import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { parseGlb, patchGlb, srgbHexToLinear } from "../src/workbench/glb.js"
import { validateProject, DEFAULT_PROJECT } from "../src/workbench/project.js"
import { describeAppearance } from "../src/workbench/appearance.js"
const source = fs.readFileSync(
  new URL(
    "../public/workbench-assets/human-face-controls.vrm",
    import.meta.url,
  ),
)
const png = {
  name: "paint.png",
  mimeType: "image/png",
  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
}
test("painted hair and isolated section retain shared shade image, explicit shade ratios and semantic controls", () => {
  const src = parseGlb(source).json,
    primitive = src.meshes[2].primitives[0],
    index = primitive.material,
    ratio = [0.72, 0.66, 0.83]
  const project = validateProject({
    ...DEFAULT_PROJECT,
    kind: "library",
    textures: { [index]: png },
    colors: { [index]: "#ffffff" },
    paintShadeRatios: { [index]: ratio },
    primitiveColors: { "2:0": "#b9ddc9" },
  })
  assert.equal(project.version, 2)
  const out = parseGlb(patchGlb(source, project)).json,
    newIndex = out.meshes[2].primitives[0].material
  for (const i of [index, newIndex]) {
    const legacy = out.extensions.VRM.materialProperties[i],
      texture = out.materials[i].pbrMetallicRoughness.baseColorTexture.index
    assert.equal(legacy.textureProperties._MainTex, texture)
    assert.equal(legacy.textureProperties._ShadeTexture, texture)
    assert.equal(out.images[out.textures[texture].source].name, png.name)
    const base = srgbHexToLinear(i === index ? "#ffffff" : "#b9ddc9")
    legacy.vectorProperties._ShadeColor
      .slice(0, 3)
      .forEach((value, j) =>
        assert.ok(Math.abs(value ** 2.2 - base[j] * ratio[j]) < 1e-7),
      )
  }
  assert(
    describeAppearance(out)
      .groups.find((g) => g.id === "hair")
      .indices.includes(newIndex),
  )
  assert(describeAppearance(out).hairMeshes.includes(2))
  assert.deepEqual(out.extensions.VRM.meta, src.extensions.VRM.meta)
})
test("schema rejects malformed new edits and preserves old projects", () => {
  assert.equal(validateProject(DEFAULT_PROJECT).version, 1)
  for (const paintShadeRatios of [
    { 0: [-1, 0, 0] },
    { 0: [1, 2, 3] },
    { bad: [1, 1, 1] },
    { 0: [1, 1] },
  ])
    assert.throws(() =>
      validateProject({ ...DEFAULT_PROJECT, paintShadeRatios }),
    )
  assert.throws(() =>
    validateProject({
      ...DEFAULT_PROJECT,
      primitiveColors: { "2:bad": "#ffffff" },
    }),
  )
  const p = validateProject({
    ...DEFAULT_PROJECT,
    kind: "library",
    sculpt: { 0: { 3: [0.001, 0, 0] } },
    primitiveColors: { "2:0": "#abcdef" },
    paintShadeRatios: { 13: [0.8, 0.7, 0.8] },
  })
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))), p)
})
