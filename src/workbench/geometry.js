import {
  applySculptOffsets,
  recalculateNormals,
  validateSculptOffsets,
} from "./sculpt.js"
const BIN = 0x004e4942
const fail = (m) => {
  throw new Error(m)
}
export function readAccessor(document, index) {
  const { json } = document
  if (!Number.isSafeInteger(index) || index < 0)
    fail("Invalid geometry accessor")
  const a = json.accessors?.[index],
    v = json.bufferViews?.[a?.bufferView]
  const bins = document.chunks.filter((c) => c.type === BIN),
    bin = bins[0]?.data
  const sizes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 },
    counts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
  if (
    !a ||
    !Number.isSafeInteger(a.bufferView) ||
    !v ||
    v.buffer !== 0 ||
    !bin ||
    bins.length !== 1 ||
    json.buffers?.[0]?.uri ||
    a.sparse ||
    a.normalized ||
    v.extensions?.EXT_meshopt_compression ||
    !sizes[a.componentType] ||
    !counts[a.type] ||
    !Number.isSafeInteger(a.count) ||
    a.count < 1 ||
    a.count > 300000
  )
    fail("Sculpt requires bounded, uncompressed source accessors")
  const n = counts[a.type],
    size = sizes[a.componentType],
    viewOffset = v.byteOffset ?? 0,
    accessorOffset = a.byteOffset ?? 0,
    stride = v.byteStride ?? size * n
  const integers = [
    viewOffset,
    accessorOffset,
    v.byteLength,
    stride,
    json.buffers?.[0]?.byteLength,
  ]
  if (
    !integers.every(Number.isSafeInteger) ||
    integers.some((n) => n < 0) ||
    v.byteLength < 1 ||
    stride < size * n ||
    viewOffset % size ||
    accessorOffset % size ||
    stride % size ||
    (v.byteStride !== undefined && (stride < 4 || stride > 252 || stride % 4))
  )
    fail("Invalid geometry buffer bounds or alignment")
  const start = viewOffset + accessorOffset,
    end = start + (a.count - 1) * stride + n * size,
    viewEnd = viewOffset + v.byteLength
  if (
    !Number.isSafeInteger(end) ||
    !Number.isSafeInteger(viewEnd) ||
    end > viewEnd ||
    viewEnd > bin.byteLength ||
    viewEnd > json.buffers[0].byteLength
  )
    fail("Invalid geometry buffer bounds")
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength),
    out =
      a.componentType === 5126
        ? new Float32Array(a.count * n)
        : new Uint32Array(a.count * n)
  const method = {
    5121: "getUint8",
    5123: "getUint16",
    5125: "getUint32",
    5126: "getFloat32",
  }[a.componentType]
  for (let i = 0; i < a.count; i++)
    for (let j = 0; j < n; j++)
      out[i * n + j] = view[method](start + i * stride + j * size, true)
  if (!out.every(Number.isFinite)) fail("Non-finite source geometry")
  return out
}
export function collectSculptGeometry(document) {
  const map = new Map(),
    unsupported = new Set()
  for (const mesh of document.json.meshes || [])
    for (const p of mesh.primitives || []) {
      const id = p.attributes?.POSITION
      if (!Number.isSafeInteger(id) || id < 0 || unsupported.has(id)) continue
      try {
        const a = document.json.accessors?.[id],
          normalId = p.attributes?.NORMAL,
          normal = document.json.accessors?.[normalId]
        if (
          (p.mode ?? 4) !== 4 ||
          p.extensions?.KHR_draco_mesh_compression ||
          a?.type !== "VEC3" ||
          a.componentType !== 5126 ||
          normal?.type !== "VEC3" ||
          normal.componentType !== 5126
        )
          fail("Unsupported sculpt primitive")
        let entry = map.get(id)
        if (!entry) {
          entry = {
            positions: readAccessor(document, id),
            normals: readAccessor(document, normalId),
            normalAccessor: normalId,
            indices: [],
          }
          if (entry.positions.length !== entry.normals.length)
            fail("Mismatched sculpt normals")
        }
        if (entry.normalAccessor !== normalId)
          fail("Shared sculpt positions need matching source normals")
        const indexAccessor = document.json.accessors?.[p.indices]
        if (
          p.indices !== undefined &&
          (!indexAccessor ||
            indexAccessor.type !== "SCALAR" ||
            ![5121, 5123, 5125].includes(indexAccessor.componentType))
        )
          fail("Invalid sculpt indices")
        const count = entry.positions.length / 3,
          idx =
            p.indices === undefined
              ? Array.from({ length: count }, (_, i) => i)
              : readAccessor(document, p.indices)
        if (
          !idx.length ||
          idx.length % 3 ||
          entry.indices.length + idx.length > 3600000 ||
          !idx.every((i) => Number.isInteger(i) && i >= 0 && i < count)
        )
          fail("Invalid sculpt triangle indices")
        for (const index of idx) entry.indices.push(index)
        map.set(id, entry)
      } catch {
        // Any incompatible primitive invalidates the entire shared POSITION group;
        // otherwise the exporter could overwrite geometry that was never evaluated.
        unsupported.add(id)
        map.delete(id)
      }
    }
  return map
}
export function patchSculpt(document, sculpt = {}) {
  if (!sculpt || typeof sculpt !== "object" || Array.isArray(sculpt))
    fail("Invalid sculpt geometry map")
  const edits = Object.entries(sculpt).filter(([key, offsets]) => {
    if (!/^(0|[1-9]\d*)$/.test(key)) fail("Invalid sculpt accessor")
    return Object.keys(validateSculptOffsets(offsets, 300000, 0.12)).length > 0
  })
  if (!edits.length) return
  const geometries = collectSculptGeometry(document),
    { json } = document,
    bin = document.chunks.find((c) => c.type === BIN)
  if (!bin || json.buffers?.[0]?.uri)
    fail("Sculpt export requires an embedded geometry buffer")
  const pieces = [bin.data]
  let size = bin.data.byteLength
  const append = (values, sourceIndex) => {
    const padding = (4 - (size % 4)) % 4
    if (padding) {
      pieces.push(new Uint8Array(padding))
      size += padding
    }
    const offset = size,
      data = new Uint8Array(values.buffer, values.byteOffset, values.byteLength)
    pieces.push(data)
    size += data.byteLength
    const bv = json.bufferViews.length
    json.bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: data.byteLength,
      target: 34962,
    })
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < values.length; i++) {
      const k = i % 3
      min[k] = Math.min(min[k], values[i])
      max[k] = Math.max(max[k], values[i])
    }
    const index = json.accessors.length
    json.accessors.push({
      bufferView: bv,
      componentType: 5126,
      type: "VEC3",
      count: values.length / 3,
      min,
      max,
      name: `Sculpted ${json.accessors[sourceIndex].name || sourceIndex}`,
    })
    return index
  }
  for (const [key, offsets] of edits) {
    const id = Number(key),
      g = geometries.get(id)
    if (!g) fail(`Geometry ${key} cannot be sculpted`)
    const checked = validateSculptOffsets(offsets, g.positions.length / 3, 0.12)
    const positions = applySculptOffsets(g.positions, checked),
      normals = recalculateNormals(positions, g.indices, g.normals)
    const positionId = append(positions, id),
      normalId = append(normals, id)
    for (const mesh of json.meshes)
      for (const p of mesh.primitives)
        if (p.attributes.POSITION === id) {
          p.attributes.POSITION = positionId
          p.attributes.NORMAL = normalId
          delete p.attributes.TANGENT
        }
  }
  const output = new Uint8Array(size)
  let offset = 0
  for (const p of pieces) {
    output.set(p, offset)
    offset += p.length
  }
  bin.data = output
  json.buffers[0].byteLength = size
}
