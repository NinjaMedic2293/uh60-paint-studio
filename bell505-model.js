// Bell 505 Jet Ranger X — original procedural geometry (no third-party model data).
// Built from public dimensions and reference photos; world frame: nose tip at x = NX, a = NX - x, +y up, +z right, ground y = 0.
import * as THREE from 'three';
export const NX = 6.243;
export const DIM = { mrR: 5.64, trR: 0.83, mrA: 3.00, mrY: 3.02, trA: 9.46, trY: 2.08, skidHalf: 0.95 };
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

// ---------- fuselage stations [a, yBot, yTop, halfWidth, superellipse n]
export const FUS = [
  [-0.02, 0.84, 0.86, 0.02, 2.0], [0.00, 0.76, 0.98, 0.12, 2.2], [0.15, 0.64, 1.24, 0.42, 2.4], [0.40, 0.57, 1.52, 0.64, 2.6], [0.80, 0.55, 1.92, 0.78, 2.9],
  [1.30, 0.54, 2.15, 0.83, 3.2], [1.80, 0.54, 2.25, 0.84, 3.4], [2.60, 0.55, 2.28, 0.84, 3.4], [3.30, 0.58, 2.27, 0.82, 3.2], [3.80, 0.68, 2.23, 0.74, 3.0],
  [4.30, 0.95, 2.15, 0.56, 2.8], [4.80, 1.30, 2.05, 0.38, 2.5], [5.20, 1.48, 1.98, 0.28, 2.2], [6.0, 1.55, 1.93, 0.21, 2.0], [8.0, 1.63, 1.89, 0.15, 2.0],
  [9.6, 1.69, 1.87, 0.11, 2.0], [9.95, 1.71, 1.86, 0.09, 2.0], [9.97, 1.77, 1.80, 0.01, 2.0]];
// engine cowl / transmission fairing hump on the roof (Arrius 2R behind the mast)
export const COWL = [[1.95, 2.05, 2.24, 0.05, 2.6], [2.15, 2.05, 2.40, 0.50, 3.0], [2.7, 2.05, 2.55, 0.60, 3.4], [3.6, 2.05, 2.58, 0.60, 3.4],
  [4.3, 2.0, 2.50, 0.52, 3.2], [4.85, 1.95, 2.36, 0.38, 2.8], [5.25, 1.88, 2.14, 0.22, 2.4], [5.45, 1.85, 1.98, 0.04, 2.0]];
// glazing masks (a, y, z) on the fuselage surface
export const isWindscreen = (a, y, z) => a < 1.60 && y > 0.86 + 0.12 * Math.abs(z) + 0.22 * a && y < 2.18 && (a > 0.08) && !(Math.abs(z) < 0.03 && a > 1.0) && !(a < 0.32);
const doorWin = (a, y, a0, a1, yb, yt) => a > a0 && a < a1 && y > yb && y < yt;
export const isSideWin = (a, y, z) => Math.abs(z) > 0.55 && (doorWin(a, y, 1.74, 2.48, 1.18, 2.12) || doorWin(a, y, 2.66, 3.0, 1.30, 2.08));
export const isChin = (a, y, z) => a > 0.30 && a < 1.25 && y < 0.98 && y > 0.66 && Math.abs(z) > 0.18 && Math.abs(z) < 0.66; // lower nose chin windows

export function buildBell505() {
  const root = new THREE.Group(); root.name = 'bell505';
  const fus = loft(FUS, -0.02, 9.97, 260, 112), cowl = loft(COWL, 1.95, 5.45, 50, 48);
  const glassG = merge([pick(fus, (a, y, z) => isWindscreen(a, y, z) || isSideWin(a, y, z)), pick(fus, isChin)]);
  // fins: vertical fin (upper + ventral) swept, at tail
  const fin = plate([[8.95, 1.84], [9.50, 2.85], [9.92, 2.88], [9.96, 1.84]], 0.07);
  const ventral = plate([[9.20, 1.72], [9.68, 1.05], [9.95, 1.08], [9.96, 1.72]], 0.06);
  const stab = plate([[7.45, -1.0], [7.95, -1.0], [7.95, 1.0], [7.45, 1.0]], 0.05, 'xz', 1.72); // horizontal stabiliser (a,z)
  const ends = [-1, 1].map(s => plate([[7.50, 1.58], [7.66, 1.95], [7.92, 1.96], [7.95, 1.52]], 0.04, 'xy', s * 1.03));
  const bodyG = merge([fus, cowl, fin, ventral, stab, ...ends, at(new THREE.CylinderGeometry(0.16, 0.30, 0.30, 24), DIM.mrA, 2.65, 0) /* mast fairing */]);
  const meshes = {};
  const M = (name, geo, mat) => { const m = new THREE.Mesh(geo, mat); m.name = name; meshes[name] = m; root.add(m); return m; };
  const paint = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.55, metalness: 0.2 });
  const metal = new THREE.MeshStandardMaterial({ color: '#8d9094', roughness: 0.35, metalness: 0.8 });
  M('body', bodyG, paint);
  M('glass', glassG, new THREE.MeshPhysicalMaterial({ color: '#22323c', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.78, envMapIntensity: 1.6 }));
  // trim: intakes (grilles both sides of the cowl), exhaust, door seams, nav light, antenna
  const trim = [];
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.62, 0.20, 0.03); trim.push(at(g, 3.55, 2.38, s * 0.595));
    for (let k = 0; k < 5; k++) trim.push(at(new THREE.BoxGeometry(0.60, 0.012, 0.045), 3.55, 2.30 + k * 0.04, s * 0.60)); }
  const ex = new THREE.CylinderGeometry(0.17, 0.15, 0.36, 24, 1, true); ex.rotateZ(-0.95); trim.push(at(ex, 4.85, 2.40, 0));
  for (const [a, y0, y1] of [[1.68, 0.62, 2.18], [2.58, 0.60, 2.24], [3.40, 0.64, 2.22]]) for (const s of [-1, 1]) {
    const f = sampler(FUS); const pts = []; for (let y = y0; y <= y1; y += 0.05) { const [yb, yt, hw, n] = f(a); const hh = (yt - yb) / 2, cy = (yb + yt) / 2; const v = Math.min(0.999, Math.abs((y - cy) / hh)); pts.push([a, y, s * (hw * (1 - v ** n) ** (1 / n) + 0.004)]); }
    trim.push(tube(pts, 0.008, 4)); }
  M('trim', merge(trim), dark);
  // ---------- skids: two crosstubes + skid tubes with upturned toe and a step on each side
  const sk = [];
  for (const s of [-1, 1]) { sk.push(tube([[0.55, 0.32, s * DIM.skidHalf], [0.72, 0.11, s * DIM.skidHalf], [1.0, 0.05, s * DIM.skidHalf], [2.6, 0.05, s * DIM.skidHalf], [4.35, 0.05, s * DIM.skidHalf], [4.5, 0.08, s * DIM.skidHalf]], 0.04));
    sk.push(at(new THREE.BoxGeometry(0.34, 0.025, 0.16), 1.75, 0.30, s * 0.92)); }
  for (const a of [1.62, 3.55]) sk.push(tube([[a, 0.05, -DIM.skidHalf], [a, 0.42, -0.86], [a, 0.55, -0.52], [a, 0.56, 0], [a, 0.55, 0.52], [a, 0.42, 0.86], [a, 0.05, DIM.skidHalf]], 0.045));
  M('skids', merge(sk), metal.clone());
  // ---------- main rotor (2 blades) and hub
  const hub = [at(new THREE.CylinderGeometry(0.08, 0.10, 0.62, 16), DIM.mrA, 2.78, 0), at(new THREE.BoxGeometry(0.30, 0.16, 0.95), DIM.mrA, DIM.mrY, 0), at(new THREE.SphereGeometry(0.13, 16, 10), DIM.mrA, DIM.mrY + 0.1, 0)];
  for (const s of [-1, 1]) hub.push(at(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 8), DIM.mrA + s * 0.16, 2.88, s * 0.22));
  M('mrhub', merge(hub), metal);
  const bl = []; for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.33, 0.035, DIM.mrR - 0.42); g.translate(0, 0, s * (0.42 + (DIM.mrR - 0.42) / 2)); bl.push(at(g, DIM.mrA, DIM.mrY + 0.02, 0)); }
  M('mrblade', merge(bl), new THREE.MeshStandardMaterial({ color: '#26282b', roughness: 0.5 }));
  // ---------- tail rotor on the left side of the fin
  const trz = -0.16;
  const th = at(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12).rotateX(Math.PI / 2), DIM.trA, DIM.trY, trz + 0.06);
  M('trhub', merge([th, at(new THREE.BoxGeometry(0.12, 0.10, 0.08), DIM.trA, DIM.trY, trz)]), metal);
  const tb = []; for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.14, DIM.trR - 0.07, 0.02); g.translate(0, s * (0.07 + (DIM.trR - 0.07) / 2), 0); g.rotateZ(0.5); tb.push(at(g, DIM.trA, DIM.trY, trz - 0.04)); }
  M('trblade', merge(tb), new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.5 }));
  return { root, P: meshes };
}
