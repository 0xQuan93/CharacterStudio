# Human Face Study derivative

`public/workbench-assets/human-face-controls.vrm` is an asset-specific derivative of the historical CC0 VRoid beta HairSample_Male model. It adds three bounded identity morphs while retaining the original binary data, textures, skeleton, spring bones, expressions and VRM license metadata. The original remains untouched. The sibling JSON receipt records exact source/output hashes.

| Target | Mesh / target | Positive direction | Maximum vertex displacement |
| --- | --- | --- | --- |
| Jaw width | 0 / 39 | Wider lower jaw | 7.4 mm |
| Chin length | 0 / 40 | Longer chin | 8.0 mm |
| Nose width | 0 / 41 | Wider nose | 3.8 mm |

Recommended weights are -1 through 1. The targets use smooth spatial fields fitted to this sample's coordinates, not generic facial landmark detection. Vertices above the lower-face region remain fixed; the chin operation does not move the mouth. These controls are modest anime face edits, not a replacement for a complete anatomical generator or a sculpting tool. There is no new hairstyle or eye-size target.

`python scripts/build-face-controls.py` deterministically reconstructs the derivative. The script checks its exact source hash before writing and appends both POSITION and NORMAL targets. Normal deltas follow the inverse-transpose Jacobian of each displacement field. Target names appear in mesh and primitive `extras.targetNames`; `mesh.extras.characterStudioIdentity` records the version and supported weight ranges.

Verification:

- `python tests/face-controls.test.py` checks preserved source payload, rig/material/VRM metadata, original expression targets, consistent target counts, nonzero bounded displacement, and unchanged upper face.
- Khronos glTF Validator reports zero errors. Uncapped warning counts and codes exactly match the original: 87,115 inherited warnings, mostly zero-weight joint references. VRM itself is an unsupported validator extension, so the browser runtime check remains necessary.
- Browser/Three-VRM render inspection at neutral and all-three combined +/-1 showed coherent silhouettes and unchanged eye placement during local acceptance. Recheck visual deformation after modifying this derivative or loading it in a different avatar runtime.

The existing hair contains authored strands, joints and spring-bone behavior. A coordinate-scale operation has not been presented as a new haircut; a new hairstyle should be authored and checked against scalp collisions and its rig.
