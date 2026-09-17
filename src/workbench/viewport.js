import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm"
import { createSpirit } from "./spirit.js"

export class Viewport {
  constructor(canvas, onStats = () => {}) {
    this.canvas = canvas
    this.onStats = onStats
    this.playing = false
    this.frame = 0
    this.disposed = false
    this.loadId = 0
    this.expressionPreview = null
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color("#151d20")
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.3
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 300)
    this.camera.position.set(2, 1.7, 4)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.target.set(0, 0.8, 0)
    this.controls.maxDistance = 30
    this.controls.minDistance = 0.1
    this.scene.add(new THREE.HemisphereLight("#f3f3ee", "#32465a", 2))
    const key = new THREE.DirectionalLight("#fff0dc", 3.2)
    key.position.set(3, 5, 4)
    this.scene.add(key)
    const fill = new THREE.DirectionalLight("#b9dded", 1.8)
    fill.position.set(-3, 3, -2)
    this.scene.add(fill)
    this.grid = new THREE.GridHelper(12, 24, "#364c52", "#223236")
    this.grid.position.y = -0.005
    this.scene.add(this.grid)
    this.display = new THREE.Group()
    this.scene.add(this.display)
    this.resize = new ResizeObserver(() => {
      const r = canvas.parentElement.getBoundingClientRect()
      this.renderer.setSize(Math.max(r.width, 1), Math.max(r.height, 1), false)
      this.camera.aspect = r.width / Math.max(r.height, 1)
      this.camera.updateProjectionMatrix()
    })
    this.resize.observe(canvas.parentElement)
    this.clock = new THREE.Clock()
    this.last = 0
    const render = (time) => {
      if (this.disposed) return
      this.frame = requestAnimationFrame(render)
      if (document.hidden || time - this.last < 1000 / 30) return
      this.last = time
      const dt = Math.min(this.clock.getDelta(), 0.05)
      this.controls.update()
      if (this.mixer && this.playing) this.mixer.update(dt)
      this.vrm?.update(dt)
      this.applyColors()
      this.applyMorphs()
      this.renderer.render(this.scene, this.camera)
    }
    this.frame = requestAnimationFrame(render)
  }
  clear() {
    for (const entry of this.textureCache?.values() || [])
      entry.texture.dispose()
    this.textureCache = new Map()
    this.mixer?.stopAllAction()
    this.mixer = null
    this.vrm = null
    this.gltf = null
    this.root = null
    this.materials = []
    this.meshes = []
    this.morphs = []
    this.display.traverse((o) => {
      o.geometry?.dispose()
      for (const m of [o.material].flat().filter(Boolean)) {
        for (const v of Object.values(m)) if (v?.isTexture) v.dispose()
        if (m.userData.originalMap && m.userData.originalMap !== m.map)
          m.userData.originalMap.dispose()
        m.dispose()
      }
    })
    this.display.clear()
    this.display.position.set(0, 0, 0)
    this.display.scale.set(1, 1, 1)
  }
  async load(buffer, project) {
    const loadId = ++this.loadId
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    const gltf = await loader.parseAsync(buffer, "")
    if (this.disposed || loadId !== this.loadId) {
      return
    }
    this.clear()
    this.gltf = gltf
    this.root = gltf.scene
    this.vrm = gltf.userData.vrm
    if (this.vrm) VRMUtils.rotateVRM0(this.vrm)
    this.display.add(this.root)
    this.display.updateMatrixWorld(true)
    this.root.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.skeleton.update()
        o.computeBoundingBox()
      }
    })
    const sourceBounds = new THREE.Box3().setFromObject(this.root),
      sourceSize = sourceBounds.getSize(new THREE.Vector3())
    this.sourceSize = sourceSize.toArray()
    this.display.scale.setScalar(
      1.6 /
        Math.max(sourceSize.y, sourceSize.x * 0.35, sourceSize.z * 0.35, 0.01),
    )
    const materialMap = new Map(),
      meshMap = new Map()
    this.root.traverse((o) => {
      if (!o.isMesh) return
      if (o.morphTargetInfluences)
        o.userData.originalMorphs = [...o.morphTargetInfluences]
      const a = gltf.parser.associations.get(o)
      const mi = a?.meshes
      if (mi !== undefined) {
        meshMap.set(mi, {
          index: mi,
          name: gltf.parser.json.meshes[mi]?.name || o.name || `Part ${mi + 1}`,
        })
        o.userData.workbenchMesh = mi
        Object.entries(o.morphTargetDictionary || {}).forEach(
          ([name, index]) => {
            const key = `${mi}:${index}`
            if (!this.morphs.some((m) => m.key === key))
              this.morphs.push({
                key,
                name: /^\d+$/.test(name) ? `Shape key ${index + 1}` : name,
                initial: o.morphTargetInfluences[index] || 0,
              })
          },
        )
      }
      for (const mat of [o.material].flat()) {
        const a = gltf.parser.associations.get(mat),
          i = a?.materials
        if (i === undefined) continue
        mat.userData.originalMap = mat.map
        mat.userData.originalColor = mat.color?.clone()
        mat.userData.originalShade = mat.shadeColorFactor?.clone()
        mat.userData.workbenchIndex = i
        const channel = mat.map?.channel || 0,
          uv = channel === 0 ? "uv" : `uv${channel}`
        materialMap.set(i, {
          index: i,
          name: mat.name || `Surface ${i + 1}`,
          color: "#" + (mat.color?.getHexString() || "ffffff"),
          canTexture:
            (materialMap.get(i)?.canTexture ?? true) &&
            !!o.geometry.attributes[uv],
        })
      }
    })
    const bound = new Set(),
      json = gltf.parser.json
    for (const group of json.extensions?.VRM?.blendShapeMaster
      ?.blendShapeGroups || [])
      for (const b of group.binds || []) bound.add(`${b.mesh}:${b.index}`)
    for (const group of Object.values({
      ...json.extensions?.VRMC_vrm?.expressions?.preset,
      ...json.extensions?.VRMC_vrm?.expressions?.custom,
    }))
      for (const b of group.morphTargetBinds || [])
        bound.add(`${json.nodes[b.node]?.mesh}:${b.index}`)
    this.morphs = this.morphs.filter((m) => !bound.has(m.key))
    this.boundMorphs = bound
    this.materials = [...materialMap.values()]
    this.meshes = [...meshMap.values()]
    this.animations = gltf.animations || []
    if (this.animations.length) this.mixer = new THREE.AnimationMixer(this.root)
    this.update(project)
    this.fit()
    const tri = []
    this.root.traverse((o) => {
      if (o.isMesh)
        tri.push(
          (o.geometry.index?.count ||
            o.geometry.attributes.position?.count ||
            0) / 3,
        )
    })
    this.info = {
      materials: this.materials,
      meshes: this.meshes,
      morphs: this.morphs,
      animations: this.animations.map((a) => a.name),
      expressions: this.vrm
        ? Object.keys(this.vrm.expressionManager?.expressionMap || {})
        : [],
      isVRM: !!this.vrm,
      triangles: Math.round(tri.reduce((a, b) => a + b, 0)),
      bones: this.vrm ? Object.keys(this.vrm.humanoid.humanBones).length : 0,
    }
    return this.info
  }
  spirit(project) {
    this.loadId++
    this.clear()
    this.root = createSpirit(project.parameters)
    this.display.add(this.root)
    this.animations = []
    this.info = {
      materials: [],
      meshes: [],
      morphs: [],
      animations: [],
      isVRM: false,
      triangles: 0,
      bones: 0,
    }
    this.update(project)
    this.fit()
    return this.info
  }
  update(project) {
    this.project = project
    if (!this.root) return
    this.root.scale.set(...project.scale)
    this.root.traverse((o) => {
      if (o.isMesh)
        o.visible = !(project.hiddenMeshes || []).includes(
          o.userData.workbenchMesh,
        )
    })
    this.applyColors(true)
    this.applyTextures()
    this.applyMorphs(true)
    this.ground()
  }
  applyColors(reset = false) {
    if (!this.root || !this.project) return
    this.root.traverse((o) => {
      if (!o.isMesh) return
      for (const m of [o.material].flat()) {
        const i = m.userData.workbenchIndex,
          c = this.project.colors[i]
        if (c) {
          m.color?.set(c)
          m.shadeColorFactor?.set(c).multiplyScalar(0.8)
        } else if (reset) {
          if (m.userData.originalColor) m.color?.copy(m.userData.originalColor)
          if (m.userData.originalShade)
            m.shadeColorFactor?.copy(m.userData.originalShade)
        }
      }
    })
  }
  applyTextures() {
    if (!this.root) return
    this.root.traverse((o) => {
      if (!o.isMesh) return
      for (const m of [o.material].flat()) {
        const i = m.userData.workbenchIndex,
          entry = this.project.textures?.[i]
        if (entry) {
          let cached = this.textureCache.get(i)
          if (cached?.data !== entry.data) {
            cached?.texture.dispose()
            const texture = new THREE.TextureLoader().load(
              `data:${entry.mimeType};base64,${entry.data}`,
            )
            texture.colorSpace = THREE.SRGBColorSpace
            texture.flipY = false
            const original = m.userData.originalMap
            if (original) {
              texture.channel = original.channel
              texture.offset.copy(original.offset)
              texture.repeat.copy(original.repeat)
              texture.center.copy(original.center)
              texture.rotation = original.rotation
              texture.wrapS = original.wrapS
              texture.wrapT = original.wrapT
              texture.minFilter = original.minFilter
              texture.magFilter = original.magFilter
              texture.anisotropy = original.anisotropy
            }
            cached = { data: entry.data, texture }
            this.textureCache.set(i, cached)
          }
          if (m.map !== cached.texture) {
            m.map = cached.texture
            m.needsUpdate = true
          }
        } else if (m.map !== m.userData.originalMap) {
          m.map = m.userData.originalMap
          m.needsUpdate = true
        }
      }
    })
  }
  applyMorphs(reset = false) {
    if (!this.root || !this.project) return
    this.root.traverse((o) => {
      if (!o.morphTargetInfluences) return
      const mi = o.userData.workbenchMesh
      for (let i = 0; i < o.morphTargetInfluences.length; i++) {
        const key = `${mi}:${i}`,
          v = this.project.morphs[key]
        if (this.boundMorphs?.has(key)) continue
        if (v !== undefined) o.morphTargetInfluences[i] = v
        else if (reset)
          o.morphTargetInfluences[i] = o.userData.originalMorphs[i]
      }
    })
  }
  expression(name, value = 1) {
    const manager = this.vrm?.expressionManager
    if (!manager) return
    for (const key of Object.keys(manager.expressionMap))
      manager.setValue(key, 0)
    if (name) manager.setValue(name, value)
  }
  ground() {
    this.display.position.set(0, 0, 0)
    this.display.updateMatrixWorld(true)
    this.root?.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.skeleton.update()
        o.computeBoundingBox()
      }
    })
    const b = new THREE.Box3().setFromObject(this.display)
    if (!b.isEmpty()) {
      const c = b.getCenter(new THREE.Vector3())
      this.display.position.set(-c.x, -b.min.y, -c.z)
    }
  }
  fit(view = "three-quarter") {
    if (!this.root) return
    const b = new THREE.Box3().setFromObject(this.display),
      s = b.getSize(new THREE.Vector3()),
      c = b.getCenter(new THREE.Vector3())
    const size = Math.max(s.x, s.y, s.z, 0.1),
      d = size * 2.3
    this.controls.target.copy(c)
    const p =
      view === "front"
        ? [0, 0, d]
        : view === "side"
        ? [d, 0, 0]
        : view === "back"
        ? [0, 0, -d]
        : [d * 0.62, d * 0.2, d]
    this.camera.position.copy(c).add(new THREE.Vector3(...p))
    this.controls.update()
  }
  animate(index) {
    this.mixer?.stopAllAction()
    if (this.mixer && this.animations[index]) {
      this.mixer.clipAction(this.animations[index]).reset().play()
      this.playing = true
    } else this.playing = false
  }
  async exportSpirit() {
    return new GLTFExporter().parseAsync(this.root, {
      binary: true,
      onlyVisible: true,
    })
  }
  screenshot() {
    this.renderer.render(this.scene, this.camera)
    return new Promise((resolve) => this.canvas.toBlob(resolve, "image/png"))
  }
  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.resize.disconnect()
    this.controls.dispose()
    this.clear()
    this.grid.geometry.dispose()
    this.grid.material.dispose()
    this.renderer.dispose()
  }
}
