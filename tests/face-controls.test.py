"""Regression checks for the deterministic CC0 derivative (no third-party Python packages)."""
import json, struct, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'public/workbench-assets'
def read(name):
    b=(ROOT/name).read_bytes();n=struct.unpack_from('<I',b,12)[0]
    return json.loads(b[20:20+n]), b[28+n:]
def values(doc,b,index):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    return list(struct.iter_unpack('<fff',b[offset:offset+a['count']*12]))
class FaceControls(unittest.TestCase):
    def test_preserves_source(self):
        source,b=read('human-hair-male.vrm');edited,out=read('human-face-controls.vrm')
        self.assertEqual(out[:len(b)],b)
        for key in ['extensions','skins','nodes','materials','textures','images']:
            self.assertEqual(edited[key],source[key],key)
        for orig,derivative in zip(source['meshes'][0]['primitives'],edited['meshes'][0]['primitives']):
            self.assertEqual(derivative['targets'][:39],orig['targets'])
    def test_bounded_targets_and_eye_exclusion(self):
        doc,b=read('human-face-controls.vrm');p=values(doc,b,0);mesh=doc['meshes'][0]
        expected=['Identity_JawWidth','Identity_ChinLength','Identity_NoseWidth']
        self.assertEqual(mesh['extras']['targetNames'][39:],expected)
        for primitive in mesh['primitives']:
            self.assertEqual(len(primitive['targets']),42)
            self.assertEqual(primitive['extras']['targetNames'],mesh['extras']['targetNames'])
        for target in mesh['primitives'][0]['targets'][39:]:
            d=values(doc,b,target['POSITION']); normals=values(doc,b,target['NORMAL'])
            self.assertEqual(len(d),len(p)); self.assertEqual(len(normals),len(p))
            self.assertGreater(max(sum(v*v for v in x) for x in d),0)
            self.assertLessEqual(max(sum(v*v for v in x) for x in d),0.012**2)
            for position,change in zip(p,d):
                if position[1]>=1.589: self.assertEqual(change,(0,0,0))
if __name__=='__main__': unittest.main()
