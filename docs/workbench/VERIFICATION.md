# Workbench 0.1 verification ledger

Recorded 2026-09-17 during local acceptance. This ledger separates passing checks from unfinished checks; [PRODUCT-SPEC.md](PRODUCT-SPEC.md) describes the delivered scope and later roadmap. No deployment or public release is implied.

## Passing core checks

Command from the repository root:

```sh
node tests/workbench-core.test.mjs
```

[The test file](../../tests/workbench-core.test.mjs) currently passes all **12 checks**:

1. Project validation bounds edits and rejects missing/invalid embedded sources.
2. Undo/redo owns independent snapshots, limits history and clears a replaced redo branch.
3. Seeded spirit variants are reproducible and schema-valid.
4. Fragment presence is boolean, with at most one optional fragment; missing parameters normalize to defaults.
5. GLB color/morph/scale edits retain binary chunks, metadata, permissions and rig references.
6. Truncated/malformed GLBs, external image/buffer URLs and nonexistent edit targets fail explicitly.
7. Hidden parts remove mesh/skin/weight bindings without renumbering skeleton nodes; now-invalid expression/weight-animation references are pruned.
8. VRM expression-bound morphs cannot masquerade as persistent identity edits.
9. Painted PNGs append aligned image bytes while preserving original binary data, UV transforms, sampler and permissions.
10. Texture signatures, MIME types, material/UV compatibility, counts and individual/total byte limits are checked.
11. A binary-free source can gain a valid embedded texture BIN chunk.
12. PNG IHDR and JPEG SOF dimensions are bounded before browser decoding, including portable project intake.

Node reports a module-type warning because the upstream package does not declare ESM for `.js`; this does not fail these tests. The tests exercise data/export contracts and do not establish visual likeness, rig deformation quality or frame-rate performance.

## Production build

`npm run build` passed with a Vite large-chunk advisory. The recorded build includes both classic and workbench entry points. [Local build log](../../../../avatar-tools/logs/workbench-build.log). The final build is served by Vite production preview on loopback port18991. Managed stop/start and repeat launch were checked, and a fresh production browser smoke test rendered the spirit and all thumbnails without page errors or failed requests. The native launcher opened the production workbench successfully.

## Browser flow: completed rerun

The corrected [flow script](../../../../avatar-tools/check-workbench-flow.cjs) passes all **11 named flow steps**, including PoseLab VRM import, with zero page errors. The flow covers:

- Spirit width edit → Undo → Redo, seeded variation and boolean-fragment portable project.
- IndexedDB autosave restoration after reload; original spirit GLB export.
- Actual composited PNG from WearHaus 3D imported onto the human's compatible material.
- Painted human portable save, painted VRM export, switch back to the spirit project, reopen the human project and confirm its replacement texture survived.
- Separate tinted human VRM export and visible import into PoseLab.

Artifacts: [spirit project](../../../../avatar-tools/logs/spirit.avatar.json), [spirit GLB](../../../../avatar-tools/logs/workbench-spirit.glb), [painted project](../../../../avatar-tools/logs/human-painted.avatar.json), [human export](../../../../avatar-tools/logs/workbench-human.vrm), [painted human export](../../../../avatar-tools/logs/workbench-human-painted.vrm), and [export screenshot](../../../../avatar-tools/logs/workbench-human-export.png).

The initial run stopped at an exact-uppercase PoseLab filename selector. The case-insensitive selector fixed that test mismatch, and the complete rerun passed; the [current flow log](../../../../avatar-tools/logs/workbench-flow.log) contains the successful result. This establishes import, not exhaustive PoseLab posing/spring-bone behavior across all edits.

## Production edit round trip

The final production [editing check](../../../../avatar-tools/check-workbench-editing.cjs) passed unbound shape key6 (`mesh0:5`)→0.02, width1.01→Undo1→Redo1.01, hair mesh2 hide/show/hide, portable save and actual PNG download. Exported VRM JSON preserved avatar metadata/humanoid, retained morph0.02, added the scale wrapper and removed the hidden mesh node binding. Reimport visibly rendered the expected bald head and retained the shape edit with zero browser errors. [Evidence](../../../../avatar-tools/logs/workbench-editing-acceptance.json).

## Export conformance

The official Khronos `gltf-validator` package was installed in a temporary directory, without changing application dependencies. Actual browser-downloaded files were validated:

| Artifact | Errors | Warnings | Report truncated? |
|---|---:|---:|---|
| `workbench-human.vrm` | **0** | 133 | No |
| `workbench-human-painted.vrm` | **0** | 133 | No |

Reports: [human](../../../../avatar-tools/logs/workbench-human.vrm.validation.json), [painted human](../../../../avatar-tools/logs/workbench-human-painted.vrm.validation.json). Both runs ignore only the highly repetitive `ACCESSOR_JOINTS_USED_ZERO_WEIGHT` warning, so the stated warning count excludes that issue. Remaining warnings concern the legacy asset's extension/tangent/skin conventions; zero errors is not a claim of zero warnings or full VRM schema/runtime certification.

Prepared Robot, Bat, Slime and historical human source files all passed glTF validation with zero errors after optional skeleton-root repair. Color/scale and hidden-part exports also passed. Painted Bat and historical human outputs passed; texture overrides on Robot material 0 and Slime material 0 are correctly refused because those primitives lack the required UV channel.

The repair preserves source rights. The original historical human VRM is retained separately; edited files preserve binary geometry and metadata. Current local source hashes and conversion history are in [RECEIPT.json](../../public/workbench-assets/RECEIPT.json).

## Generic-asset visual correction and passing recheck

An independent library browser check found the converted Robot, Bat and Slime invisible even though triangle/clip counts loaded without page errors. Source inspection found a conversion error: materials had `BLEND` with zero base alpha. Matching upstream MTL files specify opaque materials. The converter now restores intended opacity from those original MTL values, and all three GLBs and receipts were regenerated.

Fresh-load visual checks now pass for **all five library entries** (original spirit plus four models). Robot, Bat and Slime visibly animate; successive-frame pixel differences over the per-channel threshold of 8 total 7,377, 45,360 and 32,374 respectively. The final run records zero page errors and failed requests, and the 390-pixel mobile layout fits the viewport. The [current library report](../../../../avatar-tools/logs/workbench-library-acceptance.json) records these results. Earlier grid-only screenshots identified the conversion defect and are not passing visual evidence. The regenerated sources retain zero glTF validation errors.

## Separate WearHaus 3D companion

The [WearHaus audit and follow-up](research/wearhaus-audit.md) records a passing production build, visible mint garment edit, composited PNG export, skinned GLB export and zero browser page/console/request errors. The workbench flow imported that actual PNG and exported a validated painted human VRM.

This proves file transfer, material application, project serialization and valid export. Applying a garment PNG to the human test model does **not** prove matching garment UVs, an artistically correct texture layout or garment integration. A real garment handoff must use the same UV template. It also does not establish arbitrary fitting, automatic rig conversion, DCL marketplace acceptance, VRM round trips through WearHaus, or redistribution rights for private bundled assets.

## Known limits and remaining acceptance

- PoseLab import and all starter visual/motion checks passed. Broader posed deformation, spring-bone behavior and cross-engine export appearance remain follow-up coverage.
- Replacement textures are limited to 8 MiB each, 16 MiB combined and 4096 pixels per axis. Embedded textures already inside imported GLB/VRM sources are not yet dimension-preflighted; a 50 MiB file limit does not bound decompressed or GPU memory.
- Source file input is capped at 50 MiB, portable project JSON at 96 MiB, generated GLB output at 66 MiB. Browser/hardware memory and sustained performance remain unbenchmarked.
- No complete sculpting, anatomical parameter generator, curve hair editor, integrated layer painter, universal wardrobe fitting or final Quan/Zephyr design has been delivered. Those remain explicit milestones in the product specification.

Update this ledger after future source or asset changes with actual rerun results and artifact links. Retain the distinction between structural validation, visible rendering and authored-asset quality.
