import test from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_PROJECT,
  MAX_TEXTURE_BYTES,
  validateTextures,
  validateProject,
  createHistory,
  commitHistory,
  undoHistory,
  redoHistory,
  createSpiritVariant,
} from "../src/workbench/project.js"
import { buildGlb, parseGlb, patchGlb } from "../src/workbench/glb.js"

const fixture = () => ({
  json: {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { mesh: 0, weights: [0.2], skin: 0, children: [1] },
      { name: "hips" },
    ],
    skins: [{ joints: [1] }],
    meshes: [{ primitives: [{ targets: [{ POSITION: 0 }] }], weights: [0.2] }],
    materials: [
      {
        pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 0.6] },
        extensions: {
          VRMC_materials_mtoon: { shadeColorFactor: [0.5, 0.5, 0.5] },
        },
      },
    ],
    extensions: {
      VRM: {
        meta: { author: "Original creator", licenseName: "CC_BY" },
        materialProperties: [{ vectorProperties: { _Color: [1, 1, 1, 0.6] } }],
      },
      VRMC_vrm: {
        meta: { authors: ["Original creator"], allowRedistribution: false },
      },
    },
    extras: { retained: "yes" },
  },
  chunks: [
    { type: 0x004e4942, data: new Uint8Array([1, 2, 3, 4]) },
    { type: 0x12345678, data: new Uint8Array([7, 8, 9, 10]) },
  ],
})

test("document validation bounds edits and forbids incomplete external source references", () => {
  const project = validateProject({
    ...DEFAULT_PROJECT,
    parameters: createSpiritVariant("quan"),
  })
  assert.equal(project.schema, DEFAULT_PROJECT.schema)
  assert.throws(
    () => validateProject({ ...project, scale: [1, NaN, 1] }),
    /Invalid scale/,
  )
  assert.throws(
    () => validateProject({ ...project, parameters: { unknown: 3 } }),
    /Unknown/,
  )
  assert.throws(
    () => validateProject({ ...project, colors: { 0: "red" } }),
    /color/,
  )
  assert.throws(
    () => validateProject({ ...project, morphs: { "0:0": 1.1 } }),
    /weight/,
  )
  assert.throws(
    () => validateProject({ ...project, kind: "import" }),
    /missing/,
  )
  assert.throws(
    () =>
      validateProject({
        ...project,
        kind: "import",
        source: { name: "x.glb", data: "https://example.com" },
      }),
    /embedded/,
  )
  assert.equal(
    validateProject({
      ...project,
      kind: "import",
      source: { name: "x.glb", data: "Z2xURg==" },
    }).source.name,
    "x.glb",
  )
  assert.equal(
    validateProject({
      ...project,
      kind: "library",
      source: { name: "x.glb", data: "Z2xURg==" },
      provenance: { author: "Quan", license: "CC0" },
    }).provenance.license,
    "CC0",
  )
})

test("history branches, bounds memory entries and owns independent snapshots", () => {
  const initial = { value: 0 }
  let history = createHistory(initial, 2)
  initial.value = 100
  assert.equal(history.current.value, 0)
  for (let i = 1; i <= 3; i++) history = commitHistory(history, { value: i })
  assert.equal(history.past.length, 2)
  history = undoHistory(history)
  assert.equal(history.current.value, 2)
  assert.equal(redoHistory(history).current.value, 3)
  history = commitHistory(history, { value: 9 })
  assert.equal(history.future.length, 0)
  assert.equal(undoHistory(history).current.value, 2)
})

test("seeded spirit variants are stable, varied and valid", () => {
  assert.deepEqual(createSpiritVariant("quan"), createSpiritVariant("quan"))
  assert.notDeepEqual(
    createSpiritVariant("quan"),
    createSpiritVariant("zephyr"),
  )
  for (let seed = 0; seed < 100; seed++)
    validateProject({
      ...DEFAULT_PROJECT,
      parameters: createSpiritVariant(seed),
    })
})

test("spirit carries at most one optional fragment, represented by a boolean", () => {
  assert.equal(
    validateProject({ ...DEFAULT_PROJECT, parameters: {} }).parameters
      .bodyWidth,
    1,
  )
  for (const fragment of [true, false])
    assert.equal(
      validateProject({ ...DEFAULT_PROJECT, parameters: { fragment } })
        .parameters.fragment,
      fragment,
    )
  for (const fragment of [0, 1, 2, 0.5, "true", null])
    assert.throws(
      () => validateProject({ ...DEFAULT_PROJECT, parameters: { fragment } }),
      /Invalid fragment/,
    )
  for (let seed = 0; seed < 20; seed++)
    assert.equal(typeof createSpiritVariant(seed).fragment, "boolean")
})

test("GLB edit round trip preserves binary chunks, extensions, rights and rig references", () => {
  const original = buildGlb(fixture())
  const result = parseGlb(
    patchGlb(original, {
      colors: { 0: "#808080" },
      morphs: { "0:0": 0.75 },
      scale: [1.2, 1.1, 1],
    }),
  )
  const source = parseGlb(original)
  assert.deepEqual(result.chunks.slice(1), source.chunks.slice(1))
  assert.deepEqual(
    result.json.extensions.VRMC_vrm.meta,
    source.json.extensions.VRMC_vrm.meta,
  )
  assert.deepEqual(
    result.json.extensions.VRM.meta,
    source.json.extensions.VRM.meta,
  )
  assert.deepEqual(result.json.skins, source.json.skins)
  assert.equal(result.json.nodes[0].skin, 0)
  assert.deepEqual(result.json.nodes[2], {
    name: "Character Studio proportions",
    scale: [1.2, 1.1, 1],
    children: [0],
  })
  assert.deepEqual(result.json.scenes[0].nodes, [2])
  assert.equal(result.json.meshes[0].weights[0], 0.75)
  assert.equal(result.json.nodes[0].weights[0], 0.75)
  const factor = result.json.materials[0].pbrMetallicRoughness.baseColorFactor
  assert.ok(Math.abs(factor[0] - 0.2158605) < 0.000001)
  assert.equal(factor[3], 0.6)
  assert.equal(
    result.json.extensions.VRM.materialProperties[0].vectorProperties._Color[3],
    0.6,
  )
  assert.deepEqual(result.json.extras, source.json.extras)
})

test("malformed GLB, external dependencies and nonexistent edit targets fail explicitly", () => {
  const input = buildGlb(fixture())
  assert.throws(() => parseGlb(input.slice(0, -1)), /size/)
  assert.throws(() => parseGlb(new Uint8Array([1, 2, 3])), /header/)
  const external = fixture()
  external.json.images = [{ uri: "https://example.com/private.png" }]
  assert.throws(() => parseGlb(buildGlb(external)), /External/)
  assert.throws(() => patchGlb(input, { colors: { 5: "#ffffff" } }), /absent/)
  assert.throws(() => patchGlb(input, { morphs: { "0:9": 0.5 } }), /absent/)
  assert.deepEqual(parseGlb(patchGlb(input, {})).json, parseGlb(input).json)
})

test("hidden parts keep skeleton node indices and children intact", () => {
  const source = fixture()
  source.json.animations = [
    {
      channels: [
        { target: { node: 0, path: "weights" }, sampler: 0 },
        { target: { node: 1, path: "rotation" }, sampler: 1 },
      ],
      samplers: [
        { input: 0, output: 1 },
        { input: 0, output: 2 },
      ],
    },
  ]
  source.json.extensions.VRM.blendShapeMaster = {
    blendShapeGroups: [
      { name: "blink", binds: [{ mesh: 0, index: 0, weight: 100 }] },
    ],
  }
  source.json.extensions.VRMC_vrm.expressions = {
    preset: { blink: { morphTargetBinds: [{ node: 0, index: 0, weight: 1 }] } },
  }
  const result = parseGlb(
    patchGlb(buildGlb(source), { hiddenMeshes: [0] }),
  ).json
  assert.equal(result.nodes[0].mesh, undefined)
  assert.equal(result.nodes[0].skin, undefined)
  assert.equal(result.nodes[0].weights, undefined)
  assert.deepEqual(result.nodes[0].children, [1])
  assert.deepEqual(result.skins, source.json.skins)
  assert.deepEqual(result.extensions.VRM.meta, source.json.extensions.VRM.meta)
  assert.deepEqual(
    result.extensions.VRMC_vrm.meta,
    source.json.extensions.VRMC_vrm.meta,
  )
  assert.equal(
    result.extensions.VRM.blendShapeMaster.blendShapeGroups[0].binds,
    undefined,
  )
  assert.equal(
    result.extensions.VRMC_vrm.expressions.preset.blink.morphTargetBinds,
    undefined,
  )
  assert.equal(result.animations[0].channels.length, 1)
  assert.equal(result.animations[0].channels[0].target.path, "rotation")
  assert.throws(
    () => validateProject({ ...DEFAULT_PROJECT, hiddenMeshes: [-1] }),
    /Invalid hidden/,
  )
  assert.deepEqual(
    validateProject({ ...DEFAULT_PROJECT, hiddenMeshes: [0, 0] }).hiddenMeshes,
    [0],
  )
})

test("VRM expression-bound morphs cannot be exported as persistent identity edits", () => {
  const legacy = fixture()
  legacy.json.extensions.VRM.blendShapeMaster = {
    blendShapeGroups: [{ binds: [{ mesh: 0, index: 0, weight: 100 }] }],
  }
  assert.throws(
    () => patchGlb(buildGlb(legacy), { morphs: { "0:0": 0.5 } }),
    /preview-only/,
  )
  const modern = fixture()
  modern.json.extensions.VRMC_vrm.expressions = {
    custom: { smile: { morphTargetBinds: [{ node: 0, index: 0, weight: 1 }] } },
  }
  assert.throws(
    () => patchGlb(buildGlb(modern), { morphs: { "0:0": 0.5 } }),
    /preview-only/,
  )
})

const pngTexture = {
  name: "painted.png",
  mimeType: "image/png",
  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7X8AAAAASUVORK5CYII=",
}

test("painted PNG appends embedded bytes without changing source data, UV transforms, or permissions", () => {
  const source = fixture()
  source.json.buffers = [{ byteLength: 4, name: "Original geometry buffer" }]
  source.json.bufferViews = [{ buffer: 0, byteOffset: 0, byteLength: 4 }]
  source.json.images = [{ bufferView: 0, mimeType: "image/png" }]
  source.json.textures = [{ source: 0, sampler: 0 }]
  source.json.samplers = [{ wrapS: 33071, wrapT: 33071 }]
  source.json.materials[0].pbrMetallicRoughness.baseColorTexture = {
    index: 0,
    texCoord: 1,
    extensions: { KHR_texture_transform: { offset: [0.2, 0.3] } },
  }
  source.json.meshes[0].primitives[0].material = 0
  source.json.meshes[0].primitives[0].attributes = { TEXCOORD_1: 0 }
  const original = buildGlb(source)
  const result = parseGlb(patchGlb(original, { textures: { 0: pngTexture } }))
  const binary = result.chunks.find((chunk) => chunk.type === 0x004e4942).data
  const image = result.json.images[1]
  const bufferView = result.json.bufferViews[image.bufferView]
  assert.deepEqual(binary.slice(0, 4), new Uint8Array([1, 2, 3, 4]))
  assert.deepEqual(
    result.chunks.find((chunk) => chunk.type === 0x12345678).data,
    new Uint8Array([7, 8, 9, 10]),
  )
  assert.equal(bufferView.byteOffset % 4, 0)
  assert.deepEqual(
    binary.slice(
      bufferView.byteOffset,
      bufferView.byteOffset + bufferView.byteLength,
    ),
    new Uint8Array(Buffer.from(pngTexture.data, "base64")),
  )
  assert.equal(
    result.json.buffers[0].byteLength,
    bufferView.byteOffset + bufferView.byteLength,
  )
  assert.equal(result.json.buffers[0].name, "Original geometry buffer")
  assert.deepEqual(
    result.json.materials[0].pbrMetallicRoughness.baseColorTexture,
    {
      ...source.json.materials[0].pbrMetallicRoughness.baseColorTexture,
      index: 1,
    },
  )
  assert.equal(result.json.textures[1].sampler, 0)
  assert.equal(
    result.json.extensions.VRM.materialProperties[0].textureProperties._MainTex,
    1,
  )
  assert.deepEqual(
    result.json.extensions.VRM.meta,
    source.json.extensions.VRM.meta,
  )
  assert.deepEqual(
    result.json.extensions.VRMC_vrm.meta,
    source.json.extensions.VRMC_vrm.meta,
  )
  assert.deepEqual(result.json.bufferViews[0], source.json.bufferViews[0])
})

test("texture input requires signatures, per-image/total bounds and supported material keys", () => {
  assert.deepEqual(validateTextures({ 0: pngTexture })[0], pngTexture)
  assert.deepEqual(
    validateProject({
      ...DEFAULT_PROJECT,
      kind: "library",
      textures: { 0: pngTexture },
    }).textures[0],
    pngTexture,
  )
  assert.throws(
    () => validateProject({ ...DEFAULT_PROJECT, textures: { 0: pngTexture } }),
    /Spirit textures/,
  )
  assert.throws(
    () => validateTextures({ 0: { ...pngTexture, mimeType: "image/jpeg" } }),
    /JPEG signature/,
  )
  assert.throws(
    () => validateTextures({ 0: { ...pngTexture, mimeType: "image/svg+xml" } }),
    /PNG or JPEG/,
  )
  assert.throws(() => validateTextures({ "-1": pngTexture }), /index/)
  assert.throws(
    () =>
      validateTextures({
        0: {
          ...pngTexture,
          data: Buffer.alloc(MAX_TEXTURE_BYTES + 1).toString("base64"),
        },
      }),
    /oversized|size limit/,
  )
  const large = Buffer.alloc(6 * 1024 * 1024)
  Buffer.from(pngTexture.data, "base64").copy(large)
  const largeTexture = { ...pngTexture, data: large.toString("base64") }
  assert.throws(
    () =>
      validateTextures({ 0: largeTexture, 1: largeTexture, 2: largeTexture }),
    /16 MiB/,
  )
  assert.throws(
    () =>
      validateTextures(
        Object.fromEntries(
          Array.from({ length: 129 }, (_, i) => [i, pngTexture]),
        ),
      ),
    /maximum 128/,
  )
  assert.throws(
    () => patchGlb(buildGlb(fixture()), { textures: { 50: pngTexture } }),
    /absent/,
  )
  const unwrapped = fixture()
  unwrapped.json.meshes[0].primitives[0].material = 0
  assert.throws(
    () => patchGlb(buildGlb(unwrapped), { textures: { 0: pngTexture } }),
    /needs UV channel/,
  )
})

test("a source without binary data gains one aligned BIN chunk for a texture", () => {
  const source = {
    json: { asset: { version: "2.0" }, materials: [{}] },
    chunks: [],
  }
  const output = parseGlb(
    patchGlb(buildGlb(source), { textures: { 0: pngTexture } }),
  )
  assert.equal(output.chunks.length, 2)
  assert.equal(output.chunks[1].type, 0x004e4942)
  assert.equal(output.json.bufferViews[0].byteOffset, 0)
  assert.equal(output.json.images[0].mimeType, "image/png")
  assert.equal(
    output.json.materials[0].pbrMetallicRoughness.baseColorTexture.index,
    0,
  )
})

test("portable texture images are dimension-bounded before any browser decoding", () => {
  const png = Buffer.from(pngTexture.data, "base64")
  png.writeUInt32BE(4097, 16)
  assert.throws(
    () =>
      validateTextures({ 0: { ...pngTexture, data: png.toString("base64") } }),
    /4096 pixels/,
  )
  png.writeUInt32BE(0, 16)
  assert.throws(
    () =>
      validateTextures({ 0: { ...pngTexture, data: png.toString("base64") } }),
    /4096 pixels/,
  )
  png.writeUInt32BE(4096, 16)
  assert.ok(
    validateTextures({ 0: { ...pngTexture, data: png.toString("base64") } }),
  )
  // SOI, APP segment, baseline SOF: precision 8, height 1, width 4096.
  const jpeg = Buffer.from([
    255, 216, 255, 224, 0, 4, 0, 0, 255, 192, 0, 11, 8, 0, 1, 16, 0, 1, 1, 17,
    0, 255, 217,
  ])
  const texture = {
    name: "test.jpg",
    mimeType: "image/jpeg",
    data: jpeg.toString("base64"),
  }
  assert.ok(validateTextures({ 0: texture }))
  jpeg[16] = 1
  assert.throws(
    () =>
      validateTextures({ 0: { ...texture, data: jpeg.toString("base64") } }),
    /4096 pixels/,
  )
  assert.throws(
    () =>
      validateTextures({
        0: {
          ...texture,
          data: Buffer.from([255, 216, 255, 217]).toString("base64"),
        },
      }),
    /dimension header/,
  )
})
