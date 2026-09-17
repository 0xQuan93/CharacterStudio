# WEARHAUS / 3DHAUS reuse audit

> Dated research snapshot. See the current [product specification](../PRODUCT-SPEC.md) and [verification ledger](../VERIFICATION.md) for implementation and acceptance that occurred after the initial audit. Local workspace paths below identify inspected copies; this document does not publish or relicense private companion code.
Inspected 2026-09-17, read-only source audit. No runtime/build acceptance claimed. Existing WEARHAUS changes preserved. Downloaded a clean shallow checkout of private `0xQuan93/3DHAUS` to `/home/oxquan/Work/repos/3DHAUS`, commit `f17349dfd6bb52425c2c77982818033d2e30f3e5`. No dependencies installed and no application files modified.

## Decision

**3DHAUS is the actual WEARHAUS Studio the user remembered.** It is a substantial React/Three.js garment editor with useful implemented texture composition, constrained garment shaping, fit preview, validation, and DCL packaging. Use it as the separate garment workshop initially. CharacterStudio remains the full-avatar VRM assembly/export application; PoseLab remains posing/staging. Extract small renderer-independent modules only after working interchange proves the need.

`repos/WEARHAUS` is a different project: a Decentraland SDK7 social/fashion venue, useful for eventual scene staging, not avatar generation.

## Most useful implemented 3DHAUS features

Paths below are relative to `/home/oxquan/Work/repos/3DHAUS`.

| Feature | Evidence | Integration value |
|---|---|---|
| Layered image/text/gradient texture authoring | `src/editor/textureComposer.ts:58`, `src/utils/fill.ts`, `src/components/Canvas2DPreview.tsx`, `FillEditor.tsx`, `LayerControls.tsx` | Strongest first reuse: export composited base/emissive PNGs and apply to compatible avatar garments. Front/back printable boxes and shirt-axis transforms are model-specific calibration, not universal UV coordinates. |
| Actual garment shape sliders | `src/three/shapeDeformer.ts:31`, invoked in `src/three/Viewer.tsx:291` and `:442` | Changes width/length/taper/height with clearance, opening pins and weight repair. Requires material selection, DCL category geometry, and existing skin/rig; not a human-face sculptor or arbitrary avatar-body generator. |
| Existing-rig weight repair | `src/three/shapeDeformer.ts:499` | Restores imported baseline attributes each pass, checks `isSkinnedMesh`, then heuristically repaints affected garment regions. Useful reference for constrained clothing sliders; no automatic binding of unrigged mesh. |
| Fit mannequin and pose preview | `src/three/fitTester.ts:51`, `src/three/fitAnimations.ts`, `Viewer.tsx:262` | Body capsules and pose/emote diagnostics are real, but approximate clearance checks rather than cloth simulation. |
| GLB / DCL ZIP intake | `src/dcl/importWearableAsset.ts`, `src/three/importInspection.ts`, `src/security/uploadLimits.ts` | Asset inventory, bounded file intake, skeleton/UV/material/bounds diagnostics; adapt generic metrics to a future common inspector. DCL readiness labels must not become VRM readiness labels. |
| Wearable validation and packaging | `src/dcl/wearableValidation.ts`, `wearablePackage.ts`; call sites `src/App.tsx:2216`, `:2381`, `:2418` | DCL-specific target adapter: separate BaseMale/BaseFemale review and wearable.json assembly. Keep separate from VRM validation/export. |
| GLB export | `src/three/glbExport.ts:29`, called `src/App.tsx:2262` | Exports actual top-level nodes and omits invisible preview helpers. **Not a VRM exporter:** `includeCustomExtensions: false` at line 66 would discard VRM extension data. Do not route VRM avatar round trips through it. |
| Provenance and project state | `README.md` Aggregation/Provenance; `src/App.tsx` | Records source, license notes, creator, rights attestation, review, queue snapshots. Useful data contract, though attestation is not an asset license. Imported custom model bytes are not embedded in project saves. |

The app has real execution paths; it is not just a mock screen. However README descriptions and standalone source capability need distinguishing from integrated UI.

## Implemented library code that is not a proven user workflow

`src/three/retrofitConversionEngine.ts:43` combines cleanup, UV preparation and representation generation. Repository-wide reference search found **no import/call of this conversion entry point from App or Viewer**. `geometryCleanup.ts` and `dclRepresentationEngine.ts` are used by that unconnected entry point; `uvMaterialPrep.ts` inspection is used by `retrofitPipeline.ts` diagnostics. Do not advertise one-click conversion from those files alone.

`dclRepresentationEngine.ts:45` really implements nearest-source-vertex weight transfer, but requires a weighted source **and already bound target skeleton**, defaults to 8 cm projection distance and 98% coverage, and restores original weights when coverage fails. Its paired representation generator clones the source skeleton and applies category/gender deformation baselines; it does not construct a new correct male/female skeleton or guarantee fitting.

`geometryCleanup.ts` handles finite positions, invalid/degenerate indexed triangles, normal/weight cleanup. `uvMaterialPrep.ts` offers box-projected review UVs. These are not production retopology, semantic segmentation, UV unwrapping or texture baking. README explicitly acknowledges missing arbitrary-mesh rigging and reliable AI-to-DCL conversion.

## Assets and licenses

3DHAUS contains **53 valid GLBs totaling 25,659,132 bytes**: 33 garment models under `public/models` and 20 emote models under `public/dcl/emotes` (catalog at `public/dcl/emotes/catalog.json`). Models include male/female jackets, pullovers, shirts, skirts, cargo shorts, joggers and shoes. They are useful local inspection candidates; they are not yet verified reusable open assets.

No root license was found; GitHub reports `license: null`. Its AGENTS and README explicitly describe a **private internal** tool. All 53 GLBs lack an embedded `asset.copyright` field; absence of that field conveys no license. Catalog/source files do not provide per-asset grants or origins sufficient to classify them as CC0/open. Keep private source and bundled assets private, and obtain/trace individual source grants before including them in a redistributable avatar catalog. The application’s UI rights checkbox cannot establish these grants.

This is not a request to delay local technical work: local evaluation and interoperability can proceed; label bundled assets `unverified/private` and avoid marketing them as the open starter pack. Do not relicense private code merely because it lives in Quan’s account.

## Compatibility boundaries and recommended implementation

1. **Run alongside first.** Add a local WearHaus Studio launcher as the garment workbench, preserving private status. Prove a catalog item loads, texture edits apply, GLB/PNG exports open again, and the scene has no new errors. This audit did not run that acceptance.
2. **Portable artifact handoff.** Use base/emissive PNG + explicit UV/template metadata for the first path. Garment GLB handoff needs rig matching, bind-pose checking, skin-weight compatibility and VRM metadata construction. Plain GLB is not automatically a wearable VRM trait.
3. **Shared manifest, separate target adapters.** Record asset ID, source URL, author, license identifier/text/hash, source file hash, rig/profile, units, materials/UV recipe, expressions/spring-bones when applicable, and export target. Preserve private/unverified vs redistribution-approved catalog flags.
4. **Small reusable modules.** Candidate extractions: image/layer data types, canvas texture composition, general geometry metrics and provenance schema. Keep DCL categories, `Avatar_*` bone assumptions, package URNs, body-shape heuristics and wearable limits in a DCL adapter. Adapt face/hair/body sliders around the selected VRM base’s authored morph targets rather than applying DCL garment heuristics globally.
5. **Avoid whole-app copy.** 3DHAUS uses React 18.3.1 / Three 0.164.1; installed CharacterStudio declares React 19.2.4 / Three 0.183.2. Three objects, materials, textures and JSX/components need explicit migration testing. `src/App.tsx` is about 221 KB; extraction should reduce coupling, not import a second monolith.
6. **Runtime risks to test.** Skin/bind pose under walk/arms-raised/squat, material/texture color-space correctness, invisible helper exclusion, export/reimport equality of vertex/skin counts, morph retention, VRM metadata and expressions/spring bones, custom binary persistence, and browser memory after repeated imports. No automated tests were found in the checkout. Read-only audit did not install/build or test browser flows.

## Separate WEARHAUS venue

Path `/home/oxquan/Work/repos/WEARHAUS`, origin `0xQuan93/WEARHAUS`, upstream `jb0gie/WEARHAUS`. Protected dirty state at audit: README.md, main.crdt, package.json modified; `scripts/patch-admin-toolkit.mjs` and its test untracked. None changed by this task.

Actual venue runtime is wired in `src/index.ts:169`: doors, light switching, fog, cloud motion, badge claim and identity access. Scene uses SDK7 ECS, not Three.js. `assets/scene/main.composite` stores scene layout. `src/lighting/director.ts` demonstrates priority/distance light budgeting (12 ambient, 16 party); `src/motion.ts` implements cloud float/sway. These are conceptually reusable staging behaviors, but a Three.js port needs deliberate adaptation and local visual review.

Inventory: **37 valid GLBs totaling 7,785,336 bytes**, 58 meshes, 6 skins and 16 animation clips. The skinned objects are doors, turntable, conveyor and jumbotron rather than human avatars. No VRM, FBX, Blender or OBJ files found. Venue assets such as `assets/scene/Models/WEARHAUS_stage/WEARHAUS_stage.glb`, booth, clothes rack and shoes rack could stage a local fashion preview. Many embed `Wearhaus | b0gie` or `b0gie` copyrights, and the repository has no root license. Treat them as private project scenery pending explicit asset rights, not an open avatar wardrobe.

## Evidence and limits

Inspected local AGENTS, source modules, manifests, README, source call sites, Git status, GitHub metadata and binary GLB JSON headers. Followed repository-required `wearhaus-code-audit` and `wearhaus-3d-asset-pipeline` skills, including its DCL/GLB/VRM reference. Shared-memory startup notes identify WEARHAUS as parked and were respected. Source facts above are implementation observations, not current certification against marketplace policy. No deployment, publication, broad file cleanup, model mutation or private-code redistribution occurred.

## Local companion installed and accepted (follow-up, 2026-09-17)

The companion recommendation is now implemented locally. **WearHaus 3D Studio runs at http://127.0.0.1:18993/** using Vite production preview bound only to loopback. `/home/oxquan/Work/avatar-tools/start-3dhaus.sh` performs a serialized, title-checked start with strict port and separate PID/log files; `/home/oxquan/Work/avatar-tools/open-3dhaus.sh` starts it then uses `omarchy launch webapp`. Omarchy’s normal `webapp install` created `~/.local/share/applications/WearHaus 3D Studio.desktop` and a local icon. The launcher is available through Super+Space. No boot service was added.

Verification performed:

- Locked `npm ci --no-audit --no-fund`, followed by `npm run build`: TypeScript and production Vite build passed. Build reported only its large-chunk advisory (about 1.09 MB minified JS, 294 KB gzip).
- Fresh Playwright/Chromium session entered the actual editor, waited for Ready, loaded the default long-sleeve garment, changed its base color to mint (`#99ffcc`), and visually verified the garment changed.
- Exported both the composited PNG texture and skinned GLB successfully. Binary inspection confirmed valid glTF 2 GLB length/header, one mesh, one skin and two images. This is garment-export verification, not VRM conversion acceptance.
- Final browser log reports zero page errors, console errors and failed requests. Screenshot visually shows the mint garment and usable release controls. Evidence: `avatar-tools/logs/3dhaus.png`, `3dhaus-browser.json`, `3dhaus-smoke-*.png`, `3dhaus-smoke-*.glb`; repeatable check `avatar-tools/check-3dhaus.cjs`.
- Shell syntax checks passed. Desktop file validation passed with only the stock Omarchy generator's redundant Name/Comment warning.
- Source git worktree remains clean at the audited commit. No application fixes, license changes or private assets copied to another catalog. Installed dependencies are about 178 MB and production dist about 27 MB.

The earlier no-runtime-acceptance limit is superseded for these specific checks. DCL ZIP marketplace acceptance, arbitrary mesh rigging, VRM conversion, imported-asset project reopening and emote fit coverage remain unverified. Repo-required `wearhaus-testing-release` and system `omarchy` skills were applied for this follow-up.
