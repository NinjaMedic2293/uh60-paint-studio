// MH-60T Jayhawk nose kit v6. The STOCK UH-60 nose shape and chin windows are untouched: there are no cheek fairings and no shell.
// Frame as kits.js: a = metres aft of the stock nose tip, y up from the ground, z +right / -left.
// Radar (RDR-1300 class, cf. AN/APQ-187 installs): a compact, short straight cylindrical can with a hemispherical front dome.
// It is mounted under and ahead of the nose, low and slightly to the aircraft's left (user photos of 6003 and #21 front, 6003 side, #60 3/4; n030).
// Size is taken from the front photos: diameter ~0.27 x nose width. Can length and dome proportions come from the 6003 side photo.
// The warning diamond sits on the dome's left side. Matte black via the kit 'nose' material, which app.js drives to the anti-glare finish.
// EO/IR gimbal is under the chin aft of the radar. Searchlight, probe, hoist and paint are NOT touched here.
import * as THREE from 'three';
export const NOSE_T = { zc: 0, dFrac: 0.31, proud: 0.40, embed: 0.10, flir: { a: 0.42, z: -0.02, d: 0.24 } };
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
    build(fus); setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
  };
  function build(fus) {
    const rc = new THREE.Raycaster(); rc.far = 8;
    const cast = (o, d) => { rc.set(o, d); const h = rc.intersectObject(fus, false)[0]; return h ? h.point : null; };
    const hitY = (a, z, fromTop) => { const p = cast(P(a, fromTop ? 4 : -1, z), new THREE.Vector3(0, fromTop ? -1 : 1, 0)); return p ? p.y : null; };
    // measure the stock nose at a = 0.30: width (z extent) and bottom/top
    const aM = 0.30, bot = hitY(aM, 0, false) ?? 0.8, top = hitY(aM, 0, true) ?? 1.5;
    const yMid = (bot + top) / 2, zl = cast(P(aM, yMid, -3), new THREE.Vector3(0, 0, 1)), zr = cast(P(aM, yMid, 3), new THREE.Vector3(0, 0, -1));
    const width = (zl && zr) ? zr.z - zl.z : 1.2, D = T.dFrac * width, R = D / 2;
    // nose tip: the most-forward skin point on the centreline (6003 side photo: the radar axis continues the nose tip line)
    let tipY = 1.0, tipA = 9;
    for (let y = bot + 0.02; y < top; y += 0.01) { const p = cast(P(-3, y, 0), new THREE.Vector3(1, 0, 0)); if (p) { const a = P(0,0,0).x - p.x; if (a < tipA) { tipA = a; tipY = y; } } }
    const yc = bot + 0.85 * R; // v8: 6003 front photo is the height authority (radar at the bottom of the black nose)
    const dR = R * 1.07, dL = 1.12; // dome slightly larger than the can and a touch elongated (rounder ball)
    // nose skin along the radar axis (from ahead, toward +a)
    const pf = cast(P(-3, yc, T.zc), P(1, yc, T.zc).sub(P(0, yc, T.zc)).normalize());
    const a0 = pf ? P(0,0,0).x - pf.x : 0.05;
    const aFront = a0 - T.proud, aBack = a0 + T.embed, L = aBack - aFront;
    console.log('[mh60t v6] nose width', width.toFixed(3), 'bot', bot.toFixed(3), 'top', top.toFixed(3), 'D', D.toFixed(3), 'yc', yc.toFixed(3), 'tipY', tipY.toFixed(3), 'a0', a0.toFixed(3));
    const can = mk(new THREE.CylinderGeometry(R, R, L, 48, 1, false), M.nose, P((aFront + aBack) / 2, yc, T.zc)); can.rotation.z = Math.PI / 2; rad.add(can);
    const dome = mk(new THREE.SphereGeometry(dR, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.nose, P(aFront, yc, T.zc)); dome.rotation.z = -Math.PI / 2; dome.scale.set(1, dL, 1); rad.add(dome);
    // v8 mounting shelf (6003 side photo): flat dark horizontal plate under the chin. The radar sits on its forward end and the turret hangs below.
    const PL = { t: 0.08, w: D * 1.15, aF: aFront - 0.20 * dR * dL, aB: a0 + 0.50, rc: 0.07 };
    const yTop = yc - R - 0.004, yBot = yTop - PL.t;
    { const xF = P(PL.aF, 0, 0).x, xB = P(PL.aB, 0, 0).x, hw = PL.w / 2, r = PL.rc, sh = new THREE.Shape();
      sh.moveTo(xB, -hw); sh.lineTo(xF - r, -hw); sh.quadraticCurveTo(xF, -hw, xF, -hw + r); sh.lineTo(xF, hw - r); sh.quadraticCurveTo(xF, hw, xF - r, hw); sh.lineTo(xB, hw); sh.lineTo(xB, -hw);
      const g2 = new THREE.ExtrudeGeometry(sh, { depth: PL.t, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 10 });
      const plate = mk(g2, M.nose); plate.rotation.x = Math.PI / 2; plate.position.set(0, yTop, T.zc); rad.add(plate);
      // fasteners along both side edges of the underside
      for (let a = PL.aF + 0.06; a < PL.aB - 0.02; a += 0.09) for (const sz of [-1, 1]) {
        const bt = mk(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 8), M.darkMetal, P(a, yBot - 0.006, T.zc + sz * (hw - 0.03))); rad.add(bt); }
      // attachment fairing: tapered web between the plate top and the chin skin, aft of the can
      const aW0 = a0 + 0.02, aW1 = PL.aB, ys = hitY((aW0 + aW1) / 2, 0, false) ?? yTop; const hgt = Math.max(0.02, ys - yTop + 0.04);
      const web = mk(new THREE.BoxGeometry(aW1 - aW0, hgt, PL.w * 0.86), M.nose, P((aW0 + aW1) / 2, yTop + hgt / 2, T.zc)); rad.add(web);
      // front edge lip strip (lighter seam line seen along the plate's nose)
      const lipS = mk(new THREE.BoxGeometry(0.012, 0.012, PL.w - 2 * r), M.radar, P(PL.aF + 0.004, yTop - PL.t / 2, T.zc)); rad.add(lipS); }
    // joint ring at the dome/can seam
    { const ring = mk(new THREE.TorusGeometry(dR + 0.001, 0.005, 8, 64), M.radar, P(aFront, yc, T.zc)); ring.rotation.y = Math.PI / 2; rad.add(ring); }
    // warning diamond plate on the dome's left side (geometry only, no text)
    { const ang = 0.55, pl = mk(new THREE.BoxGeometry(D * 0.30, D * 0.30, 0.006), M.grille, P(aFront - (dR * dL + 0.012) * Math.sin(ang), yc, T.zc - (dR + 0.012) * Math.cos(ang)));
      pl.rotation.order = 'YXZ'; pl.rotation.y = -ang; pl.rotation.z = Math.PI / 4; rad.add(pl); }
    // EO/IR gimbal under the chin, aft of the radar
    { const F = T.flir, fr = F.d / 2, yb = yBot - 0.004; const Fa = a0 + 0.22, Fz = 0; // v8: turret hangs from the plate underside
      fl.add(mk(new THREE.SphereGeometry(fr, 40, 28), M.mission));
      fl.add(mk(new THREE.CylinderGeometry(fr * 0.86, fr * 0.9, fr * 0.5, 32), M.mission, new THREE.Vector3(0, fr * 0.78, 0)));
      fl.add(mk(new THREE.CylinderGeometry(fr * 0.55, fr * 0.6, 0.12, 24), M.darkMetal, new THREE.Vector3(0, fr * 0.78 + 0.1, 0)));
      const win = mk(new THREE.CircleGeometry(fr * 0.42, 32), M.lens, new THREE.Vector3(fr * 0.99, -fr * 0.05, 0)); win.rotation.y = Math.PI / 2; fl.add(win);
      fl.position.copy(P(Fa, yb - fr * 0.78 - 0.15, Fz)); }
    for (const z of [-0.16, 0, 0.16]) { const a = 0.80, y = hitY(a, z, true); if (y == null) continue;
      ant.add(mk(new THREE.CylinderGeometry(0.012, 0.016, 0.075, 10), M.darkMetal, P(a, y + 0.03, z))); }
    { const a = 0.95, z = 0.12, y = hitY(a, z, false); if (y != null) { const b = mk(new THREE.BoxGeometry(0.16, 0.10, 0.012), M.lightGray, P(a, y - 0.045, z)); b.rotation.z = 0.25; ant.add(b); } }
    { const a = 1.55, y = hitY(a, 0, false); if (y != null) { const dm = mk(new THREE.SphereGeometry(0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.lightGray, P(a, y + 0.01, 0)); dm.rotation.x = Math.PI; dm.scale.set(1, 0.5, 1); ant.add(dm); } }
  }
  return g;
}
