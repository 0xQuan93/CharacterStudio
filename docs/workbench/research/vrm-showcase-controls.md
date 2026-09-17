# VRM showcase: practical creator controls

Reviewed 2026-09-17 for Quan's Character Studio refinement. The [VRM showcase](https://vrm.dev/en/showcase/) is an interoperability directory, not a blanket open-source or asset license. It includes makers, viewers, editors, animation utilities, and proprietary services.

## What to adopt

| Reference | Verified capability / licensing | Character Studio decision |
| --- | --- | --- |
| [VRoid Studio](https://vroid.com/en/studio) | Presets, live shape/color editing, layered texture painting, and stroke-based hair. Free application; no reusable source license established here. Its own page distinguishes creator-owned content from third-party licensing. | Adopt the interaction pattern: meaningful categories, visual presets, a few useful controls before advanced details. Do not copy its modern bundled assets into our generator. |
| [VRM Body Modifier](https://github.com/K1234-droid/vrm-body-modifier) | Browser body parameters, poses, expression blending, gaze and blink controls. [LICENSE.md](https://github.com/K1234-droid/vrm-body-modifier/blob/2204959806008846b733729540b66fe47a74ffbd/LICENSE.md) says MIT, but [README](https://github.com/K1234-droid/vrm-body-modifier/blob/2204959806008846b733729540b66fe47a74ffbd/README.md) separately prohibits export additions in public forks and says its changes are temporary. | Useful UI reference. Do not vendor its code while these terms conflict. Its runtime-only bone edits are not evidence of a working VRM export pipeline. Research pin: `2204959806008846b733729540b66fe47a74ffbd`. |
| [three-vrm](https://github.com/pixiv/three-vrm) | MIT; browser VRM loading/rendering library already used here. | Keep the existing runtime and source-preserving export architecture. Build semantic controls above it. |
| [VRM Add-on for Blender](https://github.com/saturday06/VRM-Addon-for-Blender) | Import/export, humanoid editing, MToon and Python automation. [Main license](https://github.com/saturday06/VRM-Addon-for-Blender/blob/main/LICENSE_MAIN.txt) is MIT OR GPL-3.0-or-later; [MIT option](https://github.com/saturday06/VRM-Addon-for-Blender/blob/main/LICENSE_%28OPTION1%29_MIT.txt). | Best authoring companion for permanent face topology, original hair, weighting and rig inspection. Treat it as an independent application pipeline, not an embedded web control. |

These are implementation recommendations inferred from those sources, not claims that their feature sets already exist in Character Studio. No external code was copied during this research.

## Actual installed human: safe semantic mapping

Inspected `public/workbench-assets/human-hair-male.vrm` directly as glTF JSON. This is the previously audited historical CC0 hair sample, not a general exemption for modern VRoid content. See its adjacent license receipt for provenance.

| Control | Source material indices / mesh | Qualification |
| --- | --- | --- |
| Skin tint | 5 `Face_00_SKIN`, 9 `Body_00_SKIN` | Update together to avoid a face/body seam. Texture shading remains; a material multiplier is not a complete texture recolor. |
| Hair color | 13 `F00_000_Hair_00_HAIR` | One material for the installed hairstyle. Brow linking should be a deliberate option. |
| Brow color | 0 `FaceBrow` | Separate from eyelashes and eyeliner. |
| Iris color | 2 `EyeIris` | Leave eye whites (4) and highlights (3) alone. |
| Hair visibility | mesh 2 `Hair001.baked`, node 94 `Hair001` | 114 primitives; one existing style, no authored hair morph targets. |
| Face details | mesh 0 `Face.baked` | 39 morph targets shared across 10 primitives. Names are in **primitive** `extras.targetNames`, not mesh extras. |

The human's target names are expression controls, not anatomical identity controls. Indices 0–4 are full expressions; 5–9 brows; 10–18 eyes; 19–32 mouth; 33–38 fangs. Bound VRM expression targets are 0,1,2,3,4,10,11,12,23,24,25,26,27 and must remain separate from permanent identity edits. Their expression bindings must survive export. Unbound names include `Fcl_BRW_Joy`, `Fcl_EYE_Surprised`, `Fcl_MTH_Up`, and `Fcl_HA_Fung1`. Readable labels may describe these authored effects; they must not be relabeled as nose size, jaw width, eye spacing, or facial anatomy.

Suggested first controls: paired skin swatches plus custom picker; hair/iris/brow colors; named brows, eyes and mouth details; reset per group; optional face camera. Unknown imported models should fall back to their actual materials and authored names rather than applying this sample's hardcoded indices.

## Hairstyle and anatomy path

An exported VRM usually contains the final meshes, not a creator's editable hair-curve recipe. Hiding the sample hair can expose a scalp, but does not constitute multiple hairstyles. Useful alternatives require authored geometry or original procedural geometry attached to the head, correct bounds, save/reopen support, and export parity. Preview-only hair is insufficient for this workflow.

For facial anatomy, author a reusable neutral base with deliberate morphs (nose, jaw, cheek, chin, eye spacing and ear shape) and a stable named control manifest. Verify each delta under expressions, blinking and head motion. Coordinate texture regions at lips, eyebrows, eyelids and seams. Whole-face scale is not a substitute for these morphs.

For skin colors, darker swatches need visual QA under neutral lighting: multiplying an already colored diffuse texture can crush detail or retain unwanted warm/cool casts. A later neutral albedo plus controlled skin-tone layer is a better foundation than inferring skin masks for arbitrary uploads.

## Acceptance checks for the refinement

1. Skin changes affect face and body together; hair and eye whites remain unchanged.
2. Hair color does not silently change brows, clothing or skin.
3. Face labels match authored shapes and make the expression/anatomy distinction clear.
4. Changing style, undoing, reopening a portable project and exporting all produce the same geometry.
5. Export reimport preserves humanoid, expression and material metadata; no generic export strips VRM extensions.
6. Missing semantic capabilities in imported models degrade to explicit generic controls.
7. Front/profile/back reference captures use the same current model and neutral pose; a generated concept sheet is labeled separately from measured model geometry.
