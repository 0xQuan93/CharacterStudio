/**
 * Split selected source primitives onto independently tintable materials.
 * Texture/image/sampler references remain shared; no pixels or UVs are copied.
 * The caller applies colorsByNewMaterial through the normal VRM-aware tint path.
 */
export const MAX_PRIMITIVE_COLOR_OVERRIDES = 128
const fail = (message) => {
  throw new Error(message)
}

export function validatePrimitiveColors(overrides = {}) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides))
    fail("Invalid primitive color map")
  const entries = Object.entries(overrides)
  if (entries.length > MAX_PRIMITIVE_COLOR_OVERRIDES)
    fail("Too many individually colored parts (maximum 128)")
  const result = {}
  for (const [key, color] of entries) {
    if (!/^(0|[1-9]\d{0,5}):(0|[1-9]\d{0,5})$/.test(key))
      fail("Invalid primitive color index")
    if (typeof color !== "string" || !/^#[\da-f]{6}$/i.test(color))
      fail("Invalid primitive color")
    result[key] = color.toLowerCase()
  }
  return result
}

/** Materials animated by a VRM expression need a separate bind-cloning design. */
export function materialHasExpressionBindings(json, materialIndex) {
  const material = json.materials?.[materialIndex]
  const legacyMaterial =
    json.extensions?.VRM?.materialProperties?.[materialIndex]
  const names = new Set(
    [material?.name, legacyMaterial?.name].filter(
      (name) => typeof name === "string",
    ),
  )
  for (const group of json.extensions?.VRM?.blendShapeMaster
    ?.blendShapeGroups || []) {
    if (
      (group.materialValues || []).some((bind) => names.has(bind.materialName))
    )
      return true
  }
  const expressions = json.extensions?.VRMC_vrm?.expressions
  for (const category of ["preset", "custom"]) {
    for (const expression of Object.values(expressions?.[category] || {})) {
      if (
        [
          ...(expression.materialColorBinds || []),
          ...(expression.textureTransformBinds || []),
        ].some((bind) => bind.material === materialIndex)
      )
        return true
    }
  }
  return false
}

export function patchPrimitiveColors(document, overrides = {}) {
  const checked = validatePrimitiveColors(overrides)
  const { json } = document
  const legacy = json.extensions?.VRM?.materialProperties
  const originalCount = json.materials?.length || 0
  const pending = Object.entries(checked).map(([key, color]) => {
    const [meshIndex, primitiveIndex] = key.split(":").map(Number)
    const primitive = json.meshes?.[meshIndex]?.primitives?.[primitiveIndex]
    const materialIndex = primitive?.material
    if (
      !primitive ||
      !Number.isInteger(materialIndex) ||
      !json.materials?.[materialIndex]
    )
      fail(`Part ${key} has no source material`)
    if (materialHasExpressionBindings(json, materialIndex))
      fail(
        `Part ${key} has an expression-controlled material; independent tint is unavailable`,
      )
    if (
      legacy &&
      (!Array.isArray(legacy) ||
        legacy.length !== originalCount ||
        !legacy[materialIndex])
    )
      fail("VRM material metadata is incomplete; cannot split this material")
    return { key, color, primitive, materialIndex }
  })
  const names = new Set(
    [
      ...(json.materials || []).map((m) => m.name),
      ...(legacy || []).map((m) => m?.name),
    ].filter((name) => typeof name === "string"),
  )
  const colorsByNewMaterial = {}
  const sourceMaterialByNewMaterial = {}
  for (const { key, color, primitive, materialIndex } of pending) {
    const original = json.materials[materialIndex]
    const material = structuredClone(original)
    const sourceName =
      original.extras?.characterStudioSourceName || original.name
    material.extras = {
      ...(material.extras &&
      typeof material.extras === "object" &&
      !Array.isArray(material.extras)
        ? material.extras
        : material.extras === undefined
        ? {}
        : { characterStudioOriginalExtras: material.extras }),
      characterStudioSourceName: sourceName,
    }
    const prefix = `${material.name || "Material"} / Part ${key}`
    let name = prefix,
      suffix = 2
    while (names.has(name)) name = `${prefix} (${suffix++})`
    names.add(name)
    material.name = name
    const newIndex = json.materials.length
    json.materials.push(material)
    if (legacy) {
      const clone = structuredClone(legacy[materialIndex])
      clone.name = name
      legacy.push(clone)
    }
    primitive.material = newIndex
    colorsByNewMaterial[newIndex] = color
    sourceMaterialByNewMaterial[newIndex] = materialIndex
  }
  return { colorsByNewMaterial, sourceMaterialByNewMaterial }
}
