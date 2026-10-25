// v10: dimension fixes on the base mesh, checked against TM 1-1520-237-10 Fig 2-2 (/workspace/reflib):
//  - IR suppressor (HIRSS) outer faces pulled in: width over HIRSS 3.14 -> 2.95 m
//  - stabilator span 4.76 -> 4.37 m
//  - tail rotor diameter 3.06 -> 3.35 m (scaled about its hub; hub stays on the gearbox)
const sst = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
export const GFIX = { hirssZ0: 0.69, hirssZ1: 1.569, hirssW: 2.95, stabZ0: 0.30, stabZ1: 2.38, stabSpan: 4.37, trK: 3.35 / 3.06 };
import * as THREE from 'three';
export function fixGeometry(mesh, G, NX) {
  const g = mesh.geometry, P = g.attributes.position, gr = i => g.groups.find(q => q.materialIndex === i);
  mesh.updateMatrixWorld(true); const W = mesh.matrixWorld, Wi = W.clone().invert(), v = new THREE.Vector3();
  const rd = t => v.fromBufferAttribute(P, t).applyMatrix4(W), wr = (t, p) => { const q = p.clone().applyMatrix4(Wi); P.setXYZ(t, q.x, q.y, q.z); };
  const f = gr(G.fuselage), k = (GFIX.hirssW / 2 - GFIX.hirssZ0) / (GFIX.hirssZ1 - GFIX.hirssZ0);
  const ks = (GFIX.stabSpan / 2 - GFIX.stabZ0) / (GFIX.stabZ1 - GFIX.stabZ0);
  for (let t = f.start; t < f.start + f.count; t++) {
    const p = rd(t), x = p.x, y = p.y, az = Math.abs(p.z), s = Math.sign(p.z), a = NX - x;
    // HIRSS: a 6.35-7.64, y 2.24-2.90 (exhaust faces), blended over ~0.15 m outside that box
    const wh = sst(6.15, 6.35, a) * (1 - sst(7.64, 7.84, a)) * sst(2.10, 2.24, y) * (1 - sst(2.90, 3.04, y));
    if (wh > 0 && az > GFIX.hirssZ0) { const zz = GFIX.hirssZ0 + (az - GFIX.hirssZ0) * k; p.z = s * (az + (zz - az) * wh); wr(t, p); continue; }
    // stabilator: x < -7.2 (a > 13.4), y 1.45-2.15, outboard of the tail cone
    if (x < -7.2 && y > 1.45 && y < 2.15 && az > GFIX.stabZ0) { p.z = s * (GFIX.stabZ0 + (az - GFIX.stabZ0) * ks); wr(t, p); }
  }
  // tail rotor: uniform scale about its bounding-box centre (the hub)
  const tr = gr(G.tailRotor); if (tr) { const b = new THREE.Box3(); for (let t = tr.start; t < tr.start + tr.count; t++) b.expandByPoint(rd(t));
    const c = b.getCenter(new THREE.Vector3());
    for (let t = tr.start; t < tr.start + tr.count; t++) { const p = rd(t).sub(c).multiplyScalar(GFIX.trK).add(c); wr(t, p); } }
  P.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere();
}
