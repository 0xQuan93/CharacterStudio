import assert from "node:assert/strict"
import { test } from "node:test"
import {
  sculptStroke,
  sculptNeighbors,
  applySculptOffsets,
  validateSculptOffsets,
  recalculateNormals,
} from "../src/workbench/sculpt.js"

const positions = new Float32Array([-1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0])
const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])
const indices = new Uint16Array([0, 1, 3, 1, 2, 3])
const base = {
  positions,
  normals,
  indices,
  center: [-1, 0, 0],
  radius: 0.5,
  strength: 1,
  maxDisplacement: 0.12,
}

test("localized inflate changes only selected bind-space vertices and leaves source immutable", () => {
  const result = sculptStroke(base)
  assert.deepEqual(Object.keys(result), ["0"])
  assert.ok(Math.abs(result[0][2] - 0.1) < 1e-7)
  const output = applySculptOffsets(positions, result)
  assert.ok(output[2] > 0)
  assert.equal(positions[2], 0)
  assert.equal(output[5], 0)
})
test("repeated strokes obey total displacement limit", () => {
  let offsets = {}
  for (let i = 0; i < 20; i++) offsets = sculptStroke({ ...base, offsets })
  assert.ok(Math.hypot(...offsets[0]) <= 0.12 + 1e-9)
})
test("mirrored move has equal opposite x offsets without doubling centre stroke", () => {
  const result = sculptStroke({
    ...base,
    mode: "move",
    direction: [1, 0, 0],
    symmetry: true,
  })
  assert.equal(result[0][0], -result[2][0])
  const centre = sculptStroke({ ...base, center: [0, 0, 0], symmetry: true })
  assert.equal(centre[1][2], 0.1)
  assert.equal(centre[1][0], 0)
  const wide = sculptStroke({
    ...base,
    mode: "move",
    center: [0, 0, 0],
    radius: 2,
    direction: [1, 0, 0],
    symmetry: true,
  })
  assert.equal(wide[0][0], -wide[2][0])
  assert.equal(wide[1], undefined)
})
test("mask locks separate face parts and obeys partial membership", () => {
  const result = sculptStroke({
    ...base,
    center: [0, 0, 0],
    radius: 2,
    vertexMask: [0, 0.5, 0, 0],
  })
  assert.deepEqual(Object.keys(result), ["1"])
  assert.equal(result[1][2], 0.12)
  assert.deepEqual(sculptStroke({ ...base, vertexMask: [0, 0, 0, 0] }), {})
})
test("delta smoothing preserves authored shape when no sculpt exists", () => {
  assert.deepEqual(sculptStroke({ ...base, mode: "smooth", radius: 2 }), {})
  const before = { 1: [0, 0, 0.1] }
  const result = sculptStroke({
    ...base,
    mode: "smooth",
    center: [0, 0, 0],
    radius: 2,
    offsets: before,
  })
  assert.ok(result[1][2] < 0.1)
  assert.ok(result[0][2] > 0)
  assert.equal(before[1][2], 0.1)
  assert.deepEqual(sculptNeighbors(4, indices)[1], [0, 3, 2])
})
test("malformed edits, adjacency and non-finite input reject before corrupting output", () => {
  assert.throws(() => validateSculptOffsets({ 4: [0, 0, 0] }, 4), /absent/)
  assert.throws(() => validateSculptOffsets({ 0: [NaN, 0, 0] }, 4), /Invalid/)
  assert.throws(() => sculptStroke({ ...base, maxDisplacement: 0 }), /limit/)
  assert.throws(
    () => sculptStroke({ ...base, positions: [0, 0, Infinity] }),
    /positions/,
  )
  assert.throws(() => sculptNeighbors(3, [0, 1, 7]), /index/)
  assert.throws(
    () =>
      sculptStroke({ ...base, mode: "smooth", neighbors: [[9], [], [], []] }),
    /adjacency/,
  )
})
test("normals accumulate triangles across shared primitives and retain unreferenced fallback", () => {
  const p = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 8, 8, 8])
  const n = recalculateNormals(
    p,
    [0, 1, 2, 0, 3, 1],
    new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0]),
  )
  assert.ok(Math.abs(n[1] - Math.SQRT1_2) < 1e-7)
  assert.ok(Math.abs(n[2] - Math.SQRT1_2) < 1e-7)
  assert.deepEqual(Array.from(n.slice(12)), [1, 0, 0])
  assert.throws(() => recalculateNormals(p, [0, 1, 50]), /index/)
})
