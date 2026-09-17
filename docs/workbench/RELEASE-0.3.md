# Workbench 0.3 — sculpt, paint, and repeatable variation

Implemented locally on 2026-09-17. Open [Character Studio](http://127.0.0.1:18991/workbench.html). This is a working tool release; the current Human Face Study is still a starting mesh, not Quan's finished likeness.

## Use the new tools

1. Choose **Human Face Study**, open **Appearance**, apply the Quan palette, and select **Face** above the viewport. Keep the linked Quan reference open.
2. Open **Sculpt**, choose the face surface, and start with a small radius/strength. **Build outward**, **Push inward**, and **Relax sculpt edits** modify existing vertices. Enable X symmetry for paired edits. Click **Start sculpting**, drag on the model, then stop sculpting to orbit. Each stroke is one Undo step. The touched material defines a mask, protecting nearby eyes, teeth, brows and other materials even when they share a vertex accessor.
3. Open **Appearance → Paint hair/face/body texture**, or **Surface → Paint texture** for a UV-compatible material. Paint or erase a draft highlight layer over the existing texture; choose color, brush size and opacity, undo draft strokes, then Apply. Empty drafts close without modifying the project. Source transparency is retained. Applied layers become one embedded PNG; use project Undo for durable rollback.
4. **Appearance → Hair accents → Select hair section on model** picks an existing hair primitive. Give it an independent tint and repeat for other sections. Export creates distinct materials while preserving shared UV/texture references. Dark or colored source pixels still affect the visible tint; tinting alone does not bleach them or construct Quan's hairstyle.
5. **Appearance → Generate a variation** accepts a reproducible seed. It varies semantic palettes and only verified anatomical controls. Human Face Study varies jaw/chin/nose within ±0.55; the new female base receives palette variation because its authored facial keys are expressions. Sculpt, painted images, hair-section overrides, visibility and other unrelated state remain intact. Undo restores the previous recipe.
6. Save a portable project to keep the original source plus editable recipe. Export VRM for PoseLab and other compatible applications. Reopen the export to inspect the result; export bakes the identity surface but retains its rig and expression targets.

**Restore source surface** in Surface removes that material's texture override, tint and painted shade ratio together. This restores its original material appearance. Hair-section overrides have their own reset controls.

## What was adapted from 3DHAUS

The live 3DHAUS engine supplied a proven design: immutable original positions, smooth regional deformation and neighbor relaxation of displacement rather than the untouched mesh. The new browser sculpt module implements those principles for source-indexed VRM geometry. It deliberately leaves garment-specific Decentraland classifiers, Avatar_* skin repair and the general-purpose exporter in their original application. [Audit and implementation contract](research/3DHAUS-SCULPT-AUDIT.md).

Brush hits are mapped from the posed triangle back to source bind coordinates through barycentric coordinates. Export appends edited position/normal accessors to the original binary, redirects all affected primitives, and retains source joint weights, inverse binds, morph target deltas and VRM metadata. This preserves editable structure; it does not establish perfect deformation after arbitrary shape changes.

## Texture and color integrity

The painter bakes the current base-color multiplier in linear color space, then uses a white multiplier for the painted bitmap. Bounded shade/base ratios retain authored shade color where representable. Shared VRM0 Main/Shade or VRM1 base/shade image references are identified by source indices and updated together. Distinct authored shade maps stay distinct. The VRM0 gamma-2.2 material conversion fix remains in place.

Hair-section materials are split after shared texture edits. Their tint uses the same VRM-aware path, with inherited shade ratios. Semantic source names survive export so reimported hair still has hair controls. Expression-controlled materials cannot be split by this feature.

Project schema 2 stores sculpt offsets, independent primitive colors and painted shade ratios. Version 1 projects still load; older editors should reject schema 2 instead of silently dropping edits. Source geometry stays embedded in portable projects. This release does not persist a layered paint document or recover proprietary VRoid hair guides from an exported VRM.

## Added source material

- **Female Hair Study**: publisher-identified historical CC0 HairSample_Female, 27,068 triangles, two hair materials, original plus minimally repaired runtime derivative and hash receipts. Its 41 facial targets are expression shapes, not 41 anatomy sliders.
- **MPFB face foundation**: pinned CC0 base OBJ, game-engine rig/weights and 150 facial morphology targets. It is staged for native authoring under `assets-source/`, not offered as incompatible sliders on a VRoid mesh. No MPFB application code was copied.

[Asset provenance, inspection and excluded sources](research/humanoid-assets-2026-09.md) distinguish CC0 assets from application licenses and model-specific restrictions.

## Research conclusions and the Quan production path

Use a consistent rigged topology for likeness, author the swept hair and separate forelock, then test blink, gaze, vowels, smile and body motion. Maintain an authoring source alongside the VRM. Large shape changes may require bone/weight/expression repair and clothing refit in Blender with its maintained VRM add-on.

The official TRELLIS.2 deployment targets NVIDIA hardware with at least 24 GB VRAM. Hunyuan's releases have different memory requirements and custom license restrictions. TripoSR has a real CPU path, but speed and output quality on this machine have not been benchmarked. Experimental Vulkan implementations are interesting on this AMD machine, but some texture-rebuild paths explicitly discard rigs and morphs. No heavyweight model weights or speculative AI service were installed. [Primary-source feasibility matrix and eight-stage Quan pipeline](research/AI-VRM-FEASIBILITY.md).

## Verified scope and limits

- `npm run test:workbench` passes data validation, actual VRM loader color conversion, semantic mappings, authored targets, sculpt math, source-preserving geometry export, primitive splitting, generation, painted shading and detached-material synchronization.
- Actual browser sculpt stroke changed **194 vertices**, survived portable save and VRM reimport, with exact recipe Undo/Redo and zero page errors. Original/exported geometry and metadata also have structural regression coverage.
- Actual selected hair section `2:0` kept an independent tint in its portable recipe and exported VRM; reimport retained semantic hair controls. Zero page errors.
- Actual mint texture strokes changed **12,125 pixels**. Painted VRM export/reimport mean absolute error was at most **0.000011 RGB** over the captured viewport; portable project reopen and empty Apply were also checked. Alpha preservation and painter bounds passed at desktop, mobile and short-window sizes.
- Female base loads visibly, both hair materials are paintable, and generated variation changes six semantic colors with no expression morph edits. Saved source hash matches its receipt.
- Browser-downloaded sculpt, hair-section, painted-hair and female VRMs pass Khronos glTF validation with **zero errors**. Legacy asset warnings remain. This is not comprehensive VRM certification or proof of every expression's visual quality.
- Skin regression retest preserves selected `#a96d49` and exact cheek-region RGB after export/reimport; the exported file also loads in PoseLab with zero browser errors.
- Production build passes. Upstream large-bundle and Node module-type advisories remain.

Evidence scripts and reports live in the sibling `avatar-tools/` folder: `check-workbench-sculpt.cjs`, `check-workbench-hair-sections.cjs`, `check-workbench-paint-export.cjs`, `check-workbench-female.cjs`, and `logs/`. Older input-based appearance smoke scripts predate the contained color dialog; the named current tests exercise that interface.

Sculpting currently targets uncompressed, supported VRM triangle geometry with normals: at most 300,000 vertices per accessor, 50,000 edited vertices per accessor, 32 accessor edit maps, and 0.12 mesh-local units maximum displacement. The UI assumes meter-scale VRM geometry. It does not remesh, add resolution, move joints, refit garments, transfer arbitrary morphs across topologies, or guarantee lip/eyelid closure after aggressive edits. Painting is on a 2D UV image capped at 2048 pixels in the editor; it has no 3D projection, pressure response, seam repair, or separate shader highlight-map channel. These limits define the current tooling rather than the final avatar's appearance.
