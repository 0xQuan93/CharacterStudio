import fs from 'node:fs';
import { FBXLoader } from '/home/oxquan/Work/repos/CharacterStudio/node_modules/three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from '/home/oxquan/Work/repos/CharacterStudio/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
globalThis.window = globalThis;
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(x => {this.result=x; this.onloadend?.();}); }
  readAsDataURL(blob) { blob.arrayBuffer().then(x => {this.result=`data:${blob.type};base64,${Buffer.from(x).toString('base64')}`; this.onloadend?.();}); }
};
// FBXLoader may supply multiple joint branches whose first joint is not their
// shared root. GLTFExporter uses that first joint as skin.skeleton. Correct only
// this optional hint; preserve joint arrays, inverse bind matrices and clips.
export function repairSkinRoots(input,omitInvalid=false) {
 const bytes=Buffer.from(input), jsonLength=bytes.readUInt32LE(12);
 const doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
 const parents=new Map();
 (doc.nodes||[]).forEach((node,index)=>(node.children||[]).forEach(child=>parents.set(child,index)));
 const ancestors=index=>{const path=[],seen=new Set();while(index!==undefined&&!seen.has(index)){path.push(index);seen.add(index);index=parents.get(index);}return path;};
 let changed=false;
 for(const [index,skin] of (doc.skins||[]).entries()) {
  if(skin.skeleton===undefined || !skin.joints?.length)continue;
  const chains=skin.joints.map(ancestors);
  if(chains.every(chain=>chain.includes(skin.skeleton)))continue;
  const root=omitInvalid?undefined:chains[0].find(node=>chains.every(chain=>chain.includes(node)));
  console.log('Repair skin root',{skin:index,previous:skin.skeleton,root:root??'omitted'});
  if(root===undefined)delete skin.skeleton;else skin.skeleton=root;
  changed=true;
 }
 if(!changed)return bytes;
 const text=Buffer.from(JSON.stringify(doc)), padded=Buffer.alloc(Math.ceil(text.length/4)*4,0x20);text.copy(padded);
 const rest=bytes.subarray(20+jsonLength),output=Buffer.alloc(20+padded.length+rest.length);
 bytes.copy(output,0,0,20);output.writeUInt32LE(output.length,8);output.writeUInt32LE(padded.length,12);padded.copy(output,20);rest.copy(output,20+padded.length);
 return output;
}
if(process.argv[2]==='--repair-vrm') {
 const path=new URL('./human-hair-male.vrm',import.meta.url);
 const original=new URL('./human-hair-male.source.vrm',import.meta.url);
 if(!fs.existsSync(original))fs.copyFileSync(path,original);
 fs.writeFileSync(path,repairSkinRoots(fs.readFileSync(path),true));
} else if(process.argv[2]==='--repair-existing') {
 for(const name of ['robot','bat','slime']) {
  const path=new URL(`./${name}.glb`,import.meta.url);
  fs.writeFileSync(path,repairSkinRoots(fs.readFileSync(path)));
 }
} else for (const name of ['Robot','Bat','Slime']) {
 const data=fs.readFileSync(`/tmp/avatar-asset-convert/${name}.fbx`);
 const scene=new FBXLoader().parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 // The old Blender FBX stores Opacity=1 in its material property template,
 // while instances supply TransparentColor=white. FBXLoader does not inherit
 // the template Opacity and falls back to 1-TransparentColor, making all zero.
 // Recover authored opacity by exact material name from the same publisher's
 // bundled OBJ/MTL export. This is source-specific conversion, not an import
 // policy that forces arbitrary user materials opaque.
 const mtl=fs.readFileSync(new URL(`./${name}.mtl`,import.meta.url),'utf8');
 const opacity=new Map();let materialName;
 for(const line of mtl.split(/\r?\n/)) {
  if(line.startsWith('newmtl '))materialName=line.slice(7).trim();
  if(line.startsWith('d ')&&materialName)opacity.set(materialName,Number(line.slice(2)));
 }
 scene.traverse(object=>{for(const material of [object.material].flat().filter(Boolean)) {
  const value=opacity.get(material.name);
  if(value===undefined)throw new Error(`No source MTL opacity for ${name}/${material.name}`);
  material.opacity=value;material.transparent=value<1;material.needsUpdate=true;
 }});
 let meshes=0,bones=0;scene.traverse(o=>{if(o.isMesh)meshes++;if(o.isBone)bones++;});
 const glb=await new GLTFExporter().parseAsync(scene,{binary:true,animations:scene.animations});
 fs.writeFileSync(new URL(`./${name.toLowerCase()}.glb`,import.meta.url),repairSkinRoots(glb));
 console.log(name,{bytes:glb.byteLength,meshes,bones,animations:scene.animations.map(a=>a.name)});
}
