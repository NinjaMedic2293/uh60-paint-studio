// MH-60T Jayhawk nose kit v5 (reference study: /workspace/3d/nose-ref/study.md, photo IDs nXXX).
// Frame as kits.js: a = metres aft of the stock nose tip, y up from the ground, z +right / -left.
// One lofted shell carries the whole nose:
//  - radome (RDR-1300 class weather/search radar): a long blunt bullet whose radius grows continuously from the tip into
//    the nose bulk (no can / cylinder break), axis level at y~1.02, offset to the aircraft's LEFT (n017, n026, n030, n031);
//  - fuller avionics-bay nose with bulging cheeks: the real fuselage skin (raycast per section) pushed out by a bulge that
//    covers the lower nose and the stock chin windows, then fades back under the skin ahead of the approved anti-glare break
//    (AG_BREAK_A = 1.25), so the fuselage paint and break are untouched and there is no step.
// The shell uses the kit 'nose' material, which app.js drives with the anti-glare colour and a fixed matte finish.
// Also: EO/IR gimbal just behind the radome root (scheme 'mission' colour: dark like 6058 on the USCG presets), radome joint ring,
// warning-placard plate (geometry only, no text), three stubs on the upper nose, blade + dome antennas under the nose.
// Searchlight, probe, hoist and paint are NOT touched here.
import * as THREE from 'three';
export const NOSE_T = { zc: -0.30, yc: 1.02, aTip: -0.66, aRoot: 0.16, rRoot: 0.30, aFade: 0.70,
  bulge: 0.075, bA0: -0.10, bA1: 0.40, bE0: 1.02, bE1: 1.20, yCut0: 1.24, yCut1: 1.36, inset: 0.006, k: 0.06,
  ringA: -0.12, flir: { a: 0.30, z: -0.22, d: 0.24 } };
const sst = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
// radome radius: blunt elliptic-ogive tip, monotone growth to rRoot at aRoot (zero slope there), then fades into the nose
function radR(a) {
  const T = NOSE_T; if (a <= T.aTip) return 0;
  const t = Math.min(1, (a - T.aTip) / (T.aRoot - T.aTip));
  const r = T.rRoot * Math.pow(1 - Math.pow(1 - t, 2.0), 0.36);
  return r * (1 - 0.35 * sst(T.aRoot, T.aFade, a));
}
function findFuselage(scene) { let best = null, n = 0; scene.traverse(o => { if (o.isMesh && o.geometry?.attributes?.position && !o.userData.kit) { const c = o.geometry.attributes.position.count; if (c > n) { n = c; best = o; } } }); return best; }
export function buildNoseMH60T(M, P) {
  const T = NOSE_T, g = new THREE.Group(); g.name = 'mh60t-nose';
  const mk = (geo, mat, pos) => { const o = new THREE.Mesh(geo, mat); o.castShadow = o.receiveShadow = true; o.userData.kit = 1; if (pos) o.position.copy(pos); return o; };
  const stub = new THREE.BufferGeometry(); stub.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
  const hook = new THREE.Mesh(stub, M.nose); hook.frustumCulled = false; hook.userData.kit = 1; g.add(hook);
  const rad = new THREE.Group(); rad.name = 'mh60t-radome'; rad.userData.label = 'Weather / search radar radome (RDR-1300 class) and avionics-bay nose'; g.add(rad);
  const fl = new THREE.Group(); fl.name = 'mh60t-flir'; fl.userData.label = 'EO/IR sensor gimbal (9-in class)'; g.add(fl);
  const ant = new THREE.Group(); ant.name = 'mh60t-antennas'; ant.userData.label = 'Nose stubs, blade and dome antennas'; g.add(ant);
  hook.onBeforeRender = (renderer, scene) => {
    hook.onBeforeRender = () => {}; const fus = findFuselage(scene); if (!fus) return;
    const shell = mk(loft(fus), M.nose); rad.add(shell); fittings(fus, shell);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
  };
  const NT = 96;
  let A = [], Rm = [];
  function loft(fus) {
    fus.updateMatrixWorld(true); const rc = new THREE.Raycaster(), R0 = 1.5, c = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i <= 30; i++) A.push(T.aTip + (T.aRoot - T.aTip) * (1 - Math.cos(i / 30 * Math.PI / 2)));
    for (let a = T.aRoot + 0.025; a <= T.bE1 + 0.03; a += 0.025) A.push(a);
    for (const a of A) { const row = []; c.copy(P(a, T.yc, T.zc)); const base = radR(a);
      const B0 = T.bulge * sst(T.bA0, T.bA1, a) * sst(T.bE1, T.bE0, a);
      for (let j = 0; j < NT; j++) { const th = j / NT * Math.PI * 2; d.set(0, Math.sin(th), Math.cos(th)); let r = base;
        if (a > -0.06) { rc.set(c.clone().addScaledVector(d, R0), d.clone().negate()); rc.far = R0; const h = rc.intersectObject(fus, false)[0];
          if (h) { const sk = R0 - h.distance; const w = sst(T.yCut1, T.yCut0, h.point.y);
            const B = B0 * (1 + 0.6 * sst(0.0, -0.8, Math.sin(th))); r = smax(base, sk - T.inset + (B + T.inset) * w, T.k); } }
        row.push(r); }
      Rm.push(row); }
    // smoothing (stock skin is faceted): circumferential + axial, keeping the tip and the radome cap untouched
    for (let it = 0; it < 3; it++) { const Q = Rm.map(r => r.slice());
      for (let i = 1; i < A.length - 1; i++) for (let j = 0; j < NT; j++) { const q = Q[i]; const s = (4 * q[j] + q[(j + 1) % NT] + q[(j + NT - 1) % NT] + Q[i - 1][j] + Q[i + 1][j]) / 8; Rm[i][j] = A[i] > -0.1 ? s : q[j]; } }
    const pos = [P(T.aTip - 0.0005, T.yc, T.zc).toArray()].flat(), idx = [];
    for (let i = 0; i < A.length; i++) for (let j = 0; j < NT; j++) { const th = j / NT * Math.PI * 2; const p = P(A[i], T.yc + Rm[i][j] * Math.sin(th), T.zc + Rm[i][j] * Math.cos(th)); pos.push(p.x, p.y, p.z); }
    const V = (i, j) => 1 + i * NT + (j % NT);
    for (let j = 0; j < NT; j++) idx.push(0, V(0, j + 1), V(0, j));
    for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < NT; j++) idx.push(V(i, j), V(i, j + 1), V(i + 1, j + 1), V(i, j), V(i + 1, j + 1), V(i + 1, j));
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const n = new THREE.Vector3().fromBufferAttribute(geo.attributes.normal, V(20, 0)), p = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, V(20, 0));
    if (n.dot(p.sub(P(A[20], T.yc, T.zc))) < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; geo.setIndex(idx); geo.computeVertexNormals(); }
    return geo;
  }
  // radius of the shell at station a, angle th (interpolated)
  function shellR(a, th) { let i = A.findIndex(x => x >= a); if (i <= 0) i = 1; const t = (a - A[i - 1]) / (A[i] - A[i - 1]);
    const j = ((th / (Math.PI * 2)) * NT % NT + NT) % NT, j0 = Math.floor(j), j1 = (j0 + 1) % NT, f = j - j0;
    const r = (ii) => Rm[ii][j0] * (1 - f) + Rm[ii][j1] * f; return r(i - 1) * (1 - t) + r(i) * t; }
  function fittings(fus, shell) {
    const rc = new THREE.Raycaster(); const objs = [fus, shell];
    const hitY = (a, z, fromTop) => { const o = P(a, fromTop ? 4 : -1, z); rc.set(o, new THREE.Vector3(0, fromTop ? -1 : 1, 0)); rc.far = 5; const h = rc.intersectObjects(objs, false)[0]; return h ? h.point.y : null; };
    // joint ring, slightly lighter than the matte shell so the seam reads
    { const r = shellR(T.ringA, 0); const ring = mk(new THREE.TorusGeometry(r + 0.002, 0.007, 8, 96), M.radar, P(T.ringA, T.yc, T.zc)); ring.rotation.y = Math.PI / 2; rad.add(ring); }
    // warning-placard plate on the radome's left side (geometry only: a raised diamond plate, no text)
    { const a = -0.30, r = shellR(a, Math.PI); const pl = mk(new THREE.BoxGeometry(0.13, 0.13, 0.006), M.grille, P(a, T.yc, T.zc - r - 0.001)); pl.rotation.z = Math.PI / 4; rad.add(pl);
      const pr = mk(new THREE.BoxGeometry(0.13, 0.13, 0.006), M.grille, P(a, T.yc, T.zc + radR(a) + 0.001)); pr.rotation.z = Math.PI / 4; pr.visible = false; rad.add(pr); }
    // EO/IR gimbal: ball + drum + neck up into the shell underside, just aft of the radome root
    { const F = T.flir, fr = F.d / 2, yb = hitY(F.a, F.z, false) ?? 0.75;
      fl.add(mk(new THREE.SphereGeometry(fr, 40, 28), M.mission));
      fl.add(mk(new THREE.CylinderGeometry(fr * 0.86, fr * 0.9, fr * 0.5, 32), M.mission, new THREE.Vector3(0, fr * 0.78, 0)));
      fl.add(mk(new THREE.CylinderGeometry(fr * 0.55, fr * 0.6, 0.12, 24), M.darkMetal, new THREE.Vector3(0, fr * 0.78 + 0.1, 0)));
      const win = mk(new THREE.CircleGeometry(fr * 0.42, 32), M.lens, new THREE.Vector3(fr * 0.99, -fr * 0.05, 0)); win.rotation.y = Math.PI / 2; fl.add(win);
      const w2 = mk(new THREE.CircleGeometry(fr * 0.17, 20), M.lens, new THREE.Vector3(fr * 0.93, fr * 0.3, fr * 0.18)); w2.lookAt(new THREE.Vector3(fr * 3, fr * 0.9, fr * 0.5)); fl.add(w2);
      fl.position.copy(P(F.a, yb - 0.02 - fr * 1.05 - 0.02, F.z)); }
    // three short stubs on the upper nose just below the windscreen (n026)
    for (const z of [-0.16, 0, 0.16]) { const a = 0.80, y = hitY(a, z, true); if (y == null) continue;
      ant.add(mk(new THREE.CylinderGeometry(0.012, 0.016, 0.075, 10), M.darkMetal, P(a, y + 0.03, z))); }
    // white blade antenna and a small dome under the nose (n026, n037)
    { const a = 0.95, z = 0.12, y = hitY(a, z, false); if (y != null) { const b = mk(new THREE.BoxGeometry(0.16, 0.10, 0.012), M.lightGray, P(a, y - 0.045, z)); b.rotation.z = 0.25; ant.add(b); } }
    { const a = 1.55, z = 0.0, y = hitY(a, z, false); if (y != null) { const dm = mk(new THREE.SphereGeometry(0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.lightGray, P(a, y + 0.01, z)); dm.rotation.x = Math.PI; dm.scale.set(1, 0.5, 1); ant.add(dm); } }
  }
  return g;
}
