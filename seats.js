// Removable cabin seats. The source model carries all cabin seats in one material group (30): per seat a 36-tri pan/back shell,
// 8-tri legs and frame tubes, a 24-tri back strap and 2-tri ceiling hanger straps. Seats are picked out by connected component
// and station (a = NX - x, metres aft of the nose datum) and hidden by collapsing their triangles (restored from a copy).
//  - centre 8: the back-to-back pair of 4-seat rows in the middle of the cabin (a 3.80..4.85, forward row faces fwd, aft row faces aft)
//  - mid rear-facing: the centre seat of the forward row between the two crew chief seats (a 2.90..3.45, |z| < 0.22), facing aft
// The aft-wall 4-seat bench, the two crew chief seats and the pilot seats are not touched.
import * as THREE from 'three';
const NX = 6.243;
export const SEAT_GROUP = 30;
export const SEAT_KEYS = [['seatsCentre', 'Remove centre 8 seats'], ['seatMid', 'Remove middle rear-facing seat']];
export function setupSeats(mesh, gi = SEAT_GROUP) {
  const g = mesh.geometry, P = g.attributes.position, gr = g.groups[gi]; mesh.updateMatrixWorld(true);
  const W = mesh.matrixWorld, v = new THREE.Vector3();
  const tris = []; for (let t = gr.start; t + 2 < gr.start + gr.count; t += 3) tris.push(t);
  const key = i => P.getX(i).toFixed(4) + ',' + P.getY(i).toFixed(4) + ',' + P.getZ(i).toFixed(4);
  const par = tris.map((_, i) => i), f = i => par[i] === i ? i : (par[i] = f(par[i])), H = new Map();
  tris.forEach((t, i) => { for (let j = 0; j < 3; j++) { const k = key(t + j); if (H.has(k)) par[f(i)] = f(H.get(k)); else H.set(k, i); } });
  const comp = new Map(); tris.forEach((t, i) => { const r = f(i); if (!comp.has(r)) comp.set(r, { t: [], b: new THREE.Box3() }); const c = comp.get(r); c.t.push(t); for (let j = 0; j < 3; j++) c.b.expandByPoint(v.fromBufferAttribute(P, t + j).applyMatrix4(W)); });
  const sets = { seatsCentre: [], seatMid: [] };
  for (const c of comp.values()) { const a0 = NX - c.b.max.x, a1 = NX - c.b.min.x, z0 = c.b.min.z, z1 = c.b.max.z;
    if (a0 > 3.80 && a1 < 4.85) sets.seatsCentre.push(...c.t);
    else if (a0 > 2.90 && a1 < 3.45 && z0 > -0.22 && z1 < 0.22) sets.seatMid.push(...c.t); }
  const rest = P.array.slice(gr.start * 3, (gr.start + gr.count) * 3), state = { seatsCentre: false, seatMid: false };
  function set(s = {}) { let ch = false;
    for (const k in sets) { const want = !!s[k]; if (want === state[k]) continue; state[k] = want; ch = true;
      for (const t of sets[k]) for (let j = 0; j < 3; j++) { const i = t + j, o = (i - gr.start) * 3, b = want ? (t - gr.start) * 3 : o;
        P.setXYZ(i, rest[b], rest[b + 1], rest[b + 2]); } }
    if (ch) { P.needsUpdate = true; g.computeBoundingSphere(); } return ch; }
  return { set, state: () => ({ ...state }), counts: () => ({ seatsCentre: sets.seatsCentre.length, seatMid: sets.seatMid.length }) };
}
