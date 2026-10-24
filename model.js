// Loads the helijah UH-60 (CC BY 4.0) and normalises it: metres, nose +X, up +Y, right side +Z, wheels on y=0.
import * as THREE from 'three';
import { USDLoader } from 'three/addons/loaders/USDLoader.js';
export const GROUP = { tailRotor: 0, mainRotor: 23, fuselage: 31 };
export async function loadHeli(url = './model/uh60.usdz') {
  const root = await new USDLoader().loadAsync(url);
  let mesh; root.traverse(o => { if (o.isMesh) mesh = o; });
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), sz = box.getSize(new THREE.Vector3());
  const s = 19.76 / Math.max(sz.x, sz.y, sz.z);
  root.scale.setScalar(s); root.updateMatrixWorld(true);
  box.setFromObject(root); const c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box.min.y, -c.z); root.updateMatrixWorld(true);
  const holder = new THREE.Group(); holder.add(root); holder.updateMatrixWorld(true);
  return { holder, root, mesh };
}
// world-space vertices of one material group
export function groupVerts(mesh, gi) {
  const g = mesh.geometry, p = g.attributes.position, ix = g.index, gr = g.groups[gi], v = new THREE.Vector3(), out = [];
  for (let k = gr.start; k < gr.start + gr.count; k++) { v.fromBufferAttribute(p, ix ? ix.getX(k) : k).applyMatrix4(mesh.matrixWorld); out.push(v.x, v.y, v.z); }
  return out;
}
