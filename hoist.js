// External rescue hoist, HH-60W / UH-60M pattern (Breeze-Eastern HS/BL-29900-class electric hoist on a fixed davit),
// rigidly mounted to the cabin roof ABOVE THE RIGHT CABIN DOOR (forward end of the door, sliding door spans a = 3.30-5.02 m).
// Positions use kits.js P(a, y, z): a = metres aft of the nose tip, y = height above ground, z = +right.
// Layout from HH-60W photos (front: user photo 4521; right side: DVIDS 8863675) scaled to the stock fuselage:
//   - davit mast foot bolted to a doubler plate on the roof shoulder (roof y~2.30 at z~0.87, side skin z~1.28 up to y~2.25),
//   - mast rises ~0.5 m to an elbow, boom arm runs outboard ~0.55 m and slightly down to the hoist yoke,
//   - hoist body hangs under the boom tip, axis fore-aft, ~0.35 m outboard of the cabin skin, hook below its forward end.
// Hoist body: ~0.30 m dia x ~0.72 m overall (drum housing + aft motor + forward gearbox/cable guide); approximate, from photos.
// HS-29900 published data: 600 lb rated, 290 ft cable, 110 lb installed. Cable 3/16 in (4.8 mm) 19x7.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { P } from './kits.js';

function mesh(g, m, pos, rot) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; if (pos) o.position.copy(pos); if (rot) o.rotation.set(...rot); return o; }
// lathe about the fore-aft axis (world x). profile: [[radius, x-offset]] listed aft -> forward
function latheX(profile, m, pos, seg = 40) {
  const g = new THREE.LatheGeometry(profile.map(([r, t]) => new THREE.Vector2(Math.max(r, 1e-4), t)), seg);
  g.rotateZ(-Math.PI / 2); return mesh(g, m, pos);
}
function strut(a, b, r, m, seg = 20) { // straight round tube between two points
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const o = mesh(new THREE.CylinderGeometry(r, r, L, seg), m); o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o;
}
function bentTube(pts, r, m) { const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); return mesh(new THREE.TubeGeometry(c, 48, r, 20, false), m); }

export function buildHoist(M) {
  const g = new THREE.Group();
  const paint = M.hoist; // painted to the airframe colour on the real aircraft (scheme colour 'hoist')
  const steel = new THREE.MeshPhysicalMaterial({ color: '#b8bcc0', roughness: 0.28, metalness: 1.0 });
  const darkSteel = new THREE.MeshPhysicalMaterial({ color: '#3b3d40', roughness: 0.45, metalness: 0.9 });
  const cableM = new THREE.MeshPhysicalMaterial({ color: '#8d9196', roughness: 0.35, metalness: 1.0 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: '#151515', roughness: 0.85, metalness: 0 });
  const lens = new THREE.MeshPhysicalMaterial({ color: '#dfe6ea', roughness: 0.05, transmission: 0.0, clearcoat: 1, emissive: '#fff4d6', emissiveIntensity: 0.15 });
  const A0 = 3.78;                       // davit station (just aft of the door's forward frame)
  // --- roof doubler / mast foot: flush on the roof shoulder, wrapping over the door-top edge
  const foot = new THREE.Group();
  foot.add(mesh(new RoundedBoxGeometry(0.46, 0.035, 0.30, 2, 0.012), paint, P(A0, 2.300, 0.98), [0.25, 0, 0]));   // follows the shoulder slope
  foot.add(mesh(new RoundedBoxGeometry(0.42, 0.16, 0.03, 2, 0.01), paint, P(A0, 2.20, 1.275)));                     // side flange onto the skin, flush
  for (const da of [-0.17, -0.06, 0.06, 0.17]) for (const dz of [0.88, 1.08])
    foot.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 8), darkSteel, P(A0 + da, 2.335 - (dz - 0.98) * 0.25, dz)));
  g.add(foot);
  // --- mast (vertical tube) with fore/aft gusset fairing
  const mastBase = P(A0, 2.31, 1.02), elbow = P(A0, 2.78, 1.10);
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.08, 24), paint, P(A0, 2.35, 1.02)));                     // base collar
  g.add(strut(mastBase, elbow, 0.062, paint));
  const gus = new THREE.Shape(); gus.moveTo(-0.20, 0); gus.lineTo(0.20, 0); gus.lineTo(0.04, 0.30); gus.lineTo(-0.04, 0.30); gus.closePath();
  const gusG = new THREE.ExtrudeGeometry(gus, { depth: 0.022, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }); gusG.translate(0, 0, -0.011);
  g.add(mesh(gusG, paint, P(A0, 2.33, 1.02)));
  // --- elbow knuckle + boom arm out over the door (slightly down-sloping), boom tip yoke
  g.add(mesh(new THREE.SphereGeometry(0.085, 24, 16), paint, elbow));
  const tip = P(A0 - 0.06, 2.68, 1.62);
  g.add(bentTube([elbow, P(A0 - 0.02, 2.80, 1.30), P(A0 - 0.05, 2.76, 1.50), tip], 0.058, paint));
  g.add(strut(P(A0, 2.55, 1.06), P(A0 - 0.03, 2.74, 1.42), 0.026, paint)); // diagonal brace under the boom
  g.add(mesh(new RoundedBoxGeometry(0.18, 0.12, 0.14, 2, 0.03), paint, P(A0 - 0.06, 2.63, 1.62)));          // yoke block
  // --- hoist body (axis fore-aft), centre ~0.34 m outboard of the cabin skin
  const C = P(A0 - 0.06, 2.43, 1.62), y = C.y, z = C.z;
  // aft motor (smaller can, cooling ribs), drum housing, forward gearbox dome
  const prof = [[0, -0.40], [0.09, -0.40], [0.11, -0.38], [0.11, -0.22], [0.135, -0.20], [0.150, -0.18], [0.150, 0.20], [0.140, 0.24], [0.12, 0.29], [0.085, 0.32], [0, 0.33]];
  g.add(latheX(prof, paint, new THREE.Vector3(C.x, y, z)));
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.TorusGeometry(0.113, 0.006, 6, 32), paint, new THREE.Vector3(C.x - 0.37 + i * 0.03, y, z), [0, Math.PI / 2, 0]));
  for (const dx of [-0.17, 0.19]) g.add(mesh(new THREE.TorusGeometry(0.151, 0.008, 8, 40), darkSteel, new THREE.Vector3(C.x + dx, y, z), [0, Math.PI / 2, 0])); // housing flanges
  g.add(mesh(new RoundedBoxGeometry(0.30, 0.07, 0.10, 2, 0.02), paint, new THREE.Vector3(C.x, y + 0.16, z)));   // top saddle to yoke
  g.add(mesh(new RoundedBoxGeometry(0.16, 0.10, 0.06, 2, 0.015), darkSteel, new THREE.Vector3(C.x - 0.10, y - 0.02, z + 0.16))); // outboard connector box
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 12), darkSteel, new THREE.Vector3(C.x - 0.10, y - 0.02, z + 0.21), [Math.PI / 2, 0, 0]));
  // forward lower cable guide / level-wind fairlead and hover light lens
  const fx = C.x + 0.20;
  g.add(mesh(new RoundedBoxGeometry(0.14, 0.12, 0.13, 2, 0.03), paint, new THREE.Vector3(fx, y - 0.15, z)));
  g.add(mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 20), steel, new THREE.Vector3(fx, y - 0.212, z), [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20), lens, new THREE.Vector3(C.x + 0.325, y, z), [0, 0, Math.PI / 2]));
  // --- cable, lighted bumper, swivel and hook (stowed: hook ~0.45 m below the guide)
  const yb = y - 0.52;
  g.add(mesh(new THREE.CylinderGeometry(0.0024, 0.0024, (y - 0.21) - (yb + 0.07), 8), cableM, new THREE.Vector3(fx, (y - 0.21 + yb + 0.07) / 2, z)));
  g.add(mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 24), rubber, new THREE.Vector3(fx, yb + 0.01, z)));   // bumper
  g.add(mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.025, 24), lens, new THREE.Vector3(fx, yb - 0.04, z)));    // light ring
  g.add(mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.08, 16), steel, new THREE.Vector3(fx, yb - 0.09, z)));    // swivel
  const hookG = new THREE.TorusGeometry(0.055, 0.014, 10, 28, Math.PI * 1.55); hookG.rotateZ(Math.PI * 0.72);
  g.add(mesh(hookG, steel, new THREE.Vector3(fx, yb - 0.19, z), [0, Math.PI / 2, 0]));
  g.add(mesh(new RoundedBoxGeometry(0.03, 0.07, 0.03, 2, 0.01), steel, new THREE.Vector3(fx, yb - 0.14, z)));       // hook shank
  g.add(mesh(new THREE.BoxGeometry(0.006, 0.05, 0.035), darkSteel, new THREE.Vector3(fx, yb - 0.17, z + 0.03), [0, 0, 0.5])); // safety latch
  g.name = 'hoist'; g.userData.label = 'External rescue hoist (HH-60W pattern)';
  g.traverse(o => { if (o.isMesh) o.userData.part = 'hoist'; });
  return g;
}
