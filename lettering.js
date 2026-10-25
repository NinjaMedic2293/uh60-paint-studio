// User lettering + USCG-style vector graphics, projected onto the fuselage as decals that follow the curvature.
// Real-world sizing: the model is 1:1 in metres (overall length 19.76 m = 64 ft 10 in rotors turning, fuselage 15.5 m vs 15.26 m /
// 50 ft 0.75 in real), so 1 in = 0.0254 model units. Heights are entered in inches.
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
export const IN = 0.0254;
const NX = 6.243; // world x of the nose tip; a = NX - x (metres aft of the nose)
export const FONTS = [
  ['Barlow', 'fonts/Barlow-Bold.ttf', '700', 'Helvetica-style sans'],
  ['Barlow Condensed', 'fonts/BarlowCondensed-Bold.ttf', '700', 'Helvetica-style condensed'],
  ['Jost', 'fonts/Jost.ttf', '700', 'Futura-style geometric'],
  ['Stardos Stencil', 'fonts/StardosStencil-Bold.ttf', '700', 'Military stencil'],
  ['Saira Stencil One', 'fonts/SairaStencilOne-Regular.ttf', '400', 'Block stencil'],
];
export async function loadFonts() {
  await Promise.all(FONTS.map(async ([f, u, w]) => { try { const ff = new FontFace(f, `url(${u})`, { weight: w }); await ff.load(); document.fonts.add(ff); } catch (e) { console.warn('font', f, e); } }));
}
const fontOf = name => FONTS.find(f => f[0] === name) || FONTS[0];
// ---------- defaults (sizes in inches; positions in metres aft of nose / height above ground)
let NID = 1; const nid = () => 'm' + Date.now().toString(36) + (NID++);
export function newText(o = {}) { return { id: nid(), kind: 'text', text: 'TEXT', font: 'Barlow', color: '#111111', outline: '#ffffff', outlineIn: 0, hIn: 6, sx: 1, a: 7.2, y: 1.9, side: 1, rot: 0, both: true, ...o }; }
// matched to the user's MH-60T 6019 photo, scaled with the main wheel (26 in) and the cockpit door (~40 in wide) as anchors
export const USCG = {
  jet: () => [
    { id: nid(), group: 'jet', kind: 'jet', hIn: 17.5, color: '#c8102e', color2: '#ffffff', a: 5.30, y: 2.62, side: 1, rot: 0, both: true },
    { id: nid(), group: 'jet', kind: 'danger', hIn: 4.0, color: '#c8102e', color2: '#ffffff', a: 5.90, y: 2.66, side: 1, rot: 0, both: true }],
  rescue: () => [
    { id: nid(), group: 'rescue', kind: 'rescue', hIn: 9.5, color: '#f2b705', color2: '#111111', a: 2.00, y: 1.22, side: 1, rot: 32, both: true }],
};
// 14 CFR quick-starts (text verified on eCFR, current to 2026-10-22)
export const FAA = {
  nnumber: () => [newText({ text: 'N60TX', hIn: 12, font: 'Barlow', faa: true, a: 7.55, y: 1.78, note: '14 CFR 45.29(b)(3): rotorcraft marks >= 12 in; 45.27(a): horizontal, both sides' })],
  restricted: (w = 'RESTRICTED') => [
    newText({ text: w, hIn: 3, font: 'Barlow', a: 1.95, y: 0.98, note: '14 CFR 45.23(b): near each cockpit entrance, 2-6 in' }),
    newText({ text: w, hIn: 3, font: 'Barlow', a: 4.15, y: 0.80, note: '14 CFR 45.23(b): near each cabin entrance, 2-6 in' })],
};
// ---------- artwork: returns { c: canvas, wIn, hIn } ; dir = +1 artwork points forward on the right side, -1 mirrored for the left
const PX = 24; // texture pixels per inch (min)
function canvasFor(wIn, hIn) { const k = Math.min(PX * 2, Math.max(PX, 512 / hIn)); const c = document.createElement('canvas'); c.width = Math.ceil(wIn * k); c.height = Math.ceil(hIn * k); return { c, g: c.getContext('2d'), k }; }
function drawText(it) {
  const [fam, , wt] = fontOf(it.font); const tmp = document.createElement('canvas').getContext('2d');
  const F = 200; tmp.font = `${wt} ${F}px "${fam}"`; const capPx = tmp.measureText('H').actualBoundingBoxAscent || F * 0.7;
  const fpi = F / capPx; // font px per inch of cap height at 1 px/in
  const text = it.text || ' ';
  // layout in inches
  const capIn = it.hIn, pad = (it.outlineIn || 0) + capIn * 0.18;
  let glyphs = [], x = 0;
  tmp.font = `${wt} ${F}px "${fam}"`;
  for (const ch of [...text]) {
    const nat = tmp.measureText(ch).width / capPx * capIn; // natural advance (in)
    let w = nat * (it.sx || 1), adv = w;
    if (it.faa && ch !== ' ') { w = ch === '1' ? capIn / 6 : (ch === 'M' || ch === 'W') ? capIn : capIn * 2 / 3; adv = w + capIn * 2 / 3 / 4; } // 45.29(c),(e)
    glyphs.push({ ch, nat: Math.max(nat, 0.001), w, x }); x += adv;
  }
  if (it.faa && glyphs.length) x -= capIn * 2 / 3 / 4;
  const wIn = x + pad * 2, hIn = capIn + pad * 2;
  const { c, g, k } = canvasFor(wIn, hIn);
  g.font = `${wt} ${fpi * capIn * k}px "${fam}"`; g.textBaseline = 'alphabetic';
  const base = (pad + capIn) * k;
  const pass = stroke => glyphs.forEach(q => { if (q.ch === ' ') return; g.save(); g.translate((pad + q.x) * k, base);
    const sx = it.faa ? q.w / q.nat : (it.sx || 1); g.scale(sx, 1);
    if (stroke) g.strokeText(q.ch, 0, 0); else g.fillText(q.ch, 0, 0); g.restore(); });
  if (it.outlineIn > 0) { g.strokeStyle = it.outline || '#fff'; g.lineJoin = 'round'; g.lineWidth = it.outlineIn * 2 * k; pass(true); }
  g.fillStyle = it.color; pass(false);
  return { c, wIn, hIn };
}
function txt(g, s, x, y, size, color, rot = 0, fam = 'Barlow', wt = 700, outline = null, ow = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.font = `${wt} ${size}px "${fam}"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (outline) { g.strokeStyle = outline; g.lineWidth = ow; g.lineJoin = 'round'; g.strokeText(s, 0, 0); }
  g.fillStyle = color; g.fillText(s, 0, 0); g.restore();
}
// SVG path data for each shape (drawn with Path2D in a unit box, mirrored with dir)
const SVG = {
  // chevron "<" (tip aft) with two thick arms; box 1.10 x 1 (w x h)
  jet: { w: 1.10, d: 'M0 0.5 L1.10 0 L1.10 0.30 L0.40 0.5 L1.10 0.70 L1.10 1 Z' },
  danger: { w: 5.3, d: 'M0 0 H5.3 V1 H0 Z' },
  // arrow pointing +x: shaft + head; box 2.5 x 1
  rescue: { w: 2.5, d: 'M0 0.30 H1.70 V0 L2.5 0.5 L1.70 1 V0.70 H0 Z' },
};
function drawShape(it, dir) {
  const S = SVG[it.kind], hIn = it.hIn, wIn = S.w * hIn, pad = hIn * 0.06;
  const { c, g, k } = canvasFor(wIn + pad * 2, hIn + pad * 2);
  const u = hIn * k, ox = pad * k, W = wIn * k;
  const P = new Path2D(S.d);
  g.save(); g.translate(ox + (dir < 0 ? W : 0), ox); g.scale(dir * u, u);
  g.fillStyle = it.color; g.fill(P);
  if (it.kind === 'rescue') { g.lineWidth = 0.07; g.lineJoin = 'miter'; g.strokeStyle = it.color2; g.stroke(P); }
  g.restore();
  const X = f => ox + (dir < 0 ? W - f * u : f * u), Y = f => ox + f * u;
  if (it.kind === 'jet') {
    const ang = Math.atan2(0.5, 1.10) * dir; // arm angle
    txt(g, 'JET', X(0.80), Y(0.205), u * 0.20, it.color2, -ang);
    txt(g, 'INTAKE', X(0.76), Y(0.80), u * 0.17, it.color2, ang);
  } else if (it.kind === 'danger') {
    txt(g, 'DANGER', X(dir > 0 ? 1.95 : 3.35), Y(0.53), u * 0.78, it.color2);
    // arrow toward the intake (forward)
    g.save(); g.strokeStyle = g.fillStyle = it.color2; g.lineWidth = u * 0.09;
    const x0 = X(3.65), x1 = X(5.0); g.beginPath(); g.moveTo(x0, Y(0.5)); g.lineTo(x1, Y(0.5)); g.stroke();
    g.beginPath(); g.moveTo(x1 + dir * u * 0.12, Y(0.5)); g.lineTo(x1 - dir * u * 0.2, Y(0.30)); g.lineTo(x1 - dir * u * 0.2, Y(0.70)); g.fill(); g.restore();
  } else if (it.kind === 'rescue') {
    txt(g, 'RESCUE', X(1.0), Y(0.52), u * 0.34, it.color2, 0, 'Barlow', 800);
  }
  return { c, wIn: wIn + pad * 2, hIn: hIn + pad * 2 };
}
export function artwork(it, dir) { return it.kind === 'text' ? drawText(it) : drawShape(it, dir); }
// ---------- projection
export function fuselageOnly(mesh, matIndex) {
  const g = mesh.geometry, gr = g.groups.find(q => q.materialIndex === matIndex); const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) { const a = g.attributes[k]; if (!a) continue; out.setAttribute(k, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize)); }
  const m = new THREE.Mesh(out, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.matrixAutoUpdate = false; m.matrixWorld.copy(mesh.matrixWorld); m.matrix.copy(mesh.matrixWorld);
  out.computeBoundingSphere(); out.computeBoundingBox(); return m;
}
const ray = new THREE.Raycaster();
export function surfaceAt(fm, a, y, side, z = 0) {
  if (side === 0) { // belly: cast upward from below at lateral offset z (metres, + = right side)
    ray.set(new THREE.Vector3(NX - a, -2, z), new THREE.Vector3(0, 1, 0)); ray.far = 6;
    const h = ray.intersectObject(fm, false)[0]; if (!h) return null;
    const n = h.face.normal.clone().transformDirection(fm.matrixWorld); if (n.y > 0) n.negate(); return { p: h.point, n }; }
  ray.set(new THREE.Vector3(NX - a, y, side * 6), new THREE.Vector3(0, 0, -side)); ray.far = 12;
  const h = ray.intersectObject(fm, false).find(q => q.face && (q.point.z * side > 0)); if (!h) return null;
  const n = h.face.normal.clone().transformDirection(fm.matrixWorld); if (n.z * side < 0) n.negate();
  return { p: h.point, n };
}
function decalFor(fm, it, side, depth = 0.30) {
  const s = surfaceAt(fm, it.a, it.y, side, it.z || 0); if (!s) return null;
  const dir = side || 1; const art = artwork(it, dir);
  const n = s.n.clone(); if (side) { n.z = n.z * 0.7 + side * 0.3; } else { n.y = n.y * 0.7 - 0.3; } n.normalize(); // bias toward the side / belly normal for stability on tight curves
  // belly: letter tops point to the left side (-z) so text runs nose -> tail and reads unmirrored from below
  const yv = side ? new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize() : new THREE.Vector3(0, 0, -1).addScaledVector(n, n.z).normalize(); const xv = new THREE.Vector3().crossVectors(yv, n).normalize();
  const r = (it.rot || 0) * Math.PI / 180 * (side > 0 ? 1 : -1) * (it.kind === 'text' ? 1 : 1);
  const q = new THREE.Quaternion().setFromAxisAngle(n, r); xv.applyQuaternion(q); yv.applyQuaternion(q);
  const M = new THREE.Matrix4().makeBasis(xv, yv, n); const e = new THREE.Euler().setFromRotationMatrix(M);
  const size = new THREE.Vector3(art.wIn * IN, art.hIn * IN, depth);
  let geo = new DecalGeometry(fm, s.p, e, size);
  // drop back-facing triangles so the decal never bleeds through to the opposite skin
  const pa = geo.attributes.position, na = geo.attributes.normal, keep = [];
  for (let t = 0; t < pa.count; t += 3) { const nz = (na.getX(t) * n.x + na.getY(t) * n.y + na.getZ(t) * n.z); if (nz > 0.15) keep.push(t); }
  if (keep.length * 3 < pa.count) { const ng = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) { const A = geo.attributes[k], s2 = A.itemSize, arr = new Float32Array(keep.length * 3 * s2); keep.forEach((t, i) => arr.set(A.array.slice(t * s2, (t + 3) * s2), i * 3 * s2)); ng.setAttribute(k, new THREE.BufferAttribute(arr, s2)); } geo.dispose(); geo = ng; }
  const tex = new THREE.CanvasTexture(art.c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 0.55 });
  const o = new THREE.Mesh(geo, m); o.renderOrder = 3; o.receiveShadow = true; o.userData = { mid: it.id, side, wIn: art.wIn, hIn: art.hIn, p: s.p.clone() };
  return o;
}
// ---------- manager: caches built decals by item JSON so A|B compare and dragging stay cheap
export function createMarks(scene, fm) {
  const root = new THREE.Group(); root.name = 'marks'; scene.add(root); const cache = new Map();
  function build(it) { const g = new THREE.Group(); for (const side of it.side === 0 ? [0] : it.both ? [1, -1] : [it.side || 1]) { const o = decalFor(fm, it, side); if (o) g.add(o); } return g; }
  function sync(marks = []) {
    const want = new Set();
    for (const it of marks) { const key = JSON.stringify(it); want.add(key); if (!cache.has(key)) { const g = build(it); cache.set(key, g); root.add(g); } }
    for (const [k, g] of cache) { g.visible = want.has(k); }
    if (cache.size > 120) for (const [k, g] of cache) { if (!want.has(k)) { root.remove(g); g.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); cache.delete(k); } }
  }
  const meshes = () => { const out = []; root.traverse(o => { if (o.isMesh && o.parent.visible) out.push(o); }); return out; };
  return { root, sync, meshes };
}
// ---------- migrate the old fixed tail/program/logo fields into lettering items
export function migrate(s) {
  if (!s.marks) s.marks = [];
  const add = (t, o) => { if (t) s.marks.push(newText({ text: t, color: s.colors?.text || '#111', ...o })); };
  add(s.tail, { a: 12.55, y: 1.62, hIn: 13 }); add(s.program, { a: 7.15, y: 2.05, hIn: 9 }); add(s.logo, { a: 2.55, y: 1.20, hIn: 8 });
  delete s.tail; delete s.program; delete s.logo; return s;
}
