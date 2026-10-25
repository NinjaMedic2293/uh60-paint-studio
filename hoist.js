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
  // ---- head (v3.3): flat-sided fore-aft drum, ~0.95 m long x 0.50 m tall (~2:1 from the side). Section = tall helmet
  // (as seen from the front in 4521): rounded top, flat sides, narrowing to a rounded keel. Ends are sculpted caps.
  const L = 0.95, Hh = 0.50, Wd = 0.40;
  const sec = (sc) => { const s = new THREE.Shape(), n = 64;
    for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      const yy = Math.sign(c) * Math.pow(Math.abs(c), 0.55) * Hh / 2;                           // flat sides (superellipse)
      const taper = yy < 0 ? 1 - 0.45 * Math.pow(-yy / (Hh / 2), 1.6) : 1;                         // narrower keel
      const xx = Math.sign(sn) * Math.pow(Math.abs(sn), 0.55) * Wd / 2 * taper;
      i ? s.lineTo(xx * sc, yy * sc) : s.moveTo(xx * sc, yy * sc); } return s; };
  const bev = 0.07, drumG = new THREE.ExtrudeGeometry(sec(1 - 2 * bev / Wd * 0.9), { depth: L - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.9, bevelSegments: 10, curveSegments: 64 });
  drumG.translate(0, 0, -(L - 2 * bev) / 2); drumG.rotateY(Math.PI / 2); drumG.computeVertexNormals();
  const head = mesh(drumG, paint, new THREE.Vector3(HX, HY, HZ)); g.add(head);
  head.onBeforeRender = () => shroud.color.copy(paint.color).multiplyScalar(0.32);
  // dark fairing on the inboard lower side, flowing down into the post top
  const fair = mesh(new THREE.SphereGeometry(1, 40, 24), shroud, new THREE.Vector3(HX + 0.06, HY - 0.15, HZ - 0.06)); fair.scale.set(0.36, 0.14, 0.13); g.add(fair);
  const fair2 = mesh(new THREE.SphereGeometry(1, 28, 18), shroud, new THREE.Vector3(HX + 0.03, HY - 0.25, HZ - 0.04)); fair2.scale.set(0.13, 0.08, 0.075); g.add(fair2);
  // forward end cap: large round cover plate high on the face (the helmet face seen in 4521)
  const FE = HX + L / 2;
  g.add(mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.02, 48), paint, new THREE.Vector3(FE + 0.002, HY + 0.07, HZ), [0, 0, Math.PI / 2]));
  for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2;
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), darkSteel, new THREE.Vector3(FE + 0.014, HY + 0.07 + 0.1 * Math.sin(t), HZ + 0.1 * Math.cos(t)), [0, 0, Math.PI / 2])); }
  g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 12), darkSteel, new THREE.Vector3(FE + 0.015, HY + 0.07, HZ), [0, 0, Math.PI / 2]));
  // aft end (above the hook): large framed rectangular lens recessed into the end face
  const AE = HX - L / 2;
  g.add(mesh(new RoundedBoxGeometry(0.05, 0.34, 0.30, 3, 0.02), darkSteel, new THREE.Vector3(AE + 0.005, HY + 0.03, HZ)));   // frame
  g.add(mesh(new RoundedBoxGeometry(0.02, 0.27, 0.23, 2, 0.008), rubber, new THREE.Vector3(AE - 0.012, HY + 0.03, HZ)));    // recess
  g.add(mesh(new RoundedBoxGeometry(0.012, 0.25, 0.21, 2, 0.006), lens, new THREE.Vector3(AE - 0.016, HY + 0.03, HZ)));     // lens
  for (const dy of [-0.15, 0.15]) for (const dz of [-0.13, 0.13])
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), steel, new THREE.Vector3(AE - 0.022, HY + 0.03 + dy, HZ + dz), [0, 0, Math.PI / 2]));
  // data plate on the upper outboard side near the aft end: dark plate with light text bands + rivets
  const pz = HZ + Wd / 2 * 0.93, py = HY + 0.10, px = AE + 0.24;
  g.add(mesh(new THREE.BoxGeometry(0.18, 0.09, 0.004), darkSteel, new THREE.Vector3(px, py, pz + 0.003)));
  for (const dy of [-0.025, 0, 0.025]) g.add(mesh(new THREE.BoxGeometry(0.14, 0.008, 0.002), plate, new THREE.Vector3(px, py + dy, pz + 0.006)));
  for (const dx of [-0.08, 0.08]) for (const dy of [-0.035, 0.035]) g.add(mesh(new THREE.SphereGeometry(0.005, 6, 4), steel, new THREE.Vector3(px + dx, py + dy, pz + 0.006)));
  // ---- cable exit under the aft-outboard bottom; long bumper/swivel cylinder directly under it, then the hook
  const cx = AE + 0.10, cz = HZ, yb = HY - Hh / 2 + 0.03;
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 24), darkSteel, new THREE.Vector3(cx, yb - 0.01, cz)));     // exit fairlead
  g.add(mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.22, 28), rubber, new THREE.Vector3(cx, yb - 0.14, cz)));     // bumper
  g.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 20), steel, new THREE.Vector3(cx, yb - 0.265, cz)));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.11, 20), steel, new THREE.Vector3(cx, yb - 0.335, cz)));       // swivel
  const hookG = new THREE.TorusGeometry(0.07, 0.019, 12, 28, Math.PI * 1.55); hookG.rotateZ(Math.PI * 0.72);
  g.add(mesh(hookG, steel, new THREE.Vector3(cx, yb - 0.46, cz), [0, Math.PI / 2, 0]));
  g.name = 'hoist'; g.userData.label = 'External rescue hoist (HH-60W pattern)';
  return g;
}
