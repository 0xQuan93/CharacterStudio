# Proven VRM authoring and AI 3D feasibility for Quan

Research checked 2026-09-17 against primary project documentation and source code. This is an implementation decision record, not a benchmark report or a claim that these generation models were installed.

## Decision

Make the reusable Omarchy creator an editor of stable, licensed, rigged character families. Use sculpting for likeness, texture painting for surface details, and authored hair meshes for silhouette. Treat image-to-3D as an optional source of reference geometry, props, or candidate parts that must pass the same asset pipeline. It is not the identity or rig authority for Quan.

This machine reports an AMD Ryzen 7 7730U, integrated AMD Barcelo Radeon graphics, and approximately 22 GiB usable system RAM. No NVIDIA GPU appeared in the local PCI inventory. System RAM and swap do not satisfy a CUDA GPU's dedicated-memory requirement. These facts were read with `lscpu`, `lspci`, and `free`; model inference was not run.

## AI model choices: evidence and practical fit

| Candidate | Verified upstream capability and requirements | Decision for this machine |
| --- | --- | --- |
| **Microsoft TRELLIS.2** | Image-to-3D with geometry and PBR surface attributes. Official prerequisites specify Linux, NVIDIA GPU with at least 24 GB memory, and CUDA toolkit; the reported tested GPUs are A100/H100. Project model/code MIT, with separately licensed dependencies. [Official repository](https://github.com/microsoft/TRELLIS.2) | Upstream CUDA installation is not a viable default on this integrated Radeon laptop. Keep as optional external-worker candidate; do not add large unusable weights to Omarchy. |
| **Hunyuan3D 2.0** | Shape and texture stages; texture generation can also operate on handcrafted meshes. README says 6 GB VRAM for shape and **16 GB combined shape + texture**, not 6 GB for everything. Output example is a trimesh saved as GLB/OBJ. [Official repository](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) | Potential external batch worker for candidate meshes/textures. The published GPU figures do not prove the Radeon iGPU path. Generated static geometry still needs rigging, facial expression authoring, and VRM packaging. |
| **Hunyuan3D 2.1** | Its own README says 10 GB for shape, 21 GB for texture, 29 GB combined; tested environment uses PyTorch with CUDA 12.4. Adds PBR texture synthesis and released training code. [Official repository](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) | Do not inherit 2.0's lower memory claim. Not selected as a local desktop dependency. |
| **TripoSR** | Single-image reconstruction; code and pretrained models are MIT. Default single-image generation is around 6 GB VRAM, with optional texture baking. [Official README](https://github.com/VAST-AI-Research/TripoSR) Its actual `run.py` falls back to CPU when CUDA is unavailable. [Inference source](https://github.com/VAST-AI-Research/TripoSR/blob/main/run.py) | A plausible isolated CPU experiment, but neither speed nor fit in this laptop's current available RAM has been measured. Its fast A100 timing must not be quoted as laptop performance. Output is a reference mesh, not a finished expressive Quan avatar. |
| **Wimacs trellis2.c** | Independent native CUDA/Vulkan implementation with generation, texture, segmentation, and TokenSkin rigging commands; Linux Vulkan build documented. Texture processing explicitly rebuilds a static asset and discards source rig, morphs, animation, hierarchy and VRM extensions. Rigging creates joints/weights but does not preserve original morphs or animation. Own code MIT; weights/dependencies retain separate terms. [Project README](https://github.com/Wimacs/trellis2.c) | A real emerging Vulkan research candidate, so “all AI 3D is impossible on AMD” would be false. No verified Barcelo memory/performance data here. Keep outside the production path until a bounded benchmark and full dependency review prove value. Never route Quan's existing VRM through its rebuilding texture command as a transparent roundtrip. |

**License boundary:** Hunyuan3D 2.0 uses its own community agreement, not CC0/MIT. The inspected agreement excludes EU/UK/South Korea, contains a commercial scale condition, restricts using outputs to improve other AI models, and addresses outputs separately from model derivatives. That is incompatible with presenting it as an unrestricted CC0 generator component. Keep any eventual integration's provenance and deployment terms separate from our CC0 character library. [Actual license](https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE)

These sources establish implementations and requirements; they do not establish exact likeness to Quan. A front reference does not observe the back of the head, hidden hair, or facial depth. Generation fills those gaps. A multi-view reconstruction may improve consistency, but our multi-view character sheet is itself artwork to reconcile, not a calibrated scan.

## What VRoid proves and what to adopt

VRoid's hair system distinguishes a main/base texture from a highlight texture, with separate colors and an outline color. It allows the same material on many strands, or a distinct material for selected groups. Its grayscale textures can be recolored independently of their painted detail. These are strong interface patterns for a dark hairstyle plus Quan's mint forelock; they are not evidence that a random exported VRM contains editable VRoid hair guides. [Official hair material guide](https://vroid.pixiv.help/hc/en-us/articles/900005965706-How-to-edit-hair-color-and-texture-material)

The texture editor supports painting on a UV image or the model, instant preview, brush size/opacity, eraser, fill, blur, mirror, import/export, and texture layers. Layer images can be edited independently. [Official texture editor guide](https://vroid.pixiv.help/hc/en-us/articles/4405430561817-How-to-use-the-Texture-Editor), [layer guide](https://vroid.pixiv.help/hc/en-us/articles/4405436884633-I-want-to-learn-more-about-layers)

Apply those ideas in stages:

1. Preserve the source texture. Paint separate editable color/highlight layers; show brush diameter, opacity, active layer, and a bounded preview.
2. Expose a UV overlay and selected material. If many strands share UVs, painting one UV region changes all those strands. Say this before users try to paint a unique forelock.
3. Give the forelock its own authored hair group/material or unique UV island. A global hair tint cannot express a localized accent.
4. Distinguish a painted highlight from a lighting-dependent MToon response. A base-color painting feature should be labelled as such; do not advertise independent VRoid highlight-map parity until the shader channel, project persistence, and export mapping are actually implemented.
5. Keep PNG export and external painter roundtrip available. A 2D painting release can be useful without falsely claiming 3D projection, pressure response, or every VRoid tool.

## Stable topology is the practical route to a sculptable VRM

Blender shape keys record positions on an existing vertex topology. They are suitable for likeness adjustments and expressions; topology changes after shape-key authoring need care because the keys share the same vertices. [Blender shape-key workflow](https://docs.blender.org/UATEST/manual/en/dev/animation/shape_keys/workflow.html)

Blender stores relative keys as shape snapshots, with deltas computed relative to their reference. Replacing only the reference can change every expression's effective displacement. A likeness baseline change therefore requires coherent handling of the Basis and other key snapshots, followed by expression checks; it is not simply “move Basis and everything stays correct.” [Blender shape-key panel](https://docs.blender.org/manual/ka/latest/animation/shape_keys/shape_keys_panel.html)

The maintained VRM Add-on for Blender supports VRM import/export, humanoid settings, MToon configuration, and a Python automation API. It is the appropriate native authoring bridge for work that exceeds the browser's current controls. [Official project](https://github.com/saturday06/VRM-Addon-for-Blender)

Our browser engine stores source-accessor offsets and patches the original GLB. This preserves vertex identity and rig references without applying a general exporter to the live shader objects. See [3DHAUS transfer audit](3DHAUS-SCULPT-AUDIT.md). Small local sculpt edits preserve an addressable rig; they do not automatically reposition bones or guarantee eyelid and lip closure. Subdivision, voxel remesh, aggressive decimation, and automatic re-rigging belong on a separate authoring copy, followed by retopology/weight and expression work before release.

## Concrete Quan pipeline

This is the recommended production workflow. A stage counts as complete only when its outputs and acceptance checks exist.

1. **Lock the visual reference set.** Keep the approved portrait/front headshot and sheet visible. Compare neutral front, profile and three-quarter views. Record which details are canonical versus proposed—especially outfit and hidden hairstyle surfaces. Avoid burning temporary camera/perspective differences into facial anatomy.
2. **Choose a rigged base with the right facial topology.** Audit license, vertex density around eyelids/lips, separate eyes/mouth/hair, humanoid mapping, expressions, units and UVs. Greater catalog size does not imply greater controllability; prefer a few documented families with consistent semantic controls.
3. **Sculpt likeness as a reversible identity layer.** Start jaw/chin, brow ridge, cheek volume, nose bridge/tip and ear silhouette. Use modest bind-space edits, symmetry until purposeful asymmetry is needed, and masks protecting eyes/teeth/eyelashes. Compare silhouettes at multiple angles before fine paint.
4. **Author the hairstyle.** Build or adapt actual hair cards/strands for the swept silhouette. Keep scalp, dark hair, and mint forelock distinguishable. Preserve a `.blend` source for guide curves, UVs and spring-bone authoring. VRM is the deliverable, not a replacement for this editable source.
5. **Paint surfaces.** Match skin in neutral lighting; add brows, iris, hair grain and controlled highlights on separate layers. Preserve source alpha and UV transforms. Check that the forelock color stays local and export reproduces the editor's color space.
6. **Validate expression and motion.** Check both blinks, gaze extremes, vowels, smile, mouth interior, head turn, and shoulders. Repair the affected expression keys and weights where required. Test hair clipping and spring behavior with the finished silhouette.
7. **Package a Quan family preset.** Store identity parameters/sculpt, layer sources, texture outputs, source VRM hash, provenance, and the authoring `.blend`. Freeze a canonical Quan preset; let seeded randomization vary only deliberate, bounded family controls. Randomization must not silently replace Quan's defining features or mix incompatible hair meshes.
8. **Prove the handoff.** Reload the exported VRM in Character Studio and PoseLab, verify geometry and skin tone against the saved project, then inspect expressions again. Only assets passing this process enter the reusable generator catalog.

## Earlier references and rejected shortcuts

**three-vrm remains the runtime.** It loads/renders VRM and exposes expression/humanoid controls. It is not a topology editor or likeness generator. [Official repository](https://github.com/pixiv/three-vrm)

**KalidoKit remains a tracking reference.** The maintainer marks it deprecated; its face/body/hand solvers convert detected landmarks into rig signals. Neither it nor a face tracker reconstructs the finished neutral Quan mesh or authors hair. [Official repository](https://github.com/yeemachine/kalidokit), [our earlier tracking review](tracking-references.md)

Do not rename a generated GLB to `.vrm` and call it complete. Do not apply Decentraland-specific skin repair to arbitrary VRM faces. Do not imply every permissive code license grants reuse of bundled models, weights or third-party presets. Do not replace a working rig with an AI result merely because its static thumbnail is attractive. The acceptance target is Quan's likeness plus an editable, expressive, reproducible model.
