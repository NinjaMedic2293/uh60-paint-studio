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
  // ---- gooseneck post (v3.1): slim, leaves the shoulder rising outboard, then a tight bend up into the head underside
  const HX = P(3.87, 0, 0).x, HY = 3.06, HZ = 1.50;          // head centre
  g.add(sweep([P(FA, 2.33, 1.00), P(FA, 2.47, 1.13), P(FA, 2.60, 1.29), P(FA - 0.01, 2.70, 1.41), P(FA - 0.02, 2.78, 1.47), P(FA - 0.02, 2.87, 1.49)], 0.048, 0.052, paint, 1.25));
  // ---- head: teardrop section (wide rounded top, tapering to a narrow rounded keel), axis fore-aft
  const W = 0.165, Hb = 0.20;                                 // half-width at top, depth below centre
  const teardrop = (w, top, bot, kw) => { const s = new THREE.Shape(); const cy = top - w;
    s.moveTo(kw, bot + kw); s.absarc(0, bot + kw, kw, 0, Math.PI, true); s.lineTo(-w, cy); s.absarc(0, cy, w, Math.PI, 0, true); s.lineTo(kw, bot + kw); return s; };
  const ext = (shape, len, bev, m) => { const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 6, curveSegments: 28 });
    geo.translate(0, 0, -len / 2); geo.rotateY(Math.PI / 2); return mesh(geo, m, new THREE.Vector3(HX, HY, HZ)); };
  const housing = ext(teardrop(W - 0.035, 0.20 - 0.035, -Hb + 0.035, 0.05), 0.70, 0.05, paint); g.add(housing);          // housing
  housing.onBeforeRender = () => shroud.color.copy(paint.color).multiplyScalar(0.55); // 0.84 m incl. rounded ends
  g.add(ext(teardrop(W - 0.04, -0.035, -Hb + 0.030, 0.052), 0.66, 0.05, shroud));              // darker lower fairing (keel)
  const blend = mesh(new THREE.SphereGeometry(1, 28, 16), shroud, new THREE.Vector3(HX + 0.02, HY - 0.20, HZ - 0.01)); blend.scale.set(0.16, 0.07, 0.085); g.add(blend); // fairing into the post
  // front: round cover plate high on the face, slightly outboard, with centre bolt
  g.add(mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.014, 40), paint, new THREE.Vector3(HX + 0.425, HY + 0.06, HZ + 0.02), [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12), darkSteel, new THREE.Vector3(HX + 0.435, HY + 0.06, HZ + 0.02), [0, 0, Math.PI / 2]));
  // rear: big rectangular light over most of the aft face, bezel, and data plate on the outboard side near the aft end
  g.add(mesh(new RoundedBoxGeometry(0.02, 0.24, 0.27, 2, 0.008), darkSteel, new THREE.Vector3(HX - 0.415, HY + 0.02, HZ)));
  g.add(mesh(new RoundedBoxGeometry(0.014, 0.21, 0.24, 2, 0.006), lens, new THREE.Vector3(HX - 0.424, HY + 0.02, HZ)));
  g.add(mesh(new THREE.BoxGeometry(0.17, 0.075, 0.004), plate, new THREE.Vector3(HX - 0.27, HY + 0.10, HZ + W + 0.002)));
  // ---- cable exits the underside at the outboard aft edge; bumper, swivel and hook hang directly under it
  const cx = HX - 0.31, cz = HZ + 0.05, yb = HY - Hb;          // yb = head underside
  g.add(mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.03, 8), cableM, new THREE.Vector3(cx, yb - 0.01, cz)));
  g.add(mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.12, 24), rubber, new THREE.Vector3(cx, yb - 0.08, cz)));      // bumper
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), steel, new THREE.Vector3(cx, yb - 0.15, cz)));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.07, 16), steel, new THREE.Vector3(cx, yb - 0.195, cz)));      // swivel
  g.add(mesh(new RoundedBoxGeometry(0.032, 0.07, 0.032, 2, 0.01), steel, new THREE.Vector3(cx, yb - 0.26, cz)));     // shank
  const hookG = new THREE.TorusGeometry(0.065, 0.016, 10, 28, Math.PI * 1.55); hookG.rotateZ(Math.PI * 0.72);
  g.add(mesh(hookG, steel, new THREE.Vector3(cx, yb - 0.355, cz), [0, Math.PI / 2, 0]));                           // hook bottom ~0.43 m below head
  g.add(mesh(new THREE.BoxGeometry(0.006, 0.06, 0.03), darkSteel, new THREE.Vector3(cx, yb - 0.33, cz + 0.04), [0, 0, 0.5])); // latch
  g.name = 'hoist'; g.userData.label = 'External rescue hoist (HH-60W pattern)';
  return g;
}
