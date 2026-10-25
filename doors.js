// Opening cabin sliding doors and crew chief (gunner) windows (TM 1-1520-237-10 para 2.12; notes in the repo history).
// The door / window panels are selected out of the fuselage mesh at load time and moved by rewriting their vertices.
// Each moved vertex also carries aDoorOff (its local-space offset from the closed position); the paint shader subtracts it
// so paint breaks, zones and the anti-glare are sampled where the panel sits when CLOSED (panel keeps its colours when slid).
// Decals (lettering, star, RESCUE arrows) whose triangles lie on a panel get the same offset.
//  - cabin door: rollers ride a joggle at the forward end of the upper/lower tracks: ~6 cm outboard, then ~1.66 m aft.
//  - crew chief window: the whole window panel pops ~3 cm outboard, then slides FORWARD its full width on the outside of the skin,
//    stowing between the opening and the pilot door so the gun opening is completely clear (user reference photos).
import * as THREE from 'three';
const NX = 6.243;
export const DOOR_DEF = {
  cabin: { a0: 3.750, a1: 5.522, y0: 0.70, y1: 2.215, z: 0.98, out: 0.065, aft: 1.66 },
  win: { a0: 2.99, a1: 3.40, y0: 1.10, y1: 2.25, z: 0.95, out: 0.03, fwd: 0.399 },
};
export const DOOR_KEYS = [['rc', 'Right cabin door', 'cabin', 1], ['lc', 'Left cabin door', 'cabin', -1], ['rw', 'Right crew chief window', 'win', 1], ['lw', 'Left crew chief window', 'win', -1]];
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
// world-space offset of a panel at travel t (0 closed .. 1 open)
function offset(kind, side, t) {
  const D = DOOR_DEF[kind];
  if (kind === 'cabin') return new THREE.Vector3(-D.aft * ss(0.12, 1, t), 0, side * D.out * ss(0, 0.14, t));
  return new THREE.Vector3(D.fwd * ss(0.2, 1, t), 0, side * D.out * ss(0, 0.2, t));
}
const inBox = (D, side, a, y, z) => a > D.a0 && a < D.a1 && y > D.y0 && y < D.y1 && z * side > D.z;
export function setupDoors(mesh, { mats = [31, 22, 34], fm = null } = {}) {
  const g = mesh.geometry, P = g.attributes.position, n = P.count; mesh.updateMatrixWorld(true);
  const W = mesh.matrixWorld, L3 = new THREE.Matrix3().setFromMatrix4(W.clone().invert());
  const off = new THREE.BufferAttribute(new Float32Array(n * 3), 3); g.setAttribute('aDoorOff', off);
  const rest = P.array.slice(); const v = new THREE.Vector3();
  const wp = i => v.fromBufferAttribute(P, i).applyMatrix4(W);
  const doors = {}; for (const [k, , kind, side] of DOOR_KEYS) doors[k] = { k, kind, side, t: 0, target: 0, verts: [] };
  const tris = { cabin: [], win: [] };
  for (const gr of g.groups) { if (!mats.includes(gr.materialIndex)) continue;
    for (let t = gr.start; t + 2 < gr.start + gr.count; t += 3) {
      let all = { cabin: [true, true], win: [true, true] }, c = new THREE.Vector3();
      for (let j = 0; j < 3; j++) { const p = wp(t + j), a = NX - p.x; c.add(p);
        for (const kind of ['cabin', 'win']) for (const [si, side] of [[0, 1], [1, -1]]) if (!inBox(DOOR_DEF[kind], side, a, p.y, p.z)) all[kind][si] = false; }
      if (all.cabin[0]) doors.rc.verts.push(t, t + 1, t + 2); else if (all.cabin[1]) doors.lc.verts.push(t, t + 1, t + 2);
      else if (all.win[0] || all.win[1]) tris.win.push(t);
    } }
  // crew chief window: keep only the window panel's own connected component(s) (the mesh models each pane as a separate shell)
  const key = i => P.getX(i).toFixed(5) + ',' + P.getY(i).toFixed(5) + ',' + P.getZ(i).toFixed(5);
  const par = tris.win.map((_, i) => i), f = i => par[i] === i ? i : (par[i] = f(par[i])), H = new Map();
  tris.win.forEach((t, i) => { for (let j = 0; j < 3; j++) { const kk = key(t + j); if (H.has(kk)) par[f(i)] = f(H.get(kk)); else H.set(kk, i); } });
  const comp = new Map(); tris.win.forEach((t, i) => { const r = f(i); if (!comp.has(r)) comp.set(r, []); comp.get(r).push(t); });
  for (const list of comp.values()) { if (list.length < 30) continue; let amin = 9, amax = -9, zs = 0;
    for (const t of list) for (let j = 0; j < 3; j++) { const p = wp(t + j); amin = Math.min(amin, NX - p.x); amax = Math.max(amax, NX - p.x); zs += p.z; }
    if (amin > DOOR_DEF.win.a0 && amax < DOOR_DEF.win.a1) { const d = zs > 0 ? doors.rw : doors.lw; for (const t of list) d.verts.push(t, t + 1, t + 2); } }
  const fills = new THREE.Group(); fills.name = 'doorFills';
  // dark door-jamb surfaces (the model's cabin floor already runs out to the sill) so the open cabin-door opening never shows a gap into the void (hidden while closed)
  if (fm) { const rc = new THREE.Raycaster(), jm = new THREE.MeshStandardMaterial({ color: '#2b2d2f', roughness: 0.9, side: THREE.DoubleSide });
    const skin = (a, y, side) => { rc.set(new THREE.Vector3(NX - a, y, side * 4), new THREE.Vector3(0, 0, -side)); const h = rc.intersectObject(fm, false)[0]; return h ? Math.abs(h.point.z) : null; };
    const strip = (pts, side, k) => { const pos = []; for (let i = 0; i + 1 < pts.length; i++) { const [p0, q0] = pts[i], [p1, q1] = pts[i + 1];
        pos.push(...p0, ...q0, ...p1, ...q0, ...q1, ...p1); }
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(pos.map((v, i) => i % 3 === 2 ? v * side : v), 3)); g2.computeVertexNormals();
      const m = new THREE.Mesh(g2, jm); m.userData.door = k; m.visible = false; m.receiveShadow = true; fills.add(m); };
    const D = DOOR_DEF.cabin;
    for (const [k, side] of [['rc', 1], ['lc', -1]]) {
      // forward and aft jambs
      for (const a of [D.a0 + 0.004, D.a1 - 0.004]) { const j = []; for (let y = 0.712; y <= 2.2; y += 0.06) { const z = skin(a, y, side) || 1.1; j.push([[NX - a, y, z - 0.12], [NX - a, y, z - 0.012]]); } strip(j, side, k); }
    } }
  function place(d) {
    const o = offset(d.kind, d.side, d.t), ol = o.clone().applyMatrix3(L3);
    for (const i of d.verts) { P.setXYZ(i, rest[i * 3] + ol.x, rest[i * 3 + 1] + ol.y, rest[i * 3 + 2] + ol.z); off.setXYZ(i, ol.x, ol.y, ol.z); }
  }
  // decal meshes: per-vertex panel membership from the closed-position triangle centroid
  function decalInfo(m) {
    const geo = m.geometry; if (geo.userData.door && geo.userData.door.n === geo.attributes.position.count) return geo.userData.door;
    const pa = geo.attributes.position; m.updateMatrixWorld(true); const Wm = m.matrixWorld, who = new Array(pa.count).fill(null), c = new THREE.Vector3(), q = new THREE.Vector3();
    for (let t = 0; t + 2 < pa.count; t += 3) { c.set(0, 0, 0); for (let j = 0; j < 3; j++) c.add(q.fromBufferAttribute(pa, t + j).applyMatrix4(Wm)); c.divideScalar(3);
      const a = NX - c.x; let d = null;
      for (const k in doors) { const D = doors[k]; if (D.kind === 'win' && !D.verts.length) continue; const B = DOOR_DEF[D.kind];
        if (D.kind === 'cabin' ? inBox(B, D.side, a, c.y, c.z) : (a > 2.994 && a < 3.393 && c.y > B.y0 && c.y < B.y1 && c.z * D.side > B.z)) d = k; }
      who[t] = who[t + 1] = who[t + 2] = d; }
    return geo.userData.door = { n: pa.count, who, rest: pa.array.slice(), any: who.some(x => x), L3: new THREE.Matrix3().setFromMatrix4(Wm.clone().invert()) };
  }
  let decalRoots = [];
  function placeDecals() {
    for (const r of decalRoots) { const root = typeof r === 'function' ? r() : r; if (!root) continue;
      root.traverse(m => { if (!m.isMesh || !m.geometry?.attributes.position) return; const I = decalInfo(m); if (!I.any) return;
        const pa = m.geometry.attributes.position, cache = {};
        for (let i = 0; i < I.n; i++) { const k = I.who[i]; if (!k) continue; const ol = cache[k] || (cache[k] = offset(doors[k].kind, doors[k].side, doors[k].t).applyMatrix3(I.L3));
          pa.setXYZ(i, I.rest[i * 3] + ol.x, I.rest[i * 3 + 1] + ol.y, I.rest[i * 3 + 2] + ol.z); }
        pa.needsUpdate = true; m.geometry.computeBoundingSphere(); }); }
  }
  function refresh() { for (const k in doors) place(doors[k]); P.needsUpdate = true; off.needsUpdate = true; placeDecals();
    for (const f of fills.children) f.visible = doors[f.userData.door].t > 0.001; }
  let last = 0;
  const api = {
    doors, fills,
    addDecalRoot(r) { decalRoots.push(r); },
    // state: { rc, lc, rw, lw } booleans
    set(state = {}, instant = false) { for (const k in doors) { doors[k].target = state[k] ? 1 : 0; if (instant) doors[k].t = doors[k].target; } refresh(); },
    state() { const o = {}; for (const k in doors) o[k] = doors[k].target > 0.5; return o; },
    // advance animations; returns true while anything moves
    tick(now = performance.now()) { const dt = Math.min(0.1, last ? (now - last) / 1000 : 0); last = now; let moving = false;
      for (const k in doors) { const d = doors[k]; if (d.t === d.target) continue; const dur = d.kind === 'cabin' ? 2.2 : 1.1;
        d.t = d.target > d.t ? Math.min(d.target, d.t + dt / dur) : Math.max(d.target, d.t - dt / dur); moving = true; }
      if (moving) refresh(); return moving; },
    // run fn with every panel in its closed position (for projections against the live mesh)
    withClosed(fn) { const sv = {}; for (const k in doors) { sv[k] = doors[k].t; doors[k].t = 0; place(doors[k]); } P.needsUpdate = true;
      try { return fn(); } finally { for (const k in doors) { doors[k].t = sv[k]; place(doors[k]); } P.needsUpdate = true; } },
    placeDecals() { if (Object.values(doors).some(d => d.t > 0)) placeDecals(); },
    refresh, counts: () => Object.fromEntries(Object.entries(doors).map(([k, d]) => [k, d.verts.length / 3])),
  };
  return api;
}
