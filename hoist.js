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

export function buildHoist(M) {
  const g = new THREE.Group();
  const paint = M.hoist;
  const shroud = paint.clone(); shroud.roughness = 0.65; // darker lower fairing: tracks the scheme hoist colour at 55%
  const steel = new THREE.MeshPhysicalMaterial({ color: '#b9bdc1', roughness: 0.28, metalness: 1.0 });
  const darkSteel = new THREE.MeshPhysicalMaterial({ color: '#36383b', roughness: 0.45, metalness: 0.85 });
  const cableM = new THREE.MeshPhysicalMaterial({ color: '#8d9196', roughness: 0.35, metalness: 1.0 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.85 });
  const lens = new THREE.MeshPhysicalMaterial({ color: '#0a0e13', roughness: 0.03, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }); // dark reflective glass
  const plate = new THREE.MeshPhysicalMaterial({ color: '#c9ccc4', roughness: 0.5, metalness: 0.4 });

  // ---- position (v3.4, re-measured from DVIDS 8863675, see anatomy.md "v3.4 position"): the head lies fore-aft beside the
  // engine nacelle, its forward cap right behind the engine-inlet lip (a ~4.62) and running aft over the rear of the
  // cabin door (a ~5.57); centre ~0.37 m above the inlet centre; inboard face just clear of the nacelle side (z ~1.29).
  const HA = 5.10, HX = P(HA, 0, 0).x, HY = 3.05, HZ = 1.50;
  // ---- mast foot on the cabin-roof shoulder outboard of the nacelle, a little forward of the head's mid-length
  const FA = HA - 0.20, FZ = 1.20;
  g.add(mesh(new RoundedBoxGeometry(0.40, 0.03, 0.26, 2, 0.01), paint, P(FA, 2.285, FZ), [0.42, 0, 0]));
  for (const da of [-0.15, -0.05, 0.05, 0.15]) for (const dz of [-0.09, 0.09])
    g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 8), darkSteel, P(FA + da, 2.305 - dz * 0.42, FZ + dz), [0.42, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.06, 28), paint, P(FA, 2.31, FZ)));          // base fitting
  // ---- gooseneck post: thick at the base, rises from the shoulder, eases outboard clear of the nacelle, then up into the
  // inboard underside of the head
  const pts = [P(FA, 2.30, FZ), P(FA, 2.42, FZ + 0.03), P(FA, 2.52, FZ + 0.09), P(FA, 2.62, FZ + 0.15), P(FA, 2.72, FZ + 0.18), P(FA, 2.84, FZ + 0.20)];
  g.add(sweep(pts, 0.085, 0.06, paint, 1.15));
  // ---- head (v3.3): flat-sided fore-aft drum, ~0.95 m long x 0.50 m tall (~2:1 from the side). Section = tall helmet
  // (as seen from the front in 4521): rounded top, flat sides, narrowing to a rounded keel. Ends are sculpted caps.
  const L = 0.95, Hh = 0.50, Wd = 0.40;
  const sec = (sc) => { const s = new THREE.Shape(), n = 64;
    for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      const yy = Math.sign(c) * Math.pow(Math.abs(c), 0.55) * Hh / 2;                           // flat sides (superellipse)
      const taper = yy < 0 ? 1 - 0.45 * Math.pow(-yy / (Hh / 2), 1.6) : 1;                         // narrower keel
      const xx = Math.sign(sn) * Math.pow(Math.abs(sn), 0.55) * Wd / 2 * taper;
      i ? s.lineTo(xx * sc, yy * sc) : s.moveTo(xx * sc, yy * sc); } return s; };
  const bev = 0.05, drumG = new THREE.ExtrudeGeometry(sec(1 - 2 * bev / Wd * 0.9), { depth: L - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.9, bevelSegments: 10, curveSegments: 64 });
  drumG.translate(0, 0, -(L - 2 * bev) / 2); drumG.rotateY(Math.PI / 2); const drumS = smoothNormals(drumG);          // smooth shading, no facet bands
  const head = mesh(drumS, paint, new THREE.Vector3(HX, HY, HZ)); g.add(head);
  head.onBeforeRender = () => shroud.color.copy(paint.color).multiplyScalar(0.32);
  // darker inboard lower fairing along the drum, and a shaped saddle fairing where the post meets the underside
  const fair = mesh(new THREE.SphereGeometry(1, 48, 28), shroud, new THREE.Vector3(HX + 0.02, HY - 0.14, HZ - 0.08)); fair.scale.set(0.40, 0.14, 0.13); g.add(fair);
  const sad = new THREE.LatheGeometry([[0.065, -0.10], [0.075, -0.05], [0.11, 0.0], [0.15, 0.04], [0.16, 0.06]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const saddle = mesh(sad, shroud, P(FA, 2.84, FZ + 0.20)); saddle.scale.set(1.5, 1, 0.9); g.add(saddle);
  // forward end cap: large round cover plate high on the face (the helmet face seen in 4521)
  const FE = HX + L / 2;
  g.add(mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.02, 48), paint, new THREE.Vector3(FE + 0.002, HY + 0.07, HZ), [0, 0, Math.PI / 2]));
  for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2;
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), darkSteel, new THREE.Vector3(FE + 0.014, HY + 0.07 + 0.1 * Math.sin(t), HZ + 0.1 * Math.cos(t)), [0, 0, Math.PI / 2])); }
  g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 12), darkSteel, new THREE.Vector3(FE + 0.015, HY + 0.07, HZ), [0, 0, Math.PI / 2]));
  const rim = mesh(new THREE.TorusGeometry(0.13, 0.012, 10, 56), shroud, new THREE.Vector3(FE - 0.004, HY + 0.07, HZ), [0, Math.PI / 2, 0]); g.add(rim);
  // aft end: large framed rectangular lens recessed into the end face
  const AE = HX - L / 2;
  g.add(mesh(new RoundedBoxGeometry(0.05, 0.36, 0.32, 3, 0.02), darkSteel, new THREE.Vector3(AE + 0.005, HY + 0.03, HZ)));   // frame
  g.add(mesh(new RoundedBoxGeometry(0.02, 0.29, 0.26, 2, 0.008), rubber, new THREE.Vector3(AE - 0.012, HY + 0.03, HZ)));    // recess
  g.add(mesh(new RoundedBoxGeometry(0.012, 0.27, 0.24, 2, 0.006), lens, new THREE.Vector3(AE - 0.016, HY + 0.03, HZ)));     // lens
  for (const dy of [-0.15, 0.15]) for (const dz of [-0.13, 0.13])
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), steel, new THREE.Vector3(AE - 0.022, HY + 0.03 + dy, HZ + dz), [0, 0, Math.PI / 2]));
  // data plate on the upper outboard side near the aft end: dark plate with light text bands + rivets
  const pz = HZ + Wd / 2 * 0.985, py = HY + 0.06, px = AE + 0.28;
  g.add(mesh(new THREE.BoxGeometry(0.30, 0.15, 0.004), darkSteel, new THREE.Vector3(px, py, pz + 0.003)));
  for (const dy of [-0.045, -0.015, 0.015, 0.045]) g.add(mesh(new THREE.BoxGeometry(0.25, 0.01, 0.002), plate, new THREE.Vector3(px, py + dy, pz + 0.006)));
  for (const dx of [-0.14, 0.14]) for (const dy of [-0.065, 0.065]) g.add(mesh(new THREE.SphereGeometry(0.005, 6, 4), steel, new THREE.Vector3(px + dx, py + dy, pz + 0.006)));
  // ---- cable exits the CENTRE of the drum underside (fore-aft and lateral centre); bumper, swivel and hook hang straight below
  const cx = HX, cz = HZ, yb = HY - Hh / 2 + 0.02;
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 24), darkSteel, new THREE.Vector3(cx, yb - 0.01, cz)));     // exit fairlead
  g.add(mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.22, 28), rubber, new THREE.Vector3(cx, yb - 0.14, cz)));     // bumper
  g.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 20), steel, new THREE.Vector3(cx, yb - 0.265, cz)));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.11, 20), steel, new THREE.Vector3(cx, yb - 0.335, cz)));       // swivel
  const hookG = new THREE.TorusGeometry(0.07, 0.019, 12, 28, Math.PI * 1.55); hookG.rotateZ(Math.PI * 0.72);
  g.add(mesh(hookG, steel, new THREE.Vector3(cx, yb - 0.46, cz), [0, Math.PI / 2, 0]));
  g.name = 'hoist'; g.userData.label = 'External rescue hoist (HH-60W pattern)';
  return g;
}
