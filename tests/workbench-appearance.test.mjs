import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  describeAppearance,
  colorGroup,
  setHairVisibility,
} from "../src/workbench/appearance.js"
const bytes = readFileSync(
  new URL("../public/workbench-assets/human-hair-male.vrm", import.meta.url),
)
const json = JSON.parse(
  bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
)
const appearance = describeAppearance(json)
assert.deepEqual(
  appearance.groups.map((g) => [g.id, g.indices]),
  [
    ["skin", [5, 9]],
    ["eyes", [2]],
    ["hair", [13]],
    ["brows", [0]],
  ],
)
assert.deepEqual(appearance.hairMeshes, [2])
assert.equal(
  appearance.faceFeatures.find((f) => f.key === "0:21").label,
  "Mouth · raised",
)
assert.equal(
  appearance.faceFeatures.some((f) => f.key === "0:23"),
  false,
  "Expression-bound phoneme must not become permanent face control",
)
assert.equal(
  appearance.faceFeatures.some((f) => f.key === "0:11"),
  false,
  "Expression-bound blink must remain preview-only",
)
assert.deepEqual(colorGroup({ 2: "#123456" }, [5, 9], "#abcdef"), {
  2: "#123456",
  5: "#abcdef",
  9: "#abcdef",
})
assert.deepEqual(
  colorGroup({ 2: "#123456", 5: "#abcdef", 9: "#abcdef" }, [5, 9], null),
  { 2: "#123456" },
)
assert.deepEqual(setHairVisibility([0], [2], false), [0, 2])
assert.deepEqual(setHairVisibility([0, 2], [2], true), [0])
const anonymous = describeAppearance({
  materials: [{ name: "Body" }, { name: "Hair" }],
  meshes: [{ primitives: [{ material: 0 }, { material: 1 }] }],
})
assert.equal(
  anonymous.groups.length,
  0,
  "Unknown material names must not receive guessed semantic mappings",
)
assert.equal(anonymous.hairMeshes.length, 0)
const named = describeAppearance({
  nodes: [{ mesh: 0 }],
  meshes: [
    {
      extras: {
        targetNames: [
          "Identity_JawWidth",
          "Identity_ChinLength",
          "Identity_NoseWidth",
        ],
      },
    },
  ],
})
assert.deepEqual(
  named.identityFeatures.map((f) => f.label),
  ["Jaw width", "Chin length", "Nose width"],
)
assert.ok(named.identityFeatures.every((f) => f.min === -1 && f.max === 1))
const derivativeBytes = readFileSync(
  new URL(
    "../public/workbench-assets/human-face-controls.vrm",
    import.meta.url,
  ),
)
const derivativeJson = JSON.parse(
  derivativeBytes
    .subarray(20, 20 + derivativeBytes.readUInt32LE(12))
    .toString(),
)
const derivative = describeAppearance(derivativeJson)
assert.deepEqual(
  derivative.identityFeatures.map((f) => f.key),
  ["0:39", "0:40", "0:41"],
)
assert.equal(derivative.faceFeatures.length, appearance.faceFeatures.length)
console.log(
  "Appearance controls: verified source mappings, no expression collisions, grouped changes, hair visibility, unknown-model fallback, identity labels pass.",
)

const baldJson = structuredClone(json)
for (const node of baldJson.nodes) if (node.mesh === 2) delete node.mesh
const bald = describeAppearance(baldJson)
assert.deepEqual(bald.hairMeshes, [])
assert.equal(
  bald.groups.some((g) => g.id === "hair"),
  false,
  "Export with removed hair cannot promise restorable geometry",
)
