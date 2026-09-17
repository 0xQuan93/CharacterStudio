import { createSpiritVariant } from "./project.js"

const IDENTITY_NAMES = new Set([
  "Identity_JawWidth",
  "Identity_ChinLength",
  "Identity_NoseWidth",
])
const COLOR_GROUPS = ["skin", "hair", "eyes", "brows"]

// Each semantic channel has its own seed so descriptor ordering never changes
// a saved recipe. This generator makes a project patch, never mutates a source.
function randomFor(seed, channel) {
  let value = 2166136261
  for (const char of `${seed}\0${channel}`)
    value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0
  value = (value + 0x6d2b79f5) >>> 0
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

/**
 * Produce a shallow project patch from verified semantic appearance bindings.
 * info: describeAppearance(json), or { appearance: describeAppearance(json) }.
 * Identity features must occur in both identityFeatures and the exact name map;
 * describeAppearance excludes expression-bound targets before this call.
 * Textures, sculpt operations, source data and visibility are never changed.
 */
export function generateVariation(project, info, seed) {
  if (
    !(
      typeof seed === "string" ||
      (typeof seed === "number" && Number.isFinite(seed))
    )
  )
    throw new TypeError("Variation seed must be a string or finite number.")
  if (project.kind === "spirit")
    return {
      parameters: { ...project.parameters, ...createSpiritVariant(seed) },
    }

  const appearance = info?.appearance || info || {}
  const patch = {}
  const colors = { ...project.colors }
  let changedColors = false
  for (const id of COLOR_GROUPS) {
    const group = appearance.groups?.find((candidate) => candidate.id === id)
    const palette =
      group?.swatches?.filter((color) => /^#[0-9a-f]{6}$/i.test(color)) || []
    const indices =
      group?.indices?.filter(
        (index) => Number.isInteger(index) && index >= 0,
      ) || []
    if (!palette.length || !indices.length) continue
    const color =
      palette[
        Math.floor(randomFor(seed, `color:${id}`) * palette.length)
      ].toLowerCase()
    for (const index of indices) colors[index] = color
    changedColors = true
  }
  if (changedColors) patch.colors = colors

  const morphs = { ...project.morphs }
  let changedMorphs = false
  for (const feature of appearance.identityFeatures || []) {
    const name = appearance.names?.[feature.key]
    if (!IDENTITY_NAMES.has(name) || !/^\d+:\d+$/.test(feature.key)) continue
    const min = Math.max(
      -0.55,
      Number.isFinite(feature.min) ? feature.min : -0.55,
    )
    const max = Math.min(
      0.55,
      Number.isFinite(feature.max) ? feature.max : 0.55,
    )
    if (min > max) continue
    morphs[feature.key] =
      Math.round(
        (min + randomFor(seed, `identity:${name}`) * (max - min)) * 1000,
      ) / 1000
    // Rounding must not escape a narrowly authored permitted range.
    morphs[feature.key] = Math.max(min, Math.min(max, morphs[feature.key]))
    changedMorphs = true
  }
  if (changedMorphs) patch.morphs = morphs
  return patch
}
