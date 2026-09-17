# Character Studio: local avatar workshop architecture

> Dated research snapshot. See the current [product specification](../PRODUCT-SPEC.md) and [verification ledger](../VERIFICATION.md) for implementation and acceptance that occurred after the initial audit. Local workspace paths below identify inspected copies; this document does not publish or relicense private companion code.
Audit: 2026-09-17. Read-only inspection of `/home/oxquan/Work/repos/CharacterStudio`, upstream baseline `293182b`; app source was not modified by this audit. This is a specification and source inspection, not a claim that untested engine paths work.

## Recommendation

Keep Character Studio as the browser assembly, identity editing and export workbench. Use Blender/MPFB as the asset authoring and conversion station, and PoseLab as the performance/scene station. Build one compatible, legally reusable starter family before acquiring large catalogs. An arbitrary CC0 hair mesh does not automatically fit, deform with, or export alongside an unrelated VRM body.

The quickest useful application foundation is a **versioned project recipe with recoverable local saves, complete edit history and asset provenance**, then continuous controls for authored identity morphs. This makes every subsequent tool reusable across Quan, Quiet Frequency, WavID and future characters. Current upstream has useful assembly primitives but is not already a VRoid-style shape authoring system.

## Actual installed capabilities

Paths in this table are relative to `/home/oxquan/Work/repos/CharacterStudio/`.

| Area | Present code/API | Gap or important limitation |
|---|---|---|
| Engine | React 19, Three.js 0.183, `@pixiv/three-vrm` 3.5; `src/library/characterManager.js`, `src/context/SceneContext.jsx` | The manager owns imperative scene state. UI state and edited materials are not a single serializable document. |
| Modular bodies/hair/clothes | `CharacterManager.loadTrait(group, id, collection)`, `loadCustomTrait(group, url)`, `removeTrait`; `CharacterManifestData.js`, `manifestDataManager.js` | Parts need compatible scale, humanoid rig, bind pose and bone naming. Required groups and pair restrictions exist; universal auto-fit does not. |
| Body and face shape | `loadBlendShapeTrait`, `_loadBlendShapeTrait`, `toggleBinaryBlendShape` around lines 667–1107 | Existing preset selection turns morph influences on/off as 1/0. It does not supply VRoid-style continuous identity controls or author missing geometry. |
| Expression | `src/components/Emotions.jsx`, `emotionManager`, `blinkManager.js`, `lipsync.js` | Emotion preview already has intensity and constant mode. Identity morphs must be separated from blink, viseme and transient emotion channels. |
| Colors | `setTraitColor` around line 878; ChromePicker in `src/pages/Appearance.jsx` | Applies at trait-group scope, not semantically named material regions. Current scalar-versus-array material handling is brittle: branch inspects `mesh.material.type`, then other branch assumes `mesh.material[0].uniforms`. Inspect and repair before relying on modern MToon material support. |
| Texture import | `loadCustomTexture` around line 854 and local upload/drop in `Appearance.jsx` | Replaces textures on group children. No evidenced UV brush, layered paint document, pressure processing, seam painting or material-scoped texture selection. Upload URL lifetime is not durable project storage. |
| JSON selection | `getAvatarSelection()` around line 378; NFT attribute JSON import in `Appearance.jsx` and `JsonAttributes.jsx` | Selection output is only `{group: {name, id}}`; omits collection identity, custom geometry, colors, textures, morphs and rights. Existing NFT JSON is not a complete editable project. |
| Stored avatar | `storeCurrentAvatar()` / `loadStoredAvatar()` around line 999 | One shallow in-memory snapshot. Restore explicitly has `TO DO, ALSO GET COLOR TRAITS AND TEXTURE TRAITS`; not persistent save/load or undo. |
| Undo/redo | No implementation found in source search | Needs a command/document layer, bounded history, transaction coalescing for slider drags and awaited restores. |
| Animation | `animationManager.js`: `loadAnimation`, `pause`, `setSpeed`; FBX and glTF loaders, Mixamo retargeting | Preview infrastructure exists. Do not promise native VRMA import or authoring timeline from this inspection. PoseLab already owns scene/posing work. |
| Export | `downloadVRM`, `downloadGLB`; `download-utils.js`, `merge-geometry.js`, `components/ExportMenu.jsx` | Visible export menu offers VRM 0 and GLB; internal output-version switch exists. GLB manager path contains a TODO log. Each format/version needs independent round-trip acceptance. |
| Export metadata | `vrmMetaUtils.js` merges input model metadata with supplied metadata; `CharacterManifestData.js` forwards `downloadOptions.vrmMeta` | Existing source permissions must survive. Merge implementation is not a general license solver; particularly do not replace restricted demo rights with CC0 because app code is MIT. Needs visible identity/credit fields and provenance receipt. |
| Optimization | Atlas options in `ExportMenu.jsx`, merge/bake handling in `merge-geometry.js`, optimizer page and model statistics | Verify morph preservation and identity baking: merge code can keep/remove/bake morphs. A pretty viewport alone does not establish a valid deforming export. |
| Catalog installed | `public/local-studio/manifest.json`, `public/starter-assets` | Current local catalog is the Anata demo. No complete unrestricted Quan starter or general face/body target library is established by this audit. |

## Reference creator workflows

| Reference | Verified workflow | What to borrow |
|---|---|---|
| [VRoid Studio](https://vroid.com/en/studio) | Presets plus shape sliders; outfit templates/layering; direct 3D and UV texture painting with layers and pressure; stroke-created hair with editable shape and bounce | Domain tabs for Face, Body, Hair, Outfit, Materials, Expression, Export. Immediate preview, understandable controls and reset-per-control. The site offers Windows/macOS/iPad, not native Linux. Treat as UX inspiration, not an open-source asset library. |
| [VRoid export documentation](https://vroid.pixiv.help/hc/en-us/articles/15760756822297-I-want-to-learn-more-about-the-VRM-export-feature) | Editable `.vroid` project is distinct from exported `.vrm`; VRM cannot be directly reimported as an editable VRoid project. Export offers polygon/material/bone reduction. | Keep our editable recipe distinct from delivery VRM. Export neutral expression while preserving expression definitions; expose target-specific export budgets. |
| [MPFB character creation](https://static.makehumancommunity.org/mpfb/docs/characters/creating.html), [rigging](https://static.makehumancommunity.org/mpfb/docs/characters/rig.html), [preset saving](https://static.makehumancommunity.org/mpfb/docs/characters/saving.html) | Blender-based character construction, rig configuration and separate character presets | Use as authoring sidecar for topology, shape targets and fitted garments; import prepared avatar packs into Character Studio. Do not embed Python/GPL implementation into the MIT browser app without a deliberate license decision. |
| [MakeHuman/MPFB generator reuse FAQ](https://static.makehumancommunity.org/mpfb/faq/build_other_chargen.html) | Explicitly permits taking base mesh, targets and system asset pack to build another generator; core assets are CC0 | Strong candidate for a genuinely reusable parametric base. Conversion of targets, rig, materials and fit relationships remains engineering work. |

[MakeHuman's license page](https://static.makehumancommunity.org/about/license.html) distinguishes CC0 core assets from MPFB GPL and MakeHuman AGPL source. Community assets require their own checks; the core license does not confer a blanket license over unrelated downloads.

## Minimum durable document contract

Use schema `characterstudio.project/1` and make it independent of UI implementation:

- Stable project id, character name, schema version, created/modified dates, app version.
- Catalog identifier/version and base family (rig/topology compatibility identifier).
- Slot selections with collection/trait id, content hash and source reference.
- Per-material edits addressed by stable material id; explicit sRGB colors and texture asset references.
- Identity parameters addressed by semantic id and their authored asset bindings; finite validated ranges.
- Binary variant selections separate from identity parameters and expression preview state.
- Embedded or sidecar local assets with size/hash/type; never persist ephemeral `blob:` URLs as usable files.
- Authorship, source URL, exact license identifier/text reference, attribution, derivative modifications and embedded VRM permissions per included asset.
- Export preset and optional camera state. Animation/temporary facial previews should not silently become neutral identity geometry.

Start with JSON recipes that reference installed immutable local packs; add zipped portable bundles or IndexedDB blobs for custom uploads. Reject unresolved references with actionable diagnostics, rather than silently substituting or partially restoring. Autosave should be distinct from explicit named project exports.

## Staged implementation and acceptance

### 1. Workshop foundation

Add project Save/Open/New, local recovery, Undo/Redo, named materials, catalog/license inspector, front/side/back framing and a simple preset library. Wrap existing mutation APIs with document transactions. Ensure asynchronous loads commit in order and an old load cannot overwrite a newer selection. Display only working controls for the selected base.

Acceptance: choose body and hair; recolor two materials; select a shape preset; save; reload page; reopen and compare every edited field; undo/redo across part replacement; fail clearly for a missing asset. Export and import into PoseLab; verify rig, visible shape, texture and source metadata. Existing demo must remain marked as restricted.

### 2. Reusable parametric starter family

Choose licensed source base, authored topology/rig and skin weights, then add a modest audited set of identity targets (face width/length, jaw, nose, eye spacing, brow, shoulders, torso and limb proportions). Define min/max, defaults and incompatibilities. Convert the target library to glTF morphs or versioned delta assets. Propagate changes to eyes/teeth/clothes and adjust rig rest positions where necessary. Simply scaling bones is not a substitute for authored identity and garment fitting.

Acceptance: extreme and mixed sliders maintain eyes/teeth placement, avoid clothing penetration for supported combinations, preserve humanoid animation and survive VRM export. Include an automated shape/export fixture and visual front/profile/pose checks. Quan-specific face and swept mint-fringe hair are assets/presets on this family, not hardcoded app behavior.

### 3. Outfit/material authoring

Add semantic material zones, PNG import/export, UV template view, 2D layer painting with undo and compositing, then 3D raycast-to-UV painting. Add masks to hide body under clothes and outfit layering/compatibility rules. Small tested packs should include fitting shapes and material schemas, not just raw mesh downloads.

Acceptance: texture round trip without UV inversion, color-space regression or missing alpha; masks remain correct in bending poses; exported atlas preserves paint and transparency.

### 4. Hair and accessory authoring

Start with modular front/back/side/clump presets and independent base/fringe/highlight materials. Add transformable bone-bound accessories. Later add curve-driven hair mesh generation, UV/taper controls, spring chains and collision setup. Full VRoid-style drawn hair is a major geometry tool, not a toggle in the current engine.

Acceptance: Quan silhouette matches approved world references at front and three-quarter views; mint fringe edits independently; motion behaves in PoseLab without head penetration; spring metadata survives export.

### 5. Cross-project delivery

Provide VRM/PoseLab, GLB/world and portrait/sprite presets with measured triangles, materials, texture memory and file size. Keep authoring sources and compatible pack tooling separate from generated runtime deliverables. A local connector can launch PoseLab and reveal the export location; genuine automatic import needs an explicit agreed API in PoseLab.

## Scope boundary

This audit does not establish a production-ready asset family, test all upstream export code or implement VRoid parity. The most valuable near-term result is a dependable local workflow and reusable pack/document contract, followed by one verified open asset family. Painting, fitted parametric clothing and drawn hair should be delivered as named milestones with working acceptance scenes, rather than claimed through an expanded menu alone.
