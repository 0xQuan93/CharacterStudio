# Character Studio: local avatar workbench

Product and technical specification · 2026-09-17 · workbench 0.1

## Purpose and completion standard

Build a reusable local creator for human avatars, creatures, robots and original companions. Quan's Quiet Frequency avatar and Zephyr are the first authored character families; future projects must reuse the same document, asset and export infrastructure rather than receive hardcoded forks.

The intended mature product combines approachable identity editing, original hair and outfit construction, painting, rig-aware deformation and reliable exports. Version 0.1 is the foundation and a useful source-preserving editor. It is not VRoid parity, an arbitrary mesh auto-rigger, a complete parametric human generator or a finished Quan likeness.

Success means a person can create a character, save its editable source and decisions, reopen it offline, make reversible changes, export for a known destination, and retain both appearance and the relevant rig/rights data. Asset count and menu count are not completion criteria.

## People and jobs

- **Quan / world author:** develop the approved Quiet Frequency silhouette and face, mint fringe, high collar, and coherent alternate outfits; produce a VRM, world GLB and portrait from the same project.
- **Companion designer:** create original blocky spirits and creatures with understandable parameters, stable proportions and reusable palettes; preserve Zephyr's established identity separately from exploratory variants.
- **Project developer:** consume compact validated runtime artifacts in PoseLab, Signal Walk, WavID habitats and local companion runtimes without depending on the authoring application's scene graph.
- **Asset author:** publish a licensed compatible pack containing geometry, fitting targets, rig profile, materials, thumbnails, provenance and acceptance fixtures.

The default flow is Library → Shape → Surface → Parts → Motion → Export. Tools only appear as available when the selected asset supplies the necessary geometry or the relevant authoring system exists. A facial expression key must not be called a body identity parameter.

## Status ledger

This document describes the implemented v0.1 in [main.jsx](../../src/workbench/main.jsx), [viewport.js](../../src/workbench/viewport.js), [project.js](../../src/workbench/project.js), [glb.js](../../src/workbench/glb.js), and [storage.js](../../src/workbench/storage.js). Source implementation and acceptance remain distinct. The production build, 12 core checks, and browser flows through portable saves and exports have passed; all five library entries render, generic motion checks pass and the complete browser flow includes PoseLab import. Detailed evidence is recorded in [VERIFICATION.md](VERIFICATION.md).

| Capability | v0.1 source implementation | Scope / acceptance still required |
|---|---|---|
| Local asset library | Human, Creature, Robot, Companion filters; search; local catalog; GLB/VRM import | Four curated CC0 models plus original procedural spirit. No remote marketplace or universal part compatibility |
| Parametric creation | Spirit body width/height/depth, ears, eyes, feet, one optional fragment (boolean) and colors; seeded variants | Original companion study only. Not anatomical human parameters or approved final Zephyr |
| Imported shape editing | Whole-root XYZ scale and source mesh morph weights | Only non-expression-bound authored morphs are permanent shape edits. VRM expressions are preview controls; no new morph authoring, skeleton proportion adjustment or garment refitting |
| Surfaces | Per-material tint, bounded PNG/JPEG replacement, original texture/tint reset, palette shortcuts | Compatible UVs are required. Existing sampler/UV transforms and VRM metadata survive export. PNG interchange with WearHaus is implemented; no integrated painting/layer stack or UV editor |
| Parts | Visibility of existing source meshes | Does not add garments, retopologize, cut meshes or fit unrelated assets. Hidden scene references are removed on export; original binary geometry remains in source-preserving files |
| Motion | Choose and play/pause embedded glTF clips; VRM facial expression preview | Preview expressions do not become identity edits. Generic skeleton clips work independently of humanoid VRM. No motion import, retarget editor or authoring timeline in this screen |
| Durable editing | JSON project save/open, embedded source bytes, IndexedDB autosave, bounded undo/redo, gesture preview | One autosave slot. Not a multi-project database, cloud sync or crash-proof file system; portable files are explicit backups |
| Delivery | Original GLB JSON patching; VRM extension/binary preservation; original clips retained; original spirit GLB export | Unknown extension retention is necessary but does not prove every runtime accepts all edited transforms. Per-destination round-trip QA required |
| Inspection | Triangle/clip information, source/license panel, source morph/material names | No complete validator, texture memory estimate, skeleton repair or provenance conflict solver |
| Workspace | Orbit/pan/zoom, frame/front/side, studio/paper background, PNG viewport capture | PNG is a viewport image, not a transparent portrait/sprite pipeline |
| Companion applications | Links to Classic Character Studio, PoseLab and WearHaus 3D | Local links are launch/handoff affordances, not automatic interchange APIs |

The spirit fragment is boolean in the UI, validator, seeded generator and portable recipes: a companion carries either no fragment or one fragment. Missing spirit parameters normalize to the same defaults as the UI. Expression-bound VRM morphs are excluded from permanent Shape controls and rejected by the exporter if supplied in an imported recipe.

### Already useful but separate applications

Classic Character Studio remains the compatible modular-VRM assembly editor. Its group/trait machinery, texture replacement, expression preview and exporter are useful, but its old selection JSON is not a complete workbench project.

3DHAUS is installed separately as WearHaus 3D. Audited code includes layered image/text/gradient composition, constrained garment deformation, existing-rig weight repair, approximate fit/pose diagnostics and DCL packaging. Installation does not establish all those paths as tested. Its export disables custom extensions, so it must not be used as a lossless VRM round-trip editor. Exchange a compatible garment GLB or PNG layer output while preserving the avatar VRM source in Character Studio.

The separate WEARHAUS repository is a Decentraland venue rather than the garment editor. Both its scenery and 3DHAUS's bundled assets/code remain private or license-unverified for redistribution. Local evaluation is distinct from publishing an open asset pack.

## Reference products and evidence

| Reference | Useful precedent | Adopt / avoid |
|---|---|---|
| [VRoid Studio](https://vroid.com/en/studio) | Presets and fine feature adjustment, direct UV/3D texture editing, stroke-built hair and hair bounce, VRM output | Adopt immediate feedback and domain-specific tools. It is not an open-source engine and has no official native Linux desktop download |
| [VRoid export workflow](https://vroid.pixiv.help/hc/en-us/articles/15760756822297-I-want-to-learn-more-about-the-VRM-export-feature) | Editable source and optimized runtime VRM are different artifacts | Preserve our project/source separately; make optimization explicit and reversible |
| [MPFB](https://static.makehumancommunity.org/mpfb.html) | Blender character construction, rigs, presets and asset authoring | Preferred authoring sidecar and candidate source family for real morphological parameters |
| [MakeHuman generator reuse guidance](https://static.makehumancommunity.org/mpfb/faq/build_other_chargen.html) | Explicitly permits using CC0 base mesh, targets and system assets in another character generator | Ingest compatible assets without treating its GPL/AGPL program implementation as MIT code |
| [Quaternius modular characters](https://quaternius.com/packs/ultimatemodularcharacters.html) | CC0 modular sections and motion-ready low-poly figures | Separate compatibility families and provide useful small packs, not an undifferentiated download collection |
| [Kenney protagonists](https://kenney.nl/assets/animated-characters-protagonists) | Tiny CC0 character package with editable skin source | Good low-resource palette/skin workflow reference; actual inspected archive uses FBX, not ready-made VRM |
| [VRM Add-on for Blender](https://github.com/saturday06/VRM-Addon-for-Blender) | Import/export/edit bridge for prepared humanoids | Use for explicit rig/material/metadata preparation; it does not grant rights to third-party loaded models |
| Local 3DHAUS source audit | Real garment-specific texture and fit tools | Reuse stable artifact contracts first. Do not copy its whole app or promise unconnected conversion-engine code as a feature |

Detailed evidence is included in [asset and creator research](research/assets-and-creators.md), [classic engine architecture](research/characterstudio-architecture.md), and [WearHaus / 3DHAUS audit](research/wearhaus-audit.md). These dated research snapshots distinguish original audit observations from later implementation. Current release evidence lives in [VERIFICATION.md](VERIFICATION.md).

## Asset policy and initial families

The initial public-domain library contains historical pixiv HairSample_Male VRM, Quaternius robot, bat and slime, with exact source/license evidence and SHA-256 receipts. The four-model runtime payload is approximately 20.76 MB; source ZIPs, an unchanged historical human VRM, license evidence and conversion receipts are retained separately. Exact current bytes/hashes are in [RECEIPT.json](../../public/workbench-assets/RECEIPT.json). Converted Quaternius clips use generic glTF rigs. The human has a humanoid VRM rig and expression definitions. None is represented as final Quan or final Zephyr. Prepared local files repair invalid optional skeleton-root references without changing joints or geometry. Converted FBX material opacity is recovered from the matching original MTL values after a discovered zero-alpha conversion defect; appearance/motion checks must use the regenerated files.

Modern VRoid presets are not CC0 and its guidelines restrict character-generator reuse without separate licensing. The historical HairSample_Male is accepted because the publisher explicitly lists it among CC0 samples and embedded metadata agrees. Do not extend that exception to other files by resemblance. [Publisher guidelines](https://vroid.com/en/studio/guidelines), [historical sample list](https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use).

MPFB's base geometry, targets, rig/pose/expression data and bundled graphical assets are CC0; its source code has separate GPL terms. [Exact split-license definition](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md). Community downloads still need individual checks. PolygonalMind's [100Avatars README](https://github.com/PolygonalMind/100Avatars) limits resale without major modification; do not label that catalog CC0. Open application code never relicenses imported artwork.

### Inclusion gates for a distributable pack

1. Establish original author, canonical source, exact file version/hash and license text. Record mirrors explicitly; “free download,” a rights checkbox, or missing copyright metadata is insufficient.
2. Confirm modification, redistribution, commercial use and inclusion in a character generator are permitted. Preserve attribution or share-alike obligations when applicable; use CC0 first for the default mixable family.
3. Compare embedded VRM permissions with external evidence. A disagreement becomes review-required; never overwrite restrictive flags automatically.
4. Validate bounded file sizes, referenced resources, geometry/indices, finite transforms, textures, skin weights and expected extension versions.
5. Assign topology and rig compatibility profiles. Check bind pose, units, up/forward conventions and material/UV semantics.
6. Supply a neutral render, posed/deformed acceptance fixtures, authored morph ranges and known limitations. Verify exported output in the target runtime.
7. Mark `redistributionApproved` only after these checks. Private user imports remain usable locally with unverified provenance clearly retained; they are not automatically added to the public catalog.

## Architecture

### Layers and ownership

- **Document/core:** validated versioned recipes, stable commands, undo/redo, migrations, asset references and export intent. No live Three.js objects in the persisted document.
- **Asset registry:** immutable content-addressed source bytes, provenance, compatibility profile, semantic bindings and thumbnails. Optional downloads are a deliberate install operation; opening a saved project must not silently fetch third-party URLs.
- **Evaluation layer:** deterministically resolves recipe and source assets into geometry, materials, shape weights and rig transforms. Distinguish authored identity, transient expression, pose and simulation state.
- **Viewport:** disposable Three.js rendering, picking, controls, animation playback and diagnostics. Async loads use generation tokens so stale completions cannot replace the current project. Release abandoned resources, clips and object URLs.
- **Authoring tools:** paint, curves, parts, weights and fit modules issue document commands. Long geometry/texture operations use workers or a bounded local sidecar where browser work is unsuitable.
- **Export adapters:** target-specific validation and emission. Preserve source and unknown extension data when making reversible edits; use explicit rebuild exporters only for constructed assemblies with known metadata mapping.
- **Native shell:** local process lifecycle, launcher, theme import, file reveal and optional bridge receipts. It must not own the document format or create a second asset database.

Keep browser workbench, classic assembly editor, 3DHAUS and Blender authoring sidecar separate until an artifact interchange test justifies sharing code. Their Three.js/React versions differ; exchange files rather than cross-version renderer objects.

### Current document contract

v0.1 uses `schema: "character-studio/project"`, `version: 1` with `name`, `assetId`, `kind` (`spirit`, `library`, `import`), `parameters`, material-index `colors`, material-index `textures`, `meshIndex:targetIndex` `morphs`, root `scale`, and `hiddenMeshes`. Optional `source: {name,data}` embeds base64 GLB/VRM bytes. Optional provenance records `author`, `license`, `source` and `licenseUrl`.

Each `textures[materialIndex]` is `{name, mimeType, data}`, where `mimeType` is `image/png` or `image/jpeg` and `data` is raw base64. Imported source and texture bytes stay separate; recipe edits never overwrite the original embedded model. Empty `textures` defaults to `{}`. Spirit geometry uses palette parameters rather than imported textures.

Current intake is self-contained binary glTF 2. Limits are 50 MiB original model source; 8 MiB per replacement texture; 16 MiB total replacement textures; 4096 pixels per image axis; 128 texture entries; and 96 MiB portable JSON input. PNG IHDR/JPEG SOF dimensions and signatures are checked before browser decoding, including project-file intake. Export output is capped at 66 MiB; base64 expands binary by roughly one third. A generated file over 50 MiB must be optimized before reimport as a new standalone source; its original source-plus-edits project remains the editable format.

Validation bounds parameter values, edit counts and indices; export checks referenced materials/morphs/meshes against the actual source and refuses a painted material when any using primitive lacks the required UV channel. Texture data is appended to an aligned GLB BIN buffer, preserving prior binary bytes, image references, UV transforms, sampler settings and source permissions. Source glTF/VRM embedded image dimensions are not yet preflight-bounded: the 50 MiB input cap is not a decompressed-memory or GPU-memory guarantee. This is a practical first format, not a complete glTF security or conformance validator.

IndexedDB stores one autosave recipe; imported source bytes are embedded, whereas library recipes can reference installed assets. Explicit portable Save includes the source so that a later catalog change does not remove the project's base. A newer schema must fail clearly until migration exists.

### Evolved contract (future schema, not accepted by v1)

Introduce project UUID and timestamps; generator/evaluator version; asset hashes and pack versions; semantic stable IDs; `rigProfile`, `topologyProfile`, scale/axis conventions; slot bindings; identity parameters and corrective dependencies; texture layers/masks/color space; hair guides; accessories and weight bindings; deterministic seed; export presets; structured authorship/provenance graph; and optional presentation camera.

Store large blobs once in content-addressed IndexedDB/file storage. Portable bundles contain `project.json`, referenced immutable sources, derived authored resources and license evidence. Validate paths against traversal, verify hashes before resolving references, and bound decompressed size. Recipe migration must retain old evaluators or bake a clearly identified compatibility snapshot.

Color values must declare sRGB authoring semantics; glTF color factors are linear. Source geometry and identity edits remain separate from preview facial emotion and animation time. Do not bake a smile, closed eyes or a walk frame into neutral delivery by accident.

### Rig profiles and construction

Use separate profiles for VRM humanoid, generic skinned glTF, rigid articulated robot, curve/spring appendage, and unrigged procedural companion. A rig profile declares required joints, rest pose, optional joints, weight conventions, expression bindings and supported adapters. Nonhumanoid creatures are first-class assets rather than malformed humanoids.

Humanoid identity editing needs authored morph targets plus dependent eye/teeth/clothing changes and rest-joint adjustment where required. Root scaling is useful composition but cannot stand in for this system. Arbitrary mesh rigging requires topology/segmentation and binding tools; nearest-vertex weight transfer only works with a suitable already-weighted source and valid target skeleton.

## Staged roadmap and acceptance

### M0 — dependable workbench 0.1

Deliver the source-listed tools and curated library, restore/undo correctness, artifact provenance and local app launchers. All release claims must correspond to actual browser controls and tested paths.

Acceptance: load every starter; tint two distinct materials; modify a source morph; hide/show a mesh; change proportions; undo/redo each; save/reload/reopen with equivalent state. Portable projects must reopen without the original catalog. Corrupt/truncated/external-resource files fail clearly. Robot/Bat/Slime clips visibly play. VRM output retains metadata, humanoid mappings, expressions and binary content; appearance and pose work after PoseLab import. Generic GLBs reopen with clips and source rights. Companion seeded parameters reproduce exactly. PNG is a valid nonempty image. Repeated switching must not retain an unbounded collection of models.

Status: implemented foundation with production build, 12 core checks, all five starter visual checks, generic motion checks and all 11 browser-flow steps including PoseLab import passed. [Verification](VERIFICATION.md) records exact coverage and remaining deeper deformation/runtime limits. M1–M6 below are roadmap, not delivered features.

### M1 — reusable character families and project library

Add multiple named projects, thumbnails, recoverable asset imports, stable pack versions, content hashes, explicit compatibility reports and semantic materials. Author a small human family and original companion family. Introduce a shared license/provenance inspector and target export reports.

Acceptance: pack updates do not change old projects; a missing resource is identified by name/hash; unknown licenses remain unknown; same-named materials are independently addressable. Two compatible outfits and two hair options survive assembly, undo and export. A deliberately incompatible part is rejected before scene mutation.

Cost: moderate application/schema work plus hands-on asset normalization. Human and companion styles need separate art acceptance, not only automated checks.

### M2 — true human face/body generator

Prepare a CC0 MPFB-derived or original base with authored identity targets. Start with a small meaningful set: face proportions, jaw/chin, nose, eye placement, brows, shoulders, torso and limb proportions. Define defaults/ranges, corrective shapes, dependencies and neutral constraints. Persist body parameters independently from expressions.

Acceptance: min/max and mixed parameter fixtures preserve eyes/teeth placement, rig alignment and skin deformation. Supported outfits follow all supported shapes without unacceptable penetration in arms-up, seated and walk poses. Exported VRM recreates the chosen identity while blink/visemes still function. Quan preset is reviewed against approved front/profile/three-quarter references before being called complete.

Cost: high asset-authoring and deformation effort. A large target download is not a finished browser generator; coordinate conversion, dependent fitting and rig rest-pose handling are substantive work.

### M3 — layers, painting and wardrobe construction

v0.1 already imports composited WearHaus PNGs onto compatible materials and embeds them into portable projects and GLB/VRM exports. The actual smoke PNG proves transfer, serialization and export, not that a garment PNG matches the human model’s UV layout, general garment fit or a layered document transfer. Next prove garment interchange on a known compatible UV/rig template, then add a workbench texture document with image/fill/text/mask layers, reorder/blend/opacity, deterministic compositing and PNG export. Add UV painting before 3D raycast painting; make seam/mirror behavior explicit. Outfit slots carry fit targets, body-occlusion masks and layering rules.

Acceptance: a two-layer edit survives reopen and export with correct color space/alpha; UV seams and mirrored islands have reviewed behavior. Body masks hold under supported poses. A garment handoff preserves UVs and skin weights; a VRM never loses metadata by being routed through 3DHAUS. Each supported base/outfit combination has a fit fixture.

Cost: texture layers are moderate tool work; robust 3D paint and garment fitting are separate large systems. Approximate clearance diagnostics are not cloth simulation.

### M4 — hair, accessories and rig authoring

Start with modular front/back/side clumps and separate root/fringe/highlight colors. Add curve guides, cross section, taper, UV flow, mesh resolution, mirroring and editable clump generation. Add spring chains/colliders and bone-bound accessories. Later expose joint placement, weight visualization, normalization and constrained transfer/painting.

Acceptance: Quan's swept silhouette and mint fringe remain recognizable from multiple views; guides round-trip and regenerate deterministically; head turn/jump tests do not produce unacceptable collisions; VRM spring data and accessory transforms survive export. Weight edits are normalized and source topology changes either migrate safely or invalidate the binding explicitly.

Cost: high geometry/UI work. Drawn hair and reliable weights cannot be delivered by adding a slider panel over arbitrary meshes.

### M5 — creatures, companions and reproducible generation

Extend original generators with explicit skeleton/attachment profiles and art-directed constraints. Keep approved Zephyr preset protected as a named source; exploration creates distinct variants. Add repeatable human/creature recipes and bounded batch generation with a manifest, hashes, thumbnail sheet and per-output provenance. No cloud/GPU model requirement for the default system.

Acceptance: same seed plus evaluator/pack versions yields identical recipe and equivalent geometry; cancelled batches leave recoverable completed outputs without corrupting originals. Every result passes its profile validation. Creature motion stays on its own rig; human retargeting is never offered where mappings are absent. Reject illegal part combinations rather than silently changing identity.

Cost: moderate for procedural companion variation, high for broad body/wardrobe combinations. AI mesh generation, if added, is an optional separate intake lane requiring rights, topology and rig review.

### M6 — project delivery and native Omarchy workflow

| Destination | Artifact and adapter | Acceptance |
|---|---|---|
| PoseLab | Humanoid VRM; generic GLB prop path separately | Posing, expressions, textures and spring bones work for VRM. GLB creatures are not advertised as humanoid-pose avatars |
| Signal Walk | GLB plus placement/animation manifest and bounded texture budget | Scene loads offline, character scale/orientation/materials match and intended clip plays |
| WavID habitats | Generic GLB/recipe adapter to scene presentation | WavID identity/hash logic remains independent; character edits do not silently mutate issuance/fingerprint data |
| Zephyr runtime | Approved companion geometry, attachment/motion vocabulary and local export receipt | Runtime integration is explicit; no claim that preview geometry is an installed live companion |
| WearHaus 3D | PNG layers and compatible garment GLB with UV/rig manifest | Return-trip fitting/materials pass; DCL and VRM validation remain distinct |
| Blender/MPFB | Authoring source plus validated prepared asset pack | Preserve sculpt/rig/target source and produce the same browser-compatible pack again |

Native lifecycle: launch on demand, bind local services to loopback, reuse ports safely, report actionable failures, expose logs/stop/restart without duplicate servers, and open/export files through normal user workflows. Keep private companion services local. Read Omarchy theme colors through a small supported adapter with fallback and accessibility checks; user theme changes must not alter exported character colors. Respect reduced motion and pause preview work when hidden. Optional Zephyr gestures use the existing bridge protocol and its busy/quiet/off receipts.

Acceptance: app-menu launch from stopped state, repeated launch without duplicates, stale-process recovery, clean stop, offline operation with installed assets, theme switch without losing edits, and keyboard operation of core controls. Battery/CPU/GPU measurements are required before claiming laptop efficiency; the present viewport's 30 Hz/DPR cap is an implementation choice, not a benchmark.

## Cross-cutting quality and unresolved decisions

Maintain structural/export tests for binary chunk retention, morph/node indices, material color conversion, source hash integrity, schema rejection and history. Add visual fixtures where geometry or rendering could regress; avoid tests that merely restate component markup. Test actual target runtimes rather than inferring compatibility from a `.vrm` suffix.

Performance targets must be set from this AMD laptop's measured baseline. Track triangles, draw calls, texture memory, skeleton size, source bytes, peak import memory and steady preview frame time. Treat 50 MiB intake as a bounded first policy, not a guarantee that every 49 MiB asset runs well. Large morph arrays, texture atlases and base64 copies may dominate memory before file size does.

Open design decisions: chosen human topology family; how much MPFB evaluation runs in browser versus a local Blender process; final rig/version profiles for PoseLab; garment fit representation; whether original authored packs are released CC0 or another permissive license; and when private 3DHAUS code merits extraction under explicit licensing. Existing authorization supports local implementation, but does not establish missing third-party rights or permission to publish private repositories.

Release reports should list completed acceptance, known failures, exact artifact paths and the next incomplete milestone. A first useful editor can ship before drawn hair and anatomical generation; the mature creator is complete only when those named systems and their acceptance fixtures actually exist.
