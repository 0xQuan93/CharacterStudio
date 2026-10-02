import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { generateVariation } from "../src/workbench/generator.js"
import { describeAppearance } from "../src/workbench/appearance.js"

function appearanceFor(file) {
  const bytes = readFileSync(
    new URL(`../public/workbench-assets/${file}`, import.meta.url),
  )
  return describeAppearance(
    JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()),
  )
}
const appearance = appearanceFor("human-face-controls.vrm")
const project = {
  kind: "library",
  colors: { 100: "#123456" },
  morphs: { "0:0": 0.2, "5:8": 0.8 },
  textures: { 13: { data: "opaque-original-data" } },
  sculpt: [{ radius: 0.04 }],
  hiddenMeshes: [2],
  source: { data: "unchanged" },
}
const before = JSON.stringify(project)
const patch = generateVariation(project, appearance, "quan-study-42")
assert.deepEqual(
  patch,
  generateVariation(project, { appearance }, "quan-study-42"),
)
assert.notDeepEqual(
  patch,
  generateVariation(project, appearance, "different-seed"),
)
assert.equal(
  JSON.stringify(project),
  before,
  "Input project must remain immutable",
)
assert.equal(patch.colors[100], "#123456", "Unrelated material color preserved")
assert.equal(patch.morphs["0:0"], 0.2, "Expression values are not randomized")
assert.equal(patch.morphs["5:8"], 0.8, "Other morph values preserved")
for (const key of [
  "textures",
  "sculpt",
  "hiddenMeshes",
  "source",
  "parameters",
])
  assert.equal(key in patch, false, `Patch must not overwrite ${key}`)
for (const feature of appearance.identityFeatures)
  assert.ok(
    patch.morphs[feature.key] >= -0.55 && patch.morphs[feature.key] <= 0.55,
  )
const skin = appearance.groups.find((g) => g.id === "skin")
assert.equal(
  patch.colors[skin.indices[0]],
  patch.colors[skin.indices[1]],
  "Face/body share chosen tone",
)
assert.deepEqual(
  patch,
  generateVariation(
    project,
    {
      ...appearance,
      groups: [...appearance.groups].reverse(),
      identityFeatures: [...appearance.identityFeatures].reverse(),
    },
    "quan-study-42",
  ),
  "Descriptor ordering cannot change the recipe",
)
assert.deepEqual(
  generateVariation(project, {}, "42"),
  {},
  "Unknown avatars receive no guessed bindings",
)
const noIdentity = appearanceFor("humanoid-expansion/human-hair-female.vrm")
const female = generateVariation(project, noIdentity, 12)
assert.equal(
  "morphs" in female,
  false,
  "Unbound facial expression parts are not anatomy",
)
assert.ok(female.colors)
assert.deepEqual(
  generateVariation(
    project,
    {
      identityFeatures: [{ key: "0:0", min: -1, max: 1 }],
      names: { "0:0": "Face_Fcl_EYE_Angry" },
    },
    "any",
  ),
  {},
  "Only exact authored identity names are eligible",
)
for (const seed of [null, undefined, {}, Infinity, NaN])
  assert.throws(() => generateVariation(project, appearance, seed), /seed/i)
const spirit = generateVariation(
  { kind: "spirit", parameters: { custom: true } },
  {},
  "spirit-12",
)
assert.equal(spirit.parameters.custom, true)
assert.equal(typeof spirit.parameters.fragment, "boolean")
assert.deepEqual(
  spirit,
  generateVariation(
    { kind: "spirit", parameters: { custom: true } },
    {},
    "spirit-12",
  ),
)
console.log(
  "PASS: deterministic semantic color/identity generation, bounds, expression exclusion, state preservation, spirit variation",
)
