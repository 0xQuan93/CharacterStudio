import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { parseGlb, patchGlb } from "../src/workbench/glb.js"
import {
  readAccessor,
  collectSculptGeometry,
  patchSculpt,
} from "../src/workbench/geometry.js"
import { DEFAULT_PROJECT, validateProject } from "../src/workbench/project.js"
const source = fs.readFileSync(
  new URL(
    "../public/workbench-assets/human-face-controls.vrm",
    import.meta.url,
  ),
)
const BIN = 0x004e4942
const original = parseGlb(source)
const project = {
  ...DEFAULT_PROJECT,
  kind: "library",
  assetId: "human-face-controls",
  name: "Quan sculpt verification",
  parameters: {},
  sculpt: { 0: { 17: [0.007, -0.003, 0.011] } },
}

test("real facial VRM sculpt roundtrip preserves source bytes, binary prefix, rig and morph references", () => {
  const unchanged = Buffer.from(source)
  const originalJSON = JSON.stringify(original.json)
  const exported = patchGlb(source, project)
  const result = parseGlb(exported)
  const originalBIN = original.chunks.find((c) => c.type === BIN).data,
    resultBIN = result.chunks.find((c) => c.type === BIN).data
  assert.deepEqual(source, unchanged)
  assert.equal(JSON.stringify(original.json), originalJSON)
  assert.deepEqual(resultBIN.slice(0, originalBIN.length), originalBIN)
  assert.deepEqual(result.json.skins, original.json.skins)
  assert.deepEqual(result.json.nodes, original.json.nodes)
  assert.deepEqual(result.json.animations, original.json.animations)
  assert.deepEqual(result.json.extensions, original.json.extensions)
  const sourcePositions = readAccessor(original, 0)
  const sculptedId = result.json.meshes[0].primitives[0].attributes.POSITION
  assert.ok(sculptedId >= original.json.accessors.length)
  const actual = readAccessor(result, sculptedId)
  for (let i = 0; i < actual.length; i++) {
    const expected =
      sourcePositions[i] +
      (Math.floor(i / 3) === 17 ? project.sculpt[0][17][i % 3] : 0)
    assert.ok(
      Math.abs(actual[i] - expected) < 2e-7,
      `source vertex component ${i} changed incorrectly`,
    )
  }
  for (let mi = 0; mi < original.json.meshes.length; mi++)
    for (let pi = 0; pi < original.json.meshes[mi].primitives.length; pi++) {
      const before = original.json.meshes[mi].primitives[pi],
        after = result.json.meshes[mi].primitives[pi]
      assert.deepEqual(after.targets, before.targets)
      for (const attr of ["JOINTS_0", "WEIGHTS_0", "TEXCOORD_0"])
        assert.equal(after.attributes[attr], before.attributes[attr])
      if (before.attributes.POSITION === 0) {
        assert.equal(after.attributes.POSITION, sculptedId)
        assert.equal(
          after.attributes.NORMAL,
          result.json.meshes[0].primitives[0].attributes.NORMAL,
        )
        assert.ok(after.attributes.NORMAL >= original.json.accessors.length)
      } else assert.deepEqual(after, before)
    }
  const a = result.json.accessors[sculptedId]
  for (let axis = 0; axis < 3; axis++)
    for (let i = axis; i < actual.length; i += 3)
      assert.ok(actual[i] >= a.min[axis] && actual[i] <= a.max[axis])
  const normals = readAccessor(
    result,
    result.json.meshes[0].primitives[0].attributes.NORMAL,
  )
  for (let i = 0; i < normals.length; i += 3)
    assert.ok(Math.abs(Math.hypot(...normals.slice(i, i + 3)) - 1) < 1e-6)
})

test("project validates versioned offsets and source-aware exporter rejects invalid vertex/accessor references", () => {
  const checked = validateProject(project)
  assert.equal(checked.version, 2)
  assert.deepEqual(checked.sculpt, project.sculpt)
  assert.throws(
    () => validateProject({ ...project, sculpt: { 0: { 1.5: [0, 0, 0.01] } } }),
    /vertex/,
  )
  assert.throws(
    () => validateProject({ ...project, sculpt: { 0: { 17: [0.13, 0, 0] } } }),
    /limit/,
  )
  assert.throws(
    () =>
      validateProject({ ...project, sculpt: { "-1": { 17: [0.01, 0, 0] } } }),
    /accessor/,
  )
  assert.throws(
    () =>
      patchGlb(source, { ...project, sculpt: { 0: { 99999: [0.01, 0, 0] } } }),
    /absent/,
  )
  assert.throws(
    () =>
      patchGlb(source, { ...project, sculpt: { 99999: { 0: [0.01, 0, 0] } } }),
    /cannot/,
  )
  assert.throws(
    () => patchGlb(source, { ...project, sculpt: { 0: { 17: [NaN, 0, 0] } } }),
    /offset/,
  )
})

test("invalid triangle indices cannot generate a sculpted export", () => {
  const document = parseGlb(source)
  const p = document.json.meshes[0].primitives[0],
    a = document.json.accessors[p.indices],
    v = document.json.bufferViews[a.bufferView],
    bin = document.chunks.find((c) => c.type === BIN).data
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength),
    offset = (v.byteOffset || 0) + (a.byteOffset || 0)
  view.setUint16(offset, 65535, true)
  assert.equal(collectSculptGeometry(document).has(0), false)
  assert.throws(() => patchSculpt(document, project.sculpt), /cannot|index/)
})

test("geometry reader rejects accessor ranges outside their declared buffer view", () => {
  const document = parseGlb(source),
    a = document.json.accessors[0],
    v = document.json.bufferViews[a.bufferView]
  v.byteLength = 4
  assert.throws(() => readAccessor(document, 0), /bounds|accessor/i)
})

test("geometry reader rejects malformed accessor counts and alignment", () => {
  for (const count of [-1, 0, 1.5]) {
    const d = parseGlb(source)
    d.json.accessors[0].count = count
    assert.throws(() => readAccessor(d, 0), /count|accessor|bounds/i)
  }
  const d = parseGlb(source)
  d.json.accessors[0].byteOffset = 1
  assert.throws(() => readAccessor(d, 0), /align|accessor|bounds/i)
})

test("shared accessor geometry includes every material primitive", () => {
  const geometry = collectSculptGeometry(original).get(0)
  const expected = original.json.meshes
    .flatMap((m) => m.primitives)
    .filter((p) => p.attributes.POSITION === 0)
    .reduce((n, p) => n + original.json.accessors[p.indices].count, 0)
  assert.equal(geometry.indices.length, expected)
  assert.equal(geometry.positions.length, original.json.accessors[0].count * 3)
})

test("one unsupported primitive disables its complete shared POSITION group", () => {
  for (const change of [
    (p) => {
      p.mode = 1
    },
    (p) => {
      p.attributes.NORMAL = 99999
    },
    (p) => {
      p.extensions = {
        KHR_draco_mesh_compression: {
          bufferView: 0,
          attributes: { POSITION: 0 },
        },
      }
    },
  ]) {
    const d = parseGlb(source)
    change(d.json.meshes[0].primitives[5])
    assert.equal(collectSculptGeometry(d).has(0), false)
    assert.throws(() => patchSculpt(d, project.sculpt), /cannot/)
  }
  const d = parseGlb(source),
    a = d.json.accessors[d.json.meshes[0].primitives[5].indices]
  a.count -= 1
  assert.equal(collectSculptGeometry(d).has(0), false)
})

test("interleaved FLOAT positions read correctly and integer indices retain precision", () => {
  const bytes = new Uint8Array(32),
    v = new DataView(bytes.buffer)
  for (const [offset, value] of [
    [0, 1],
    [4, 2],
    [8, 3],
    [16, 4],
    [20, 5],
    [24, 6],
  ])
    v.setFloat32(offset, value, true)
  const d = {
    json: {
      buffers: [{ byteLength: 32 }],
      bufferViews: [{ buffer: 0, byteLength: 32, byteStride: 16 }],
      accessors: [
        { bufferView: 0, componentType: 5126, type: "VEC3", count: 2 },
      ],
    },
    chunks: [{ type: BIN, data: bytes }],
  }
  assert.deepEqual(Array.from(readAccessor(d, 0)), [1, 2, 3, 4, 5, 6])
  d.json.bufferViews[0].byteStride = 14
  assert.throws(() => readAccessor(d, 0), /alignment/)
  d.json.bufferViews[0].byteStride = 4
  d.json.accessors[0] = {
    bufferView: 0,
    componentType: 5125,
    type: "SCALAR",
    count: 1,
  }
  v.setUint32(0, 16777217, true)
  assert.equal(readAccessor(d, 0)[0], 16777217)
})

test("empty sculpt layers are binary no-ops, including authored normals", () => {
  const d = parseGlb(source),
    before = JSON.stringify(d.json),
    bin = Buffer.from(d.chunks.find((c) => c.type === BIN).data)
  patchSculpt(d, { 0: {} })
  assert.equal(JSON.stringify(d.json), before)
  assert.deepEqual(Buffer.from(d.chunks.find((c) => c.type === BIN).data), bin)
})
