import test from "node:test"
import assert from "node:assert/strict"
import { VRMMaterialsV0CompatPlugin } from "@pixiv/three-vrm-materials-v0compat"
import {
  buildGlb,
  parseGlb,
  patchGlb,
  srgbHexToLinear,
} from "../src/workbench/glb.js"

// Use the installed VRM loader, not a test-side imitation of our exporter.
test("edited skin colors survive actual VRM0 loader conversion without a second gamma transform", async () => {
  for (const color of [
    "#a96d49",
    "#c89470",
    "#422b22",
    "#010a1f",
    "#ffffff",
    "#000000",
  ]) {
    const json = {
      asset: { version: "2.0" },
      materials: [
        { pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 0.7] } },
      ],
      extensions: {
        VRM: {
          materialProperties: [
            {
              name: "skin",
              shader: "VRM/MToon",
              vectorProperties: {
                _Color: [1, 1, 1, 0.7],
                _ShadeColor: [1, 1, 1, 1],
              },
            },
          ],
        },
      },
    }
    const exported = parseGlb(
      patchGlb(buildGlb({ json, chunks: [] }), { colors: { 0: color } }),
    ).json
    const expected = srgbHexToLinear(color)
    const pbr = [...exported.materials[0].pbrMetallicRoughness.baseColorFactor]
    const plugin = new VRMMaterialsV0CompatPlugin({ json: exported })
    await plugin.beforeRoot()
    const imported = exported.materials[0]
    for (let i = 0; i < 3; i++) {
      assert.ok(
        Math.abs(
          imported.pbrMetallicRoughness.baseColorFactor[i] - expected[i],
        ) < 1e-7,
        `${color} channel${i} changes after VRM0 loading`,
      )
      assert.ok(
        Math.abs(
          imported.extensions.VRMC_materials_mtoon.shadeColorFactor[i] -
            expected[i] * 0.8,
        ) < 1e-7,
        `${color} shade changes after VRM0 loading`,
      )
      assert.equal(pbr[i], expected[i], "glTF fallback must remain linear")
    }
    assert.equal(
      imported.pbrMetallicRoughness.baseColorFactor[3],
      0.7,
      "alpha is not gamma encoded",
    )
  }
})
test("VRM1 and plain glTF continue using linear colors", () => {
  const json = {
    asset: { version: "2.0" },
    materials: [
      {
        pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 0.5] },
        extensions: { VRMC_materials_mtoon: { shadeColorFactor: [1, 1, 1] } },
      },
    ],
  }
  const out = parseGlb(
    patchGlb(buildGlb({ json, chunks: [] }), { colors: { 0: "#a96d49" } }),
  ).json
  const rgb = srgbHexToLinear("#a96d49")
  assert.deepEqual(out.materials[0].pbrMetallicRoughness.baseColorFactor, [
    ...rgb,
    0.5,
  ])
  assert.deepEqual(
    out.materials[0].extensions.VRMC_materials_mtoon.shadeColorFactor,
    rgb.map((v) => v * 0.8),
  )
})
