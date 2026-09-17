#!/usr/bin/env python3
"""Append bounded identity morphs to the specific CC0 VRoid beta sample.
No dependencies; original bytes, expressions, skeleton and VRM metadata retained.
This is deliberately asset-specific, not a general facial landmark algorithm.
"""
import hashlib, json, math, struct
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/workbench-assets/human-hair-male.vrm'
OUTPUT = SOURCE.with_name('human-face-controls.vrm')
NAMES = ['Identity_JawWidth', 'Identity_ChinLength', 'Identity_NoseWidth']

def smooth(a, b, x):
    t = max(0, min(1, (x-a)/(b-a)))
    return t*t*(3-2*t)

def delta(kind, p):
    x,y,z = p; x -= 0.00050885
    front = 1-smooth(-0.045, -0.02, z)
    if kind == 0:
        weight = (1-smooth(1.54, 1.58, y))*smooth(1.49,1.515,y)*front
        return (x*0.12*weight, 0, 0)
    if kind == 1:
        weight = (1-smooth(1.505,1.538,y))*front
        return (0, -0.008*weight, 0)
    weight = (1-smooth(0.007,0.023,abs(x)))*smooth(1.548,1.558,y)*(1-smooth(1.574,1.589,y))*(1-smooth(-0.109,-0.096,z))
    return (x*0.4*weight,0,0)

def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def normal_delta(kind,p,n):
    # Inverse-transpose Jacobian of the continuous displacement field.
    columns=[]; h=0.00001
    for axis in range(3):
        plus=list(p); minus=list(p); plus[axis]+=h; minus[axis]-=h
        dp=delta(kind,plus); dm=delta(kind,minus)
        columns.append([(1 if axis==i else 0)+(dp[i]-dm[i])/(2*h) for i in range(3)])
    cof=[cross(columns[1],columns[2]),cross(columns[2],columns[0]),cross(columns[0],columns[1])]
    transformed=[sum(cof[k][i]*n[k] for k in range(3)) for i in range(3)]
    length=math.sqrt(sum(v*v for v in transformed))
    return [transformed[i]/length-n[i] for i in range(3)]

def build():
    raw=SOURCE.read_bytes(); size=struct.unpack_from('<I',raw,12)[0]; doc=json.loads(raw[20:20+size]); binary=bytearray(raw[28+size:])
    assert hashlib.sha256(raw).hexdigest() == 'b1e0179be9b42cf7ddc9ab52ef336e864cd39cc971db2a0151e5b115c16bf7fe'
    def accessor(i):
        a=doc['accessors'][i]; v=doc['bufferViews'][a['bufferView']]
        assert a['componentType']==5126 and a['type']=='VEC3' and not a.get('sparse') and not v.get('byteStride')
        offset=v.get('byteOffset',0)+a.get('byteOffset',0)
        return list(struct.iter_unpack('<fff',binary[offset:offset+a['count']*12]))
    positions=accessor(0); normals=accessor(1); mesh=doc['meshes'][0]
    assert all(p['attributes']['POSITION']==0 and len(p['targets'])==39 for p in mesh['primitives'])
    names=mesh['primitives'][0]['extras']['targetNames'] + NAMES
    stats=[]
    def append(values):
        while len(binary)%4: binary.append(0)
        offset=len(binary); payload=b''.join(struct.pack('<fff',*v) for v in values); binary.extend(payload)
        view=len(doc['bufferViews']); doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(payload),'target':34962})
        index=len(doc['accessors']); doc['accessors'].append({'bufferView':view,'componentType':5126,'count':len(values),'type':'VEC3','min':[min(v[k]for v in values)for k in range(3)],'max':[max(v[k]for v in values)for k in range(3)]})
        return index
    for kind,name in enumerate(NAMES):
        deltas=[delta(kind,p)for p in positions]
        assert all(d==(0,0,0) for p,d in zip(positions,deltas) if p[1]>=1.589), 'Eye/upper face must stay fixed'
        peak=max(math.sqrt(sum(x*x for x in d))for d in deltas)
        assert 0 < peak <= 0.012
        target={'POSITION':append(deltas),'NORMAL':append([normal_delta(kind,p,n)for p,n in zip(positions,normals)])}
        for primitive in mesh['primitives']: primitive['targets'].append(target.copy())
        stats.append({'name':name,'index':39+kind,'maxDisplacementMeters':peak})
    mesh.setdefault('extras',{})['targetNames']=names
    mesh['extras']['characterStudioIdentity']={'version':1,'targets':[{'index':39+i,'name':name,'min':-1,'max':1}for i,name in enumerate(NAMES)]}
    for primitive in mesh['primitives']: primitive['extras']['targetNames']=names
    if 'weights' in mesh: mesh['weights'] += [0]*3
    for node in doc['nodes']:
        if node.get('mesh')==0 and 'weights'in node: node['weights'] += [0]*3
    assert not doc.get('animations'), 'Animation weight channels need explicit resizing'
    doc['buffers'][0]['byteLength']=len(binary)
    encoded=json.dumps(doc,separators=(',',':')).encode(); encoded+=b' '*((-len(encoded))%4)
    result=struct.pack('<III',0x46546c67,2,12+8+len(encoded)+8+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
    OUTPUT.write_bytes(result)
    receipt={'source':SOURCE.name,'sourceSha256':hashlib.sha256(raw).hexdigest(),'output':OUTPUT.name,'sha256':hashlib.sha256(result).hexdigest(),'license':'CC0-1.0','targets':stats,'safeWeightRange':[-1,1],'notes':'Asset-specific lower-face deformations. Untouched eye vertices, original skeleton, textures, VRM metadata and expression targets. Normal deltas from displacement Jacobian. Not an anatomical human generator.'}
    OUTPUT.with_suffix('.json').write_text(json.dumps(receipt,indent=2)+'\n'); print(json.dumps(receipt,indent=2))
if __name__=='__main__': build()
