// Bell 505 Jet Ranger X — original procedural geometry (no third-party model data).
// Built from public dimensions and reference photos; world frame: nose tip at x = NX, a = NX - x, +y up, +z right, ground y = 0.
import * as THREE from 'three';
export const NX = 6.243, YOFF = 0.08; // fuselage lift above the v2 trace (belly ~0.6 m above skid tubes)
export const DIM = { mrR: 5.64, trR: 0.83, mrA: 3.16, mrY: 3.12, trA: 9.62, trY: 1.58, skidHalf: 0.95 };
const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
// sample station table [a, yBot, yTop, halfWidth, exponent] with Catmull-Rom
function sampler(S) { return a => { let i = 0; while (i < S.length - 2 && S[i + 1][0] < a) i++;
  const p = k => S[Math.max(0, Math.min(S.length - 1, k))]; const t = (a - S[i][0]) / (S[i + 1][0] - S[i][0]);
  return [1, 2, 3, 4].map(j => cr(p(i - 1)[j], p(i)[j], p(i + 1)[j], p(i + 2)[j], Math.max(0, Math.min(1, t)))); }; }
function loft(S, a0, a1, nA, nR, capEnds = true) {
  const f = sampler(S), pos = [], idx = [];
  for (let i = 0; i <= nA; i++) { const u = i / nA, a = a0 + (a1 - a0) * (0.5 - 0.5 * Math.cos(Math.PI * u)); const [yb, yt, hw, n] = f(a);
    const cy = (yb + yt) / 2, hh = Math.max(0.001, (yt - yb) / 2), w = Math.max(0.001, hw), e = 2 / n;
    for (let j = 0; j < nR; j++) { const th = j / nR * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      pos.push(NX - a, cy + hh * Math.sign(s) * Math.abs(s) ** e, w * Math.sign(c) * Math.abs(c) ** e); } }
  for (let i = 0; i < nA; i++) for (let j = 0; j < nR; j++) { const A = i * nR + j, B = i * nR + (j + 1) % nR, C = A + nR, D = B + nR; idx.push(A, C, B, B, C, D); }
  if (capEnds) for (const [ri, flip] of [[0, true], [nA, false]]) { const c = pos.length / 3; let x = 0, y = 0, z = 0;
    for (let j = 0; j < nR; j++) { x += pos[(ri * nR + j) * 3]; y += pos[(ri * nR + j) * 3 + 1]; z += pos[(ri * nR + j) * 3 + 2]; } pos.push(x / nR, y / nR, z / nR);
    for (let j = 0; j < nR; j++) { const A = ri * nR + j, B = ri * nR + (j + 1) % nR; flip ? idx.push(c, B, A) : idx.push(c, A, B); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// faces of g whose centroid passes fn(a,y,z) -> new geometry pushed out along normals by off
function pick(g, fn, off = 0.006) { const p = g.attributes.position, n = g.attributes.normal, ix = g.index.array, out = [], nn = [];
  for (let k = 0; k < ix.length; k += 3) { let a = 0, y = 0, z = 0; for (let m = 0; m < 3; m++) { a += NX - p.getX(ix[k + m]); y += p.getY(ix[k + m]); z += p.getZ(ix[k + m]); }
    if (!fn(a / 3, y / 3, z / 3)) continue;
    for (let m = 0; m < 3; m++) { const v = ix[k + m]; out.push(p.getX(v) + n.getX(v) * off, p.getY(v) + n.getY(v) * off, p.getZ(v) + n.getZ(v) * off); nn.push(n.getX(v), n.getY(v), n.getZ(v)); } }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); r.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); return r; }
const merge = gs => { const P = [], N = []; for (let g of gs) { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.normal) g.computeVertexNormals(); for (const v of g.attributes.position.array) P.push(v); for (const v of g.attributes.normal.array) N.push(v); }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); r.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return r; };
const at = (g, a, y, z) => g.translate(NX - a, y, z);
function tube(pts, r, seg = 10) { const c = new THREE.CatmullRomCurve3(pts.map(([a, y, z]) => new THREE.Vector3(NX - a, y, z)), false, 'centripetal'); return new THREE.TubeGeometry(c, pts.length * 12, r, seg, false); }
function plate(outline, thick, plane = 'xy', zc = 0) { // outline in (a, y) or (a, z)
  const s = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(NX - u, v))); const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.3, bevelSize: thick * 0.3, bevelSegments: 2 });
  g.translate(0, 0, -thick / 2); if (plane === 'xz') { g.rotateX(Math.PI / 2); } g.translate(0, plane === 'xz' ? zc : 0, plane === 'xy' ? zc : 0); return g; }

// ---------- fuselage stations [a, yBot, yTop, halfWidth, superellipse n] — traced from a true side photo (v2)
export const FUS = [
  [-0.03, 0.86, 0.89, 0.015, 1.6], [0.00, 0.83, 0.94, 0.06, 1.7], [0.10, 0.76, 1.10, 0.19, 1.9], [0.20, 0.66, 1.23, 0.31, 2.1], [0.30, 0.59, 1.35, 0.41, 2.3],
  [0.50, 0.52, 1.50, 0.56, 2.6], [0.75, 0.49, 1.67, 0.68, 2.9], [1.00, 0.48, 1.82, 0.76, 3.1], [1.25, 0.47, 1.98, 0.80, 3.3], [1.60, 0.47, 2.13, 0.82, 3.4],
  [2.00, 0.47, 2.16, 0.83, 3.4], [2.80, 0.48, 2.16, 0.83, 3.4], [3.40, 0.51, 2.14, 0.81, 3.2], [4.00, 0.60, 2.08, 0.72, 3.0], [4.50, 0.74, 1.97, 0.57, 2.8],
  [5.00, 1.04, 1.84, 0.40, 2.5], [5.50, 1.23, 1.73, 0.26, 2.2], [6.00, 1.27, 1.70, 0.22, 2.0], [8.00, 1.32, 1.65, 0.16, 2.0], [9.60, 1.35, 1.60, 0.11, 2.0],
  [9.95, 1.37, 1.58, 0.09, 2.0], [9.97, 1.45, 1.50, 0.01, 2.0]];
export const COWL = [[1.85, 1.95, 2.10, 0.05, 2.6], [2.05, 1.95, 2.27, 0.50, 3.0], [2.60, 1.95, 2.41, 0.58, 3.4], [3.60, 1.95, 2.49, 0.58, 3.4],
  [4.20, 1.90, 2.36, 0.50, 3.2], [4.70, 1.80, 2.14, 0.36, 2.8], [5.00, 1.70, 1.90, 0.20, 2.4], [5.12, 1.66, 1.74, 0.03, 2.0]];
const fusAt = sampler(FUS);
// outline-based glass: a patch on the fuselage surface between a0..a1, bounded by angle limits from y-limit functions
function surfPt(a, th, off) { const [yb, yt, hw, n] = fusAt(a); const cy = (yb + yt) / 2, hh = (yt - yb) / 2, e = 2 / n, c = Math.cos(th), s = Math.sin(th);
  const y = cy + hh * Math.sign(s) * Math.abs(s) ** e, z = hw * Math.sign(c) * Math.abs(c) ** e;
  // approximate outward normal of superellipse for offset
  const ny = Math.sign(s) * Math.abs(s) ** (2 - e) / hh, nz = Math.sign(c) * Math.abs(c) ** (2 - e) / hw, l = Math.hypot(ny, nz) || 1; return [NX - a, y + off * ny / l, z + off * nz / l]; }
const thOfY = (a, y, side) => { const [yb, yt] = fusAt(a); const cy = (yb + yt) / 2, hh = (yt - yb) / 2, n = fusAt(a)[3]; const v = Math.max(-0.999, Math.min(0.999, (y - cy) / hh)); const s = Math.sign(v) * Math.abs(v) ** (n / 2); const t = Math.asin(s); return side > 0 ? t : Math.PI - t; };
function patch(a0, a1, thLo, thHi, nu = 40, nv = 24, off = 0.008) { const pos = [], idx = [];
  for (let i = 0; i <= nu; i++) { const a = a0 + (a1 - a0) * i / nu; const t0 = thLo(a), t1 = thHi(a); for (let j = 0; j <= nv; j++) pos.push(...surfPt(a, t0 + (t1 - t0) * j / nv, off)); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const A = i * (nv + 1) + j, B = A + 1, C = A + nv + 1, D = C + 1; idx.push(A, B, C, B, D, C); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const rr = (a, a0, a1, r) => { const d = Math.min(a - a0, a1 - a); return d >= r ? 0 : r - Math.sqrt(Math.max(0, r * r - (r - d) ** 2)); };
export const WIN = {
  ws: { a0: 0.40, a1: 1.62, low: a => 1.16 - 0.10 * (a - 0.40) }, // wraparound windscreen lower edge (y) along a; runs up over the roof front
  door: { a0: 1.74, a1: 2.50, yb: 1.12, yt: 2.04, r: 0.12 }, rear: { a0: 2.62, a1: 3.00, yb: 1.30, yt: 2.02, r: 0.10 } };
function glassGeo() { const G = []; const W = WIN.ws;
  G.push(patch(W.a0, W.a1, a => thOfY(a, Math.min(W.low(a), fusAt(a)[1] - 0.02), 1) + rrTh(a), a => thOfY(a, Math.min(W.low(a), fusAt(a)[1] - 0.02), -1) - rrTh(a), 60, 48));
  for (const s of [1, -1]) for (const w of [WIN.door, WIN.rear]) {
    const lo = a => thOfY(a, w.yb + rr(a, w.a0, w.a1, w.r), s), hi = a => thOfY(a, w.yt - rr(a, w.a0, w.a1, w.r), s);
    G.push(s > 0 ? patch(w.a0, w.a1, lo, hi) : patch(w.a0, w.a1, hi, lo)); }
  return merge(G); }
function rrTh(a) { const W = WIN.ws; return 0.35 * rr(a, W.a0 - 0.2, W.a1, 0.12); } // round the aft corners of the windscreen
// airfoil-ish tapered blade along +span axis (local z), chord along x
function blade(r0, r1, c0, c1, tipFrom, t, sweep = 0) { const pos = [], idx = [], NS = 16, NC = 12;
  const sec = u => { const out = []; for (let k = 0; k < NC; k++) { const th = k / NC * Math.PI * 2; const x = 0.5 * (1 + Math.cos(th)); const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4); out.push([x, Math.sin(th) >= 0 ? yt : -yt]); } return out; };
  const S = sec(); for (let i = 0; i <= NS; i++) { const r = r0 + (r1 - r0) * i / NS; const k = r > tipFrom ? (r - tipFrom) / (r1 - tipFrom) : 0; const c = c0 + (c1 - c0) * k, sw = sweep * k * k;
    for (const [x, y] of S) pos.push((x - 0.3) * c + sw, y * c, r); }
  for (let i = 0; i < NS; i++) for (let k = 0; k < NC; k++) { const A = i * NC + k, B = i * NC + (k + 1) % NC; idx.push(A, B, A + NC, B, B + NC, A + NC); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }

export function buildBell505() {
  const root = new THREE.Group(); root.name = 'bell505';
  const fus = loft(FUS, -0.03, 9.97, 220, 96), cowl = loft(COWL, 1.85, 5.12, 50, 48);
  const glassG = glassGeo();
  // fins: vertical fin (upper + ventral) swept, at tail
  const fin = plate([[9.25, 1.50], [9.75, 2.27], [10.0, 2.30], [9.97, 1.45]], 0.07);
  const ventral = plate([[9.15, 1.30], [9.62, 0.44], [9.88, 0.44], [9.80, 1.28]], 0.06);
  const stab = plate([[7.0, -1.0], [7.55, -1.0], [7.55, 1.0], [7.0, 1.0]], 0.05, 'xz', 1.30); // horizontal stabiliser (a,z)
  const ends = [-1, 1].map(s => plate([[7.03, 1.14], [7.17, 1.52], [7.45, 1.54], [7.52, 1.10]], 0.04, 'xy', s * 1.03));
  const bodyG = merge([fus, cowl, fin, ventral, stab, ...ends, at(new THREE.CylinderGeometry(0.16, 0.30, 0.30, 24), DIM.mrA, 2.65, 0) /* mast fairing */]);
  const meshes = {};
  const M = (name, geo, mat) => { const m = new THREE.Mesh(geo, mat); m.name = name; meshes[name] = m; root.add(m); return m; };
  const paint = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.55, metalness: 0.2 });
  const metal = new THREE.MeshStandardMaterial({ color: '#8d9094', roughness: 0.35, metalness: 0.8 });
  M('body', bodyG, paint);
  M('glass', glassG, new THREE.MeshPhysicalMaterial({ color: '#22323c', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.78, envMapIntensity: 1.6 }));
  // trim: Arrius 2R intake grilles both sides of the cowl, angled exhaust outlet (right side, aft cowl), door seams
  const trim = [];
  for (const s of [-1, 1]) { trim.push(at(new THREE.BoxGeometry(0.55, 0.22, 0.03), 3.70, 2.24, s * 0.585));
    for (let k = 0; k < 5; k++) trim.push(at(new THREE.BoxGeometry(0.53, 0.012, 0.045), 3.70, 2.16 + k * 0.042, s * 0.595)); }
  { const d = new THREE.Vector3(-0.55, 0.55, 0.62).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    const ex = new THREE.CylinderGeometry(0.15, 0.13, 0.34, 28, 1, true); ex.applyQuaternion(q); trim.push(at(ex, 4.45, 2.20, 0.40));
    const lip = new THREE.TorusGeometry(0.15, 0.015, 8, 28); lip.rotateX(Math.PI / 2); lip.translate(0, 0.17, 0); lip.applyQuaternion(q); trim.push(at(lip, 4.45, 2.20, 0.40)); }
  for (const [a, y0, y1] of [[1.68, 0.53, 2.12], [2.58, 0.51, 2.15], [3.40, 0.55, 2.12]]) for (const s of [-1, 1]) {
    const f = sampler(FUS); const pts = []; for (let y = y0; y <= y1; y += 0.04) { const [yb, yt, hw, n] = f(a); const hh = (yt - yb) / 2, cy = (yb + yt) / 2; const v = Math.min(0.999, Math.abs((y - cy) / hh)); pts.push([a, y, s * (hw * (1 - v ** n) ** (1 / n) + 0.004)]); }
    trim.push(tube(pts, 0.008, 4)); }
  M('trim', merge(trim), dark);
  // ---------- skids: two crosstubes + skid tubes with upturned toe and a step on each side
  const sk = [];
  for (const s of [-1, 1]) { sk.push(tube([[0.55, 0.32, s * DIM.skidHalf], [0.72, 0.11, s * DIM.skidHalf], [1.0, 0.05, s * DIM.skidHalf], [2.6, 0.05, s * DIM.skidHalf], [4.35, 0.05, s * DIM.skidHalf], [4.5, 0.08, s * DIM.skidHalf]], 0.04));
    sk.push(at(new THREE.BoxGeometry(0.34, 0.025, 0.16), 1.75, 0.30, s * 0.92)); }
  for (const a of [1.62, 3.55]) sk.push(tube([[a, 0.05, -DIM.skidHalf], [a, 0.46, -0.86], [a, 0.58, -0.52], [a, 0.59, 0], [a, 0.58, 0.52], [a, 0.46, 0.86], [a, 0.05, DIM.skidHalf]], 0.045));
  M('skids', merge(sk), metal.clone());
  // ---------- main rotor (2 blades) and hub
  const A = DIM.mrA, Y = DIM.mrY, hub = [];
  hub.push(at(new THREE.CylinderGeometry(0.075, 0.09, Y - 2.48, 16), A, (Y + 2.48) / 2 - 0.02, 0)); // mast
  hub.push(at(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), A, 2.70, 0), at(new THREE.CylinderGeometry(0.20, 0.20, 0.03, 24), A, 2.76, 0)); // swashplate
  hub.push(at(new THREE.BoxGeometry(0.20, 0.10, 0.80), A, Y, 0), at(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 16), A, Y, 0)); // yoke + trunnion
  for (const s of [-1, 1]) { hub.push(at(new THREE.CylinderGeometry(0.055, 0.05, 0.36, 12).rotateX(Math.PI / 2), A, Y, s * 0.55)); // grips
    hub.push(at(new THREE.BoxGeometry(0.16, 0.03, 0.05), A + 0.10 * s, Y - 0.05, s * 0.40)); // pitch horn
    hub.push(tube([[A + 0.17 * s, 2.77, s * 0.18], [A + 0.17 * s, Y - 0.05, s * 0.40]], 0.012, 6)); } // pitch link
  hub.push(at(new THREE.SphereGeometry(0.05, 12, 8), A, Y + 0.12, 0)); // stabiliser-free top / nut
  M('mrhub', merge(hub), metal);
  const bl = []; for (const s of [-1, 1]) { const g = blade(0.70, DIM.mrR, 0.33, 0.16, DIM.mrR - 0.35, 0.10, -0.12); if (s < 0) g.rotateY(Math.PI); bl.push(at(g, A, Y + 0.01, 0)); }
  M('mrblade', merge(bl), new THREE.MeshStandardMaterial({ color: '#26282b', roughness: 0.5 }));
  // ---------- tail rotor on the left side of the fin
  const trz = -0.16;
  const th = at(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12).rotateX(Math.PI / 2), DIM.trA, DIM.trY, trz + 0.06);
  M('trhub', merge([th, at(new THREE.BoxGeometry(0.12, 0.10, 0.08), DIM.trA, DIM.trY, trz)]), metal);
  const tb = []; for (const s of [-1, 1]) { const g = blade(0.08, DIM.trR, 0.14, 0.11, DIM.trR - 0.12, 0.10); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2); if (s < 0) g.rotateZ(Math.PI); g.rotateZ(0.5); tb.push(at(g, DIM.trA, DIM.trY, trz - 0.04)); }
  M('trblade', merge(tb), new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.5 }));
  for (const n of ['body', 'glass', 'trim']) meshes[n].geometry.translate(0, YOFF, 0);
  return { root, P: meshes };
}
