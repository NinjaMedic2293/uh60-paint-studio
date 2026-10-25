// External rescue hoist, USCG MH-60T Jayhawk pattern (v4, rebuilt from scratch from 30 Commons photos; study in
// /workspace/3d/hoist-ref/v4/study.md). A SLIM support arm is bolted to the cabin roof edge at the top of the right
// sliding-door opening, just below and outboard of the engine inlet; it leans up and outboard (~45 deg) clear of the nacelle,
// then turns vertical into the underside of a compact capsule-shaped hoist head that sits beside the inlet, above the roof
// line, its drum axis fore-aft. Head ~0.76 m long x 0.32 m tall x 0.32 m wide, fuller at the forward (drum) end; arm one smooth oval gooseneck, ~0.27 x 0.12 m at the faired root, ~0.14 x 0.09 m at the head.
// The cable leaves the centre of the head underside; black bumper, swivel and hook stow just below it.
// Positions use kits.js P(a, y, z): a = metres aft of the nose tip, y = height above ground, z = +right (outboard).
import * as THREE from 'three';
import { P } from './kits.js';

function mesh(g, m, pos, rot) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; if (pos) o.position.copy(pos); if (rot) o.rotation.set(...rot); return o; }
// lathe about the fore-aft (world x) axis; profile [[r, x]] from aft (x<0) to forward; sz squeezes the section laterally
function latheX(profile, m, pos, sz = 1, seg = 56) {
  const g = new THREE.LatheGeometry(profile.map(([r, t]) => new THREE.Vector2(Math.max(r, 1e-4), t)), seg);
  g.rotateZ(-Math.PI / 2); g.scale(1, 1, sz); g.computeVertexNormals(); return mesh(g, m, pos);
}
// smooth profile helper: rounded capsule radius along x in [-L/2, L/2] with separate aft/forward end radii
function capsule(L, rA, rF, rMid, n = 40) { const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, x = -L / 2 + L * t; let r;
    const ea = Math.min(1, (x + L / 2) / rA), ef = Math.min(1, (L / 2 - x) / rF);
    const base = rA + (rF - rA) * t, mid = base + (rMid - base) * Math.sin(Math.PI * t) * 0.6;
    r = mid * Math.sqrt(Math.max(0, 1 - Math.pow(1 - ea, 2))) * Math.sqrt(Math.max(0, 1 - Math.pow(1 - ef, 2)));
    out.push([r, x]); } return out; }
// swept tube with an oval section: ax = fore-aft (world x) half-width scale, radius tapering r0 -> r1
function sweep(pts, r0, r1, m, ax = 1.0, ax1 = ax) {
  const c = pts.getPointAt ? pts : new THREE.CatmullRomCurve3(pts, false, 'centripetal'); const n = 48, seg = 28;
  const g = new THREE.TubeGeometry(c, n, 1, seg, false), pos = g.attributes.position, p = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= n; i++) { const t = i / n, r = r0 + (r1 - r0) * t; c.getPointAt(t, p);
    for (let j = 0; j <= seg; j++) { const k = i * (seg + 1) + j; v.fromBufferAttribute(pos, k).sub(p); v.x *= ax + (ax1 - ax) * t; v.multiplyScalar(r).add(p); pos.setXYZ(k, v.x, v.y, v.z); } }
  g.computeVertexNormals(); return mesh(g, m);
}

export function buildHoist(M) {
  const g = new THREE.Group();
  const paint = M.hoist;
  const steel = new THREE.MeshPhysicalMaterial({ color: '#b9bdc1', roughness: 0.28, metalness: 1.0 });
  const dark = new THREE.MeshPhysicalMaterial({ color: '#2c2e31', roughness: 0.5, metalness: 0.4 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.85 });
  const lens = new THREE.MeshPhysicalMaterial({ color: '#0b0f14', roughness: 0.04, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.02 });

  // ---- head (capsule, axis fore-aft). HA = centre station, HY = centre height, HZ = centre outboard.
  const HA = 4.69, HX = P(HA, 0, 0).x, HY = 2.95, HZ = 1.62, L = 0.76, R = 0.162;
  const prof = capsule(L, 0.11, 0.157, R), rAt = x => { let b = prof[0]; for (const q of prof) if (Math.abs(q[1] - x) < Math.abs(b[1] - x)) b = q; return b[0]; };
  const head = latheX(prof, paint, new THREE.Vector3(HX, HY, HZ), 1.0); g.add(head);
  // seam bands between the drum housing and the end housings
  // forward outboard face: hoist light/camera lens + fittings (photo 34)
  const FE = HX + L / 2, ld = new THREE.Vector3(1, -0.15, 0.75).normalize(), lq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ld);
  { const lp = new THREE.Vector3(FE - 0.07, HY + 0.01, HZ + 0.075); const c = mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.03, 28), dark, lp); c.quaternion.copy(lq); g.add(c); const h = mesh(new THREE.SphereGeometry(0.04, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lens, lp.clone().addScaledVector(ld, 0.012)); h.quaternion.copy(lq); g.add(h);
    for (const dy of [-0.07, 0.075]) { const f = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), dark, new THREE.Vector3(FE - 0.1, HY + dy, HZ + 0.1)); f.quaternion.copy(lq); g.add(f); } }
  // (side slot removed: not visible in photos 30/33/34)
  // panel lines (thin slightly darker grooves) and flush latches, as in photo 33
  const seam = paint.clone(); seam.onBeforeRender = () => {}; const seamCol = () => seam.color.copy(paint.color).multiplyScalar(0.72);
  for (const dx of [-0.30, 0.05]) { const t = mesh(new THREE.TorusGeometry(rAt(dx) + 0.0008, 0.0025, 6, 64), seam, new THREE.Vector3(HX + dx, HY, HZ), [0, Math.PI / 2, 0]); t.onBeforeRender = seamCol; g.add(t); }
  { const ln = mesh(new THREE.BoxGeometry(0.34, 0.004, 0.004), seam, new THREE.Vector3(HX - 0.12, HY + R * 0.72, HZ + R * 0.70), [0.8, 0, 0]); ln.onBeforeRender = seamCol; g.add(ln); }
  for (const dx of [-0.26, -0.02]) for (const ang of [0.5, -0.4]) { const lt = mesh(new THREE.BoxGeometry(0.03, 0.01, 0.004), seam, new THREE.Vector3(HX + dx, HY + Math.sin(ang) * rAt(dx), HZ + Math.cos(ang) * rAt(dx)), [-ang, 0, 0]); lt.onBeforeRender = seamCol; g.add(lt); }

  // ---- support arm: foot on the cabin roof edge at the door top rail (below/outboard of the inlet), leaning up and outboard
  // clear of the nacelle side, then turning vertical into the head underside slightly aft and inboard of the head centre.
  const AA = HA + 0.20, AX = P(AA, 0, 0).x;
  const root = new THREE.Vector3(AX, 2.19, 1.01), tip = new THREE.Vector3(AX, HY - R + 0.04, HZ - 0.05);
  const arm = new THREE.CubicBezierCurve3(root, new THREE.Vector3(AX, 2.45, 1.30), new THREE.Vector3(AX, tip.y - 0.30, tip.z + 0.02), tip);
  g.add(sweep(arm, 0.062, 0.047, paint, 2.2, 1.45));   // oval: ~0.27 x 0.12 m at the root (faired), ~0.14 x 0.09 m at the head
  // root fitting: tapered collar + bolted base plate on the skin
  g.add(sweep([new THREE.Vector3(AX, 2.14, 0.975), new THREE.Vector3(AX, 2.19, 1.01), new THREE.Vector3(AX, 2.24, 1.05)], 0.078, 0.066, paint, 2.0));
  g.add(mesh(new THREE.BoxGeometry(0.44, 0.02, 0.19), paint, new THREE.Vector3(AX, 2.14, 0.98), [-0.5, 0, 0]));
  for (const dx of [-0.085, 0.085]) for (const dz of [-0.045, 0.045]) { const o = new THREE.Vector3(dx, 0.013, dz).applyEuler(new THREE.Euler(-0.5, 0, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 10), dark, new THREE.Vector3(AX, 2.14, 0.98).add(o), [-0.5, 0, 0])); }
  // saddle: small fairing where the arm enters the head
  const sad = mesh(new THREE.SphereGeometry(1, 32, 16), paint, new THREE.Vector3(AX, HY - R + 0.035, HZ - 0.05)); sad.scale.set(0.12, 0.06, 0.08); g.add(sad);
  // cable-guide: twin rollers + yoke either side of the fairlead (photo 33)
  for (const sx of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 16), dark, new THREE.Vector3(HX + sx * 0.035, HY - R - 0.005, HZ + 0.02), [Math.PI / 2, 0, 0])); g.add(mesh(new THREE.BoxGeometry(0.012, 0.05, 0.07), paint, new THREE.Vector3(HX + sx * 0.065, HY - R + 0.01, HZ + 0.02))); }

  // ---- cable exits the CENTRE of the head underside; bumper (black, white band), swivel and hook stow just below
  const cx = HX, cz = HZ + 0.02, yb = HY - R;
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 24), dark, new THREE.Vector3(cx, yb, cz)));                  // fairlead
  g.add(mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.05, 6), steel, new THREE.Vector3(cx, yb - 0.04, cz)));      // cable
  g.add(mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.12, 28), rubber, new THREE.Vector3(cx, yb - 0.125, cz)));      // bumper
  g.add(mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.02, 28), new THREE.MeshPhysicalMaterial({ color: '#d8d8d2', roughness: 0.6 }), new THREE.Vector3(cx, yb - 0.08, cz)));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), steel, new THREE.Vector3(cx, yb - 0.195, cz)));
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.05, 20), steel, new THREE.Vector3(cx, yb - 0.23, cz)));       // swivel
  const hy = yb - 0.255, hk = [[0, 0], [0, -0.04], [0.01, -0.07], [0.035, -0.095], [0.024, -0.13], [-0.012, -0.138], [-0.04, -0.115], [-0.043, -0.085], [-0.027, -0.066]];
  g.add(sweep(hk.map(([dz, dy]) => new THREE.Vector3(cx, hy + dy, cz + dz)), 0.012, 0.01, steel));
  g.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.058, 8), steel, new THREE.Vector3(cx, hy - 0.05, cz - 0.016), [-0.5, 0, 0]));   // latch
  g.name = 'hoist'; g.userData.label = 'External rescue hoist (MH-60T pattern)';
  return g;
}
