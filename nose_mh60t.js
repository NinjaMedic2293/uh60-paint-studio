// MH-60T Jayhawk nose kit, clean-sheet v1 (reference study: /workspace/3d/nose-ref/study.md, photo IDs nXXX).
// Frame as kits.js: a = metres aft of the stock nose tip, y up from the ground, z +right / -left.
//  - Weather/search radar radome (RDR-1300 class): a blunt cylinder ~0.50 m dia, ~0.70 m exposed length, its front
//    ~0.40 m ahead of the stock nose tip, axis level at y~1.02 and offset ~0.22 m to the aircraft's LEFT (n017, n026, n030, n031).
//  - The radome root is lofted into the real fuselage skin: each radial section is raycast against the fuselage and the
//    radome radius is smooth-max'ed with the skin radius, then fades under the skin, so there is no step or collar.
//  - Radome + fillet use the kit 'nose' material, which app.js already drives with the anti-glare colour and a fixed matte
//    finish when anti-glare is on (so it matches the approved matte-black nose paint regardless of gloss).
//  - 9-in class EO/IR gimbal (light grey ball on a short neck) under the chin just aft of the radome root (n030/n031/n026).
// The searchlight, probe, hoist and paint are NOT touched here.
import * as THREE from 'three';
export const NOSE_T = { NX: 0, zc: -0.34, yc: 1.02, r: 0.27, seamA: -0.14, aFront: -0.47, aCyl: -0.31, aJ: 0.20, aEnd: 0.62, inset: 0.006, k: 0.05,
  flir: { a: 0.62, z: -0.20, y: 0.535, d: 0.24 } };
const sst = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
// exposed radome radius along a (front cap is a blunt superellipse, slight taper toward the front)
function radR(a) {
  const T = NOSE_T; if (a < T.aFront) return 0;
  const rc = T.r * (1 - 0.06 * sst(T.aJ, T.aCyl, a)); // ~6% taper toward the cap
  if (a >= T.aCyl) return rc;
  const u = (T.aCyl - a) / (T.aCyl - T.aFront); // 0 at cap start, 1 at the very front
  return rc * Math.pow(Math.max(0, 1 - Math.pow(u, 3.2)), 1 / 3.2);
}
function findFuselage(scene) { let best = null, n = 0; scene.traverse(o => { if (o.isMesh && o.geometry?.attributes?.position && !o.userData.kit) { const c = o.geometry.attributes.position.count; if (c > n) { n = c; best = o; } } }); return best; }
export function buildNoseMH60T(M, P) {
  const T = NOSE_T, g = new THREE.Group(); g.name = 'mh60t-nose';
  const mk = (geo, mat, pos) => { const o = new THREE.Mesh(geo, mat); o.castShadow = o.receiveShadow = true; o.userData.kit = 1; if (pos) o.position.copy(pos); return o; };
  // EO/IR gimbal: grey yoke drum + ball with a dark forward window, on a dark neck to the chin skin
  const F = T.flir, fr = F.d / 2, fl = new THREE.Group(); fl.name = 'mh60t-flir'; fl.userData.label = 'EO/IR sensor gimbal (9-in class)';
  fl.add(mk(new THREE.SphereGeometry(fr, 40, 28), M.lightGray));
  const drum = mk(new THREE.CylinderGeometry(fr * 0.86, fr * 0.9, fr * 0.55, 32), M.lightGray, new THREE.Vector3(0, fr * 0.8, 0)); fl.add(drum);
  const neck = mk(new THREE.CylinderGeometry(fr * 0.55, fr * 0.6, 0.10, 24), M.darkMetal, new THREE.Vector3(0, fr * 0.8 + 0.12, 0)); fl.add(neck);
  const win = mk(new THREE.CircleGeometry(fr * 0.42, 32), M.lens, new THREE.Vector3(fr * 0.99, -fr * 0.05, 0)); win.rotation.y = Math.PI / 2; fl.add(win);
  const win2 = mk(new THREE.CircleGeometry(fr * 0.17, 20), M.lens, new THREE.Vector3(fr * 0.93, fr * 0.30, fr * 0.18)); win2.lookAt(new THREE.Vector3(fr * 3, fr * 0.9, fr * 0.5)); fl.add(win2);
  fl.position.copy(P(F.a, F.y, F.z)); g.add(fl);
  // radome: built lazily on the first frame the kit is drawn, because it needs the fuselage mesh to loft into
  const stub = new THREE.BufferGeometry(); stub.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
  const hook = new THREE.Mesh(stub, M.nose); hook.frustumCulled = false; hook.userData.kit = 1; g.add(hook);
  const rad = new THREE.Group(); rad.name = 'mh60t-radome'; rad.userData.label = 'Weather / search radar radome (RDR-1300 class)'; g.add(rad);
  // radome joint ring ~0.32 m behind the front (n026/n031): a thin dark groove line around the cylinder
  { const sr = radR(T.seamA); const ring = mk(new THREE.TorusGeometry(sr + 0.002, 0.006, 6, 72), M.darkMetal, P(T.seamA, T.yc, T.zc)); ring.rotation.y = Math.PI / 2; rad.add(ring); }
  hook.onBeforeRender = (renderer, scene) => {
    hook.onBeforeRender = () => {}; const fus = findFuselage(scene); if (!fus) return;
    rad.add(mk(loft(fus), M.nose)); setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
  };
  function loft(fus) {
    fus.updateMatrixWorld(true); const rc = new THREE.Raycaster(), NA = 64, NT = 72, R0 = 1.3;
    const A = []; for (let i = 0; i < NA; i++) { const u = i / (NA - 1); A.push(i < 24 ? T.aFront + (T.aCyl - T.aFront) * (1 - Math.cos(u / (23 / (NA - 1)) * Math.PI / 2)) : T.aCyl + (T.aEnd - T.aCyl) * (i - 23) / (NA - 24)); }
    const pos = [], idx = [], c = new THREE.Vector3(), d = new THREE.Vector3();
    const Rm = [];
    for (let i = 0; i < NA; i++) { const a = A[i], row = []; c.copy(P(a, T.yc, T.zc));
      const base = radR(a) * (1 - sst(T.aJ, T.aEnd, a));
      for (let j = 0; j < NT; j++) { const th = j / NT * Math.PI * 2; d.set(0, Math.sin(th), Math.cos(th));
        let r = base;
        if (a > -0.05) { rc.set(c.clone().addScaledVector(d, R0), d.clone().negate()); rc.far = R0; const h = rc.intersectObject(fus, false)[0];
          if (h) { const s = Math.min(R0 - h.distance - T.inset, base + 0.10); r = smax(base, s, T.k * sst(T.aEnd, T.aJ, a) + 1e-3); } }
        row.push(r); }
      Rm.push(row); }
    // light circumferential smoothing of the conformed part (the stock skin is faceted)
    for (let it = 0; it < 2; it++) for (let i = 1; i < NA; i++) { const q = Rm[i].slice(); for (let j = 0; j < NT; j++) Rm[i][j] = (2 * q[j] + q[(j + 1) % NT] + q[(j + NT - 1) % NT]) / 4; }
    pos.push(...P(T.aFront - 0.0005, T.yc, T.zc).toArray());
    for (let i = 0; i < NA; i++) for (let j = 0; j < NT; j++) { const th = j / NT * Math.PI * 2; const p = P(A[i], T.yc + Rm[i][j] * Math.sin(th), T.zc + Rm[i][j] * Math.cos(th)); pos.push(p.x, p.y, p.z); }
    const V = (i, j) => 1 + i * NT + (j % NT);
    for (let j = 0; j < NT; j++) idx.push(0, V(0, j + 1), V(0, j));
    for (let i = 0; i < NA - 1; i++) for (let j = 0; j < NT; j++) idx.push(V(i, j), V(i, j + 1), V(i + 1, j + 1), V(i, j), V(i + 1, j + 1), V(i + 1, j));
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    // make sure normals face outward (away from the radome axis)
    const n = new THREE.Vector3().fromBufferAttribute(geo.attributes.normal, V(30, 0)), p = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, V(30, 0));
    if (n.dot(p.sub(P(A[30], T.yc, T.zc))) < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; geo.setIndex(idx); geo.computeVertexNormals(); }
    return geo;
  }
  return g;
}
