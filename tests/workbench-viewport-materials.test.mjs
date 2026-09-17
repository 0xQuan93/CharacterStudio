import test from "node:test"
import assert from "node:assert/strict"
import * as THREE from "three"
import { MToonMaterial } from "@pixiv/three-vrm"
import { Viewport } from "../src/workbench/viewport.js"
test("all-accent material keeps its detached painter base synchronized and restores source on reset", () => {
  const mat = new MToonMaterial(),
    originalMap = new THREE.Texture()
  mat.color.set("#997766")
  mat.shadeColorFactor.set("#776655")
  mat.map = originalMap
  mat.userData = {
    workbenchIndex: 0,
    originalMap,
    originalColor: mat.color.clone(),
    originalShade: mat.shadeColorFactor.clone(),
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), mat)
  mesh.userData.workbenchPrimitive = "0:0"
  const root = new THREE.Group()
  root.add(mesh)
  const view = Object.create(Viewport.prototype)
  view.root = root
  view.textureCache = new Map()
  view.project = {
    colors: { 0: "#191716" },
    primitiveColors: { "0:0": "#b9ddc9" },
    paintShadeRatios: { 0: [0.7, 0.8, 0.9] },
    textures: {},
  }
  view.applyColors(true)
  assert.notEqual(mesh.material, mat)
  assert.equal(mesh.material.color.getHexString(), "b9ddc9")
  assert.equal(
    mat.color.getHexString(),
    "191716",
    "Painter base must not inherit section tint",
  )
  view
    .textureShadeRatio(0)
    .forEach((v, i) => assert.ok(Math.abs(v - [0.7, 0.8, 0.9][i]) < 1e-8))
  const replacement = new THREE.Texture()
  view.textureCache.set(0, { data: "stub", texture: replacement })
  view.project.textures = { 0: { data: "stub" } }
  view.applyTextures()
  assert.equal(mesh.material.map, replacement)
  assert.equal(
    mat.map,
    replacement,
    "Detached original receives current painted bitmap",
  )
  view.project = {
    colors: {},
    textures: {},
    primitiveColors: {},
    paintShadeRatios: {},
  }
  view.applyColors(true)
  view.applyTextures()
  assert.equal(mesh.material, mat)
  assert.equal(mat.color.getHexString(), "997766")
  assert.equal(mat.map, originalMap)
  mesh.geometry.dispose()
  mat.dispose()
  replacement.dispose()
  originalMap.dispose()
})
