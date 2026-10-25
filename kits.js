// Nose mission-equipment kits, hoist and searchlight. Dimensions in metres; positions in (a, y, z):
// a = metres aft of the stock nose tip, y = height above ground, z = +right / -left.
// Published sizes used: MH-60T ESS gimbal 9 in (Aviation Today 2013); Wescam MX-10 260 mm dia x 355 mm (L3Harris datasheet).
// Everything else is scaled from the reference photos against the stock fuselage and is approximate.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BREAKS } from './paint.js';
const NX = BREAKS.NX;
export const P = (a, y, z) => new THREE.Vector3(NX - a, y, z);
export function kitMaterials() {
  const M = {
    mission: new THREE.MeshPhysicalMaterial({ color: '#1e1f20', roughness: 0.5, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
    nose: new THREE.MeshPhysicalMaterial({ color: '#4a4f2a', roughness: 0.55, clearcoat: 0.2 }),
    hoist: new THREE.MeshPhysicalMaterial({ color: '#4a4f2a', roughness: 0.5, clearcoat: 0.2 }),
    metal: new THREE.MeshPhysicalMaterial({ color: '#9a9ea2', roughness: 0.3, metalness: 0.85 }),
    darkMetal: new THREE.MeshPhysicalMaterial({ color: '#2a2b2c', roughness: 0.4, metalness: 0.6 }),
    lens: new THREE.MeshPhysicalMaterial({ color: '#0a1118', roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02 }),
    lensGreen: new THREE.MeshPhysicalMaterial({ color: '#1f6b3a', roughness: 0.05, metalness: 0.2, clearcoat: 1, emissive: '#0b2a14', emissiveIntensity: 0.4 }),
    lightGray: new THREE.MeshPhysicalMaterial({ color: '#c4c8cb', roughness: 0.45, clearcoat: 0.3 }),
    lamp: new THREE.MeshPhysicalMaterial({ color: '#b9bcbd', emissive: '#fff4d6', emissiveIntensity: 0.0, roughness: 0.1 }),
    grille: new THREE.MeshPhysicalMaterial({ color: '#3a3b3c', roughness: 0.7, metalness: 0.3 }),
    radar: new THREE.MeshPhysicalMaterial({ color: '#4a4f55', roughness: 0.55, clearcoat: 0.3 }),
    radome: new THREE.MeshPhysicalMaterial({ color: '#26282a', roughness: 0.85, clearcoat: 0.0 }),
    dome: new THREE.MeshPhysicalMaterial({ color: '#1b1d1f', roughness: 0.25, clearcoat: 0.8 }),
    probe: new THREE.MeshPhysicalMaterial({ color: '#2a2c2e', roughness: 0.5, clearcoat: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 }),
  };
  return M;
}
function mesh(g, m, pos, rot) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; if (pos) o.position.copy(pos); if (rot) o.rotation.set(...rot); return o; }
// lathe along +x (forward) : profile [[r, along]] from back (0) to front
function latheX(profile, m, seg = 48) {
  const pts = profile.map(([r, t]) => new THREE.Vector2(Math.max(r, 1e-4), t));
  const g = new THREE.LatheGeometry(pts, seg); g.rotateZ(-Math.PI / 2); // lathe axis y -> x
  return new THREE.Mesh(g, m);
}
// domed cylinder pointing forward: radius r, straight length L, cap length c, small edge bevel
function radomeProfile(r, L, c, bevel = 0.02) {
  const p = [[0, 0], [r - bevel, 0], [r, bevel], [r, L]];
  for (let i = 1; i <= 12; i++) { const t = i / 12 * Math.PI / 2; p.push([r * Math.cos(t), L + c * Math.sin(t)]); }
  return p;
}
function tube(points, r0, r1, m, seg = 24) {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, 40, 1, seg, false);
  // taper radius along length
  const pos = g.attributes.position, n = 41, ring = seg + 1, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) { const t = i / (n - 1), rr = r0 + (r1 - r0) * t; curve.getPointAt(t, c);
    for (let j = 0; j < ring; j++) { const k = i * ring + j; v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(rr).add(c); pos.setXYZ(k, v.x, v.y, v.z); } }
  g.computeVertexNormals(); const o = new THREE.Mesh(g, m); o.castShadow = true; return o;
}
function ball(dia, M, lensFrac = 0.42, mat) {
  const g = new THREE.Group(); const r = dia / 2;
  g.add(mesh(new THREE.SphereGeometry(r, 40, 28), mat || M.mission));
  const lens = mesh(new THREE.CircleGeometry(r * lensFrac, 32), M.lens); lens.position.x = r * 0.985; lens.rotation.y = Math.PI / 2; g.add(lens);
  const lens2 = mesh(new THREE.CircleGeometry(r * 0.16, 20), M.lens); lens2.position.set(r * 0.9, r * 0.38, r * 0.2); lens2.lookAt(lens2.position.clone().multiplyScalar(3)); g.add(lens2);
  // yoke ring
  const yoke = mesh(new THREE.TorusGeometry(r * 1.0, r * 0.06, 10, 40), M.darkMetal); yoke.rotation.x = Math.PI / 2; yoke.position.y = r * 0.55; yoke.scale.set(1, 1, 1); g.add(yoke);
  return g;
}
function neck(top, bottom, r, M) { const h = top - bottom; const o = mesh(new THREE.CylinderGeometry(r, r * 1.15, h, 24), M.darkMetal); o.position.y = bottom + h / 2; return o; }
function neckAt(a, z, top, bottom, r, M) { const o = neck(top, bottom, r, M); const p = P(a, 0, z); o.position.x = p.x; o.position.z = p.z; return o; }
function probe(base, mid, tip, r0, r1, M, paintMat) {
  const g = new THREE.Group();
  g.add(tube([base, mid, tip], r0, r1, paintMat));
  // nozzle
  const dir = tip.clone().sub(mid).normalize();
  const noz = latheX([[0, 0], [r1 * 1.05, 0], [r1 * 1.05, 0.06], [r1 * 0.7, 0.14], [r1 * 0.55, 0.26], [r1 * 0.35, 0.3], [0, 0.32]], M.darkMetal);
  noz.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir); noz.position.copy(tip); noz.castShadow = true; g.add(noz);
  // two support struts to the fuselage
  for (const t of [0.12, 0.42]) { const p = base.clone().lerp(mid, t * 2 > 1 ? 1 : t * 2);
    const s = mesh(new RoundedBoxGeometry(0.16, 0.22, 0.32, 3, 0.03), paintMat); s.position.copy(p).add(new THREE.Vector3(0, 0, -Math.sign(p.z) * 0.18)); g.add(s); }
  return g;
}
export function buildKits(M) {
  const K = {};
  // ---------- MH-60T: blunt cylindrical radome on a square collar, black, 9-in chin ESS ball, aft chin dome
  {
    const g = new THREE.Group();
    // radome ~0.56 m dia, protrudes ~0.5 m (scaled from photo 0 against the cockpit-door break); centred just below nose-tip height
    const collar = mesh(new RoundedBoxGeometry(0.22, 0.66, 0.66, 4, 0.12), M.mission, P(0.03, 1.03, 0)); g.add(collar);
    const rad = latheX(radomeProfile(0.28, 0.32, 0.19, 0.03), M.mission); rad.position.copy(P(0.10, 1.03, 0)); rad.castShadow = true; g.add(rad);
    const seam = mesh(new THREE.TorusGeometry(0.282, 0.007, 6, 48), M.darkMetal, P(-0.04, 1.03, 0), [0, Math.PI / 2, 0]); g.add(seam);
    // ESS turret: Star SAFIRE III class (15-in / 0.38 m housing per FLIR data; photo scales to ~0.32 m visible ball) hanging under the chin
    const b = ball(0.33, M); b.position.copy(P(0.98, 0.46, 0)); g.add(b); g.add(neckAt(0.98, 0, 0.66, 0.58, 0.07, M));
    K.mh60t = g;
  }
  // ---------- HH-60G: AN/APN-239 radar pod low on the LEFT chin, AN/AAQ-29A FLIR ball, refuelling probe on the right
  {
    const g = new THREE.Group();
    const pod = mesh(new THREE.SphereGeometry(1, 40, 28), M.mission, P(0.12, 0.70, -0.52)); pod.scale.set(0.42, 0.26, 0.30); g.add(pod);
    const pylon = mesh(new RoundedBoxGeometry(0.42, 0.16, 0.22, 3, 0.05), M.nose, P(0.40, 0.86, -0.48)); g.add(pylon);
    const b = ball(0.30, M); b.position.copy(P(0.45, 0.62, 0.22)); g.add(b); g.add(neckAt(0.45, 0.22, 0.82, 0.74, 0.06, M));
    K.hh60g = g;
  }
  // ---------- HH-60W: extended nose with radar face, Wescam MX-10 below it, big probe on the right
  {
    const g = new THREE.Group();
    const ext = mesh(new RoundedBoxGeometry(0.80, 0.74, 0.96, 6, 0.24), M.nose, P(0.06, 1.10, 0)); g.add(ext);
    const top = mesh(new RoundedBoxGeometry(0.75, 0.22, 0.70, 4, 0.1), M.nose, P(0.35, 1.47, 0), [0, 0, -0.32]); g.add(top);
    // radar window: flat, slightly domed dark disc (~0.48 m) with 8 radial ribs, flush with the extension face
    const dish = latheX([[0, 0], [0.245, 0], [0.245, 0.02], [0.2, 0.045], [0.1, 0.06], [0, 0.064]], M.radar); dish.position.copy(P(-0.33, 1.02, 0)); dish.castShadow = true; g.add(dish);
    const rim = mesh(new THREE.TorusGeometry(0.247, 0.012, 8, 48), M.darkMetal, P(-0.335, 1.02, 0), [0, Math.PI / 2, 0]); g.add(rim);
    for (let i = 0; i < 8; i++) { const ang = i / 8 * Math.PI * 2; const r = mesh(new THREE.BoxGeometry(0.016, 0.21, 0.016), M.lightGray);
      r.position.copy(P(-0.375, 1.02 + 0.12 * Math.sin(ang), 0.12 * Math.cos(ang))); r.rotation.x = -ang + Math.PI / 2; g.add(r); }
    const mx = new THREE.Group(); const body = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.13, 32), M.lightGray); body.position.y = 0.11; mx.add(body);
    const bb = ball(0.26, M, 0.38, M.lightGray); mx.add(bb); mx.position.copy(P(-0.12, 0.54, 0)); g.add(mx);
    g.add(neckAt(-0.12, 0, 0.75, 0.66, 0.07, M));
    K.hh60w = g;
  }
  // ---------- MH-60M (160th SOAR), per the user's labelled graphic (left-front 3/4) and TWZ 2023-09-21.
  // Every item is a named part with userData.label so the viewer's legend overlay can point at it.
  {
    const g = new THREE.Group();
    const part = (name, label, ...objs) => { const p = new THREE.Group(); p.name = name; p.userData.label = label; objs.forEach(o => p.add(o)); g.add(p); return p; };
    // Silent Knight TF/TA radome: blunt, matte, taller than wide, sits on the nose and stands proud of the nose top
    const rd = latheX([[0, 0], [0.27, 0], [0.30, 0.10], [0.31, 0.26], [0.29, 0.40], [0.24, 0.52], [0.15, 0.60], [0, 0.63]], M.radome, 56);
    rd.scale.set(1, 0.71, 0.68); rd.position.copy(P(0.30, 1.33, 0)); rd.castShadow = true;
    const rdSeam = mesh(new THREE.TorusGeometry(0.27, 0.01, 8, 48), M.darkMetal, P(0.30, 1.33, 0), [0, Math.PI / 2, 0]); rdSeam.scale.set(1, 0.71, 0.68);
    const rdBase = mesh(new RoundedBoxGeometry(0.40, 0.70, 0.62, 4, 0.12), M.mission, P(0.44, 1.20, 0));
    const hood = mesh(new RoundedBoxGeometry(0.80, 0.22, 0.50, 4, 0.10), M.mission, P(0.80, 1.50, 0), [0, 0, -0.22]);
    part('apq187-radome', 'AN/APQ-187 Silent Knight TF/TA radar (graphic: "AN/ALQ-187")', rd, rdSeam, rdBase, hood);
    // AN/ZSQ-2 EO targeting sensor: rounded housing directly below the radome with a gimballed ball and window
    const zH = mesh(new RoundedBoxGeometry(0.46, 0.24, 0.60, 4, 0.08), M.mission, P(0.14, 0.88, 0));
    const zB = mesh(new THREE.SphereGeometry(0.27, 40, 28), M.mission, P(0.02, 0.62, 0));
    const zW = mesh(new RoundedBoxGeometry(0.03, 0.20, 0.22, 2, 0.02), M.lens, P(-0.24, 0.62, 0.05));
    const zL = mesh(new THREE.CircleGeometry(0.04, 24), M.lensGreen, P(-0.23, 0.66, -0.14), [0, Math.PI / 2, 0]);
    part('zsq2-turret', 'AN/ZSQ-2 electro-optical targeting sensor', zH, zB, zW, zL);
    // DVE LWIR sensor: small forward-looking pod beside the radome (aircraft right)
    const lw = mesh(new RoundedBoxGeometry(0.40, 0.25, 0.29, 4, 0.05), M.mission, P(0.36, 0.79, 0.50)); lw.castShadow = true;
    const lwL = mesh(new THREE.CircleGeometry(0.07, 20), M.lens, P(0.155, 0.80, 0.50), [0, Math.PI / 2, 0]);
    const lwS = mesh(new RoundedBoxGeometry(0.04, 0.17, 0.21, 2, 0.02), M.metal, P(0.165, 0.79, 0.50));
    part('dve-lwir', 'DVE LWIR sensor', lw, lwL, lwS);
    // DVE LIDAR: box fairing low on the left chin (toggle; "not installed" in the graphic's photo)
    const ld = mesh(new RoundedBoxGeometry(0.40, 0.43, 0.45, 4, 0.05), M.mission, P(0.36, 0.66, -0.58));
    const ldW = mesh(new RoundedBoxGeometry(0.02, 0.26, 0.30, 2, 0.02), M.lens, P(0.155, 0.66, -0.58));
    const lidar = part('dve-lidar', 'DVE LIDAR sensor (toggle)', ld, ldW); lidar.userData.lidar = true;
    // AN/AAQ-24B(V)25 advanced threat warner: small round domes on both nose cheeks
    const aaq = [];
    for (const s of [1, -1]) { const h = mesh(new THREE.CylinderGeometry(0.10, 0.105, 0.07, 24), M.mission, P(0.80, 1.42, s * 0.90), [Math.PI / 2, 0, -s * 0.0]);
      h.lookAt(P(0.2, 1.5, s * 2.0)); h.rotateX(Math.PI / 2);
      const d = mesh(new THREE.SphereGeometry(0.095, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.dome, P(0.80, 1.42, s * 0.90)); d.lookAt(P(0.2, 1.5, s * 2.0)); d.rotateX(Math.PI / 2); d.translateY(0.03);
      aaq.push(h, d); }
    part('aaq24-mws', 'AN/AAQ-24B(V)25 advanced threat warner sensor', ...aaq);
    // AN/ALQ-211(V)7 SIRFC quadrant receive antenna: flat cheek bump below the windscreen
    const sq = [];
    for (const s of [1, -1]) { const b = mesh(new THREE.SphereGeometry(0.11, 28, 16), M.mission, P(1.45, 1.28, s * 0.98)); b.scale.set(1.1, 0.8, 0.45); sq.push(b); }
    part('alq211-quadrant', 'AN/ALQ-211(V)7 SIRFC quadrant receive antenna', ...sq);
    // AN/ALQ-162(V)6 Shadowbox SPJ: three small domes on the roof above the windscreen
    const sb = [mesh(new RoundedBoxGeometry(0.22, 0.05, 0.54, 2, 0.02), M.mission, P(2.15, 2.62, 0))];
    for (const z of [-0.175, 0, 0.175]) sb.push(mesh(new THREE.SphereGeometry(0.078, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.dome, P(2.10, 2.645, z)));
    part('alq162-shadowbox', 'AN/ALQ-162(V)6 Shadowbox self-protection jammer', ...sb);
    // forward cabin side: strut carrying the SIRFC detect-band antenna (box) and AN/AVR-2B laser warner (round head)
    const ms = [], av = [];
    for (const s of [1, -1]) {
      ms.push(mesh(new RoundedBoxGeometry(0.06, 0.95, 0.06, 2, 0.015), M.darkMetal, P(3.30, 1.95, s * 1.27)));
      ms.push(mesh(new RoundedBoxGeometry(0.16, 0.26, 0.12, 3, 0.03), M.mission, P(3.30, 2.30, s * 1.32)));
      const h = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 24), M.mission, P(3.30, 2.02, s * 1.34), [0, 0, Math.PI / 2]);
      const l = mesh(new THREE.CircleGeometry(0.06, 24), M.lens, P(3.255, 2.02, s * 1.34), [0, Math.PI / 2, 0]); av.push(h, l); }
    part('alq211-detect', 'AN/ALQ-211(V)7 SIRFC detect-band antenna', ...ms);
    part('avr2b-lwr', 'AN/AVR-2B laser warning receiver', ...av);
    // small detail: landing light under the chin, pitot booms
    const ll = mesh(new THREE.CircleGeometry(0.07, 24), M.lamp, P(0.75, 0.50, 0.0), [Math.PI / 2, 0, 0]); g.add(ll);
    for (const s of [1, -1]) g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), M.metal, P(1.6, 2.35, s * 0.55), [0, 0, Math.PI / 2 - 0.1]));
    K.mh60m = g;
  }
  K.uh60l = new THREE.Group();
  for (const k in K) K[k].name = 'kit-' + k;
  return K;
}
// Rescue hoist above the right cabin door (boom, drum, hook)
// External rescue hoist (HH-60 / UH-60 class, Goodrich 44301-style), above the forward edge of the RIGHT cabin door.
// Mounted on the cabin-roof shoulder (fuselage measured at a=3.4-3.8: side skin top y~2.25 z~1.28, roof shoulder y~2.30 z~0.85).
// Sizes from the user's HH-60W front photo as ratios of one windscreen pane (~0.80 m): boom tube 0.12, head 0.30 w x 0.40 h,
// head centre ~0.30 m outboard of the cabin side and ~0.75 m above the shoulder; hook ~0.12 m.
export function buildHoist(M) {
  const g = new THREE.Group(); const A = 3.55;
  // mounting saddle: sits on the roof shoulder and wraps down onto the side skin (sunk 2 cm into the skin so there is no gap)
  g.add(mesh(new RoundedBoxGeometry(0.56, 0.12, 0.50, 3, 0.04), M.hoist, P(A, 2.33, 1.04)));
  g.add(mesh(new RoundedBoxGeometry(0.50, 0.26, 0.08, 3, 0.03), M.hoist, P(A, 2.20, 1.255)));
  g.add(mesh(new RoundedBoxGeometry(0.30, 0.20, 0.30, 3, 0.06), M.hoist, P(A, 2.46, 1.08)));
  // curved boom: up from the saddle, out over the door
  g.add(tube([P(A, 2.42, 1.08), P(A, 2.75, 1.16), P(A, 2.98, 1.36), P(A, 3.05, 1.56)], 0.065, 0.055, M.hoist));
  // hoist head: drum housing, axis fore-aft, with motor end cap and lower guide
  const head = mesh(new RoundedBoxGeometry(0.42, 0.40, 0.30, 4, 0.12), M.hoist, P(A, 3.02, 1.60)); g.add(head);
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.10, 24), M.darkMetal, P(A - 0.24, 3.04, 1.60), [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.10, 12), M.darkMetal, P(A, 2.78, 1.62)));
  // cable + hook (stowed short)
  g.add(mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.16, 6), M.darkMetal, P(A, 2.66, 1.62)));
  g.add(mesh(new RoundedBoxGeometry(0.06, 0.12, 0.06, 2, 0.02), M.darkMetal, P(A, 2.54, 1.62)));
  g.add(mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20, Math.PI * 1.6), M.darkMetal, P(A, 2.43, 1.62), [0, Math.PI / 2, 0]));
  g.name = 'hoist'; g.userData.label = 'External rescue hoist'; return g;
}
// Main-rotor bifilar vibration absorber: 4 arms at 45 deg to the blades on top of the hub, each with a pendulum weight.
// (Replaces the solid dome in the source model, which is not a UH-60 part.)
export function buildBifilar(M, hub = [1.63, 0], y = 3.98) {
  const g = new THREE.Group(); g.position.set(hub[0], y, hub[1]);
  g.add(mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 24), M.darkMetal, new THREE.Vector3(0, 0.02, 0)));
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), M.darkMetal, new THREE.Vector3(0, 0.15, 0)));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    const arm = mesh(new RoundedBoxGeometry(0.46, 0.07, 0.12, 2, 0.025), M.darkMetal, new THREE.Vector3(c * 0.33, 0.05, s * 0.33), [0, -a, 0]); g.add(arm);
    g.add(mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.09, 24), M.darkMetal, new THREE.Vector3(c * 0.58, 0.07, s * 0.58)));
    g.add(mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.09, 24), M.darkMetal, new THREE.Vector3(c * 0.58, -0.04, s * 0.58)));
  }
  g.name = 'bifilar'; return g;
}
// Gimbaled searchlight (Trakkabeam-style) on a bracket outside the pilot's (right) door, with a real spot light
export function buildSearchlight(M) {
  const g = new THREE.Group();
  // per user MH-60T photos: large gimbaled head low on the right forward fuselage, under the cockpit door
  const br = mesh(new RoundedBoxGeometry(0.16, 0.22, 0.16, 2, 0.03), M.darkMetal, P(2.30, 0.86, 1.18)); g.add(br);
  const fork = mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 24, Math.PI), M.darkMetal, P(2.30, 0.70, 1.30), [0, Math.PI / 2, Math.PI]); g.add(fork);
  const head = latheX([[0, 0], [0.15, 0], [0.17, 0.05], [0.17, 0.28], [0.18, 0.31], [0, 0.31]], M.mission); head.position.copy(P(2.40, 0.64, 1.30)); g.add(head);
  const lamp = mesh(new THREE.CircleGeometry(0.165, 32), M.lamp, P(2.085, 0.64, 1.30), [0, Math.PI / 2, 0]); g.add(lamp);
  const spot = new THREE.SpotLight('#fff3dc', 0, 60, 0.22, 0.4, 1.2); spot.position.copy(P(2.07, 0.64, 1.30)); spot.target.position.copy(P(-6, 0, 3.5)); spot.castShadow = false;
  g.add(spot, spot.target); g.userData.spot = spot; g.userData.lamp = M.lamp; g.name = 'searchlight';
  return g;
}

// Air-refuelling probe: an independent part for every nose. side = 'right' | 'left'.
// Telescoping boom from the forward cabin, nearly level, tip about 3 m ahead of the nose (MH-60M / HH-60 class).
export function buildProbe(M, side = 'right', variant = 'mh60m') {
  const s = side === 'left' ? -1 : 1;
  const len = { hh60g: -1.6, hh60w: -1.9, mh60t: -1.7, uh60l: -1.7 }[variant] ?? -2.9;
  const g = probe(P(3.20, 0.92, s * 1.30), P(1.0, 0.86, s * 1.10), P(len, 0.90, s * 1.02), 0.12, 0.095, M, M.probe);
  // telescoping step + collar near the base, and a fuselage fairing
  const c = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.10, 24), M.darkMetal, P(1.6, 0.86, s * 1.12), [0, 0, Math.PI / 2]); g.add(c);
  const f = mesh(new RoundedBoxGeometry(1.0, 0.34, 0.30, 4, 0.08), M.probe, P(2.8, 0.92, s * 1.30)); g.add(f);
  g.name = 'refuel-probe'; g.userData.label = 'Air-refuelling probe'; return g;
}

// ESSS stub wings with one external fuel tank per side (MH-60T option)
export const TANK_A = 3.45;
export function buildTanks(M) {
  const g = new THREE.Group(); g.name = 'tanks'; g.userData.label = 'ESSS stubs + external fuel tanks';
  for (const s of [1, -1]) {
    // positions from MH-60T 6008/6029 photos: tank nose sits just aft of the cabin-door front, stub/pylon ~1.2 m behind the nose
    const AN = TANK_A, AS = AN + 1.00;
    const st = mesh(new RoundedBoxGeometry(0.50, 0.10, 0.85, 3, 0.04), M.tank, P(AS, 1.95, s * 1.62), [s * 0.35, 0, 0]); g.add(st);
    const py = mesh(new RoundedBoxGeometry(0.40, 0.30, 0.08, 2, 0.02), M.darkMetal, P(AS, 1.66, s * 1.98)); g.add(py);
    const prof = [[0, 0], [0.12, 0.02], [0.22, 0.12], [0.28, 0.35], [0.29, 0.8], [0.29, 1.7], [0.289, 1.78], [0.27, 2.1], [0.18, 2.4], [0, 2.5]];
    // black front cap = nose dome only (from the 0.27 m station forward)
    const t = latheX(prof.slice(0, 8), M.tank, 40); t.position.copy(P(AN + 2.5, 1.30, s * 1.98)); t.castShadow = true; g.add(t);
    const c = latheX(prof.slice(7), M.tankCap || M.tank, 40); c.position.copy(P(AN + 2.5, 1.30, s * 1.98)); c.castShadow = true; g.add(c);
  }
  return g;
}
