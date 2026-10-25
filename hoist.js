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
  const shroud = paint.clone(); shroud.roughness = 0.65; // darker lower fairing: tracks the scheme hoist colour at 55%
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
  // ---- gooseneck post (v3.2): short, thick at the base, rises nearly vertically from the roof shoulder with a slight
  // aft lean, then curves outboard into the inboard underside of the head (head sits above the outboard shoulder)
  const HX = P(3.90, 0, 0).x, HY = 3.02, HZ = 1.20, R = 0.20, SY = 1.32;   // head centre, half-width, vertical stretch
  g.add(sweep([P(FA, 2.32, 1.02), P(FA - 0.01, 2.46, 1.025), P(FA - 0.02, 2.58, 1.04), P(FA - 0.03, 2.67, 1.08), P(FA - 0.04, 2.74, 1.13), P(FA - 0.04, 2.80, 1.17)], 0.085, 0.055, paint, 1.15));
  // ---- head: smooth tall helmet/teardrop, axis fore-aft, ~0.53 m tall x 0.40 m wide x 0.80 m long, narrowing toward the keel
  const hp = []; for (let i = 0; i <= 24; i++) { const t = i / 24, x = -0.40 + 0.80 * t, e = Math.abs(2 * t - 1);
    hp.push([R * Math.pow(Math.max(0, 1 - Math.pow(e, 6)), 0.5 / 1), x]); }
  const head = latheX(hp, paint, new THREE.Vector3(HX, HY, HZ), SY, 64);
  { const p = head.geometry.attributes.position, v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); if (v.y < 0) { const f = 1 - 0.42 * Math.pow(-v.y / (R * SY), 1.4); v.z *= f; } p.setXYZ(k, v.x, v.y, v.z); }
    head.geometry.computeVertexNormals(); }
  g.add(head);
  // dark fairing on the inboard lower side, flowing down into the post top
  const shroud2 = shroud; head.onBeforeRender = () => shroud2.color.copy(paint.color).multiplyScalar(0.32);
  const fair = mesh(new THREE.SphereGeometry(1, 40, 24), shroud, new THREE.Vector3(HX + 0.04, HY - 0.15, HZ - 0.07)); fair.scale.set(0.32, 0.19, 0.135); g.add(fair);
  const fair2 = mesh(new THREE.SphereGeometry(1, 28, 18), shroud, new THREE.Vector3(HX + 0.02, HY - 0.27, HZ - 0.04)); fair2.scale.set(0.12, 0.08, 0.075); g.add(fair2);
  // front: large round cover plate high on the face
  g.add(mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.014, 48), paint, new THREE.Vector3(HX + 0.385, HY + 0.08, HZ + 0.01), [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), darkSteel, new THREE.Vector3(HX + 0.395, HY + 0.08, HZ + 0.01), [0, 0, Math.PI / 2]));
  // rear: big rectangular light over most of the aft face + bezel; data plate on the outboard side
  g.add(mesh(new RoundedBoxGeometry(0.03, 0.27, 0.27, 2, 0.01), darkSteel, new THREE.Vector3(HX - 0.385, HY + 0.07, HZ)));
  g.add(mesh(new RoundedBoxGeometry(0.014, 0.24, 0.24, 2, 0.006), lens, new THREE.Vector3(HX - 0.402, HY + 0.07, HZ)));
  const dp = mesh(new THREE.BoxGeometry(0.16, 0.07, 0.004), plate, new THREE.Vector3(HX - 0.20, HY + 0.10, HZ + R + 0.003)); g.add(dp);
  // ---- cable exit under the aft-outboard bottom; long bumper/swivel cylinder directly under it, then the hook
  const cx = HX - 0.22, cz = HZ + 0.015, yb = HY - R * SY * 0.86;
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 24), darkSteel, new THREE.Vector3(cx, yb - 0.01, cz)));     // exit fairlead
  g.add(mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.22, 28), rubber, new THREE.Vector3(cx, yb - 0.14, cz)));     // bumper
  g.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 20), steel, new THREE.Vector3(cx, yb - 0.265, cz)));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.11, 20), steel, new THREE.Vector3(cx, yb - 0.335, cz)));       // swivel
  const hookG = new THREE.TorusGeometry(0.07, 0.019, 12, 28, Math.PI * 1.55); hookG.rotateZ(Math.PI * 0.72);
  g.add(mesh(hookG, steel, new THREE.Vector3(cx, yb - 0.46, cz), [0, Math.PI / 2, 0]));
  g.name = 'hoist'; g.userData.label = 'External rescue hoist (HH-60W pattern)';
  return g;
}
