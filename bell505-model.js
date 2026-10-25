// Bell 505 Jet Ranger X — original procedural geometry (no third-party model data).
// Built from public dimensions and reference photos (v3: lofted from side / front / plan traces with a chined, boxy cabin section).
// World frame: nose tip at x = NX, a = NX - x (metres aft of nose), +y up, +z right, ground y = 0.
import * as THREE from 'three';
export const NX = 6.243;
export const DIM = { mrR: 5.64, trR: 0.83, mrA: 3.16, mrY: 3.12, trA: 9.62, trY: 1.50, skidHalf: 0.95 };
const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
// station: [a, yBot, yTop, halfWidth, nUpper, chineFrac, nLower]. Section = two superellipse halves meeting at the chine
// (max width) at y = yb + chineFrac*(yt-yb); a low chine with a high lower exponent gives the flat-sided, flat-bottomed 505 cabin.
const norm = s => s.map(r => r.length >= 7 ? r : [r[0], r[1], r[2], r[3], r[4] ?? 2, 0.5, r[4] ?? 2]);
function sampler(S) { S = norm(S); return a => { let i = 0; while (i < S.length - 2 && S[i + 1][0] < a) i++;
  const p = k => S[Math.max(0, Math.min(S.length - 1, k))]; const t = Math.max(0, Math.min(1, (a - S[i][0]) / (S[i + 1][0] - S[i][0])));
  return [1, 2, 3, 4, 5, 6].map(j => cr(p(i - 1)[j], p(i)[j], p(i + 1)[j], p(i + 2)[j], t)); }; }
function secPt(st, th) { const [yb, yt, hw, nu, cf, nl] = st; const yc = yb + cf * (yt - yb), c = Math.cos(th), s = Math.sin(th);
  const e = 2 / (s >= 0 ? nu : nl), h = s >= 0 ? yt - yc : yc - yb;
  return [yc + Math.sign(s) * h * Math.abs(s) ** e, Math.max(0.001, hw) * Math.sign(c) * Math.abs(c) ** e]; }
function loft(S, a0, a1, nA, nR, capEnds = true) {
  const f = sampler(S), pos = [], idx = [];
  for (let i = 0; i <= nA; i++) { const u = i / nA, a = a0 + (a1 - a0) * (0.5 - 0.5 * Math.cos(Math.PI * u)); const st = f(a);
    // resample the section evenly by arc length (superellipse angle sampling leaves flat sides as single long facets)
    const D = 1440, P = [], L = [0]; for (let k = 0; k <= D; k++) { P.push(secPt(st, k / D * Math.PI * 2)); if (k) L.push(L[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); }
    for (let j = 0, k = 0; j < nR; j++) { const t = j / nR * L[D]; while (k < D - 1 && L[k + 1] < t) k++; const u = (t - L[k]) / Math.max(1e-9, L[k + 1] - L[k]);
      pos.push(NX - a, P[k][0] + (P[k + 1][0] - P[k][0]) * u, P[k][1] + (P[k + 1][1] - P[k][1]) * u); } }
  for (let i = 0; i < nA; i++) for (let j = 0; j < nR; j++) { const A = i * nR + j, B = i * nR + (j + 1) % nR, C = A + nR, D = B + nR; idx.push(A, B, C, B, D, C); }
  if (capEnds) for (const [ri, flip] of [[0, true], [nA, false]]) { const c = pos.length / 3; let x = 0, y = 0, z = 0;
    for (let j = 0; j < nR; j++) { x += pos[(ri * nR + j) * 3]; y += pos[(ri * nR + j) * 3 + 1]; z += pos[(ri * nR + j) * 3 + 2]; } pos.push(x / nR, y / nR, z / nR);
    for (let j = 0; j < nR; j++) { const A = ri * nR + j, B = ri * nR + (j + 1) % nR; flip ? idx.push(c, A, B) : idx.push(c, B, A); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const merge = gs => { const P = [], N = []; for (let g of gs) { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.normal) g.computeVertexNormals(); for (const v of g.attributes.position.array) P.push(v); for (const v of g.attributes.normal.array) N.push(v); }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); r.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return r; };
const at = (g, a, y, z) => g.translate(NX - a, y, z);
function tube(pts, r, seg = 10) { const c = new THREE.CatmullRomCurve3(pts.map(([a, y, z]) => new THREE.Vector3(NX - a, y, z)), false, 'centripetal'); return new THREE.TubeGeometry(c, pts.length * 12, r, seg, false); }
function plate(outline, thick, plane = 'xy', zc = 0) {
  const s = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(NX - u, v))); const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.3, bevelSize: thick * 0.3, bevelSegments: 2 });
  g.translate(0, 0, -thick / 2); if (plane === 'xz') g.rotateX(Math.PI / 2); g.translate(0, plane === 'xz' ? zc : 0, plane === 'xy' ? zc : 0); return g; }

// ---------- fuselage: side profile (yb, yt) from c12/c17/c25, plan half-width and section shape from front/rear views (c22, c20) and specs
export const FUS = [
  [-0.06, 0.79, 0.85, 0.05, 2.0, 0.50, 2.0], [-0.02, 0.72, 0.95, 0.17, 2.0, 0.45, 2.0], [0.10, 0.67, 1.06, 0.27, 2.0, 0.42, 2.2], [0.25, 0.63, 1.26, 0.41, 2.1, 0.38, 2.6],
  [0.45, 0.60, 1.55, 0.56, 2.1, 0.34, 3.0], [0.70, 0.56, 1.88, 0.68, 2.2, 0.31, 3.4], [1.00, 0.54, 2.16, 0.79, 2.3, 0.29, 3.8], [1.30, 0.53, 2.33, 0.83, 2.5, 0.28, 4.0],
  [1.70, 0.53, 2.40, 0.84, 2.9, 0.28, 4.2], [2.30, 0.53, 2.39, 0.84, 2.9, 0.28, 4.2], [2.85, 0.56, 2.33, 0.81, 2.8, 0.30, 4.0], [3.30, 0.64, 2.25, 0.73, 2.7, 0.33, 3.4],
  [3.90, 0.84, 2.14, 0.57, 2.6, 0.42, 2.8], [4.50, 1.08, 1.97, 0.40, 2.4, 0.50, 2.4], [5.10, 1.24, 1.79, 0.27, 2.2, 0.50, 2.2], [6.00, 1.32, 1.72, 0.22, 2.0, 0.50, 2.0],
  [8.00, 1.38, 1.68, 0.16, 2.0, 0.50, 2.0], [9.60, 1.41, 1.63, 0.11, 2.0, 0.50, 2.0], [9.95, 1.43, 1.61, 0.09, 2.0, 0.50, 2.0], [9.97, 1.50, 1.54, 0.01, 2.0, 0.50, 2.0]];
export const COWL = [[1.75, 2.10, 2.27, 0.05, 3.0], [1.95, 2.10, 2.47, 0.50, 3.0], [2.50, 2.10, 2.60, 0.60, 3.0], [3.60, 2.10, 2.62, 0.60, 3.0],
  [4.20, 2.00, 2.36, 0.50, 3.2], [4.70, 1.90, 2.12, 0.36, 2.8], [5.00, 1.80, 1.98, 0.20, 2.4], [5.12, 1.76, 1.84, 0.03, 2.0]];
const fusAt = sampler(FUS);
// surface point and outward normal at (a, th), offset along the normal
function surfPt(a, th, off) { const st = fusAt(a), d = 1e-3; const [y, z] = secPt(st, th), [y2, z2] = secPt(st, th + d), [y3, z3] = secPt(fusAt(a + d), th);
  const t1 = new THREE.Vector3(0, y2 - y, z2 - z), t2 = new THREE.Vector3(-d, y3 - y, z3 - z), n = t2.cross(t1).normalize();
  if (n.y * (y - (st[0] + st[4] * (st[1] - st[0]))) + n.z * z < 0) n.negate();
  return [NX - a + n.x * off, y + n.y * off, z + n.z * off]; }
// angle on the +z (side>0) or -z side where the section reaches height y (bisection; y rises monotonically with th on each side)
function thOfY(a, y, side) { const st = fusAt(a); let lo = -Math.PI / 2, hi = Math.PI / 2; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (secPt(st, m)[0] < y) lo = m; else hi = m; } const t = (lo + hi) / 2; return side > 0 ? t : Math.PI - t; }
export const zAt = (a, y, side) => side * Math.abs(secPt(fusAt(a), thOfY(a, y, 1))[1]);
function patch(a0, a1, thLo, thHi, nu = 40, nv = 24, off = 0.008) { const pos = [], idx = [];
  for (let i = 0; i <= nu; i++) { const a = a0 + (a1 - a0) * i / nu; const t0 = thLo(a), t1 = thHi(a); for (let j = 0; j <= nv; j++) pos.push(...surfPt(a, t0 + (t1 - t0) * j / nv, off)); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const A = i * (nv + 1) + j, B = A + 1, C = A + nv + 1, D = C + 1; idx.push(A, B, C, B, D, C); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const rr = (a, a0, a1, r) => { const d = Math.min(a - a0, a1 - a); return d >= r ? 0 : r - Math.sqrt(Math.max(0, r * r - (r - d) ** 2)); };
export const WIN = {
  ws: { a0: 0.36, a1: 1.50, low: a => a < 0.8 ? 0.93 - 0.40 * (a - 0.36) : Math.min(0.80, 0.754 + 0.1 * (a - 0.8)) }, // wraparound windscreen: from just behind the nose tip, down the sides to near the chine, back over the roof front
  door: { a0: 1.80, a1: 2.42, yb: 0.90, yt: 2.22, r: 0.14 }, rear: { a0: 2.52, a1: 2.92, yb: 1.00, yt: 2.18, r: 0.12 } };
const wsLo = a => Math.min(WIN.ws.low(a) + rr(a, WIN.ws.a0 - 0.25, WIN.ws.a1, 0.14), fusAt(a)[1] - 0.03);
// red roof aft of the windscreen header: from WS_TOP aft the glass only covers the sides, up to wsHi(a)
const WS_TOP = 1.22, wsHi = a => a < WS_TOP ? 9 : fusAt(a)[1] - 0.12 - 0.5 * (a - WS_TOP);
const inWin = (a, y, z) => { const W = WIN.ws; if (a > W.a0 && a < W.a1 && y > wsLo(a) && y < wsHi(a)) return true;
  if (Math.abs(z) < 0.3) return false; for (const w of [WIN.door, WIN.rear]) if (a > w.a0 && a < w.a1 && y > w.yb + rr(a, w.a0, w.a1, w.r) && y < w.yt - rr(a, w.a0, w.a1, w.r)) return true; return false; };
// drop body faces behind the glass so the cabin can be seen through it
function cutWin(g) { g = g.toNonIndexed(); const p = g.attributes.position.array, n = g.attributes.normal.array, P = [], N = [];
  for (let k = 0; k < p.length; k += 9) { const a = NX - (p[k] + p[k + 3] + p[k + 6]) / 3, y = (p[k + 1] + p[k + 4] + p[k + 7]) / 3, z = (p[k + 2] + p[k + 5] + p[k + 8]) / 3;
    if (inWin(a, y, z)) continue; for (let m = 0; m < 9; m++) { P.push(p[k + m]); N.push(n[k + m]); } }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); r.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return r; }
// window frame line along a set of surface points
function frames() { const T = [], W = WIN.ws, f = (a, th) => { const q = surfPt(a, th, 0.004); return [NX - q[0], q[1], q[2]]; };
  for (const s of [1, -1]) { const pts = []; for (let a = W.a0 - 0.02; a <= W.a1; a += 0.03) pts.push(f(a, thOfY(a, wsLo(a), s))); T.push(tube(pts, 0.009, 6));
    { const q = []; for (let a = WS_TOP; a <= W.a1; a += 0.02) q.push(f(a, thOfY(a, wsHi(a), s))); T.push(tube(q, 0.009, 6)); }
    for (const w of [WIN.door, WIN.rear]) { const pts = [], e = 0.012; const lo = a => w.yb + rr(a, w.a0, w.a1, w.r), hi = a => w.yt - rr(a, w.a0, w.a1, w.r);
      for (let a = w.a0 + e; a <= w.a1 - e; a += 0.03) pts.push(f(a, thOfY(a, lo(a), s))); for (let y = lo(w.a1 - e); y <= hi(w.a1 - e); y += 0.05) pts.push(f(w.a1 - e, thOfY(w.a1 - e, y, s)));
      for (let a = w.a1 - e; a >= w.a0 + e; a -= 0.03) pts.push(f(a, thOfY(a, hi(a), s))); for (let y = hi(w.a0 + e); y >= lo(w.a0 + e); y -= 0.05) pts.push(f(w.a0 + e, thOfY(w.a0 + e, y, s)));
      pts.push(pts[0]); T.push(tube(pts, 0.009, 6)); } }
  { const pts = []; for (let th = thOfY(W.a0, wsLo(W.a0), 1); th <= thOfY(W.a0, wsLo(W.a0), -1); th += 0.04) pts.push(f(W.a0 + 0.005, th)); T.push(tube(pts, 0.009, 6)); }
  { const pts = []; for (let th = thOfY(WS_TOP, wsHi(WS_TOP + 1e-3), 1); th <= thOfY(WS_TOP, wsHi(WS_TOP + 1e-3), -1); th += 0.04) pts.push(f(WS_TOP, th)); T.push(tube(pts, 0.009, 6));
    for (const s of [1, -1]) { const q = []; for (let y = wsLo(W.a1 - 0.005); y <= wsHi(W.a1 - 0.005); y += 0.04) q.push(f(W.a1 - 0.005, thOfY(W.a1 - 0.005, y, s))); T.push(tube(q, 0.009, 6)); } }
  return T; }
function glassGeo() { const G = []; const W = WIN.ws, lo = wsLo;
  G.push(patch(W.a0, WS_TOP, a => thOfY(a, lo(a), 1), a => thOfY(a, lo(a), -1), 60, 64));
  G.push(patch(WS_TOP, W.a1, a => thOfY(a, lo(a), 1), a => thOfY(a, wsHi(a), 1), 20, 24), patch(WS_TOP, W.a1, a => thOfY(a, wsHi(a), -1), a => thOfY(a, lo(a), -1), 20, 24));
  for (const s of [1, -1]) for (const w of [WIN.door, WIN.rear]) {
    const l = a => thOfY(a, w.yb + rr(a, w.a0, w.a1, w.r), s), h = a => thOfY(a, w.yt - rr(a, w.a0, w.a1, w.r), s);
    G.push(s > 0 ? patch(w.a0, w.a1, l, h) : patch(w.a0, w.a1, h, l)); }
  return merge(G); }
// airfoil-ish tapered blade along local +z (span), chord along x
function blade(r0, r1, c0, c1, tipFrom, t, sweep = 0) { const pos = [], idx = [], NS = 16, NC = 12;
  const S = []; for (let k = 0; k < NC; k++) { const th = k / NC * Math.PI * 2, x = 0.5 * (1 + Math.cos(th)); const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4); S.push([x, Math.sin(th) >= 0 ? yt : -yt]); }
  for (let i = 0; i <= NS; i++) { const r = r0 + (r1 - r0) * i / NS; const k = r > tipFrom ? (r - tipFrom) / (r1 - tipFrom) : 0; const c = c0 + (c1 - c0) * k, sw = sweep * k * k;
    for (const [x, y] of S) pos.push((x - 0.3) * c + sw, y * c, r); }
  for (let i = 0; i < NS; i++) for (let k = 0; k < NC; k++) { const A = i * NC + k, B = i * NC + (k + 1) % NC; idx.push(A, B, A + NC, B, B + NC, A + NC); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }

export function buildBell505() {
  const root = new THREE.Group(); root.name = 'bell505';
  const fus = cutWin(loft(FUS, -0.06, 9.97, 420, 176)), cowl = loft(COWL, 1.75, 5.12, 50, 48);
  const fin = plate([[9.25, 1.48], [9.72, 2.24], [9.94, 2.26], [9.92, 1.42]], 0.07);
  const ventral = plate([[9.22, 1.30], [9.60, 0.64], [9.84, 0.64], [9.80, 1.28]], 0.06);
  const stab = plate([[7.05, -0.90], [7.50, -0.90], [7.50, 0.90], [7.05, 0.90]], 0.05, 'xz', 1.30);
  const ends = [-1, 1].map(s => plate([[7.08, 1.16], [7.20, 1.48], [7.42, 1.50], [7.48, 1.12]], 0.04, 'xy', s * 0.93));
  const bodyG = merge([fus, cowl, fin, ventral, stab, ...ends, at(new THREE.CylinderGeometry(0.12, 0.20, 0.20, 24), DIM.mrA, 2.58, 0)]);
  const meshes = {}, M = (name, geo, mat) => { const m = new THREE.Mesh(geo, mat); m.name = name; meshes[name] = m; root.add(m); return m; };
  const dark = new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.55, metalness: 0.2 });
  const metal = new THREE.MeshStandardMaterial({ color: '#8d9094', roughness: 0.35, metalness: 0.8 });
  M('body', bodyG, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }));
  const glass = M('glass', glassGeo(), new THREE.MeshPhysicalMaterial({ color: '#9fb6c4', roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.03, metalness: 0.0, transparent: true, opacity: 0.42, envMapIntensity: 1.3, depthWrite: false }));
  glass.renderOrder = 2;
  // cabin interior so the light glass reads: floor, panel + glareshield, two crew seats, rear bench
  const inner = [at(new THREE.BoxGeometry(1.9, 0.04, 1.36), 2.15, 0.68, 0), at(new THREE.BoxGeometry(0.16, 0.24, 0.90), 1.22, 1.08, 0), at(new THREE.BoxGeometry(0.22, 0.04, 0.95), 1.20, 1.21, 0)];
  for (const z of [-0.36, 0.36]) inner.push(at(new THREE.BoxGeometry(0.50, 0.12, 0.48), 1.95, 0.98, z), at(new THREE.BoxGeometry(0.10, 0.70, 0.46), 2.22, 1.36, z));
  inner.push(at(new THREE.BoxGeometry(0.50, 0.12, 1.30), 2.72, 0.98, 0), at(new THREE.BoxGeometry(0.10, 0.75, 1.30), 2.98, 1.38, 0));
  M('interior', merge(inner), new THREE.MeshStandardMaterial({ color: '#8f8068', roughness: 0.85 }));
  // trim: windscreen centre post, door seams, hinges + handles, intake grilles, angled exhaust outlet
  const trim = frames();
  { const pts = []; for (let a = WIN.ws.a0 + 0.04; a <= WIN.ws.a1 - 0.02; a += 0.05) { const p = surfPt(a, Math.PI / 2, 0.012); pts.push([NX - p[0], p[1], 0]); } trim.push(tube(pts, 0.018, 6)); }
  for (const s of [-1, 1]) {
    for (const [a, y0, y1] of [[1.73, 0.56, 2.30], [2.47, 0.56, 2.32], [3.18, 0.62, 2.22]]) { const pts = []; for (let y = y0; y <= y1; y += 0.04) pts.push([a, y, zAt(a, y, s) + s * 0.004]); trim.push(tube(pts, 0.007, 4)); }
    for (const [a, y] of [[1.77, 1.25], [1.77, 1.95], [2.51, 1.25], [2.51, 1.95]]) trim.push(at(new THREE.BoxGeometry(0.07, 0.10, 0.03), a, y, zAt(a, y, s) + s * 0.012)); // hinges
    for (const a of [2.36, 3.10]) trim.push(at(new THREE.BoxGeometry(0.17, 0.035, 0.03), a, 0.80, zAt(a, 0.80, s) + s * 0.016)); // handles
    trim.push(at(new THREE.BoxGeometry(0.55, 0.22, 0.03), 3.70, 2.30, s * 0.585));
    for (let k = 0; k < 5; k++) trim.push(at(new THREE.BoxGeometry(0.53, 0.012, 0.045), 3.70, 2.22 + k * 0.042, s * 0.595)); }
  { const d = new THREE.Vector3(-0.55, 0.55, 0.62).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    const ex = new THREE.CylinderGeometry(0.15, 0.13, 0.34, 28, 1, true); ex.applyQuaternion(q); trim.push(at(ex, 4.45, 2.24, 0.40));
    const lip = new THREE.TorusGeometry(0.15, 0.015, 8, 28); lip.rotateX(Math.PI / 2); lip.translate(0, 0.17, 0); lip.applyQuaternion(q); trim.push(at(lip, 4.45, 2.24, 0.40)); }
  M('trim', merge(trim), dark);
  // ---------- landing gear: skid tubes (paintable) + arched dark crosstubes, steps
  const sk = [], xt = [], H = DIM.skidHalf;
  for (const s of [-1, 1]) { sk.push(tube([[0.80, 0.30, s * H], [0.95, 0.11, s * H], [1.20, 0.05, s * H], [2.6, 0.05, s * H], [4.25, 0.05, s * H], [4.40, 0.08, s * H]], 0.04));
    sk.push(at(new THREE.BoxGeometry(0.34, 0.025, 0.16), 1.85, 0.27, s * 0.90)); }
  for (const a of [1.58, 3.42]) xt.push(tube([[a, 0.05, -H], [a, 0.30, -0.90], [a, 0.47, -0.68], [a, 0.54, -0.35], [a, 0.55, 0], [a, 0.54, 0.35], [a, 0.47, 0.68], [a, 0.30, 0.90], [a, 0.05, H]], 0.045));
  M('skids', merge(sk), new THREE.MeshStandardMaterial({ color: '#2c2d2f', roughness: 0.5, metalness: 0.3 }));
  M('xtubes', merge(xt), new THREE.MeshStandardMaterial({ color: '#232427', roughness: 0.5, metalness: 0.3 }));
  // ---------- main rotor: mast, swashplate, yoke, grips, pitch horns + links; 2 tapered blades
  const A = DIM.mrA, Y = DIM.mrY, hub = [];
  hub.push(at(new THREE.CylinderGeometry(0.075, 0.09, Y - 2.48, 16), A, (Y + 2.48) / 2 - 0.02, 0));
  hub.push(at(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), A, 2.70, 0), at(new THREE.CylinderGeometry(0.20, 0.20, 0.03, 24), A, 2.76, 0));
  hub.push(at(new THREE.BoxGeometry(0.20, 0.10, 0.80), A, Y, 0), at(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 16), A, Y, 0));
  for (const s of [-1, 1]) { hub.push(at(new THREE.CylinderGeometry(0.055, 0.05, 0.36, 12).rotateX(Math.PI / 2), A, Y, s * 0.55));
    hub.push(at(new THREE.BoxGeometry(0.16, 0.03, 0.05), A + 0.10 * s, Y - 0.05, s * 0.40));
    hub.push(tube([[A + 0.17 * s, 2.77, s * 0.18], [A + 0.17 * s, Y - 0.05, s * 0.40]], 0.012, 6)); }
  hub.push(at(new THREE.SphereGeometry(0.05, 12, 8), A, Y + 0.12, 0));
  M('mrhub', merge(hub), metal);
  const bl = []; for (const s of [-1, 1]) { const g = blade(0.70, DIM.mrR, 0.33, 0.16, DIM.mrR - 0.35, 0.10, -0.12); if (s < 0) g.rotateY(Math.PI); bl.push(at(g, A, Y + 0.01, 0)); }
  M('mrblade', merge(bl), new THREE.MeshStandardMaterial({ color: '#26282b', roughness: 0.5 }));
  // ---------- tail rotor on the left side of the fin
  const trz = -0.16;
  M('trhub', merge([at(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12).rotateX(Math.PI / 2), DIM.trA, DIM.trY, trz + 0.06), at(new THREE.BoxGeometry(0.12, 0.10, 0.08), DIM.trA, DIM.trY, trz)]), metal);
  const tb = []; for (const s of [-1, 1]) { const g = blade(0.08, DIM.trR, 0.14, 0.11, DIM.trR - 0.12, 0.10); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2); if (s < 0) g.rotateZ(Math.PI); g.rotateZ(0.5); tb.push(at(g, DIM.trA, DIM.trY, trz - 0.04)); }
  M('trblade', merge(tb), new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.5 }));
  return { root, P: meshes };
}
