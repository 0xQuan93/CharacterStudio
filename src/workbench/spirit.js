import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"

// Original geometry, authored from the established Zephyr silhouette.
// Deliberately non-humanoid. Parameters describe a family of small companions.
export function createSpirit(p = {}) {
  const root = new THREE.Group()
  root.name = "Signal spirit"
  const body = new THREE.MeshStandardMaterial({
    color: p.bodyColor || "#9badab",
    roughness: 0.88,
  })
  const dark = new THREE.MeshStandardMaterial({
    color: "#101817",
    roughness: 0.95,
  })
  const accent = new THREE.MeshStandardMaterial({
    color: p.accentColor || "#b9ddc9",
    emissive: p.accentColor || "#b9ddc9",
    emissiveIntensity: 0.35,
    roughness: 0.6,
  })
  const w = p.bodyWidth ?? 1,
    h = p.bodyHeight ?? 1,
    d = p.bodyDepth ?? 0.55,
    ear = p.earHeight ?? 0.28,
    eye = p.eyeSize ?? 0.13,
    foot = p.footSize ?? 0.19
  function box(name, size, pos, mat, r = 0.045) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, r), mat)
    m.name = name
    m.position.set(...pos)
    m.castShadow = true
    m.receiveShadow = true
    root.add(m)
    return m
  }
  const y = foot + h / 2
  box("Body", [w, h, d], [0, y, 0], body, 0.1)
  for (const side of [-1, 1]) {
    box(
      side < 0 ? "Left ear" : "Right ear",
      [w * 0.2, ear, d * 0.8],
      [side * w * 0.35, foot + h + ear * 0.3, 0],
      body,
    )
    box(
      side < 0 ? "Left foot" : "Right foot",
      [foot, foot, Math.max(foot, d * 0.6)],
      [side * w * 0.3, foot * 0.5, 0.025],
      body,
    )
    box(
      side < 0 ? "Left eye" : "Right eye",
      [eye, eye * 1.3, 0.028],
      [side * w * 0.235, y + h * 0.04, d / 2 + 0.013],
      dark,
      0.008,
    )
    box(
      side < 0 ? "Left cheek" : "Right cheek",
      [w * 0.1, h * 0.12, d * 0.6],
      [side * w * 0.51, y - h * 0.13, 0],
      body,
      0.02,
    )
  }
  box(
    "Smile",
    [w * 0.12, 0.027, 0.03],
    [0, y - h * 0.16, d / 2 + 0.02],
    dark,
    0.007,
  )
  box(
    "Smile left",
    [0.026, 0.05, 0.03],
    [-w * 0.072, y - h * 0.14, d / 2 + 0.02],
    dark,
    0.007,
  )
  box(
    "Smile right",
    [0.026, 0.05, 0.03],
    [w * 0.072, y - h * 0.14, d / 2 + 0.02],
    dark,
    0.007,
  )
  if (p.fragment !== false) {
    const fragment = box(
      "One memory fragment",
      [0.12, 0.12, 0.12],
      [w * 0.72, y + 0.05, 0.12],
      accent,
      0.009,
    )
    fragment.rotation.z = Math.PI / 10
  }
  root.userData = {
    generator: "character-studio/signal-spirit-v1",
    parameters: p,
  }
  return root
}
