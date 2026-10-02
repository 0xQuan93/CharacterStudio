# Workbench starter assets and rights

The workbench code is under the repository's MIT license. Bundled model source files and derivatives are separate assets. The catalog records author, license, source link, and SHA-256 for each runtime model in [`catalog.json`](../../public/workbench-assets/catalog.json).

| Starter | Publisher and source | Rights evidence | Local provenance |
| --- | --- | --- | --- |
| Human Face Study and Anime Hair Study | pixiv Inc., historical VRoid beta [HairSample_Male](https://github.com/madjin/vrm-samples/blob/master/vroid/beta/HairSample_Male.vrm) | [pixiv FAQ](https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use) identifies this historical sample as CC0; embedded metadata also says CC0 | [`RECEIPT.json`](../../public/workbench-assets/RECEIPT.json), [`human-hair-male-LICENSE.json`](../../public/workbench-assets/human-hair-male-LICENSE.json), [face derivative](FACE-CONTROLS.md) |
| Female Hair Study | pixiv Inc., historical VRoid beta [HairSample_Female](https://github.com/madjin/vrm-samples/blob/master/vroid/beta/HairSample_Female.vrm) | Same [pixiv FAQ](https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use); embedded metadata says CC0 | [female receipt](../../public/workbench-assets/humanoid-expansion/RECEIPT.json) |
| Friendly Robot | [Quaternius creator upload](https://opengameart.org/content/animated-lowpoly-robot) | CC0 on creator listing and bundled [`robot-LICENSE.txt`](../../public/workbench-assets/robot-LICENSE.txt) | [`RECEIPT.json`](../../public/workbench-assets/RECEIPT.json), retained source ZIP |
| Little Bat and Slime | [Quaternius creator upload](https://opengameart.org/content/lowpoly-animated-monsters) | CC0 on creator listing and bundled [`monsters-LICENSE.txt`](../../public/workbench-assets/monsters-LICENSE.txt) | [`RECEIPT.json`](../../public/workbench-assets/RECEIPT.json), retained source ZIP |
| Signal spirit | Original procedural character by 0xQuan and Codex | Included with this fork | Generated in `src/workbench/`; no downloaded character model |

The Quaternius GLBs are local conversions of original FBX/OBJ archives. The historical human VRM derivatives preserve their original metadata; the included repairs and target construction are described by their receipts and [face study details](FACE-CONTROLS.md). The historical CC0 exception does not extend to current VRoid presets or to models that users import.

`assets-source/mpfb-face-foundation/` contains pinned MakeHuman/MPFB base mesh, rig, weights, and facial target data under the included CC0 asset dedication. The MPFB application code has a different license and is not included. This source pack is not an installed browser catalog item or a drop-in VRM. Its [`README.md`](../../assets-source/mpfb-face-foundation/README.md) and [`RECEIPT.json`](../../assets-source/mpfb-face-foundation/RECEIPT.json) record the source revision and exact files.

External assets loaded into the classic upstream editor through `npm run get-assets` are not part of this curated CC0 library. Verify their separate terms before redistribution.
