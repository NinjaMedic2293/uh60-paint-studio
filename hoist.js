// External rescue hoist, HH-60W pattern (electric hoist, Breeze-Eastern HS-29900 class; exact model not published).
// Rebuilt from /workspace/3d/hoist-ref/anatomy.md (v3): a gooseneck mast rises from the right cabin-roof shoulder above the
// forward half of the sliding-door opening, curving up and outboard into the underside of the hoist head, which sits HIGH
// (centre ~0.7 m above the door top, level with the engine inlet), axis fore-aft. Forward end: round cap with a large disk cover.
// Aft end: light lens and data plate; the cable exits under the aft end and the bumper + hook stow just below it.
// Positions use kits.js P(a, y, z): a = metres aft of the nose tip, y = height above ground, z = +right (outboard).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { P } from './kits.js';

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

export function buildHoist(M) {
  const g = new THREE.Group();
  const paint = M.hoist;
  const shroud = paint.clone(); shroud.roughness = 0.6;
  const steel = new THREE.MeshPhysicalMaterial({ color: '#b9bdc1', roughness: 0.28, metalness: 1.0 });
  const darkSteel = new THREE.MeshPhysicalMaterial({ color: '#36383b', roughness: 0.45, metalness: 0.85 });
  const cableM = new THREE.MeshPhysicalMaterial({ color: '#8d9196', roughness: 0.35, metalness: 1.0 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.85 });
  const lens = new THREE.MeshPhysicalMaterial({ color: '#e8eef2', roughness: 0.04, metalness: 0.1, clearcoat: 1, emissive: '#fff4d6', emissiveIntensity: 0.12 });
  const plate = new THREE.MeshPhysicalMaterial({ color: '#c9ccc4', roughness: 0.5, metalness: 0.4 });

  // ---- mast foot: doubler on the roof shoulder (flush, follows the ~25 deg shoulder slope) + bolts
  const FA = 3.86;
  g.add(mesh(new RoundedBoxGeometry(0.40, 0.03, 0.30, 2, 0.01), paint, P(FA, 2.305, 1.02), [0.42, 0, 0]));
  for (const da of [-0.15, -0.05, 0.05, 0.15]) for (const dz of [-0.1, 0.1])
    g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 8), darkSteel, P(FA + da, 2.325 - dz * 0.42, 1.02 + dz), [0.42, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.06, 28), paint, P(FA, 2.33, 1.02)));          // base fitting
  // ---- gooseneck mast: up from the shoulder, curving outboard into the head underside (oval, wider fore-aft)
  const top = P(FA, 2.87, 1.48);
  g.add(sweep([P(FA, 2.33, 1.02), P(FA, 2.48, 1.07), P(FA, 2.65, 1.25), P(FA, 2.78, 1.40), top], 0.06, 0.068, paint, 1.35));
  // shroud where the mast meets the head (dark, smooth fairing under the head)
  const sh = mesh(new THREE.SphereGeometry(1, 32, 20), shroud, P(FA - 0.02, 2.88, 1.47)); sh.scale.set(0.22, 0.09, 0.14); g.add(sh);

  // ---- hoist head, axis fore-aft. x-offsets in the lathe: aft (-) to forward (+); length 0.70 m
  const HA = 3.87, C = P(HA, 3.06, 1.50); const n0 = g.children.length;
  const prof = [[0, -0.35], [0.13, -0.35], [0.145, -0.34], [0.16, -0.32], [0.165, -0.10], [0.165, 0.22], [0.16, 0.29], [0.14, 0.33], [0.11, 0.35], [0, 0.352]];
  g.add(latheX(prof, paint, C, 1.30));
  // keel: the drum fairing narrows downward (teardrop section in the front view)
  const keel = mesh(new THREE.SphereGeometry(1, 32, 16), paint, new THREE.Vector3(C.x - 0.02, C.y - 0.13, C.z + 0.01)); keel.scale.set(0.30, 0.12, 0.11); g.add(keel);
  // forward disk cover with centre bolt
  g.add(mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.012, 40), paint, new THREE.Vector3(C.x + 0.352, C.y + 0.05, C.z + 0.02), [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12), darkSteel, new THREE.Vector3(C.x + 0.362, C.y + 0.05, C.z + 0.02), [0, 0, Math.PI / 2]));
  // housing seam bands
  for (const dx of [-0.30, 0.20]) { const t = mesh(new THREE.TorusGeometry(0.165, 0.006, 8, 48), darkSteel, new THREE.Vector3(C.x + dx, C.y, C.z), [0, Math.PI / 2, 0]); t.scale.set(1, 1.30, 1); g.add(t); }
  // aft end: rectangular light lens + data plate (outboard)
  g.add(mesh(new RoundedBoxGeometry(0.012, 0.09, 0.20, 2, 0.004), lens, new THREE.Vector3(C.x - 0.355, C.y - 0.06, C.z)));
  g.add(mesh(new THREE.BoxGeometry(0.16, 0.06, 0.004), plate, new THREE.Vector3(C.x - 0.22, C.y + 0.07, C.z + 0.167)));
  // ---- cable exit under the AFT end, bumper, swivel, hook (stowed)
  const cx = C.x - 0.29, cz = C.z + 0.03, yb = C.y - 0.33;
  g.add(mesh(new RoundedBoxGeometry(0.10, 0.05, 0.09, 2, 0.02), darkSteel, new THREE.Vector3(cx, C.y - 0.235, cz)));          // fairlead
  g.add(mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.05, 8), cableM, new THREE.Vector3(cx, C.y - 0.27, cz)));
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.11, 24), rubber, new THREE.Vector3(cx, yb, cz)));                     // bumper
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.07, 16), steel, new THREE.Vector3(cx, yb - 0.09, cz)));                // swivel
  g.add(mesh(new RoundedBoxGeometry(0.03, 0.06, 0.03, 2, 0.01), steel, new THREE.Vector3(cx, yb - 0.16, cz)));
  const hookG = new THREE.TorusGeometry(0.065, 0.016, 10, 28, Math.PI * 1.55); hookG.rotateZ(Math.PI * 0.72);
  g.add(mesh(hookG, steel, new THREE.Vector3(cx, yb - 0.25, cz), [0, Math.PI / 2, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.006, 0.05, 0.03), darkSteel, new THREE.Vector3(cx, yb - 0.23, cz + 0.035), [0, 0, 0.5]));
  // head + hook scaled 1.2x about the head centre (photo ratios: head ~0.40 m tall x 0.84 m long incl. end caps)
  const hg = new THREE.Group(); hg.position.copy(C); hg.scale.setScalar(1.2);
  for (const o of g.children.slice(n0)) { o.position.sub(C); hg.add(o); }
  g.add(hg);
  g.name = 'hoist'; g.userData.label = 'External rescue hoist (HH-60W pattern)';
  return g;
}
