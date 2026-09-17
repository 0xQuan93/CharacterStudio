# 3DHAUS deformation transfer into Character Studio

Local source inspection: 2026-09-17. Source: private `repos/3DHAUS`, commit `f17349dfd6bb52425c2c77982818033d2e30f3e5`. The source repository was clean and was not changed. Followed its wearhaus-code-audit and wearhaus-3d-asset-pipeline skills. This is authorized local integration; the private application and its assets have no assumed public redistribution grant.

## What is actually implemented in 3DHAUS

`src/three/Viewer.tsx` calls `applyShapeToRoot` both after a model loads and when shape state changes. It is a live editor engine, not an unused proposal. `src/three/dclRepresentationEngine.ts` also uses it in preparation of representations.

`src/three/shapeDeformer.ts` provides four relevant mechanisms:

1. `originalPositions` saves a stable baseline. Each parameter pass derives geometry from original vertices, so slider operations do not repeatedly deform the last result.
2. `applyShapeToGeometry` applies smooth height/width masks for upper-body garments, trousers, and footwear. Its width, taper, clearance, opening constraints, and avatar cushion assumptions are tailored to Decentraland garments.
3. `relaxDeformedTopology` averages deformation offsets across triangle neighbors; it does not smooth away the untouched garment silhouette. This is the directly useful foundation for an avatar sculpt relaxation tool.
4. `repairSkinWeights` resets to original joint data, then transfers/repaints weights using source surfaces and hardcoded `Avatar_*` bone/capsule assumptions. This is unsuitable for indiscriminate use on VRM faces or arbitrary creature rigs.

The generic Three.js exporter in `src/three/glbExport.ts` uses `includeCustomExtensions: false`. It is appropriate to its garment workflow but does not constitute a metadata-preserving VRM exporter. Character Studio therefore retains its original-document patch exporter.

## Transfer implemented here

`src/workbench/sculpt.js` is a focused new JavaScript implementation of the transferable architecture: immutable source positions, smooth spherical masks, bounded displacement, triangle-neighbor relaxation of offsets, and source vertex identity. No DCL bone names, garment fitting constants, or skin repainting rules were copied into the avatar engine.

- Inflate/deflate displaces along source bind normals.
- Move displaces along a supplied local unit direction.
- Smooth relaxes existing sculpt deltas. It does not remesh or perform subdivision.
- Optional X symmetry reflects the brush and move direction around a specified local plane. Overlapping mirrored brushes use their maximum influence, so the center is not stamped twice. This preserves a symmetric input under symmetric edits; it does not automatically symmetrize an asymmetric source.
- Optional membership masks lock other facial parts or materials.
- Each stroke returns new sparse offsets. Caller commits once per gesture to its project history.
- Normal reconstruction accumulates all source triangles sharing a POSITION accessor. It preserves fallback normals at unreferenced or degenerate vertices.

The first UI integration targets VRM humanoids with meter-scale geometry. Displacement is capped at 0.12 local units by the caller. The pure core limits each source array to 300,000 vertices and each edit map to 50,000 changed vertices. These are workbench constraints, not VRM format limits or guarantees of safe anatomy.

## Integration contract

Persist edits as `project.sculpt[positionAccessorIndex][sourceVertexIndex] = [dx, dy, dz]`. The numbers are offsets in the original POSITION accessor's mesh-local bind coordinates. They are not screen, posed, or normalized display coordinates.

```js
const offsets = sculptStroke({
  positions: originalPositions, // flat XYZ source accessor order
  normals: originalNormals,
  indices: allTrianglesUsingThisPositionAccessor,
  offsets: project.sculpt[accessorIndex] || {},
  center: bindSpaceBrushCenter,
  radius: 0.03,
  strength: 0.3,
  mode: 'inflate', // also move, smooth
  symmetry: true,
  symmetryPlane: 0,
  maxDisplacement: 0.12,
  vertexMask: optionalMembershipMask,
})
const positions = applySculptOffsets(originalPositions, offsets)
const normals = recalculateNormals(positions, allTriangles, originalNormals)
```

`sculptNeighbors(vertexCount, indices)` can be cached for smooth strokes. `validateSculptOffsets` checks persisted offsets independently. Preview and export must apply the same offsets to the same source vertex order and reconstruct the same normals.

The exporter should append or replace the intended POSITION/NORMAL accessor data while keeping UVs, indices, joint weights, joint indices, inverse bind matrices, node hierarchy, expression target indices, morph delta arrays, spring bones, metadata, and animation references intact. Update POSITION min/max. Do not overwrite shared buffer bytes accidentally: attributes may be interleaved or shared, and unsupported compression/sparse accessor layouts need explicit handling or rejection.

## Boundaries and verification

A posed skinned ray hit is not a bind-space point. `mesh.worldToLocal(hit.point)` only removes the object transform; it does not remove skeletal deformation. Either sculpt an explicit neutral bind-pose proxy or recover the bind-space location from the hit triangle's vertex correspondence. Disable expression/animation movement during a gesture. The [Three.js SkinnedMesh implementation](https://github.com/mrdoob/three.js/blob/dev/src/objects/SkinnedMesh.js) applies the bind matrices and joint blend separately from the object's world matrix.

Topology preservation keeps existing rig and expression references addressable. It does not guarantee blink/lip closure after large face changes, fix clothes that clip, or move bones to match a reshaped body. Sculpting cannot add missing hair cards, create a new hairline topology, create ears that do not exist, or turn a low-resolution base into a detailed face. Existing duplicate vertices at UV seams are not welded automatically; that would need a source-aware seam constraint including joint signatures. Keep brush radius small, work on a compatible base, and inspect expressions after changes.

Seven core regression groups in `tests/workbench-sculpt.test.mjs` pass: local edits/source immutability, repeated displacement bounds, bilateral/centerline symmetry, membership locking, delta smoothing, malformed input rejection, and shared-accessor normal reconstruction. This isolated core test is not a claim that the complete viewport or VRM export workflow has passed; integration QA is recorded separately by the main implementation.
