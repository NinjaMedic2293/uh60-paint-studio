// External rescue hoist, HH-60W pattern (electric hoist, Breeze-Eastern HS-29900 class; exact model not published).
// Rebuilt from /workspace/3d/hoist-ref/anatomy.md (v3): a gooseneck mast rises from the right cabin-roof shoulder above the
// forward half of the sliding-door opening, curving up and outboard into the underside of the hoist head, which sits HIGH
// (centre ~0.7 m above the door top, level with the engine inlet), axis fore-aft. Forward end: round cap with a large disk cover.
// Aft end: light lens and data plate; the cable exits under the aft end and the bumper + hook stow just below it.
// Positions use kits.js P(a, y, z): a = metres aft of the nose tip, y = height above ground, z = +right (outboard).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { P } from './kits.js';

// smooth normals across coincident vertices (ExtrudeGeometry is non-indexed, which shows facet bands)
function smoothNormals(geo) { geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, acc = new Map(), key = i => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
  for (let i = 0; i < p.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a); }
  for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(...a) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); } return geo; }
function mesh(g, m, pos, rot) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; if (pos) o.position.copy(pos); if (rot) o.rotation.set(...rot); return o; }
// lathe about the fore-aft (world x) axis; profile [[r, x]] aft -> forward; sy stretches the section vertically
function latheX(profile, m, pos, sy = 1, seg = 48) {
  const g = new THREE.LatheGeometry(profile.map(([r, t]) => new THREE.Vector2(Math.max(r, 1e-4), t)), seg);
  g.rotateZ(-Math.PI / 2); g.scale(1, sy, 1); g.computeVertexNormals(); return mesh(g, m, pos);
}
// swept tube with varying radius and a vertical/horizontal aspect (fore-aft width wx, lateral width wz)
function sweep(pts, r0, r1, m, ax = 1.0) {
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); const n = 40, seg = 24;
  const g = new THREE.TubeGeometry(c, n, 1, seg, false), pos = g.attributes.position, p = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= n; i++) { const t = i / n, r = r0 + (r1 - r0) * t * t; c.getPointAt(t, p);
    for (let j = 0; j <= seg; j++) { const k = i * (seg + 1) + j; v.fromBufferAttribute(pos, k).sub(p); v.x *= ax; v.multiplyScalar(r).add(p); pos.setXYZ(k, v.x, v.y, v.z); } }
  g.computeVertexNormals(); return mesh(g, m);
}

// readable data plate: light anodised plate with engraved-look dark text (generic legend, no real part numbers)
function plateTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#c4c6bf'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#2b2d2f'; x.lineWidth = 8; x.strokeRect(10, 10, 492, 236);
  x.fillStyle = '#26282a'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.fillText('RESCUE HOIST', 256, 66);
  x.font = '26px monospace'; x.textAlign = 'left';
  [['P/N', 'HS-29900-1'], ['S/N', '0412'], ['CAP', '600 LB'], ['CABLE', '290 FT']].forEach(([k, v], i) => { x.fillText(k, 40, 112 + i * 34); x.fillText(v, 170, 112 + i * 34); });
  x.fillStyle = '#26282a'; for (const [cx, cy] of [[28, 28], [484, 28], [28, 228], [484, 228]]) { x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildHoist(M) {
  const g = new THREE.Group();
  const paint = M.hoist;
  const shroud = paint.clone(); shroud.roughness = 0.65; // darker motor housing / fairings: tracks the scheme hoist colour
  const steel = new THREE.MeshPhysicalMaterial({ color: '#b9bdc1', roughness: 0.28, metalness: 1.0 });
  const darkSteel = new THREE.MeshPhysicalMaterial({ color: '#36383b', roughness: 0.45, metalness: 0.85 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.85 });
  const lens = new THREE.MeshPhysicalMaterial({ color: '#0a0e13', roughness: 0.03, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
  const plateM = new THREE.MeshPhysicalMaterial({ map: plateTexture(), roughness: 0.45, metalness: 0.3 });

  // ---- position (v3.5, see anatomy.md "v3.5 height"): fore-aft kept from v3.4 (head a 4.59-5.61, centre a 5.10). The head
  // now sits HIGH on a tall gooseneck: bottom ~0.05 m above the engine-inlet top (y 2.98), centre y 3.32 (0.64 m above the inlet centre;
  // 0.27 of the roof-to-hub span, as in 4521), so the bumper and
  // hook hang clear below it beside the inlet. Head enlarged ~16% (0.58 m tall x 0.47 m wide x 1.02 m long).
  const HA = 5.10, HX = P(HA, 0, 0).x, HY = 3.32, HZ = 1.55;
  const L = 1.02, Hh = 0.58, Wd = 0.47;
  // ---- mast foot: bolted ON the upper outboard shoulder of the nacelle/cabin roof skin (surface y 2.815 at z 1.18, a 4.95,
  // raycast against the model), with a flange tilted to the local ~45 deg skin slope, so the post stands on the roof line
  const FA = HA - 0.15, FZ = 1.18, FY = 2.815, tilt = -0.85;
  const flange = mesh(new RoundedBoxGeometry(0.36, 0.03, 0.24, 2, 0.012), paint, P(FA, FY + 0.005, FZ), [tilt, 0, 0]); g.add(flange);
  for (const da of [-0.13, -0.04, 0.04, 0.13]) for (const s of [-1, 1]) {
    const o = new THREE.Vector3(0, 0.022, s * 0.09).applyEuler(new THREE.Euler(tilt, 0, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.014, 8), darkSteel, P(FA + da, FY + 0.005, FZ).add(o), [tilt, 0, 0])); }
  // base boot: a tapered collar from the flange into the post, so the post reads as rigidly socketed
  g.add(sweep([P(FA, FY - 0.02, FZ - 0.02), P(FA, FY + 0.05, FZ + 0.01), P(FA, FY + 0.12, FZ + 0.035)], 0.135, 0.10, shroud, 1.25));
  // ---- gooseneck post (photo 4521): a thick tube rising from the shoulder, standing nearly vertical, then curving up and
  // outboard into the inboard underside of the head. Rise ~0.25 m above the skin to the saddle (0.5 m to the head axis).
  const top = P(FA, HY - Hh / 2 + 0.03, HZ - 0.10);
  const pts = [P(FA, FY - 0.01, FZ), P(FA, FY + 0.08, FZ + 0.02), P(FA, FY + 0.15, FZ + 0.06), P(FA, FY + 0.20, FZ + 0.15), P(FA, top.y - 0.03, HZ - 0.15), top];
  g.add(sweep(pts, 0.095, 0.075, paint, 1.2));
  // ---- head: fore-aft drum with flat sides, tall helmet section narrowing to a keel
  const sec = (sc, H, W) => { const s = new THREE.Shape(), n = 64;
    for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      const yy = Math.sign(c) * Math.pow(Math.abs(c), 0.55) * H / 2;
      const taper = yy < 0 ? 1 - 0.40 * Math.pow(-yy / (H / 2), 1.6) : 1;
      const xx = Math.sign(sn) * Math.pow(Math.abs(sn), 0.55) * W / 2 * taper;
      i ? s.lineTo(xx * sc, yy * sc) : s.moveTo(xx * sc, yy * sc); } return s; };
  const drum = (len, H, W, bev, mat, pos) => { const geo = new THREE.ExtrudeGeometry(sec(1 - 2 * bev / W * 0.9, H, W), { depth: len - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.9, bevelSegments: 10, curveSegments: 64 });
    geo.translate(0, 0, -(len - 2 * bev) / 2); geo.rotateY(Math.PI / 2); return mesh(smoothNormals(geo), mat, pos); };
  const head = drum(L, Hh, Wd, 0.06, paint, new THREE.Vector3(HX, HY, HZ)); g.add(head);
  head.onBeforeRender = () => shroud.color.copy(paint.color).multiplyScalar(0.38);
  // inboard motor/gearbox housing: a darker second lobe along the inboard upper side (the dark "helmet" behind the cover in 4521)
  g.add(drum(L * 0.80, Hh * 0.72, 0.20, 0.05, shroud, new THREE.Vector3(HX - 0.04, HY + 0.05, HZ - Wd / 2 + 0.02)));
  // raised circumferential reinforcing bands and a spine along the top
  for (const dx of [-0.24, 0.26]) { const b = drum(0.03, Hh + 0.012, Wd + 0.012, 0.01, paint, new THREE.Vector3(HX + dx, HY, HZ)); g.add(b); }
  g.add(mesh(new RoundedBoxGeometry(L * 0.86, 0.035, 0.07, 2, 0.015), paint, new THREE.Vector3(HX, HY + Hh / 2 + 0.005, HZ + 0.03)));
  // keel fairing where the post meets the underside
  const fair = mesh(new THREE.SphereGeometry(1, 48, 28), shroud, new THREE.Vector3(HX + 0.05, HY - Hh / 2 + 0.06, HZ - 0.10)); fair.scale.set(0.30, 0.10, 0.12); g.add(fair);
  // forward end: large flat circular cover high and outboard on the face (4521), with rim, bolt circle and centre boss
  const FE = HX + L / 2, cy = HY + 0.08, cz = HZ + 0.04;
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.025, 56), paint, new THREE.Vector3(FE + 0.004, cy, cz), [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.TorusGeometry(0.16, 0.013, 10, 56), shroud, new THREE.Vector3(FE - 0.002, cy, cz), [0, Math.PI / 2, 0]));
  for (let k = 0; k < 10; k++) { const t = k / 10 * Math.PI * 2;
    g.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 8), darkSteel, new THREE.Vector3(FE + 0.018, cy + 0.125 * Math.sin(t), cz + 0.125 * Math.cos(t)), [0, 0, Math.PI / 2])); }
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.03, 20), shroud, new THREE.Vector3(FE + 0.02, cy, cz), [0, 0, Math.PI / 2]));
  // aft end: large framed rectangular lens
  const AE = HX - L / 2;
  g.add(mesh(new RoundedBoxGeometry(0.05, 0.42, 0.38, 3, 0.02), darkSteel, new THREE.Vector3(AE + 0.005, HY + 0.03, HZ)));
  g.add(mesh(new RoundedBoxGeometry(0.02, 0.35, 0.31, 2, 0.008), rubber, new THREE.Vector3(AE - 0.012, HY + 0.03, HZ)));
  g.add(mesh(new RoundedBoxGeometry(0.012, 0.33, 0.29, 2, 0.006), lens, new THREE.Vector3(AE - 0.016, HY + 0.03, HZ)));
  for (const dy of [-0.18, 0.18]) for (const dz of [-0.16, 0.16])
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), steel, new THREE.Vector3(AE - 0.022, HY + 0.03 + dy, HZ + dz), [0, 0, Math.PI / 2]));
  // data plate on the upper outboard flat, between the aft and middle bands: a real texture with a legend, not stripes
  const pz = HZ + Wd / 2 * 0.99 + 0.004, py = HY + 0.07, px = AE + 0.20;
  const pl = mesh(new THREE.PlaneGeometry(0.24, 0.12), plateM, new THREE.Vector3(px, py, pz)); g.add(pl);
  g.add(mesh(new THREE.BoxGeometry(0.25, 0.13, 0.004), darkSteel, new THREE.Vector3(px, py, pz - 0.003)));
  // ---- cable exits the CENTRE of the drum underside (user-confirmed); compact stack: fairlead, short bumper, swivel, hook
  const cx = HX, czc = HZ, yb = HY - Hh / 2 * 0.98;
  g.add(mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.035, 24), darkSteel, new THREE.Vector3(cx, yb - 0.012, czc)));      // fairlead
  g.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 6), steel, new THREE.Vector3(cx, yb - 0.04, czc)));            // cable
  g.add(mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.13, 28), rubber, new THREE.Vector3(cx, yb - 0.115, czc)));          // bumper
  for (const d of [-0.035, 0.0, 0.035]) g.add(mesh(new THREE.TorusGeometry(0.058, 0.006, 8, 28), rubber, new THREE.Vector3(cx, yb - 0.115 + d, czc), [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 20), steel, new THREE.Vector3(cx, yb - 0.192, czc)));
  g.add(mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.07, 20), steel, new THREE.Vector3(cx, yb - 0.24, czc)));          // swivel
  // hook: shank + J-bowl swept as one tube, with a spring latch, in the lateral plane (seen open from the front, as in 4521)
  const hy = yb - 0.275, hk = [[0, 0], [0, -0.05], [0.012, -0.09], [0.045, -0.125], [0.03, -0.17], [-0.015, -0.18], [-0.05, -0.15], [-0.055, -0.11], [-0.035, -0.085]];
  g.add(sweep(hk.map(([dz, dy]) => new THREE.Vector3(cx, hy + dy, czc + dz)), 0.017, 0.013, steel));
  g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.075, 8), steel, new THREE.Vector3(cx, hy - 0.065, czc - 0.02), [-0.5, 0, 0]));   // latch
  g.name = 'hoist'; g.userData.label = 'External rescue hoist (HH-60W pattern)';
  return g;
}
