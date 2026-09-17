# Quan reference and GLB / FBX preparation

Local workflow added 2026-09-17. Open `/workbench-conversion.html` or **VRM converter** in the workbench's creative tools links.

## Quan reference

`public/workbench-reference/quan-full-body-transparent.png` is a 1024×1536 RGBA front A-pose illustration. The full silhouette, fingers and boots are present. It has real alpha; the guide uses a CSS checkerboard for preview. Browser download was verified byte-identical to the generated file.

Workspace master: `artwork/quiet-frequency/character-sheets/quan-v1/full-body/quan-front-transparent-v1.png`. `PROMPT.md` records the exact built-in image_gen prompt and the existing face/body references; `RECEIPT.json` records its hash and alpha counts. Existing images remain unchanged. This image is an artistic modeling reference, not measured orthographic data or a rig.

## Local conversion tools

The workspace sibling `avatar-tools/conversion/` contains pinned portable Blender 4.5.14 LTS with the official VRM Add-on for Blender 4.7.1. Its installer verifies download checksums and isolates its configuration/add-on from other Blender installs. See that folder's `README.md`, `INSTALL-RECEIPT.json`, `metadata.example.json`, and executable launchers.

`convert.sh INPUT --output NEW_DIRECTORY --preflight` inspects GLB/FBX and retains an authoring `.blend` and report. Full conversion adds `--metadata actual-metadata.json` and writes `model.vrm`. An optional bone map assigns exact source names to VRM humanoid roles. Sources remain untouched and existing output directories are refused. Default template placeholders must be replaced with actual authors/permissions.

A required humanoid skeleton and real skin weights must exist; this tool does not auto-rig a static image-to-3D result. It deliberately rejects unsupported/incomplete rig mapping rather than producing a nominal VRM with no functioning humanoid. Raw morph targets can survive conversion, but semantic VRM expressions, gaze and spring bones require authoring. Blender source animation clips are not exported into the neutral VRM deliverable.

An explicit `--yaw-degrees 180` fixes a source that was verified to face backward. This was necessary for the legacy VRM0-derived GLB fixture when preparing VRM1. It is not a universal rotation for all inputs.

FBX material intent can be ambiguous: one fixture arrived with all surfaces marked transparent, causing back hair to render through the face despite valid geometry. `--material-overrides` supplies reviewed opaque/cutout/blend and culling settings by exact source material name. Keep those settings with the authoring file. Embedded texture presence alone does not establish shader parity; procedural or glTF-unlit source materials may need baking into standard PBR before FBX export. Inspect the actual render.

## Acceptance

The local conversion tests use the historical CC0 HairSample_Male source. They remove its VRM extension to test genuine GLB preparation and also create a textured standard-PBR FBX fixture. Reports record original hashes, mapped humanoid roles, skinning, morphs, image inventory, authoring errors and output hashes. Current tool-specific verification is recorded under `avatar-tools/conversion/tests/`.

Browser acceptance uses `avatar-tools/check-converted-vrm.cjs`: imports actual converted VRM, changes skin tone, checks sculpt availability, exports and reimports, and verifies the edited tone. Desktop/mobile guide rendering and the transparent PNG download use `avatar-tools/check-conversion-guide.cjs`. Those tests do not certify arbitrary third-party models or finish Quan's likeness; they establish a usable preparation and editing path.

Use the original VRM directly when one already exists. Routing it through FBX or stripping its extensions discards semantic avatar features that Character Studio's source-preserving VRM editor would otherwise retain.
