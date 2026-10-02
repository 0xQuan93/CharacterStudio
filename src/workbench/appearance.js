// Semantics come from explicit VRoid material/target names, never mesh order.
export function describeAppearance(json) {
  const materials = json.materials || []
  const referencedMeshes = new Set(
    (json.nodes || []).flatMap((node) =>
      Number.isInteger(node.mesh) ? [node.mesh] : [],
    ),
  )
  const referencedMaterials = new Set(
    [...referencedMeshes].flatMap((index) =>
      (json.meshes?.[index]?.primitives || []).map((p) => p.material),
    ),
  )
  const find = (pattern) =>
    materials.flatMap((m, index) =>
      referencedMaterials.has(index) &&
      pattern.test(m.extras?.characterStudioSourceName || m.name || "")
        ? [index]
        : [],
    )
  const groups = [
    {
      id: "skin",
      label: "Skin tone",
      indices: find(/_(?:Face|Body)_\d+_SKIN$/i),
      swatches: [
        "#fff3e6",
        "#ebc4a0",
        "#c89470",
        "#a96d49",
        "#74482f",
        "#422b22",
      ],
    },
    {
      id: "eyes",
      label: "Eye color",
      indices: find(/_EyeIris_\d+_EYE$/i),
      swatches: [
        "#493023",
        "#8b633b",
        "#476b51",
        "#49748a",
        "#706282",
        "#a4adb0",
      ],
    },
    {
      id: "hair",
      label: "Hair color",
      indices: find(/_Hair_\d+_HAIR(?:_\d+)?$/i),
      swatches: [
        "#191716",
        "#503527",
        "#885137",
        "#c6a371",
        "#e5dccb",
        "#a6c6bd",
      ],
    },
    {
      id: "brows",
      label: "Eyebrow color",
      indices: find(/_FaceBrow_\d+_FACE$/i),
      swatches: ["#191716", "#503527", "#885137", "#c6a371"],
    },
  ].filter((g) => g.indices.length)
  const hairMaterials = new Set(
    groups.find((g) => g.id === "hair")?.indices || [],
  )
  const hairMeshes = (json.meshes || []).flatMap((mesh, index) =>
    referencedMeshes.has(index) &&
    mesh.primitives?.length &&
    mesh.primitives.every((p) => hairMaterials.has(p.material))
      ? [index]
      : [],
  )
  const bound = new Set()
  for (const group of json.extensions?.VRM?.blendShapeMaster
    ?.blendShapeGroups || [])
    for (const b of group.binds || []) bound.add(`${b.mesh}:${b.index}`)
  for (const group of Object.values({
    ...json.extensions?.VRMC_vrm?.expressions?.preset,
    ...json.extensions?.VRMC_vrm?.expressions?.custom,
  }))
    for (const b of group.morphTargetBinds || [])
      bound.add(`${json.nodes?.[b.node]?.mesh}:${b.index}`)
  const names = {},
    faceFeatures = [],
    identityFeatures = []
  const regions = {
    BRW: "Brows",
    EYE: "Eyes",
    MTH: "Mouth",
    HA: "Teeth",
    ALL: "Face",
  }
  const words = {
    Fun: "relaxed",
    Sorrow: "sad",
    Angry: "angry",
    Joy: "happy",
    Surprised: "surprised",
    Close: "closed",
    Natural: "natural",
    Up: "raised",
    Down: "lowered",
    R: "right",
    L: "left",
  }
  for (const [meshIndex, mesh] of (json.meshes || []).entries()) {
    if (!referencedMeshes.has(meshIndex)) continue
    const targetNames =
      mesh.extras?.targetNames ||
      mesh.primitives?.[0]?.extras?.targetNames ||
      []
    targetNames.forEach((name, index) => {
      const key = `${meshIndex}:${index}`
      if (typeof name !== "string") return
      names[key] = name
      const identityLabels = {
        Identity_JawWidth: "Jaw width",
        Identity_ChinLength: "Chin length",
        Identity_NoseWidth: "Nose width",
      }
      if (identityLabels[name] && !bound.has(key))
        identityFeatures.push({
          key,
          label: identityLabels[name],
          min: -1,
          max: 1,
        })
      const match = name.match(/_Fcl_(BRW|EYE|MTH)_([A-Za-z0-9_]+)$/)
      if (!match || bound.has(key)) return
      const label = `${regions[match[1]]} · ${match[2]
        .split("_")
        .map((w) => words[w] || w)
        .join(" ")}`
      faceFeatures.push({ key, label, sourceName: name })
    })
  }
  return { groups, hairMeshes, names, faceFeatures, identityFeatures }
}
export const EMPTY_APPEARANCE = {
  groups: [],
  hairMeshes: [],
  names: {},
  faceFeatures: [],
  identityFeatures: [],
}
export function colorGroup(colors, indices, value) {
  const result = { ...colors }
  for (const index of indices) {
    if (value === null) delete result[index]
    else result[index] = value
  }
  return result
}
export function setHairVisibility(hiddenMeshes, hairMeshes, visible) {
  const result = new Set(hiddenMeshes)
  for (const index of hairMeshes)
    visible ? result.delete(index) : result.add(index)
  return [...result]
}
