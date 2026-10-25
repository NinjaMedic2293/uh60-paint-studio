// Clean-sheet procedural main rotor head + blades and canted tail rotor (v1). Replaces the source model's rotor groups
// (main-rotor group: everything except the mast tube is collapsed; tail-rotor group hidden). Study and photo IDs:
// /workspace/3d/rotor-ref/study.md (not shipped). World frame: metres, nose +X, up +Y, right side +Z.
//  Main rotor: R 8.18 m (16.36 m dia), 4 blades, chord 0.527 m, SC1095-like 9.5% section, -18 deg twist,
//    20 deg swept tip outboard of 0.93R, nickel/titanium leading-edge strip, trim tab, root cuff, elastomeric
//    bearings, lead-lag dampers, pitch horns/links, swashplate, 4-arm bifilar absorber on top. Turns CCW from above.
//  Tail rotor: R 1.675 m (3.35 m dia), canted 20 deg (disc normal from the model's own tail rotor), 4 blades
//    chord 0.249 m on two crossed composite flex-beams (bearingless), pitch shells, pitch beam, hub cap.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const ROT = {
  hub: [1.63, 3.66, 0], R: 8.18, chord: 0.527, tc: 0.095, sweepR: 0.93, sweep: 20, droop: 0.55, tipLen: 0.55, phase: Math.PI / 4,
  tr: { c: [-8.353, 3.922, 0.391], n: [0, 0.358, 0.934], R: 1.675, chord: 0.249, tipLen: 0.20, phase: 0 },
};

// ---- airfoil: cambered NACA 4-digit stand-in for SC1095 (t/c 9.5%, ~1% camber); closed loop TE->upper->LE->lower
function airfoil(n = 26, t = ROT.tc, m = 0.01, p = 0.4) {
  const yc = x => x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x);
  const yt = x => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) { const x = (1 - Math.cos(Math.PI * i / n)) / 2; up.push([x, yc(x) + yt(x)]); lo.push([x, yc(x) - yt(x)]); }
  return [...up.reverse(), ...lo.slice(1)]; // [chord fraction from LE, thickness/chord]
}
// Blade surface. Local frame: span +X, aft (chord) +Z, up +Y. S(r) -> {c, le (z of LE), y (droop), th (pitch rad), tc}
function bladeGeo(r0, r1, nS, S, { sel = null, inflate = 0, cap = true } = {}) {
  let af = airfoil(); if (sel) af = af.filter(q => q[0] <= sel);
  const nA = af.length, pos = [], idx = [];
  for (let i = 0; i <= nS; i++) {
    const u = i / nS, r = r0 + (r1 - r0) * (1 - Math.cos(Math.PI * u)) / 2 * 0 + (r1 - r0) * u, s = S(r), ct = Math.cos(s.th), st = Math.sin(s.th);
    const k = (s.tc ?? ROT.tc) / ROT.tc;
    for (const [x, yy] of af) {
      const zc = s.le + x * s.c - inflate, yc = yy * k * s.c * (1 + inflate * 40);
      const z0 = zc - (s.le + 0.25 * s.c); // rotate about quarter chord, nose-up positive
      pos.push(r, s.y + yc * ct - z0 * st, s.le + 0.25 * s.c + yc * st + z0 * ct);
    }
  }
  for (let i = 0; i < nS; i++) for (let j = 0; j < nA - 1; j++) { const a = i * nA + j, b = a + nA; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  if (cap && !sel) for (const i of [0, nS]) { const base = i * nA, c = pos.length / 3; let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < nA; j++) { cx += pos[3 * (base + j)]; cy += pos[3 * (base + j) + 1]; cz += pos[3 * (base + j) + 2]; } pos.push(cx / nA, cy / nA, cz / nA);
    for (let j = 0; j < nA - 1; j++) i ? idx.push(base + j, c, base + j + 1) : idx.push(base + j + 1, c, base + j); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}
function M(g, m, p, r) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; if (p) o.position.set(...p); if (r) o.rotation.set(...r); return o; }
const cyl = (r0, r1, h, s = 24) => new THREE.CylinderGeometry(r0, r1, h, s);
// rod between two points
function rod(a, b, r, m, s = 12) { const d = new THREE.Vector3().subVectors(b, a), o = M(cyl(r, r, d.length(), s), m);
  o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o; }
// rounded-rect / oval extrusion along local X
function ovalX(x0, x1, w0, h0, w1, h1, m, n = 24) {
  const g = new THREE.CylinderGeometry(1, 1, 1, n, 1); g.rotateZ(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getX(i) + 0.5, w = w0 + (w1 - w0) * t, h = h0 + (h1 - h0) * t; p.setXYZ(i, x0 + (x1 - x0) * t, p.getY(i) * h, p.getZ(i) * w); }
  g.computeVertexNormals(); return M(g, m);
}

// main blade station function
function mainS(r) {
  const { R, chord: C, sweepR, droop } = ROT, rs = sweepR * R, tw = THREE.MathUtils.degToRad;
  // root: chord grows from cuff (0.30 m) to full by r = 1.75 m with the trailing edge filling out (LE straight)
  let c = r < 1.75 ? 0.30 + (C - 0.30) * Math.sin(Math.min(1, Math.max(0, r - 1.1) / 0.65) * Math.PI / 2) : C, le = -0.25 * C;
  if (r > rs) { const off = (r - rs) * Math.tan(tw(ROT.sweep)); le += off; c = C - off * 0.82; }
  const y = -droop * Math.pow(Math.max(0, (r - 0.75) / (R - 0.75)), 1.7) - (r > rs ? (r - rs) * 0.05 : 0);
  const th = tw(9 - 18 * (r - 0.2 * R) / (0.8 * R));
  const tc = r < 1.7 ? ROT.tc + 0.12 * (1 - (r - 1.1) / 0.6) : ROT.tc;
  return { c, le, y, th, tc: Math.max(ROT.tc, tc) };
}
function trS(r) {
  const { R, chord: C } = ROT.tr, tw = THREE.MathUtils.degToRad;
  const c = r < 0.55 ? 0.12 + (C - 0.12) * Math.sin(Math.min(1, (r - 0.36) / 0.19) * Math.PI / 2) : C;
  return { c, le: -0.25 * C + (C - c) * 0.35, y: 0, th: tw(6 - 18 * (r - 0.4) / (R - 0.4)), tc: r < 0.55 ? 0.16 - 0.065 * (r - 0.36) / 0.19 : 0.12 };
}

export function buildRotors() {
  const MT = {
    blade: new THREE.MeshPhysicalMaterial({ color: '#2b2b2b', roughness: 0.62, metalness: 0.05, clearcoat: 0.15 }),
    tip: new THREE.MeshPhysicalMaterial({ color: '#d8d8d8', roughness: 0.5, metalness: 0.1 }),
    strip: new THREE.MeshPhysicalMaterial({ color: '#a7abaf', roughness: 0.32, metalness: 0.85 }),
    hub: new THREE.MeshPhysicalMaterial({ color: '#3b3d3f', roughness: 0.45, metalness: 0.55 }),
    dark: new THREE.MeshPhysicalMaterial({ color: '#202122', roughness: 0.55, metalness: 0.4 }),
    steel: new THREE.MeshPhysicalMaterial({ color: '#9a9ea3', roughness: 0.3, metalness: 0.9 }),
    elast: new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.9 }),
  };
  const root = new THREE.Group(); root.name = 'rotors';
  // ================= MAIN ROTOR =================
  const mr = new THREE.Group(); mr.position.set(...ROT.hub); root.add(mr);
  const { R, tipLen } = ROT, rTip = R - tipLen;
  // v2 head (r18, r77, r92, r62, r74): chunky machined titanium hub, thick elastomeric-bearing housings with bolt rings,
  // beefy spindles and cuffs, lead-lag dampers with hoses, near-vertical pitch links, swashplate + scissors, and a
  // bifilar absorber: a 4-arm spider bolted on the hub top, arms 45 deg off the blades, each arm end carrying a
  // U-shaped (clevis) tuning mass hung on two bifilar pins.
  const RB = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
  const nut = (p, ax, m = MT.steel, s = 0.018) => { const o = M(cyl(s, s, s * 0.9, 6), m, p); if (ax === 'x') o.rotation.z = Math.PI / 2; if (ax === 'z') o.rotation.x = Math.PI / 2; return o; };
  const tube = (pts, r, m) => M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 32, r, 8), m);
  // mast (silver standpipe), swashplate, scissors
  mr.add(M(cyl(0.15, 0.16, 0.95, 40), MT.steel, [0, -0.47, 0]));
  mr.add(M(cyl(0.165, 0.165, 0.06, 40), MT.hub, [0, -0.20, 0]));
  mr.add(M(cyl(0.50, 0.54, 0.07, 56), MT.hub, [0, -0.50, 0]));     // stationary swashplate
  mr.add(M(cyl(0.56, 0.58, 0.06, 56), MT.hub, [0, -0.435, 0]));    // rotating swashplate
  mr.add(M(cyl(0.22, 0.25, 0.16, 40), MT.dark, [0, -0.47, 0]));    // uniball / slider housing
  for (let k = 0; k < 4; k++) { const a = ROT.phase + k * Math.PI / 2 + Math.atan2(0.30, 0.58); mr.add(M(RB(0.14, 0.06, 0.08, 0.015), MT.hub, [Math.cos(a) * 0.60, -0.435, -Math.sin(a) * 0.60], [0, a, 0])); } // rotating-swashplate pitch-link lugs
  { const sc = new THREE.Group(); sc.rotation.y = ROT.phase + Math.PI / 4; mr.add(sc); // rotating scissors (hub -> swashplate), two links and a knee
    sc.add(M(RB(0.06, 0.06, 0.08, 0.015), MT.hub, [0.17, -0.18, 0]));
    sc.add(rod(new THREE.Vector3(0.17, -0.18, 0), new THREE.Vector3(0.30, -0.30, 0), 0.026, MT.hub));
    sc.add(rod(new THREE.Vector3(0.30, -0.30, 0), new THREE.Vector3(0.40, -0.42, 0), 0.026, MT.hub));
    sc.add(M(cyl(0.03, 0.03, 0.08, 12), MT.steel, [0.30, -0.30, 0], [Math.PI / 2, 0, 0])); }
  // hub body: thick 4-lobed forging, lobes on the blade azimuths
  mr.add(M(cyl(0.31, 0.33, 0.38, 8), MT.hub, [0, -0.03, 0], [0, Math.PI / 8, 0]));
  mr.add(M(cyl(0.24, 0.30, 0.06, 40), MT.hub, [0, -0.20, 0]));
  for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; mr.add(nut([Math.cos(a) * 0.26, -0.235, Math.sin(a) * 0.26], 'y')); }
  // bifilar: spider plate bolted on the hub top + 4 arms + U-shaped masses on bifilar pins
  const bif = new THREE.Group(); bif.position.y = 0.13; mr.add(bif);
  bif.add(M(cyl(0.24, 0.26, 0.05, 40), MT.hub, [0, 0.025, 0]));
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; bif.add(nut([Math.cos(a) * 0.20, 0.055, Math.sin(a) * 0.20], 'y')); }
  bif.add(M(cyl(0.13, 0.16, 0.08, 32), MT.hub, [0, 0.09, 0]));
  bif.add(M(cyl(0.08, 0.08, 0.03, 6), MT.dark, [0, 0.145, 0]));
  for (let i = 0; i < 4; i++) { const a = ROT.phase + Math.PI / 4 + i * Math.PI / 2, arm = new THREE.Group(); arm.rotation.y = a; bif.add(arm);
    arm.add(M(RB(0.30, 0.08, 0.14, 0.02), MT.hub, [0.30, 0.06, 0]));            // spider arm
    arm.add(M(RB(0.10, 0.12, 0.18, 0.02), MT.hub, [0.44, 0.07, 0]));            // arm end fitting (carries the pins)
    // U-shaped tuning mass straddling the arm end: back block + two side cheeks, opening inboard
    const ms = new THREE.Group(); ms.position.set(0.47, 0.07, 0); arm.add(ms);
    ms.add(M(RB(0.08, 0.17, 0.34, 0.025), MT.dark, [0.07, 0, 0]));
    for (const s of [-1, 1]) ms.add(M(RB(0.18, 0.17, 0.06, 0.02), MT.dark, [-0.01, 0, s * 0.14]));
    // two bifilar pins (horizontal, tangential) with bushings visible on the cheek faces
    for (const dx of [-0.05, 0.03]) for (const s of [-1, 1]) ms.add(M(cyl(0.024, 0.024, 0.012, 16), MT.hub, [dx, 0.02, s * 0.172], [Math.PI / 2, 0, 0]));
  }
  // per-blade hardware
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group(); b.rotation.y = ROT.phase + i * Math.PI / 2; mr.add(b); // local +X spanwise, +Z aft (CCW rotation)
    // hub arm + elastomeric bearing housing: heavy rounded box, round bolted outer face
    b.add(M(RB(0.28, 0.36, 0.36, 0.05), MT.hub, [0.34, -0.03, 0]));
    b.add(M(cyl(0.17, 0.17, 0.08, 36), MT.hub, [0.48, -0.02, 0], [0, 0, Math.PI / 2]));
    b.add(M(cyl(0.135, 0.135, 0.03, 36), MT.elast, [0.535, -0.02, 0], [0, 0, Math.PI / 2]));
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; b.add(nut([0.525, -0.02 + Math.sin(a) * 0.15, Math.cos(a) * 0.15], 'x', MT.steel, 0.016)); }
    // spindle and cuff (blade attachment), bolt rows top and bottom
    b.add(ovalX(0.54, 0.76, 0.115, 0.11, 0.10, 0.10, MT.hub));
    b.add(M(RB(0.46, 0.17, 0.26, 0.04), MT.hub, [0.95, 0, 0]));
    b.add(ovalX(1.16, 1.32, 0.12, 0.075, 0.25, 0.04, MT.hub));
    for (const x of [0.80, 0.90, 1.00, 1.10]) for (const s of [-1, 1]) { b.add(nut([x, 0.093, s * 0.075], 'y', MT.steel, 0.022)); b.add(nut([x, -0.093, s * 0.075], 'y', MT.steel, 0.022)); }
    b.add(M(RB(0.07, 0.07, 0.10, 0.015), MT.hub, [0.66, 0.12, 0])); // flap / droop stop
    // pitch horn (leading side) and near-vertical pitch link down to the rotating swashplate lug
    b.add(M(RB(0.14, 0.09, 0.22, 0.02), MT.hub, [0.64, -0.08, -0.19]));
    b.add(M(new THREE.SphereGeometry(0.04, 14, 10), MT.dark, [0.60, -0.13, -0.30]));
    b.add(rod(new THREE.Vector3(0.59, -0.13, -0.30), new THREE.Vector3(0.58, -0.41, -0.30), 0.028, MT.steel, 14));
    b.add(M(new THREE.SphereGeometry(0.035, 12, 8), MT.dark, [0.58, -0.415, -0.30]));
    b.add(M(cyl(0.034, 0.034, 0.04, 14), MT.hub, [0.585, -0.27, -0.30]));
    // lead-lag damper (trailing side): fat cylinder from a hub lug to the cuff, rod end, end eyes
    b.add(M(RB(0.09, 0.09, 0.09, 0.02), MT.hub, [0.22, 0.0, 0.26]));
    b.add(rod(new THREE.Vector3(0.24, 0.0, 0.26), new THREE.Vector3(0.62, 0.0, 0.23), 0.065, MT.dark, 20));
    b.add(rod(new THREE.Vector3(0.60, 0.0, 0.23), new THREE.Vector3(0.84, 0.0, 0.15), 0.028, MT.steel, 12));
    b.add(M(RB(0.08, 0.08, 0.08, 0.02), MT.hub, [0.85, 0.0, 0.14]));
    // hydraulic hose to the damper (from the hub top)
    b.add(tube([[0.12, 0.14, 0.12], [0.22, 0.17, 0.22], [0.36, 0.10, 0.30], [0.46, 0.06, 0.29]], 0.012, MT.elast));
    b.add(tube([[0.18, 0.13, -0.10], [0.36, 0.16, -0.16], [0.56, 0.10, -0.12], [0.64, 0.06, -0.10]], 0.009, MT.elast));
    // blade: body (scheme 'blades'), tip cap (scheme 'tips'), LE abrasion strip, trim tab
    const body = M(bladeGeo(1.10, rTip, 64, mainS), MT.blade); body.userData.zone = 'blades'; b.add(body);
    b.add(M(bladeGeo(rTip, R, 14, mainS), MT.tip));
    b.add(M(bladeGeo(1.55, rTip, 56, mainS, { sel: 0.11, inflate: 0.0015, cap: false }), MT.strip));
    { const r0 = 0.73 * R, r1 = 0.86 * R, s0 = mainS(r0), s1 = mainS(r1), g = new THREE.BoxGeometry(r1 - r0, 0.004, 0.05);
      const tab = M(g, MT.blade, [(r0 + r1) / 2, (s0.y + s1.y) / 2 - Math.sin((s0.th + s1.th) / 2) * 0.75 * ROT.chord, s0.le + s0.c + 0.02]); tab.rotation.x = (s0.th + s1.th) / 2; b.add(tab); }
  }
  // ================= TAIL ROTOR =================
  const T = ROT.tr, n = new THREE.Vector3(...T.n).normalize(), e1 = new THREE.Vector3(1, 0, 0), e2 = new THREE.Vector3().crossVectors(n, e1);
  const tr = new THREE.Group(); tr.position.set(...T.c); root.add(tr);
  tr.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(e1, e2, n)); // local XY = disc plane, +Z outboard (disc normal)
  // gearbox output shaft and hub
  tr.add(M(cyl(0.075, 0.09, 0.28, 24), MT.hub, [0, 0, -0.16], [Math.PI / 2, 0, 0]));
  tr.add(M(cyl(0.13, 0.13, 0.05, 32), MT.hub, [0, 0, -0.03], [Math.PI / 2, 0, 0]));
  tr.add(M(cyl(0.11, 0.11, 0.05, 32), MT.hub, [0, 0, 0.09], [Math.PI / 2, 0, 0]));
  { const g = new THREE.SphereGeometry(0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); g.rotateX(Math.PI / 2); g.scale(1, 1, 0.9); tr.add(M(g, MT.hub, [0, 0, 0.115])); }
  for (let i = 0; i < 4; i++) {
    const phi = T.phase + Math.PI / 2 + i * Math.PI / 2, zoff = (i % 2) ? 0.0 : 0.06;
    const b = new THREE.Group(); b.rotation.z = phi; b.position.z = zoff; tr.add(b);
    // blade frame: span +X; airfoil 'up' = disc normal (+Z of tr) ; aft = -(rotation direction) -> local blade frame (X, Z, -Y)
    const bf = new THREE.Group(); bf.rotation.x = Math.PI / 2; b.add(bf); // maps bladeGeo +Y(thick) -> +Z(normal), +Z(aft) -> -Y
    // flex-beam (composite crossbeam spar) and pitch shell
    if (i < 2) b.add(M(new THREE.BoxGeometry(0.80, 0.10, 0.022), MT.dark)); // one flex-beam spans each opposite pair
    { const ps = ovalX(0.12, 0.40, 0.035, 0.05, 0.03, 0.07, MT.hub); ps.rotation.x = Math.PI / 2; b.add(ps); } // pitch shell
    const body = M(bladeGeo(0.36, T.R - T.tipLen, 40, trS), MT.blade); bf.add(body);
    bf.add(M(bladeGeo(T.R - T.tipLen, T.R, 8, trS), MT.tip));
    bf.add(M(bladeGeo(0.55, T.R - T.tipLen, 30, trS, { sel: 0.11, inflate: 0.001, cap: false }), MT.strip));
    // pitch link from the hub spider to the pitch-shell horn (leading side)
    b.add(rod(new THREE.Vector3(0.10, 0.10, 0.17 - zoff), new THREE.Vector3(0.24, 0.07, 0.04), 0.012, MT.steel));
  }
  { const sp = new THREE.Group(); sp.position.z = 0.17; tr.add(sp); sp.add(M(cyl(0.05, 0.05, 0.04, 16), MT.hub, [0, 0, 0], [Math.PI / 2, 0, 0]));
    for (let i = 0; i < 4; i++) { const a = T.phase + Math.PI / 2 + i * Math.PI / 2; sp.add(rod(new THREE.Vector3(), new THREE.Vector3(Math.cos(a) * 0.1 - Math.sin(a) * 0.1, Math.sin(a) * 0.1 + Math.cos(a) * 0.1, 0), 0.014, MT.hub)); } }
  root.userData.paint = (colors) => { MT.blade.color.set(colors.blades || '#2b2b2b'); MT.tip.color.set(colors.tips || '#d8d8d8'); };
  root.userData.mats = MT;
  return root;
}

// Hide the source model's rotors: keep only the main-rotor mast tube (r < 0.2 m about the hub axis, below the hub)
// and anything low in the group (roof fairing parts); collapse the rest. Tail-rotor group is emptied.
export function hideStockRotors(mesh, G) {
  const g = mesh.geometry, p = g.attributes.position, v = new THREE.Vector3(), [hx, , hz] = ROT.hub;
  const gm = g.groups.find(q => q.materialIndex === G.mainRotor); let n = 0;
  for (let k = gm.start; k + 2 < gm.start + gm.count; k += 3) { let keep = true;
    for (let j = 0; j < 3; j++) { v.fromBufferAttribute(p, k + j).applyMatrix4(mesh.matrixWorld);
      if (!(v.y < 2.62 || (Math.hypot(v.x - hx, v.z - hz) < 0.2 && v.y < 3.30))) { keep = false; break; } }
    if (!keep) { n++; for (let j = 1; j < 3; j++) p.setXYZ(k + j, p.getX(k), p.getY(k), p.getZ(k)); } }
  p.needsUpdate = true;
  const gt = g.groups.find(q => q.materialIndex === G.tailRotor); if (gt) gt.count = 0;
  return n;
}
