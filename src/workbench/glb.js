import { patchPrimitiveColors } from "./primitive-colors.js"
import { patchSculpt } from "./geometry.js"
import {
  MAX_SOURCE_BYTES,
  MAX_OUTPUT_BYTES,
  validateTextures,
} from "./project.js"

const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942
const MAGIC = 0x46546c67
const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { fatal: true })
const fail = (message) => {
  throw new Error(message)
}
const bytesOf = (value) =>
  value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : ArrayBuffer.isView(value)
    ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    : fail("Expected GLB bytes")

/** Preserve every binary/unknown chunk, and reject external file dependencies. */
export function parseGlb(input, { maxBytes = MAX_SOURCE_BYTES } = {}) {
  const bytes = bytesOf(input)
  if (bytes.byteLength > maxBytes)
    fail(`GLB exceeds ${Math.round(maxBytes / 1024 / 1024)} MiB`)
  if (bytes.byteLength < 20) fail("Truncated GLB header")
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== MAGIC || view.getUint32(4, true) !== 2)
    fail("Expected a glTF 2 binary file (.glb or .vrm)")
  if (view.getUint32(8, true) !== bytes.byteLength)
    fail("GLB declared size does not match file")
  const chunks = []
  let json
  for (let offset = 12; offset < bytes.byteLength; ) {
    if (offset + 8 > bytes.byteLength) fail("Truncated GLB chunk header")
    const length = view.getUint32(offset, true)
    const type = view.getUint32(offset + 4, true)
    offset += 8
    if (length % 4 || length > bytes.byteLength - offset)
      fail("Invalid GLB chunk length")
    const data = bytes.slice(offset, offset + length)
    if (type === JSON_CHUNK) {
      if (json || chunks.length)
        fail("GLB must start with exactly one JSON chunk")
      json = JSON.parse(decoder.decode(data).replace(/[\u0000 ]+$/, ""))
    } else if (!json) fail("GLB JSON chunk is missing")
    chunks.push({ type, data })
    offset += length
  }
  if (!json || json.asset?.version !== "2.0")
    fail("Missing glTF 2 asset metadata")
  for (const definition of [...(json.buffers || []), ...(json.images || [])]) {
    if (
      definition.uri !== undefined &&
      (typeof definition.uri !== "string" ||
        !definition.uri.startsWith("data:"))
    )
      fail(
        "External buffers or images are not supported; embed them in the GLB first",
      )
  }
  return { json, chunks }
}

export function buildGlb({ json, chunks = [] }) {
  const encoded = encoder.encode(JSON.stringify(json))
  const padded = new Uint8Array(Math.ceil(encoded.length / 4) * 4)
  padded.fill(0x20)
  padded.set(encoded)
  const outputChunks = [
    { type: JSON_CHUNK, data: padded },
    ...chunks.filter((chunk) => chunk.type !== JSON_CHUNK),
  ]
  const length =
    12 +
    outputChunks.reduce((total, chunk) => total + 8 + chunk.data.byteLength, 0)
  if (length > MAX_OUTPUT_BYTES) fail("Edited GLB exceeds 66 MiB")
  const output = new ArrayBuffer(length)
  const view = new DataView(output)
  const bytes = new Uint8Array(output)
  view.setUint32(0, MAGIC, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, length, true)
  let offset = 12
  for (const chunk of outputChunks) {
    const data = bytesOf(chunk.data)
    if (data.byteLength % 4) fail("Unaligned GLB chunk")
    view.setUint32(offset, data.byteLength, true)
    view.setUint32(offset + 4, chunk.type, true)
    bytes.set(data, offset + 8)
    offset += data.byteLength + 8
  }
  return output
}

export function srgbHexToLinear(hex) {
  if (!/^#[\da-f]{6}$/i.test(hex)) fail("Invalid material color")
  return [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
}

/** Patch original glTF JSON instead of reserializing live Three shaders/VRM data. */
export function patchGlb(input, project) {
  const document = parseGlb(input)
  const { json } = document
  patchSculpt(document, project.sculpt)
  const textures = validateTextures(project.textures)
  if (Object.keys(textures).length) {
    const bins = document.chunks.filter((chunk) => chunk.type === BIN_CHUNK)
    if (bins.length > 1 || json.buffers?.[0]?.uri)
      fail("Texture painting requires a single embedded primary GLB buffer")
    const existing = bins[0]?.data || new Uint8Array(0)
    if ((json.buffers?.[0]?.byteLength || 0) > existing.byteLength)
      fail("Primary GLB buffer is truncated")
    const parts = []
    let byteLength = existing.byteLength
    json.buffers ||= []
    json.bufferViews ||= []
    json.images ||= []
    json.textures ||= []
    for (const [index, texture] of Object.entries(textures)) {
      const material = json.materials?.[Number(index)]
      if (!material) fail(`Texture material ${index} is absent from source`)
      const decoded = atob(texture.data)
      const data = Uint8Array.from(decoded, (char) => char.charCodeAt(0))
      const offset = Math.ceil(byteLength / 4) * 4
      const bufferView = json.bufferViews.length
      json.bufferViews.push({
        buffer: 0,
        byteOffset: offset,
        byteLength: data.byteLength,
      })
      const image = json.images.length
      json.images.push({
        name: texture.name,
        mimeType: texture.mimeType,
        bufferView,
      })
      const textureIndex = json.textures.length
      material.pbrMetallicRoughness ||= {}
      const previous = material.pbrMetallicRoughness.baseColorTexture || {}
      const texCoord =
        previous.extensions?.KHR_texture_transform?.texCoord ??
        previous.texCoord ??
        0
      for (const mesh of json.meshes || []) {
        for (const primitive of mesh.primitives || []) {
          if (
            primitive.material === Number(index) &&
            primitive.attributes?.[`TEXCOORD_${texCoord}`] === undefined
          )
            fail(
              `Material ${index} needs UV channel ${texCoord} before importing a painted texture`,
            )
        }
      }
      const previousTexture = json.textures[previous.index]
      const replacement = { name: texture.name, source: image }
      if (previousTexture?.sampler !== undefined)
        replacement.sampler = previousTexture.sampler
      json.textures.push(replacement)
      material.pbrMetallicRoughness.baseColorTexture = {
        ...previous,
        index: textureIndex,
      }
      const legacy = json.extensions?.VRM?.materialProperties?.[Number(index)]
      if (legacy) {
        legacy.textureProperties ||= {}
        if (
          legacy.textureProperties._MainTex !== undefined &&
          legacy.textureProperties._ShadeTexture ===
            legacy.textureProperties._MainTex
        )
          legacy.textureProperties._ShadeTexture = textureIndex
        legacy.textureProperties._MainTex = textureIndex
      }
      const mtoon = material.extensions?.VRMC_materials_mtoon
      if (
        mtoon?.shadeMultiplyTexture &&
        mtoon.shadeMultiplyTexture.index === previous.index
      )
        mtoon.shadeMultiplyTexture = {
          ...mtoon.shadeMultiplyTexture,
          index: textureIndex,
        }
      parts.push({ offset, data })
      byteLength = offset + data.byteLength
    }
    const binary = new Uint8Array(Math.ceil(byteLength / 4) * 4)
    binary.set(existing)
    for (const part of parts) binary.set(part.data, part.offset)
    json.buffers[0] = { ...(json.buffers[0] || {}), byteLength }
    if (bins[0]) bins[0].data = binary
    else document.chunks.splice(1, 0, { type: BIN_CHUNK, data: binary })
  }
  const expressionMorphs = new Set()
  for (const group of json.extensions?.VRM?.blendShapeMaster
    ?.blendShapeGroups || []) {
    for (const bind of group.binds || [])
      expressionMorphs.add(`${bind.mesh}:${bind.index}`)
  }
  for (const category of ["preset", "custom"]) {
    for (const expression of Object.values(
      json.extensions?.VRMC_vrm?.expressions?.[category] || {},
    )) {
      for (const bind of expression.morphTargetBinds || []) {
        const meshIndex = json.nodes?.[bind.node]?.mesh
        if (meshIndex !== undefined)
          expressionMorphs.add(`${meshIndex}:${bind.index}`)
      }
    }
  }
  const { colorsByNewMaterial, sourceMaterialByNewMaterial } =
    patchPrimitiveColors(document, project.primitiveColors)
  for (const [index, color] of Object.entries({
    ...project.colors,
    ...colorsByNewMaterial,
  })) {
    if (!/^(0|[1-9]\d*)$/.test(index)) fail("Invalid material index")
    const material = json.materials?.[Number(index)]
    if (!material) fail(`Material ${index} is absent from source`)
    const rgb = srgbHexToLinear(color)
    material.pbrMetallicRoughness ||= {}
    const alpha = material.pbrMetallicRoughness.baseColorFactor?.[3] ?? 1
    material.pbrMetallicRoughness.baseColorFactor = [...rgb, alpha]
    const ratio = project.paintShadeRatios?.[
      sourceMaterialByNewMaterial[index] ?? index
    ] || [0.8, 0.8, 0.8]
    const shade = rgb.map((value, i) => value * ratio[i])
    const toon = material.extensions?.VRMC_materials_mtoon
    if (toon) toon.shadeColorFactor = shade
    const legacy = json.extensions?.VRM?.materialProperties?.[Number(index)]
    if (legacy) {
      legacy.vectorProperties ||= {}
      // VRM0 MToon stores gamma-2.2 RGB; its loader converts these back
      // to linear and overrides the glTF fallback. Alpha stays linear.
      const legacyRgb = rgb.map((value) => Math.pow(value, 1 / 2.2))
      legacy.vectorProperties._Color = [
        ...legacyRgb,
        legacy.vectorProperties._Color?.[3] ?? alpha,
      ]
      legacy.vectorProperties._ShadeColor = [
        ...shade.map((value) => Math.pow(value, 1 / 2.2)),
        legacy.vectorProperties._ShadeColor?.[3] ?? 1,
      ]
    }
  }
  for (const [key, value] of Object.entries(project.morphs || {})) {
    if (expressionMorphs.has(key))
      fail(
        "VRM expression-bound shape keys are preview-only; remove this permanent shape edit before exporting",
      )
    if (
      !/^\d+:\d+$/.test(key) ||
      !Number.isFinite(value) ||
      value < -1 ||
      value > 1
    )
      fail("Invalid morph edit")
    const [meshIndex, targetIndex] = key.split(":").map(Number)
    const mesh = json.meshes?.[meshIndex]
    const count = mesh?.primitives?.[0]?.targets?.length || 0
    if (!mesh || targetIndex >= count)
      fail(`Morph ${key} is absent from source`)
    mesh.weights ||= Array(count).fill(0)
    mesh.weights[targetIndex] = value
    // Node weights override mesh defaults, including instanced copies.
    for (const node of json.nodes || []) {
      if (node.mesh === meshIndex && node.weights)
        node.weights[targetIndex] = value
    }
  }
  const scale = project.scale || [1, 1, 1]
  if (
    !Array.isArray(scale) ||
    scale.length !== 3 ||
    scale.some((value) => !Number.isFinite(value) || value < 0.25 || value > 3)
  )
    fail("Invalid export scale")
  const hidden = project.hiddenMeshes || []
  if (
    !Array.isArray(hidden) ||
    hidden.some(
      (index) =>
        !Number.isSafeInteger(index) || index < 0 || !json.meshes?.[index],
    )
  )
    fail("Hidden mesh is absent from source")
  const hiddenSet = new Set(hidden)
  const hiddenNodes = new Set()
  for (const [index, node] of (json.nodes || []).entries()) {
    if (!hiddenSet.has(node.mesh)) continue
    hiddenNodes.add(index)
    // glTF requires a mesh whenever skin or weights is present. Keep the node,
    // its hierarchy and all shared skin definitions; remove only its mesh binding.
    delete node.mesh
    delete node.skin
    delete node.weights
  }
  if (hiddenNodes.size) {
    for (const animation of json.animations || []) {
      animation.channels = animation.channels.filter(
        (channel) =>
          !(
            channel.target?.path === "weights" &&
            hiddenNodes.has(channel.target.node)
          ),
      )
    }
    // Empty glTF animations are invalid; their samplers are local to each entry.
    if (json.animations) {
      json.animations = json.animations.filter(
        (animation) => animation.channels.length,
      )
      if (!json.animations.length) delete json.animations
    }
    for (const group of json.extensions?.VRM?.blendShapeMaster
      ?.blendShapeGroups || []) {
      if (group.binds) {
        group.binds = group.binds.filter((bind) => !hiddenSet.has(bind.mesh))
        if (!group.binds.length) delete group.binds
      }
    }
    const expressions = json.extensions?.VRMC_vrm?.expressions
    for (const category of ["preset", "custom"]) {
      for (const expression of Object.values(expressions?.[category] || {})) {
        if (expression.morphTargetBinds) {
          expression.morphTargetBinds = expression.morphTargetBinds.filter(
            (bind) => !hiddenNodes.has(bind.node),
          )
          if (!expression.morphTargetBinds.length)
            delete expression.morphTargetBinds
        }
      }
    }
  }
  if (scale.some((value) => value !== 1)) {
    if (!Array.isArray(json.scenes) || !json.scenes.length)
      fail("Cannot scale a GLB without scenes")
    json.nodes ||= []
    for (const scene of json.scenes) {
      const roots = scene.nodes || []
      if (!roots.length) continue
      const wrapper = json.nodes.length
      json.nodes.push({
        name: "Character Studio proportions",
        scale: [...scale],
        children: [...roots],
      })
      scene.nodes = [wrapper]
    }
  }
  return buildGlb(document)
}
