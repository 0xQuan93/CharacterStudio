/**
 * Bind-space, topology-preserving sculpting. The original POSITION accessor order
 * is the identity of a vertex; do not feed posed, merged or reindexed positions.
 *
 * Architectural adaptation of 3DHAUS shapeDeformer: keep originals immutable,
 * use smooth regional masks, and relax displacement rather than base geometry.
 * Its DCL-specific skin-weight repair is deliberately not part of this engine.
 */
export const MAX_SCULPT_VERTICES = 300000
export const MAX_SCULPT_EDITS = 50000
const fail = (message) => {
  throw new Error(message)
}
const vector = (value, label) => {
  if (
    (!Array.isArray(value) && !ArrayBuffer.isView(value)) ||
    value.length !== 3 ||
    !Array.from(value).every(Number.isFinite)
  )
    fail(`Invalid sculpt ${label}`)
  return value
}

export function validateSculptOffsets(
  offsets = {},
  vertexCount,
  maxDisplacement = Infinity,
) {
  if (!offsets || typeof offsets !== "object" || Array.isArray(offsets))
    fail("Invalid sculpt offsets")
  const entries = Object.entries(offsets)
  if (entries.length > MAX_SCULPT_EDITS)
    fail(`Sculpt edits exceed ${MAX_SCULPT_EDITS} vertices`)
  const output = {}
  for (const [key, value] of entries) {
    if (
      !/^(0|[1-9]\d*)$/.test(key) ||
      !Number.isSafeInteger(Number(key)) ||
      (vertexCount !== undefined && Number(key) >= vertexCount)
    )
      fail("Sculpt vertex is absent from source")
    vector(value, "offset")
    if (Math.hypot(...value) > maxDisplacement + 1e-7)
      fail("Sculpt offset exceeds displacement limit")
    if (Math.hypot(...value) > 1e-9) output[key] = Array.from(value)
  }
  return output
}

export function applySculptOffsets(positions, offsets = {}) {
  validatePositions(positions)
  const checked = validateSculptOffsets(offsets, positions.length / 3)
  const output = Float32Array.from(positions)
  for (const [key, value] of Object.entries(checked)) {
    const j = Number(key) * 3
    for (let axis = 0; axis < 3; axis++) output[j + axis] += value[axis]
  }
  return output
}

function validatePositions(positions) {
  if (
    (!Array.isArray(positions) && !ArrayBuffer.isView(positions)) ||
    !positions.length ||
    positions.length % 3 ||
    positions.length / 3 > MAX_SCULPT_VERTICES ||
    !positions.every(Number.isFinite)
  )
    fail("Invalid or oversized sculpt positions")
}

/** Build indexed adjacency once per primitive/accessor. Never joins UV seams. */
export function sculptNeighbors(vertexCount, indices) {
  if (
    !Number.isInteger(vertexCount) ||
    vertexCount < 1 ||
    vertexCount > MAX_SCULPT_VERTICES
  )
    fail("Invalid sculpt vertex count")
  const order =
    indices ?? Array.from({ length: vertexCount }, (_, index) => index)
  if (order.length % 3 || order.length > MAX_SCULPT_VERTICES * 12)
    fail("Sculpt requires bounded triangle topology")
  const links = Array.from({ length: vertexCount }, () => new Set())
  const connect = (a, b) => {
    if (a !== b) {
      links[a].add(b)
      links[b].add(a)
    }
  }
  for (let i = 0; i < order.length; i += 3) {
    const triangle = [order[i], order[i + 1], order[i + 2]]
    if (
      !triangle.every((v) => Number.isInteger(v) && v >= 0 && v < vertexCount)
    )
      fail("Invalid sculpt triangle index")
    connect(triangle[0], triangle[1])
    connect(triangle[1], triangle[2])
    connect(triangle[2], triangle[0])
  }
  return links.map((row) => [...row])
}

/**
 * Returns a fresh sparse { sourceVertexIndex: [dx,dy,dz] } displacement map.
 * center/radius/direction/maxDisplacement use mesh-local bind-space units.
 * strength is [-1,1]; inflate accepts negative strength for deflate.
 * move direction is a unit direction (not a pointer-distance vector).
 * smooth relaxes ONLY existing deltas, preserving untouched authored shape.
 * vertexMask (optional Float32Array) is membership [0,1]; zero locks a vertex.
 * symmetry reflects around mesh-local X=symmetryPlane, not world-space X.
 * Provide neighbors for smooth to reuse cached triangle adjacency.
 */
export function sculptStroke({
  positions,
  offsets = {},
  indices,
  neighbors,
  normals,
  center,
  radius,
  strength = 0.25,
  mode = "inflate",
  direction = [0, 0, 1],
  symmetry = false,
  symmetryPlane = 0,
  maxDisplacement,
  vertexMask,
}) {
  validatePositions(positions)
  vector(center, "center")
  vector(direction, "direction")
  if (!["inflate", "move", "smooth"].includes(mode))
    fail("Unknown sculpt brush")
  if (
    !Number.isFinite(radius) ||
    radius <= 0 ||
    !Number.isFinite(strength) ||
    Math.abs(strength) > 1 ||
    !Number.isFinite(symmetryPlane)
  )
    fail("Invalid sculpt brush settings")
  const count = positions.length / 3
  if (!Number.isFinite(maxDisplacement) || maxDisplacement <= 0)
    fail("Sculpt requires a positive displacement limit")
  if (
    normals &&
    (normals.length !== positions.length || !normals.every(Number.isFinite))
  )
    fail("Invalid sculpt normals")
  if (mode === "inflate" && !normals)
    fail("Inflate requires bind-space normals")
  if (
    vertexMask &&
    (vertexMask.length !== count ||
      !vertexMask.every((n) => Number.isFinite(n) && n >= 0 && n <= 1))
  )
    fail("Invalid sculpt vertex mask")
  const originalOffsets = validateSculptOffsets(offsets, count, maxDisplacement)
  const output = { ...originalOffsets }
  const adjacency =
    mode === "smooth" ? neighbors || sculptNeighbors(count, indices) : null
  if (adjacency && adjacency.length !== count) fail("Invalid sculpt adjacency")
  const brushCenters = [Array.from(center)]
  if (symmetry)
    brushCenters.push([2 * symmetryPlane - center[0], center[1], center[2]])
  const directionLength = Math.hypot(...direction)
  if (mode === "move" && directionLength < 1e-9) return output
  for (let i = 0; i < count; i++) {
    const j = i * 3
    const previous = originalOffsets[i] || [0, 0, 0]
    const p = [
      positions[j] + previous[0],
      positions[j + 1] + previous[1],
      positions[j + 2] + previous[2],
    ]
    let influence = 0,
      reflected = false
    for (let side = 0; side < brushCenters.length; side++) {
      const c = brushCenters[side]
      const t = Math.max(
        0,
        1 - Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) / radius,
      )
      const weight = t * t * (3 - 2 * t) * (vertexMask?.[i] ?? 1)
      if (
        weight > influence ||
        (weight === influence &&
          side === 1 &&
          center[0] === symmetryPlane &&
          p[0] < symmetryPlane)
      ) {
        influence = weight
        reflected = side === 1
      }
    }
    if (influence <= 0) continue
    const next = [...previous]
    if (mode === "smooth") {
      const links = adjacency[i]
      if (
        !Array.isArray(links) ||
        !links.every((n) => Number.isInteger(n) && n >= 0 && n < count)
      )
        fail("Invalid sculpt adjacency")
      const eligible = links.filter((n) => !vertexMask || vertexMask[n] > 0)
      if (!eligible.length) continue
      for (let axis = 0; axis < 3; axis++) {
        const average =
          eligible.reduce(
            (sum, n) => sum + (originalOffsets[n]?.[axis] || 0),
            0,
          ) / eligible.length
        next[axis] +=
          (average - previous[axis]) * influence * Math.abs(strength) * 0.5
      }
    } else {
      const axisVector =
        mode === "move"
          ? [direction[0] * (reflected ? -1 : 1), direction[1], direction[2]]
          : [normals[j], normals[j + 1], normals[j + 2]]
      const length = Math.hypot(...axisVector)
      if (length < 1e-9) continue
      const amount = (radius * 0.2 * strength * influence) / length
      for (let axis = 0; axis < 3; axis++)
        next[axis] += axisVector[axis] * amount
      // A brush crossing the mirror plane must not split its centre vertices.
      if (symmetry && Math.abs(positions[j] - symmetryPlane) < 1e-7) next[0] = 0
    }
    const length = Math.hypot(...next)
    if (length > maxDisplacement)
      for (let axis = 0; axis < 3; axis++)
        next[axis] *= maxDisplacement / length
    if (Math.hypot(...next) < 1e-9) delete output[i]
    else output[i] = next
  }
  if (Object.keys(output).length > MAX_SCULPT_EDITS)
    fail(
      `Sculpt edits exceed ${MAX_SCULPT_EDITS} vertices; use a smaller brush`,
    )
  return output
}

/** Area-weighted normals using the complete shared POSITION accessor topology. */
export function recalculateNormals(positions, indices, originalNormals) {
  validatePositions(positions)
  const count = positions.length / 3
  if (
    originalNormals &&
    (originalNormals.length !== positions.length ||
      !originalNormals.every(Number.isFinite))
  )
    fail("Invalid source normals")
  const order = indices ?? Array.from({ length: count }, (_, i) => i)
  if (order.length % 3 || order.length > MAX_SCULPT_VERTICES * 12)
    fail("Invalid normal triangle topology")
  const output = new Float32Array(positions.length)
  for (let i = 0; i < order.length; i += 3) {
    const triangle = [order[i], order[i + 1], order[i + 2]]
    if (!triangle.every((v) => Number.isInteger(v) && v >= 0 && v < count))
      fail("Invalid normal triangle index")
    const [a, b, c] = triangle.map((v) => v * 3)
    const ab = [
      positions[b] - positions[a],
      positions[b + 1] - positions[a + 1],
      positions[b + 2] - positions[a + 2],
    ]
    const ac = [
      positions[c] - positions[a],
      positions[c + 1] - positions[a + 1],
      positions[c + 2] - positions[a + 2],
    ]
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ]
    for (const vertex of [a, b, c])
      for (let axis = 0; axis < 3; axis++) output[vertex + axis] += normal[axis]
  }
  for (let j = 0; j < output.length; j += 3) {
    let length = Math.hypot(output[j], output[j + 1], output[j + 2])
    if (length < 1e-12) {
      for (let axis = 0; axis < 3; axis++)
        output[j + axis] = originalNormals?.[j + axis] ?? (axis === 1 ? 1 : 0)
      length = Math.hypot(output[j], output[j + 1], output[j + 2])
      if (length < 1e-12) {
        output[j + 1] = 1
        length = 1
      }
    }
    for (let axis = 0; axis < 3; axis++) output[j + axis] /= length
  }
  return output
}
