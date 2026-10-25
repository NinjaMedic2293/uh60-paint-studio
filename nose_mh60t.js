// MH-60T Jayhawk nose kit v6. The STOCK UH-60 nose shape and chin windows are untouched: there are no cheek fairings and no shell.
// Frame as kits.js: a = metres aft of the stock nose tip, y up from the ground, z +right / -left.
// Radar (RDR-1300 class, cf. AN/APQ-187 installs): a compact, short straight cylindrical can with a hemispherical front dome.
// It is mounted under and ahead of the nose, low and slightly to the aircraft's left (user photos of 6003 and #21 front, 6003 side, #60 3/4; n030).
// Size is taken from the front photos: diameter ~0.27 x nose width. Can length and dome proportions come from the 6003 side photo.
// The warning diamond sits on the dome's left side. Matte black via the kit 'nose' material, which app.js drives to the anti-glare finish.
// EO/IR gimbal is under the chin aft of the radar. Searchlight, probe, hoist and paint are NOT touched here.
import * as THREE from 'three';
export const NOSE_T = { zc: 0, dFrac: 0.31, faceOff: 0.0, embed: 0.10, kB: 1.80, ycR: 1.15, chinL: 0.50, cylL: 0.80, shelfF: 0.85, turOff: 0.55, flir: { a: 0.42, z: -0.02, d: 0.24 } };
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
    const yc = bot + T.ycR * R; // v8: 6003 front photo is the height authority (radar at the bottom of the black nose)
    const dR = R * 1.07, dL = 1.12; // dome slightly larger than the can and a touch elongated (rounder ball)
    // nose skin along the radar axis (from ahead, toward +a)
    const pf = cast(P(-3, yc, T.zc), P(1, yc, T.zc).sub(P(0, yc, T.zc)).normalize());
    const a0 = pf ? P(0,0,0).x - pf.x : 0.05;
    // v9 housing (6003 side photo): one piece, tombstone section. Rounded top (radius R about the axis), side walls tangent at the widest
    // point that drop straight down, and a flat bottom at yB = yc - kB*R. That flat bottom IS the plate: it runs aft under the chin flush and
    // coplanar, with the same vertical side walls. A hemispherical cap on the front carries the upper half; the lower box ends in a flat face there.
    // Measured on the 6003 side photo (housing front face = seam behind the ball; D = ball diameter):
    //  - the ball is a cylinder 0.6D long plus a hemispherical cap, so it is about 1.1D long ahead of the face;
    //  - the housing behind the face has a rounded top and vertical side walls down to a flat bottom 1.62R below the ball axis;
    //  - the flat bottom continues forward under the ball as the lower part of the housing (top = ball bottom), ending 0.65D ahead of the face;
    //  - aft, the same walls and flat bottom run under the chin; the turret hangs right under the flat bottom, 0.28D aft of the face.
    const aFace = a0 - T.faceOff, aCap = aFace - T.cylL * D, aTipD = aCap - R, aBack = a0 + T.embed, yB = yc - T.kB * R, aChin = a0 + T.chinL, aShelf = aFace - T.shelfF * D;
    console.log('[mh60t v9] width', width.toFixed(3), 'bot', bot.toFixed(3), 'top', top.toFixed(3), 'D', D.toFixed(3), 'yc', yc.toFixed(3), 'yB', yB.toFixed(3), 'a0', a0.toFixed(3), 'ballFront', aTipD.toFixed(3));
    const tomb = (y0, len, xAft) => { const sh = new THREE.Shape(); sh.moveTo(-R, y0); sh.lineTo(R, y0); sh.lineTo(R, yc); sh.absarc(0, yc, R, 0, Math.PI, false); sh.lineTo(-R, y0);
      const g2 = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 40 }); const m = mk(g2, M.nose); m.rotation.y = Math.PI / 2; m.position.set(xAft, 0, T.zc); return m; };
    const Rh = R * 1.04; // housing slightly proud of the ball so the face seam reads
    { const sh = new THREE.Shape(); sh.moveTo(-Rh, yB); sh.lineTo(Rh, yB); sh.lineTo(Rh, yc); sh.absarc(0, yc, Rh, 0, Math.PI, false); sh.lineTo(-Rh, yB);
      const g2 = new THREE.ExtrudeGeometry(sh, { depth: aBack - aFace, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 40 }); const m = mk(g2, M.nose); m.rotation.y = Math.PI / 2; m.position.set(P(aBack, 0, 0).x, 0, T.zc); rad.add(m); }
    // ball: cylinder + hemispherical cap
    { const c = mk(new THREE.CylinderGeometry(R, R, aCap - aFace < 0 ? aFace - aCap : 0.01, 48), M.nose, P((aFace + aCap) / 2, yc, T.zc)); c.rotation.z = Math.PI / 2; rad.add(c); }
    const cap = mk(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.nose, P(aCap, yc, T.zc)); cap.rotation.z = -Math.PI / 2; rad.add(cap);
    // forward lower housing under the ball: same width, flat bottom flush at yB, top = ball bottom
    { const h = (yc - R) - yB; rad.add(mk(new THREE.BoxGeometry(aFace - aShelf, h, 2 * Rh), M.nose, P((aFace + aShelf) / 2, yB + h / 2, T.zc))); }
    // chin section aft: same walls, same flat bottom, up into the chin skin
    { const ys = Math.max(hitY(aBack, 0, false) ?? yc, hitY(aChin, 0, false) ?? yc) + 0.06, h = ys - yB;
      rad.add(mk(new THREE.BoxGeometry(aChin - aBack + 0.02, h, 2 * Rh), M.nose, P((aBack + aChin) / 2, yB + h / 2, T.zc))); }
    for (let a = aShelf + 0.04; a < aChin - 0.02; a += 0.09) for (const sz of [-1, 1]) rad.add(mk(new THREE.CylinderGeometry(0.007, 0.007, 0.005, 8), M.darkMetal, P(a, yB - 0.002, T.zc + sz * (Rh - 0.03))));
    // warning diamond on the ball's left side near its rear (6003 side photo), geometry only
    for (const sz of [-1, 1]) { const pl = mk(new THREE.BoxGeometry(D * 0.30, D * 0.30, 0.006), M.grille, P(aFace - 0.17 * D, yc + 0.02, T.zc + sz * (R + 0.003))); pl.rotation.z = Math.PI / 4; rad.add(pl); } // both sides: left in n030, right in 6003
    window.__mh60t = { R, Rh, yc, yB, a0, aFace, aTipD, aCap, aShelf, aChin };
    // EO/IR gimbal under the chin, aft of the radar
    { const F = T.flir, fr = F.d / 2, yb = yB; const Fa = aFace + T.turOff * D, Fz = 0; // v8: turret hangs from the plate underside
      fl.add(mk(new THREE.SphereGeometry(fr, 40, 28), M.mission));
      fl.add(mk(new THREE.CylinderGeometry(fr * 0.86, fr * 0.9, fr * 0.5, 32), M.mission, new THREE.Vector3(0, fr * 0.78, 0)));
      fl.add(mk(new THREE.CylinderGeometry(fr * 0.55, fr * 0.6, 0.12, 24), M.darkMetal, new THREE.Vector3(0, fr * 0.78 + 0.1, 0)));
      const win = mk(new THREE.CircleGeometry(fr * 0.42, 32), M.lens, new THREE.Vector3(fr * 0.99, -fr * 0.05, 0)); win.rotation.y = Math.PI / 2; fl.add(win);
      const tyc = yb - fr - 0.012; fl.position.copy(P(Fa, tyc, Fz)); window.__mh60t.tur = [Fa, tyc];
      fl.add(mk(new THREE.CylinderGeometry(fr * 0.6, fr * 0.6, 0.02, 20), M.darkMetal, new THREE.Vector3(0, fr + 0.02, 0))); }
    for (const z of [-0.16, 0, 0.16]) { const a = 0.80, y = hitY(a, z, true); if (y == null) continue;
      ant.add(mk(new THREE.CylinderGeometry(0.012, 0.016, 0.075, 10), M.darkMetal, P(a, y + 0.03, z))); }
    { const a = 0.95, z = 0.12, y = hitY(a, z, false); if (y != null) { const b = mk(new THREE.BoxGeometry(0.16, 0.10, 0.012), M.lightGray, P(a, y - 0.045, z)); b.rotation.z = 0.25; ant.add(b); } }
    { const a = 1.55, y = hitY(a, 0, false); if (y != null) { const dm = mk(new THREE.SphereGeometry(0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.lightGray, P(a, y + 0.01, 0)); dm.rotation.x = Math.PI; dm.scale.set(1, 0.5, 1); ant.add(dm); } }
  }
  return g;
}
