export const PROJECT_SCHEMA = "character-studio/project"
export const MAX_SOURCE_BYTES = 50 * 1024 * 1024
export const MAX_TEXTURE_BYTES = 8 * 1024 * 1024
export const MAX_TOTAL_TEXTURE_BYTES = 16 * 1024 * 1024
export const MAX_TEXTURE_DIMENSION = 4096
export const MAX_OUTPUT_BYTES = MAX_SOURCE_BYTES + MAX_TOTAL_TEXTURE_BYTES
export const DEFAULT_SPIRIT_PARAMETERS = Object.freeze({
  bodyWidth: 1,
  bodyHeight: 1,
  bodyDepth: 0.55,
  earHeight: 0.28,
  eyeSize: 0.13,
  footSize: 0.19,
  fragment: true,
  bodyColor: "#9badab",
  accentColor: "#b9ddc9",
})
export const DEFAULT_PROJECT = Object.freeze({
  schema: PROJECT_SCHEMA,
  version: 1,
  name: "Untitled character",
  assetId: "spirit",
  kind: "spirit",
  parameters: DEFAULT_SPIRIT_PARAMETERS,
  colors: {},
  textures: {},
  morphs: {},
  scale: [1, 1, 1],
  hiddenMeshes: [],
})

const clone = (value) => {
  if (Array.isArray(value)) return value.map(clone)
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    )
  return value // Immutable source strings are shared across history, never serialized again.
}
const equal = (a, b) =>
  a === b ||
  (a !== null &&
    b !== null &&
    typeof a === "object" &&
    typeof b === "object" &&
    Array.isArray(a) === Array.isArray(b) &&
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(
      (key) => Object.hasOwn(b, key) && equal(a[key], b[key]),
    ))
const fail = (message) => {
  throw new Error(message)
}
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value)
const text = (value, field, max) =>
  typeof value === "string" &&
  value.length <= max &&
  !/[\u0000-\u001f]/.test(value)
    ? value
    : fail(`Invalid ${field}`)
const finite = (value, min, max, field) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max
    ? value
    : fail(`Invalid ${field}: expected ${min}–${max}`)
const hex = (value, field) =>
  typeof value === "string" && /^#[\da-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : fail(`Invalid ${field}: expected #RRGGBB`)
const base64Size = (data, maxBytes, label) => {
  if (
    typeof data !== "string" ||
    data.length === 0 ||
    data.length % 4 ||
    data.length > Math.ceil(maxBytes / 3) * 4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(data)
  )
    fail(`Invalid or oversized ${label} data`)
  const bytes =
    (data.length / 4) * 3 -
    (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0)
  if (bytes > maxBytes) fail(`${label} exceeds its size limit`)
  return bytes
}
const PARAMETER_RANGES = {
  bodyWidth: [0.1, 4],
  bodyHeight: [0.1, 4],
  bodyDepth: [0.1, 4],
  earHeight: [0, 3],
  eyeSize: [0.01, 1],
  footSize: [0.01, 2],
}

function checkedDimensions(width, height) {
  if (
    !width ||
    !height ||
    width > MAX_TEXTURE_DIMENSION ||
    height > MAX_TEXTURE_DIMENSION
  )
    fail("Texture dimensions must be between 1 and 4096 pixels on each side")
}

function validateImageHeader(texture) {
  if (texture.mimeType === "image/png") {
    const bytes = Uint8Array.from(atob(texture.data.slice(0, 44)), (char) =>
      char.charCodeAt(0),
    )
    const signature = [137, 80, 78, 71, 13, 10, 26, 10]
    if (
      bytes.length < 33 ||
      !signature.every((byte, i) => bytes[i] === byte) ||
      String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
    )
      fail("Texture does not have a valid PNG signature")
    const view = new DataView(bytes.buffer)
    if (view.getUint32(8) !== 13) fail("Invalid PNG dimension header")
    checkedDimensions(view.getUint32(16), view.getUint32(20))
    return
  }
  const bytes = Uint8Array.from(atob(texture.data), (char) =>
    char.charCodeAt(0),
  )
  if (
    bytes.length < 4 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes[2] !== 255
  )
    fail("Texture does not have a valid JPEG signature")
  const frameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ])
  for (let offset = 2; offset < bytes.length; ) {
    if (bytes[offset++] !== 0xff) fail("Invalid JPEG marker header")
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === 0xda || marker === 0xd9 || marker === undefined) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > bytes.length) fail("Truncated JPEG header")
    const length = bytes[offset] * 256 + bytes[offset + 1]
    if (length < 2 || offset + length > bytes.length)
      fail("Invalid JPEG segment length")
    if (frameMarkers.has(marker)) {
      if (length < 8) fail("Truncated JPEG dimension header")
      checkedDimensions(
        bytes[offset + 5] * 256 + bytes[offset + 6],
        bytes[offset + 3] * 256 + bytes[offset + 4],
      )
      return
    }
    offset += length
  }
  fail("JPEG dimension header is missing")
}

/** Material-scoped raster overrides, bounded independently of the source model. */
export function validateTextures(input = {}) {
  if (!isObject(input)) fail("Invalid textures map")
  const entries = Object.entries(input)
  if (entries.length > 128) fail("Too many texture edits (maximum 128)")
  let total = 0
  const result = {}
  for (const [index, texture] of entries) {
    if (!/^(0|[1-9]\d{0,5})$/.test(index) || !isObject(texture))
      fail("Invalid texture material index")
    if (!["image/png", "image/jpeg"].includes(texture.mimeType))
      fail("Textures must be PNG or JPEG")
    total += base64Size(
      texture.data,
      MAX_TEXTURE_BYTES,
      "Texture (maximum 8 MiB)",
    )
    if (total > MAX_TOTAL_TEXTURE_BYTES) fail("Combined textures exceed 16 MiB")
    validateImageHeader(texture)
    result[index] = {
      name: text(texture.name, "texture name", 255),
      mimeType: texture.mimeType,
      data: texture.data,
    }
  }
  return result
}

/** Validate untrusted JSON before the UI resolves an asset from its local registry. */
export function validateProject(input) {
  if (
    !isObject(input) ||
    input.schema !== PROJECT_SCHEMA ||
    input.version !== 1
  )
    fail("Unsupported character project format")
  if (!["library", "import", "spirit"].includes(input.kind))
    fail("Invalid project kind")
  const result = {
    schema: PROJECT_SCHEMA,
    version: 1,
    name: text(input.name, "name", 160),
    assetId: text(input.assetId, "assetId", 200),
    kind: input.kind,
    parameters: {},
    colors: {},
    textures: {},
    morphs: {},
    scale: [1, 1, 1],
    hiddenMeshes: [],
  }
  if (!result.name.trim() || !result.assetId)
    fail("Project name and assetId are required")
  for (const field of ["parameters", "colors", "morphs"]) {
    if (input[field] !== undefined && !isObject(input[field]))
      fail(`Invalid ${field}`)
  }
  for (const [key, value] of Object.entries(input.parameters || {})) {
    if (key === "bodyColor" || key === "accentColor")
      result.parameters[key] = hex(value, key)
    else if (key === "fragment")
      result.parameters[key] =
        typeof value === "boolean"
          ? value
          : fail("Invalid fragment: expected true or false")
    else if (Object.hasOwn(PARAMETER_RANGES, key))
      result.parameters[key] = finite(value, ...PARAMETER_RANGES[key], key)
    else fail(`Unknown spirit parameter: ${key}`)
  }
  if (input.kind === "spirit")
    result.parameters = { ...DEFAULT_SPIRIT_PARAMETERS, ...result.parameters }
  result.textures = validateTextures(input.textures)
  if (input.kind === "spirit" && Object.keys(result.textures).length)
    fail("Spirit textures are not supported; use the spirit palette controls")
  const colors = Object.entries(input.colors || {})
  const morphs = Object.entries(input.morphs || {})
  if (colors.length > 2048 || morphs.length > 8192)
    fail("Too many material or morph edits")
  for (const [key, value] of colors) {
    if (!/^(0|[1-9]\d{0,5})$/.test(key)) fail("Invalid material index")
    result.colors[key] = hex(value, "material color")
  }
  for (const [key, value] of morphs) {
    if (!/^(0|[1-9]\d{0,5}):(0|[1-9]\d{0,4})$/.test(key))
      fail("Invalid morph index")
    result.morphs[key] = finite(value, -1, 1, "morph weight")
  }
  if (input.scale !== undefined) {
    if (!Array.isArray(input.scale) || input.scale.length !== 3)
      fail("Invalid scale")
    result.scale = input.scale.map((value) => finite(value, 0.25, 3, "scale"))
  }
  if (input.hiddenMeshes !== undefined) {
    if (
      !Array.isArray(input.hiddenMeshes) ||
      input.hiddenMeshes.length > 100000 ||
      input.hiddenMeshes.some(
        (value) => !Number.isSafeInteger(value) || value < 0 || value > 999999,
      )
    )
      fail("Invalid hidden mesh indices")
    result.hiddenMeshes = [...new Set(input.hiddenMeshes)]
  }
  if (input.source !== undefined) {
    if (input.kind === "spirit" || !isObject(input.source))
      fail("Embedded source is only valid for imported or library characters")
    const { name, data } = input.source
    base64Size(data, MAX_SOURCE_BYTES, "embedded GLB (maximum 50 MiB)")
    result.source = { name: text(name, "source filename", 255), data }
  }
  if (input.kind === "import" && !result.source)
    fail("Imported project is missing its original GLB source")
  if (input.provenance !== undefined) {
    if (!isObject(input.provenance)) fail("Invalid asset provenance")
    result.provenance = {}
    for (const key of ["author", "license", "source", "licenseUrl"]) {
      if (input.provenance[key] !== undefined)
        result.provenance[key] = text(
          input.provenance[key],
          `provenance ${key}`,
          2048,
        )
    }
  }
  return result
}

/** History values never alias callers' objects. Commit once per completed gesture. */
export function createHistory(initial, limit = 50) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 200)
    fail("Invalid history limit")
  return { current: clone(initial), past: [], future: [], limit }
}
export function commitHistory(history, next) {
  if (equal(history.current, next)) return history
  return {
    current: clone(next),
    past: [...history.past, clone(history.current)].slice(-history.limit),
    future: [],
    limit: history.limit,
  }
}
export function undoHistory(history) {
  if (!history.past.length) return history
  return {
    current: clone(history.past.at(-1)),
    past: history.past.slice(0, -1),
    future: [clone(history.current), ...history.future],
    limit: history.limit,
  }
}
export function redoHistory(history) {
  if (!history.future.length) return history
  return {
    current: clone(history.future[0]),
    past: [...history.past, clone(history.current)].slice(-history.limit),
    future: history.future.slice(1),
    limit: history.limit,
  }
}

/** Stable seeded design exploration; returns only the spirit parameters. */
export function createSpiritVariant(seed) {
  let state = 2166136261
  for (const char of String(seed))
    state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
  const range = (min, max) =>
    Math.round((min + random() * (max - min)) * 100) / 100
  const palette = ["#92eac0", "#f0bb84", "#99bced", "#cbaceb", "#e99eb7"]
  return {
    bodyWidth: range(0.7, 1.3),
    bodyHeight: range(0.75, 1.4),
    bodyDepth: range(0.55, 1),
    earHeight: range(0.15, 0.65),
    eyeSize: range(0.07, 0.16),
    footSize: range(0.13, 0.3),
    fragment: random() >= 0.25,
    bodyColor: "#273537",
    accentColor: palette[Math.floor(random() * palette.length)],
  }
}
