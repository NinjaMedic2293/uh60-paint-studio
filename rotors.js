// Clean-sheet procedural main rotor head + blades and canted tail rotor (v1). Replaces the source model's rotor groups
// (main-rotor group: everything except the mast tube is collapsed; tail-rotor group hidden). Study and photo IDs:
// /workspace/3d/rotor-ref/study.md (not shipped). World frame: metres, nose +X, up +Y, right side +Z.
//  Main rotor: R 8.18 m (16.36 m dia), 4 blades, chord 0.527 m, SC1095-like 9.5% section, -18 deg twist,
//    20 deg swept tip outboard of 0.93R, nickel/titanium leading-edge strip, trim tab, root cuff, elastomeric
//    bearings, lead-lag dampers, pitch horns/links, swashplate, 4-arm bifilar absorber on top. Turns CCW from above.
//  Tail rotor: R 1.675 m (3.35 m dia), canted 20 deg (disc normal from the model's own tail rotor), 4 blades
//    chord 0.249 m on two crossed composite flex-beams (bearingless), pitch shells, pitch beam, hub cap.
import * as THREE from 'three';

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
  // mast (continues the model's mast tube up through the hub) and swashplate
  mr.add(M(cyl(0.125, 0.135, 0.95, 32), MT.hub, [0, -0.38, 0]));
  mr.add(M(cyl(0.40, 0.44, 0.06, 48), MT.hub, [0, -0.37, 0]));    // stationary swashplate
  mr.add(M(cyl(0.38, 0.40, 0.05, 48), MT.steel, [0, -0.315, 0]));  // rotating swashplate
  mr.add(M(cyl(0.18, 0.22, 0.14, 32), MT.dark, [0, -0.35, 0]));   // uniball housing
  for (const [a, b] of [[[0.14, -0.12, 0], [0.28, -0.20, 0]], [[0.28, -0.20, 0], [0.30, -0.30, 0.05]]]) mr.add(rod(new THREE.Vector3(...a), new THREE.Vector3(...b), 0.022, MT.hub)); // rotating scissors
  // hub: one-piece titanium hub, upper and lower plates with 4 arms (blade azimuths), central nut
  const plate = () => { const s = new THREE.Shape(), a = 0.46, w = 0.20, rr = 0.07; // 4-arm star with filleted inner corners
    const P = []; for (let i = 0; i < 4; i++) { const q = i * Math.PI / 2, c = Math.cos(q), sn = Math.sin(q), pc = (x, y) => [x * c - y * sn, x * sn + y * c];
      P.push(pc(w + rr * 0.2, -w), pc(a, -w), pc(a + 0.05, 0), pc(a, w), pc(w + rr * 0.2, w)); }
    s.moveTo(...P[0]); for (let i = 1; i < P.length; i++) s.lineTo(...P[i]); s.closePath(); return s; };
  for (const [y, h] of [[0.085, 0.055], [-0.135, 0.055]]) { const g = new THREE.ExtrudeGeometry(plate(), { depth: h, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 8 });
    g.rotateX(Math.PI / 2); g.translate(0, y + h / 2, 0); g.rotateY(ROT.phase); mr.add(M(g, MT.hub)); }
  mr.add(M(cyl(0.20, 0.20, 0.24, 32), MT.hub, [0, -0.02, 0]));
  mr.add(M(cyl(0.10, 0.12, 0.08, 6), MT.dark, [0, 0.14, 0]));
  // bifilar absorber: centre post, 4 arms at 45 deg to the blades, each with a paired pendulum mass (top & bottom)
  const bif = new THREE.Group(); bif.position.y = 0.19; mr.add(bif);
  bif.add(M(cyl(0.12, 0.14, 0.12, 32), MT.hub, [0, -0.04, 0]));
  bif.add(M(cyl(0.05, 0.05, 0.06, 16), MT.dark, [0, 0.05, 0]));
  for (let i = 0; i < 4; i++) { const a = ROT.phase + Math.PI / 4 + i * Math.PI / 2, arm = new THREE.Group(); arm.rotation.y = -a; bif.add(arm);
    arm.add(ovalX(0.08, 0.46, 0.09, 0.045, 0.06, 0.035, MT.hub));
    for (const y of [0.06, -0.06]) { const w = M(cyl(0.11, 0.11, 0.075, 28), MT.dark, [0.50, y, 0]); w.scale.set(1, 1, 1.3); arm.add(w); }
    arm.add(M(cyl(0.03, 0.03, 0.2, 12), MT.steel, [0.50, 0, 0])); }
  // per-blade hardware + blade
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group(); b.rotation.y = ROT.phase + i * Math.PI / 2; mr.add(b); // local +X spanwise, +Z aft (CCW rotation)
    // elastomeric bearing (laminated, between the hub plates) and spindle
    const eb = M(cyl(0.15, 0.15, 0.20, 28), MT.elast, [0.40, -0.02, 0], [0, 0, Math.PI / 2]); b.add(eb);
    for (const x of [0.32, 0.37, 0.42, 0.47]) b.add(M(cyl(0.155, 0.155, 0.01, 28), MT.steel, [x, -0.02, 0], [0, 0, Math.PI / 2]));
    b.add(ovalX(0.50, 0.70, 0.10, 0.10, 0.09, 0.09, MT.hub)); // spindle
    // cuff: bolted clevis around the blade spar
    b.add(ovalX(0.68, 1.15, 0.20, 0.12, 0.16, 0.07, MT.hub));
    for (const x of [0.80, 0.92, 1.04]) for (const s of [-1, 1]) b.add(M(cyl(0.02, 0.02, 0.19 - (x - 0.8) * 0.15, 10), MT.steel, [x, 0, s * 0.06]));
    b.add(M(cyl(0.03, 0.03, 0.04, 10), MT.steel, [0.74, 0.14, 0])); // droop stop / flap stop
    // pitch horn (leading side) and pitch-control rod down to the swashplate
    b.add(rod(new THREE.Vector3(0.66, -0.04, -0.08), new THREE.Vector3(0.56, -0.07, -0.30), 0.035, MT.hub));
    b.add(rod(new THREE.Vector3(0.56, -0.09, -0.30), new THREE.Vector3(0.54, -0.31, -0.29), 0.03, MT.steel)); // pitch link (near vertical)
    b.add(rod(new THREE.Vector3(0.33, -0.315, -0.18), new THREE.Vector3(0.54, -0.315, -0.29), 0.04, MT.hub)); // rotating swashplate lug
    b.add(M(new THREE.SphereGeometry(0.045, 12, 8), MT.dark, [0.54, -0.31, -0.29]));
    b.add(M(new THREE.SphereGeometry(0.04, 12, 8), MT.dark, [0.56, -0.08, -0.30]));
    // lead-lag damper (trailing side) hub -> cuff
    b.add(rod(new THREE.Vector3(0.22, 0.0, 0.24), new THREE.Vector3(0.60, 0.0, 0.21), 0.055, MT.dark, 18));
    b.add(rod(new THREE.Vector3(0.55, 0.0, 0.21), new THREE.Vector3(0.80, 0.0, 0.17), 0.026, MT.steel, 12));
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
