# Workbench 0.2 · appearance and Quan reference

2026-09-17. This increment makes human editing approachable while keeping generic models and source-preserving exports.

## Use

Choose **Human Face Study** in the library. Its **Appearance** tab groups Skin tone, Eye color, Hair color and Eyebrow color. Skin updates the matching face and body surfaces together. Choose a swatch, use the color picker, or restore Original. **Apply Quan palette** supplies a warm/dark/mint starting palette; it does not create Quan's likeness or mint forelock. Colors multiply source texture color, so they are not exact paint replacement.

Use **Face** above the viewport for a head close-up. **Jaw width**, **Chin length** and **Nose width** are true bounded geometry targets, with narrower/shorter values below zero and wider/longer values above zero. These targets were added to a separate derivative asset; existing projects still use their original source. [How the targets were made](FACE-CONTROLS.md).

Resting-expression details are collapsed separately; blink/phonemes bound to the VRM expression system stay in Motion preview. Advanced Shape/Surface/Parts remain available. Unknown imported material names receive individual controls rather than guessed skin/hair mappings.

**Hair style** offers Original hairstyle or No hair. The source contains one complete hairstyle; additional fitted styles and Quan's swept black hair with mint forelock still require authored geometry. An exported bald model cannot recover removed hair; retain the portable project to restore it.

Save a portable project to preserve edits and source. Signed weights round-trip through JSON, undo/redo and VRM export. Older0.1 code rejected negative weights, so use0.2 to open a signed-face project.

## Quan model reference

The Appearance panel opens `/workbench-reference.html`, with the finished downloadable sheet and original portrait. The sheet contains full-body front/profile/back/three-quarter views, neutral/profile/smile faces, hair crown and eye details. Built-in image_gen created the plate from the approved portrait; Remotion added exact labels and the existing Listening Moon emblem. The full prompt, original generated plate and composition receipt are in the artwork workspace's `character-sheets/quan-v1/` directory.

Face, warm brown skin, hair signature and collar follow established references. Full-body jacket details, trousers and boots are proposed additions. This is artist reference, not measured orthographic geometry or a finished 3D Quan asset. The final composition is3072×2400 from a1536×1024 generated illustration.

## Research and constraints

The [VRM showcase research](research/vrm-showcase-controls.md) informed semantic grouping, clear authoring/preview distinctions and the Blender authoring path. No code was copied from VRM Body Modifier; its export-fork restrictions conflict with its permissive license file and need resolution before reuse.

The existing tests now include signed geometry edits, semantic material groups, hidden-hair import behavior and generated-target invariants. Browser acceptance is recorded in [VERIFICATION.md](VERIFICATION.md). Original approved art and the original human model remain intact.
