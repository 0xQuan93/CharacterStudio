# Avatar assets and creator research

> Dated research snapshot. See the current [product specification](../PRODUCT-SPEC.md) and [verification ledger](../VERIFICATION.md) for implementation and acceptance that occurred after the initial audit. Local workspace paths below identify inspected copies; this document does not publish or relicense private companion code.
Verified 2026-09-17. Scope: local Linux creator for people, creatures, robots, and original Zephyr assets. Recommendations distinguish tool code, asset copyright, and embedded VRM permissions. Downloadable is not synonymous with redistributable.

## Installed starter library

Four self-contained models are staged in `repos/CharacterStudio/public/workbench-assets/`, with `catalog.json`, SHA-256 `RECEIPT.json`, original Quaternius ZIPs, their packaged license texts, human VRM metadata, and a conversion script. Total model payload is 20.76 MB decimal; retained source archives add 8.42 MB. No full asset collection was cloned.

| Model | Format / size | Provenance and rights | Intended role |
|---|---|---|---|
| Historical HairSample_Male | VRM 0, 18,481,892 bytes | pixiv Inc.; official FAQ explicitly lists this historical sample as CC0. Downloaded from madjin's clearly identified mirror; embedded metadata also says CC0, Everyone, commercial use Allow. | Anime face/hair editing and human VRM regression scaffold; not finished Quan |
| Friendly Robot | GLB, 1,429,936 bytes; 14 clips | Quaternius, CC0, original creator-uploaded archive includes license | Robot/generic skeleton editing; not a replacement design for Zephyr |
| Little Bat | GLB, 530,032 bytes; 5 clips | Quaternius, CC0, original creator-uploaded archive includes license | Nonhumanoid animation and material workflow |
| Slime | GLB, 320,192 bytes; 4 clips | Quaternius, same source/rights | Nonhumanoid expressive creature workflow |

Human license evidence: [official historical sample FAQ](https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use). [Exact mirror file](https://github.com/madjin/vrm-samples/blob/master/vroid/beta/HairSample_Male.vrm), [raw download](https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/HairSample_Male.vrm). This is an explicitly named historical exception, not permission to reuse modern VRoid presets generally.

Robot: [creator's listing](https://opengameart.org/content/animated-lowpoly-robot), [direct source ZIP](https://opengameart.org/sites/default/files/Animated%20Robot%20-%20Oct%202018.zip). Creatures: [creator's listing](https://opengameart.org/content/lowpoly-animated-monsters), [direct source ZIP](https://opengameart.org/sites/default/files/Animated%20Monster%20Pack%20by%20%40Quaternius.zip). These pages identify Quaternius as uploader and CC0 as license. Source archives contain FBX, OBJ and Blend; GLBs are local conversions, not upstream originals.

All four models' GLB JSON chunks were parsed: internal buffers/images are self-contained, meshes and skins exist, and converted animations remain present. FBXLoader trims vertices with more than four weights; GLTFExporter approximates legacy Phong materials. Browser validation must assess deformation and appearance. Do not call the creature GLBs VRM-compatible: they lack humanoid metadata and are intended for generic skeleton playback. The public-domain dedication permits editing, redistribution, commercial use, and generator inclusion without required attribution; provenance is retained voluntarily.

## Parametric foundation: MPFB / MakeHuman

MPFB is the strongest longer-term foundation for an independently redistributable humanoid generator. Its asset license explicitly covers base geometry, morph targets, textures, clothes, rigs, poses and expressions as CC0; its Blender add-on code is GPLv3, whereas MakeHuman application code is AGPL. Generated graphical output is treated separately. [Exact split-license definition](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md).

The project explicitly permits taking its base mesh, targets and system asset pack to build another character generator. This unusually direct permission fits our intended application. Keep asset ingestion separate from copying GPL/AGPL implementation code; using CC0 mesh data does not require relicensing Character Studio's code. [Generator reuse FAQ](https://static.makehumancommunity.org/mpfb/faq/build_other_chargen.html).

| Pack | Published ZIP size | Why useful | License |
|---|---:|---|---|
| [System assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) | 267 MB | Eyes, teeth, brows, hair, clothes, proxies; includes toon01 skin and low-poly eyes | CC0 |
| [Hair 01](https://static.makehumancommunity.org/assets/assetpacks/hair01.html) | 217 MB | Stylized/low-poly styles including Cortu short messy hair, straight bangs, and learning_anime_hair | CC0 |
| [Shirts 01](https://static.makehumancommunity.org/assets/assetpacks/shirts01.html) | 23 MB | Basic tops and fisherman sweater for adapting our own outfit | CC0 |
| [Pants 01](https://static.makehumancommunity.org/assets/assetpacks/pants01.html) | 20 MB | Base wardrobe | CC0 |
| [Shoes 01](https://static.makehumancommunity.org/assets/assetpacks/shoes01.html) | 79 MB | Shoes/boots | CC0 |
| [Suits 02](https://static.makehumancommunity.org/assets/assetpacks/suits02.html) | 183 MB | Fantasy/science-fiction wardrobe | CC0 |
| [Faceunits 01](https://static.makehumancommunity.org/assets/assetpacks/faceunits01.html) | 0.2 MB | Mika Suominen's ARKit-style face targets | CC0 per functional-pack index |

Direct downloads use `https://files2.makehumancommunity.org/asset_packs/PACK/PACK_cc0.zip`, where PACK is `makehuman_system_assets`, `hair01`, `shirts01`, `pants01`, `shoes01`, or `suits02`. These exact URLs were extracted from official pages. Functional face units use [faceunits01.zip](https://files2.makehumancommunity.org/functional/faceunits01.zip); Meta/Oculus-style speech targets use [visemes02.zip](https://files2.makehumancommunity.org/functional/visemes02.zip). The [pack index](https://static.makehumancommunity.org/assets/assetpacks.html) separates CC0 and CC-BY sets: do not assume all community content is CC0.

These are MakeHuman/MPFB source assets, not drop-in Character Studio VRMs. Production work must fit garments to the selected morphology, bake valid skin weights and compatible morphs, map a humanoid skeleton, prepare portable materials, and export. Prefer a curated subset over installing every pack. Exact Quan face, swept mint fringe, and high collar still require art direction and authored edits.

## Other useful asset families

| Source | Verified capabilities / license | Application fit |
|---|---|---|
| [Quaternius Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html) | 11 characters, four swappable sections, 24 animations; CC0; FBX/OBJ/glTF/Blend described upstream | Modular wardrobe/proportion and NPC seed library; stylized low-poly rather than manga. [Official download folder](https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX?usp=sharing) |
| [Quaternius Ultimate Monsters](https://quaternius.com/packs/ultimatemonsters.html) | 50 animated creatures, CC0; FBX/OBJ/Blend and glTF listed | Larger bestiary after proving the small Bat/Slime set. [Official download folder](https://drive.google.com/drive/folders/18m4KpzpEzhC9wl7jzr6dUc0N8Jozr79C?usp=sharing) |
| [Kenney Animated Characters Protagonists](https://kenney.nl/assets/animated-characters-protagonists) | Actual official ZIP inspected: 581,441 bytes, one FBX model, four PNG skins plus editable SVG sources, idle/jump/run FBX; packaged CC0 license | Exceptionally lightweight material/skin template; conversion needed, no packaged GLB. [Exact download](https://kenney.nl/media/pages/assets/animated-characters-protagonists/608191acc4-1774773108/kenney_animated-characters-protagonists.zip) |
| [Quaternius Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) | Humanoid animation library and mannequin; GLB/FBX, CC0; source Blend tied to source tier | Retargeting test suite and motion preview. Verify which clips the free tier actually contains before promising all 120+ |
| [Blender human base meshes](https://www.blender.org/download/demo-files/) | Official page lists Human Base Meshes v1.4.1, 49 MB, CC0, Blender 4+ | Sculpting reference/foundation; no automatic avatar-generator rig or VRM claim |

## Creators: borrow workflows and open components carefully

**VRoid Studio:** reference workflow for body/face sliders, editable UV textures, stroke-built hair, hair bounce, and VRM export. Its official supported desktop downloads are Windows/macOS; Linux operation was not tested. It is freeware, not the open-source engine for our app. [Official feature overview](https://vroid.com/en/studio).

Current VRoid mesh/preset content is not CC0. Its guidelines require a separate pixiv license for an application generating models from modified/combined VRoid-created meshes/textures (self-only use is excepted). Therefore current presets and A–Z samples must not become our redistributable creator catalog. The historical CC0 sample above is handled with exact file and official evidence. [Guidelines](https://vroid.com/en/studio/guidelines), [current samples' special conditions](https://vroid.pixiv.help/hc/ja/articles/4402394424089-AvatarSample-A-Z).

**MPFB:** reference for morphological controls, rigging, fitted clothes, presets, batch generation, and expression export. Native Blender integration is suitable for Linux asset authoring; interactive performance on this AMD machine is unmeasured. [Project](https://static.makehumancommunity.org/mpfb.html).

**VRM Add-on for Blender:** import/export/edit bridge for prepared humanoids. Follow its installation/version requirements; it supplies tooling rather than a blanket license for loaded models. [Primary repository](https://github.com/saturday06/VRM-Addon-for-Blender).

**M3 avatar catalogs:** discovery/interop references, not universal rights grants. [M3 avatars](https://github.com/M3-org/avatars) includes mixed third-party characters and needs model-by-model provenance. [PolygonalMind 100Avatars](https://github.com/PolygonalMind/100Avatars) invites adaptations but its README restricts direct resale without major modification; it is not a clean CC0 catalog. Do not label it CC0 or silently fold it into an unrestricted starter pack. Character Studio's MIT code license does not change imported avatar rights.

## Product consequences

Maintain two explicit pipelines: humanoids preserve VRM expressions, spring bones and license metadata; creatures/robots preserve ordinary glTF skeletons and named clips. Material editing and scene framing can be shared, while humanoid retargeting and generic animation remain distinct. Zephyr should be authored against established references, with modular body pieces and original motion rather than forcing a human skeleton.

Every catalog item should preserve original source URL, author, source-file digest, license evidence, conversion history, and rig category. Presets should reference stable asset IDs plus edits, not silently rewrite asset provenance. On export, derive permissions from all constituent assets; never stamp CC0 on an avatar merely because the application is open source.

Near-term feature order: curated asset chooser → materials/color regions → morph/expression controls where present → original editable hair/wardrobe parts → saved projects and undo → validated GLB/VRM export. Longer-term MPFB ingestion provides real body/face parameters and garment refitting. Installing asset packs alone does not implement those geometry systems.
