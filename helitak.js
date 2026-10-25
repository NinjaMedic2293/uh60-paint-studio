// Helitak FT4500 belly fire tank (FAA STC SR04461CH) for UH-60/S-70. Brochure + helitak.com.au specs: 4500 L (1188 gal),
// shell 3400 mm long x 2000 mm wide, 300 mm (12 in) retracted ("empty profile") height, carbon-fibre shell, roll-under install on
// the ESSS lower mounts + cargo hook, HP6000 hover (snorkel) pump 6000 L/min. When filled the red skirt EXPANDS downward into a
// tapered hopper; after the drop it retracts to the 300 mm profile (Helitak / AirHistory N8286 / Airliners Kestrel captions).
// Shape and hose routing from photos (notes: /workspace/3d/helitak-ref/notes.md): rigid light shell on top, red skirt below,
// dark bottom doors; orange snorkel tube on the LEFT side just aft of the main gear. Extended: tube hangs (v2: 3.2 m tube +
// 0.55 m pump head, ~10 deg aft trail); retracted: tube swung aft and lying along the left side of the tank, strapped at the tail.
// Positions use kits.js P(a, y, z): a = metres aft of the nose tip, y = height above ground, z = +right.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { P } from './kits.js';
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
// v2 (photo-measured, main wheel 0.66 m as ruler): N8286 side drop (APF) skirt 1.46 m deep, bottom ~1.6 m below wheel bottoms,
// front face ~31 deg / aft face ~32 deg from vertical, sides near-vertical, front of tank ~ main axle; VH-URS (brochure) depth ~1.3 m,
// bottom ~1.2 m below wheels, snorkel ~3.7 m incl. a long slim pump head, pivot just aft of the left main wheel at shell height.
// v4: bag is a smaller footprint than the 3.4 x 2.0 frame: top 2.6 x 1.6, 0.75 m deep, bottom ~2.27 x 1.70 (flare)
// -> bag ~3.01 m3 + shell ~1.71 m3 = ~4.72 m3 (4500 L + 5%); total depth ~1.01 m = ~1.5x the 0.66 m main wheel (N8286/VH-URS).
// (v3 note, superseded:) capacity is the hard constraint. Shell (3.4 x 2.0 x 0.26, ~1.71 m3) + skirt (0.50 m deep, narrower top that flares
// 4 deg outward, 15/10 deg front/aft faces, flat bottom) = ~4.75 m3 = 4500 L + ~5% margin; bottom ~0.2 m below wheel bottoms.
export const HT = { a0: 3.55, a1: 6.95, w: 2.0, top: 0.565, shell: 0.26, band: 0.04, depth: 0.75, fSlope: 15, aSlope: 10, sSlope: -4, inset: 0.07, bagL: 2.6, bagW: 1.6,
  piv: [3.95, 0.50, -1.19], tube: 3.2, head: 0.55, hang: 0.17, stow: 1.505 };
function mesh(g, m, pos, rot) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; if (pos) o.position.copy(pos); if (rot) o.rotation.set(...rot); return o; }
// rounded-rectangle outline (half sizes hx along x, hz along z, corner radius r), n points per corner
function rrect(hx, hz, r, n = 6) { const pts = []; const cs = [[hx - r, hz - r, 0], [-(hx - r), hz - r, 1], [-(hx - r), -(hz - r), 2], [hx - r, -(hz - r), 3]];
  for (const [cx, cz, q] of cs) for (let i = 0; i <= n; i++) { const t = (q + i / n) * Math.PI / 2; pts.push([cx + r * Math.cos(t), cz + r * Math.sin(t)]); } return pts; }
export function buildHelitak() {
  const g = new THREE.Group(); g.name = 'helitak'; g.userData.label = 'Helitak FT4500 fire tank';
  const M = {
    shell: new THREE.MeshPhysicalMaterial({ color: '#e8e9ea', roughness: 0.45, clearcoat: 0.4 }),
    skirt: new THREE.MeshPhysicalMaterial({ color: '#c8202a', roughness: 0.5, clearcoat: 0.25, side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ color: '#2a2c2e', roughness: 0.7, metalness: 0.3 }),
    tube: new THREE.MeshPhysicalMaterial({ color: '#e46a1c', roughness: 0.45, clearcoat: 0.3 }),
    steel: new THREE.MeshPhysicalMaterial({ color: '#b7bbbf', roughness: 0.3, metalness: 1 }),
    motor: new THREE.MeshPhysicalMaterial({ color: '#6b5a3e', roughness: 0.4, metalness: 0.6 }),
    yellow: new THREE.MeshStandardMaterial({ color: '#e8c21a', roughness: 0.55 }),
    strap: new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.9 }),
  };
  const cx = (HT.a0 + HT.a1) / 2, L = HT.a1 - HT.a0, X = P(cx, 0, 0).x, yS = HT.top - HT.shell;
  // rigid carbon shell (top part of the 300 mm profile)
  g.add(mesh(new RoundedBoxGeometry(L, HT.shell, HT.w, 4, 0.07), M.shell, new THREE.Vector3(X, HT.top - HT.shell / 2, 0)));
  // dark mounting rail on top (gap to the belly) and ESSS/hook fittings
  g.add(mesh(new THREE.BoxGeometry(L - 0.3, 0.02, HT.w - 0.3), M.dark, new THREE.Vector3(X, HT.top + 0.008, 0)));
  for (const a of [3.85, 5.25, 6.6]) for (const s of [1, -1]) g.add(mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06), M.dark, P(a, HT.top - 0.03, s * (HT.w / 2 + 0.02))));
  // expanding skirt: rings of rounded rectangles from the shell bottom down to the bottom doors
  const NR = 6, NP = rrect(1, 1, 0.1).length;
  const sg = new THREE.BufferGeometry(); const pos = new Float32Array(NR * NP * 3); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const idx = []; for (let r = 0; r < NR - 1; r++) for (let i = 0; i < NP; i++) { const j = (i + 1) % NP, a = r * NP + i, b = r * NP + j, c = (r + 1) * NP + i, d = (r + 1) * NP + j; idx.push(a, c, b, b, c, d); }
  const uv = new Float32Array(NR * NP * 2); for (let r = 0; r < NR; r++) for (let i = 0; i < NP; i++) { uv[(r * NP + i) * 2] = i / NP * 14; uv[(r * NP + i) * 2 + 1] = r / (NR - 1); }
  sg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); sg.setIndex(idx);
  { // cheap fabric creases: soft vertical folds + a couple of horizontal fold lines (procedural canvas, colour + bump)
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 128);
    let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) { const px = rnd() * 256, w = 3 + rnd() * 10, g = x.createLinearGradient(px - w, 0, px + w, 0); const k = 200 + rnd() * 30 | 0;
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(${k},${k},${k},0.8)`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px - w, rnd() * 30, 2 * w, 128); }
    for (const py of [42, 86]) { x.fillStyle = 'rgba(215,215,215,0.7)'; x.fillRect(0, py, 256, 2); }
    const T = new THREE.CanvasTexture(c); T.wrapS = THREE.RepeatWrapping; T.colorSpace = THREE.SRGBColorSpace; M.skirt.map = T; M.skirt.bumpMap = T; M.skirt.bumpScale = 0.6; M.skirt.clearcoat = 0.1; M.skirt.roughness = 0.75; } const skirt = mesh(sg, M.skirt); g.add(skirt);
  const bot = mesh(new RoundedBoxGeometry(1, 0.035, 1, 2, 0.012), M.dark); g.add(bot);
  const seam = mesh(new THREE.BoxGeometry(1, 0.004, 0.012), M.strap); g.add(seam);
  const tn = d => Math.tan(d * Math.PI / 180);
  function shape(e) { // e: 0 retracted .. 1 extended. Flat sloped front/aft faces, near-vertical sides, small corner radius
    const D = HT.band + (HT.depth - HT.band) * e, ix = HT.inset + e * ((L - HT.bagL) / 2 - HT.inset), iz = HT.inset + e * ((HT.w - HT.bagW) / 2 - HT.inset), xf0 = X + L / 2 - ix, xa0 = X - L / 2 + ix, hw0 = HT.w / 2 - iz; let xf, xa, hw, y;
    for (let r = 0; r < NR; r++) { const f = r / (NR - 1), d = D * f; y = yS - d;
      xf = xf0 - d * tn(HT.fSlope); xa = xa0 + d * tn(HT.aSlope); hw = hw0 - d * tn(HT.sSlope);
      const o = rrect((xf - xa) / 2, hw, 0.08), cx = (xf + xa) / 2;
      for (let i = 0; i < NP; i++) { const k = (r * NP + i) * 3; pos[k] = cx + o[i][0]; pos[k + 1] = y; pos[k + 2] = o[i][1]; } }
    sg.attributes.position.needsUpdate = true; sg.computeVertexNormals(); sg.computeBoundingSphere();
    const bl = xf - xa, bw = 2 * hw; bot.scale.set(bl + 0.10, 1, bw + 0.10); bot.position.set((xf + xa) / 2, y - 0.012, 0); seam.scale.set(bl - 0.1, 1, 1); seam.position.set((xf + xa) / 2, y - 0.031, 0);
    bot.visible = seam.visible = e > 0.02; return y - 0.03; }
  // ---- HP6000 snorkel: pivot bracket on the left forward corner, rigid orange tube + yellow power cable, pump head with strainer
  const PV = P(...HT.piv); const br = mesh(new THREE.BoxGeometry(0.16, 0.22, 0.10), M.dark, P(HT.piv[0], HT.piv[1] + 0.06, HT.piv[2] + 0.09)); g.add(br);
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 16), M.steel, PV, [Math.PI / 2, 0, 0]));
  const arm = new THREE.Group(); arm.position.copy(PV); g.add(arm);
  arm.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, HT.tube, 24), M.tube, new THREE.Vector3(0, -HT.tube / 2, 0)));
  arm.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.10, 24), M.dark, new THREE.Vector3(0, -0.05, 0)));
  for (const f of [0.35, 0.7]) arm.add(mesh(new THREE.TorusGeometry(0.063, 0.008, 6, 24), M.dark, new THREE.Vector3(0, -HT.tube * f, 0), [Math.PI / 2, 0, 0]));
  arm.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, HT.tube, 8), M.yellow, new THREE.Vector3(0.0, -HT.tube / 2, 0.075)));
  const H0 = -HT.tube; // pump head: motor can, strainer cage, yellow foot ring
  arm.add(mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.10, 24), M.steel, new THREE.Vector3(0, H0 - 0.05, 0)));
  arm.add(mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.28, 28), M.motor, new THREE.Vector3(0, H0 - 0.24, 0)));
  arm.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 28, 1, true), M.dark, new THREE.Vector3(0, H0 - 0.45, 0)));
  for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; arm.add(mesh(new THREE.BoxGeometry(0.016, 0.15, 0.016), M.steel, new THREE.Vector3(0.12 * Math.cos(t), H0 - 0.45, 0.12 * Math.sin(t)))); }
  arm.add(mesh(new THREE.TorusGeometry(0.118, 0.018, 8, 28), M.yellow, new THREE.Vector3(0, H0 - 0.53, 0), [Math.PI / 2, 0, 0]));
  arm.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 28), M.dark, new THREE.Vector3(0, H0 - 0.545, 0)));
  // tie-down strap from the stowed pump head to the lower fuselage (retracted only)
  const strap = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), M.strap); g.add(strap);
  const tipW = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let t = 0, target = 0;
  function place() {
    const e = ss(0.30, 1, t), th = HT.stow + (HT.hang - HT.stow) * ss(0.25, 1, t);
    shape(e); arm.rotation.z = -th; // tube points down when th=0; rotating -th swings the tip aft (-x)
    tipW.set(0, -HT.tube - 0.30, 0).applyEuler(arm.rotation).add(PV);
    const A = P(7.7, 0.66, -0.80); strap.visible = t < 0.05; if (strap.visible) { const d = A.clone().sub(tipW); strap.scale.set(1, d.length(), 1); strap.position.copy(tipW).addScaledVector(d, 0.5); strap.quaternion.setFromUnitVectors(up, d.normalize()); }
  }
  // ground drop while extended (the display "hovers" so the hanging pump head clears the ground by 0.15 m)
  const G = HT.tube + HT.head - HT.piv[1] + 0.15 - (HT.tube + HT.head) * (1 - Math.cos(HT.hang));
  g.userData = { ...g.userData, M,
    set(s = {}, instant = false) { target = s.helitakExt ? 1 : 0; if (instant) t = target;
      M.shell.color.set(s.helitakMatch ? (s.colors?.belly || '#e8e9ea') : '#e8e9ea'); place(); },
    tick(dt) { if (t === target) return false; t = target > t ? Math.min(target, t + dt / 3.5) : Math.max(target, t - dt / 3.5); place(); return true; },
    groundY: () => -G * ss(0, 0.55, t), get t() { return t; }, set t(v) { t = v; place(); }, tip: () => tipW.clone() };
  place(); return g;
}
