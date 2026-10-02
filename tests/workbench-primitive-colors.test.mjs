import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { parseGlb, buildGlb, patchGlb } from "../src/workbench/glb.js"
import {
  patchPrimitiveColors,
  validatePrimitiveColors,
  materialHasExpressionBindings,
} from "../src/workbench/primitive-colors.js"
const source = fs.readFileSync(
  new URL(
    "../public/workbench-assets/human-face-controls.vrm",
    import.meta.url,
  ),
)

test("real VRM hair primitive receives independent mint tint while shared UV siblings retain originals", () => {
  const d = parseGlb(source),
    before = structuredClone(d.json),
    bin = d.chunks.find((c) => c.type === 0x004e4942).data.slice()
  assert.ok(d.json.meshes[2].primitives.length > 100)
  const primitive = d.json.meshes[2].primitives[0],
    originalMaterial = primitive.material
  const { colorsByNewMaterial, sourceMaterialByNewMaterial } =
    patchPrimitiveColors(d, { "2:0": "#B9DDC9" })
  assert.deepEqual(colorsByNewMaterial, {
    [before.materials.length]: "#b9ddc9",
  })
  assert.equal(primitive.material, before.materials.length)
  assert.deepEqual(sourceMaterialByNewMaterial, {
    [before.materials.length]: originalMaterial,
  })
  assert.equal(
    d.json.materials.at(-1).extras.characterStudioSourceName,
    before.materials[originalMaterial].name,
  )
  assert.deepEqual(
    d.json.materials.slice(0, before.materials.length),
    before.materials,
  )
  assert.deepEqual(
    d.json.extensions.VRM.materialProperties.slice(0, before.materials.length),
    before.extensions.VRM.materialProperties,
  )
  assert.deepEqual(
    d.json.materials.at(-1).pbrMetallicRoughness.baseColorTexture,
    before.materials[originalMaterial].pbrMetallicRoughness.baseColorTexture,
  )
  assert.equal(
    d.json.materials.at(-1).name,
    d.json.extensions.VRM.materialProperties.at(-1).name,
  )
  assert.deepEqual(d.json.textures, before.textures)
  assert.deepEqual(d.json.images, before.images)
  assert.deepEqual(d.chunks.find((c) => c.type === 0x004e4942).data, bin)
  assert.deepEqual(
    d.json.meshes[2].primitives.slice(1),
    before.meshes[2].primitives.slice(1),
  )
  const result = parseGlb(
    patchGlb(buildGlb(d), { colors: colorsByNewMaterial }),
  )
  assert.deepEqual(result.json.skins, before.skins)
  assert.deepEqual(result.json.nodes, before.nodes)
  assert.deepEqual(
    result.json.extensions.VRM.blendShapeMaster,
    before.extensions.VRM.blendShapeMaster,
  )
  const linearRed = ((185 / 255 + 0.055) / 1.055) ** 2.4
  assert.ok(
    Math.abs(
      result.json.extensions.VRM.materialProperties.at(-1).vectorProperties
        ._Color[0] **
        2.2 -
        linearRed,
    ) < 1e-10,
  )
  assert.deepEqual(
    result.json.meshes[2].primitives[0].attributes,
    before.meshes[2].primitives[0].attributes,
  )
})

test("multiple selections split independently with unique names and cloned VRM1 material extensions", () => {
  const d = {
    json: {
      materials: [
        {
          name: "Hair",
          pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
          extensions: {
            VRMC_materials_mtoon: { shadeColorFactor: [0.5, 0.5, 0.5] },
          },
        },
      ],
      meshes: [{ primitives: [{ material: 0 }, { material: 0 }] }],
    },
  }
  const { colorsByNewMaterial } = patchPrimitiveColors(d, {
    "0:0": "#112233",
    "0:1": "#aabbcc",
  })
  assert.deepEqual(colorsByNewMaterial, { 1: "#112233", 2: "#aabbcc" })
  assert.notEqual(d.json.materials[1].name, d.json.materials[2].name)
  d.json.materials[1].extensions.VRMC_materials_mtoon.shadeColorFactor[0] = 0.9
  assert.equal(
    d.json.materials[0].extensions.VRMC_materials_mtoon.shadeColorFactor[0],
    0.5,
  )
  assert.equal(
    d.json.materials[2].extensions.VRMC_materials_mtoon.shadeColorFactor[0],
    0.5,
  )
})

test("expression-bound material colors/transforms are refused and invalid maps cannot partially mutate source", () => {
  for (const expression of [
    { materialColorBinds: [{ material: 0 }] },
    { textureTransformBinds: [{ material: 0 }] },
  ]) {
    const d = {
      json: {
        materials: [{ name: "Hair" }],
        meshes: [{ primitives: [{ material: 0 }] }],
        extensions: {
          VRMC_vrm: { expressions: { preset: { happy: expression } } },
        },
      },
    }
    assert.equal(materialHasExpressionBindings(d.json, 0), true)
    assert.throws(
      () => patchPrimitiveColors(d, { "0:0": "#aabbcc" }),
      /expression/,
    )
    assert.equal(d.json.materials.length, 1)
  }
  const d = {
    json: {
      materials: [{ name: "Hair" }],
      meshes: [{ primitives: [{ material: 0 }] }],
      extensions: {
        VRM: {
          materialProperties: [{ name: "Hair" }],
          blendShapeMaster: {
            blendShapeGroups: [{ materialValues: [{ materialName: "Hair" }] }],
          },
        },
      },
    },
  }
  assert.throws(
    () => patchPrimitiveColors(d, { "0:0": "#aabbcc" }),
    /expression/,
  )
  delete d.json.extensions
  assert.throws(
    () => patchPrimitiveColors(d, { "0:0": "#aabbcc", "0:9": "#aabbcc" }),
    /source/,
  )
  assert.equal(d.json.materials.length, 1)
  assert.equal(d.json.meshes[0].primitives[0].material, 0)
  assert.throws(() => validatePrimitiveColors({ "-1:0": "#aabbcc" }), /index/)
  assert.throws(() => validatePrimitiveColors({ "0:0": "mint" }), /color/)
  assert.throws(
    () =>
      validatePrimitiveColors(
        Object.fromEntries(
          Array.from({ length: 129 }, (_, i) => [`0:${i}`, "#aabbcc"]),
        ),
      ),
    /maximum/,
  )
})

test("successive part splits retain the source semantic name and preserve custom extras", () => {
  const d = {
    json: {
      materials: [
        {
          name: "Hair / Part 0:0",
          extras: { characterStudioSourceName: "Hair", custom: "kept" },
        },
      ],
      meshes: [{ primitives: [{ material: 0 }] }],
    },
  }
  const result = patchPrimitiveColors(d, { "0:0": "#b9ddc9" })
  assert.deepEqual(result.sourceMaterialByNewMaterial, { 1: 0 })
  assert.deepEqual(d.json.materials[1].extras, {
    characterStudioSourceName: "Hair",
    custom: "kept",
  })
  assert.equal(d.json.materials[0].name, "Hair / Part 0:0")
})
