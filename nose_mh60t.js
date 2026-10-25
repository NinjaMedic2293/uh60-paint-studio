// MH-60T Jayhawk nose kit v6. The STOCK UH-60 nose shape and chin windows are untouched: there are no cheek fairings and no shell.
// Frame as kits.js: a = metres aft of the stock nose tip, y up from the ground, z +right / -left.
// Radar (RDR-1300 class, cf. AN/APQ-187 installs): a compact, short straight cylindrical can with a hemispherical front dome.
// It is mounted under and ahead of the nose, low and slightly to the aircraft's left (user photos of 6003 and #21 front, 6003 side, #60 3/4; n030).
// Size is taken from the front photos: diameter ~0.27 x nose width. Can length and dome proportions come from the 6003 side photo.
// The warning diamond sits on the dome's left side. Matte black via the kit 'nose' material, which app.js drives to the anti-glare finish.
// EO/IR gimbal is under the chin aft of the radar. Searchlight, probe, hoist and paint are NOT touched here.
import * as THREE from 'three';
export const NOSE_T = { zc: 0, dFrac: 0.36, faceOff: 0.0, embed: 0.10, kB: 2.05, ycR: 0.5, chinL: 0.85, cylL: 1.12, capK: 0.62, shelfF: 0.70, turOff: 0.55, turA: 0.25, turDrop: 0.10, boxW: 1.10, boxTop: 0.68, stripes: [{ a0: 0.21, a1: 0.62, th: 42, w: 0.03 }, { a0: 0.26, a1: 0.63, th: -33.5, w: 0.022 }], dia: { da: 0.381, th: 6.3, sa: 0.13, sv: 0.17 }, ports: { a: 0.72, z: [0.08, 0.23, 0.40] }, neck: 0.03, flir: { a: 0.42, z: -0.02, d: 0.26 }, rampL: 0.45 };
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
    const aFace = a0 - T.faceOff, aCap = aFace - T.cylL * D, aTipD = aCap - T.capK * R, aBack = a0 + T.embed, yB = yc - R, aChin = a0 + T.chinL, aShelf = aFace - T.shelfF * D;
    console.log('[mh60t v14] width', width.toFixed(3), 'bot', bot.toFixed(3), 'top', top.toFixed(3), 'D', D.toFixed(3), 'yc', yc.toFixed(3), 'yB', yB.toFixed(3), 'a0', a0.toFixed(3), 'ballFront', aTipD.toFixed(3));
    const tomb = (y0, len, xAft) => { const sh = new THREE.Shape(); sh.moveTo(-R, y0); sh.lineTo(R, y0); sh.lineTo(R, yc); sh.absarc(0, yc, R, 0, Math.PI, false); sh.lineTo(-R, y0);
      const g2 = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 40 }); const m = mk(g2, M.nose); m.rotation.y = Math.PI / 2; m.position.set(xAft, 0, T.zc); return m; };
    const Rh = R * 1.04; // housing slightly proud of the ball so the face seam reads
    { const sh = new THREE.Shape(); sh.moveTo(-Rh, yB); sh.lineTo(Rh, yB); sh.lineTo(Rh, yc); sh.absarc(0, yc, Rh, 0, Math.PI, false); sh.lineTo(-Rh, yB);
      const g2 = new THREE.ExtrudeGeometry(sh, { depth: aBack - aFace, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 40 }); const m = mk(g2, M.nose); m.rotation.y = Math.PI / 2; m.position.set(P(aBack, 0, 0).x, 0, T.zc); rad.add(m); }
    // ball: cylinder + hemispherical cap
    { const c = mk(new THREE.CylinderGeometry(R, R, aCap - aFace < 0 ? aFace - aCap : 0.01, 48), M.nose, P((aFace + aCap) / 2, yc, T.zc)); c.rotation.z = Math.PI / 2; rad.add(c); }
    const cap = mk(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.nose, P(aCap, yc, T.zc)); cap.rotation.z = -Math.PI / 2; cap.scale.y = T.capK; rad.add(cap); // v14: slightly flattened dome, longer barrel (photo stripes stay straight to ~0.6 m ahead of the face)
    // v11: ONE lower box. The barrel's vertical side walls (|z| = Rh) continue straight down to a single flat bottom at the barrel's bottom
    // tangent yB = yc - R (nothing hangs below it except the turret). It starts under the barrel (aShelf) and runs aft flat until it is
    // buried in the chin skin; no lip, no step, no ramp plate. Side profile: top at the axis (the can covers above), extended aft into the skin.
    { const X = a => P(a, 0, 0).x; let aEnd = aChin; for (let a = 0; a < 2.5; a += 0.02) { const yl = hitY(a, T.zc + Rh * 0.98, false), yr2 = hitY(a, T.zc - Rh * 0.98, false); if (yl != null && yr2 != null && Math.max(yl, yr2) < yB - 0.01) { aEnd = a + 0.05; break; } } const ys = Math.max(hitY(aEnd, 0, false) ?? yc, yc) + 0.06, sh = new THREE.Shape();
      sh.moveTo(X(aShelf), yB); sh.lineTo(X(aEnd), yB); sh.lineTo(X(aEnd), ys); sh.lineTo(X(aBack), ys); sh.lineTo(X(aBack), yc - T.boxTop * R); sh.lineTo(X(aShelf), yc - T.boxTop * R); sh.lineTo(X(aShelf), yB); // v13: box top below the diamond so the wider box walls don't hide the can's lower side
      const Rb = R * T.boxW, g2 = new THREE.ExtrudeGeometry(sh, { depth: 2 * Rb, bevelEnabled: false, curveSegments: 8 });
      const m = mk(g2, M.nose); m.position.z = T.zc - Rb; rad.add(m);
      // v12: crisp box edges (vertical front face and the flat-bottom corners read as in the photo)
      const el = new THREE.LineSegments(new THREE.EdgesGeometry(g2, 30), new THREE.LineBasicMaterial({ color: 0x4a4d50 })); el.userData.kit = 1; m.add(el); window.__mh60tEnd = aEnd; }
    for (let a = aShelf + 0.04; a < aFace + 0.10; a += 0.09) for (const sz of [-1, 1]) rad.add(mk(new THREE.CylinderGeometry(0.007, 0.007, 0.005, 8), M.darkMetal, P(a, yB - 0.002, T.zc + sz * (Rh - 0.03))));
    // v12 warning diamond decal (6003 photo): white-bordered diamond, red-orange upper half, on both sides of the can,
    // conforming to the barrel (curved patch), centre T.dia.da ahead of the can face, T.dia.th deg above the side line
    { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'), dm = (r) => { c.beginPath(); c.moveTo(64, 64 - r); c.lineTo(64 + r, 64); c.lineTo(64, 64 + r); c.lineTo(64 - r, 64); c.closePath(); };
      dm(63); c.fillStyle = '#f4f2ec'; c.fill(); dm(57); c.fillStyle = '#e9e6de'; c.fill();
      c.save(); dm(57); c.clip(); c.fillStyle = '#d8432c'; c.fillRect(0, 0, 128, 60); c.fillStyle = '#f4f2ec'; c.fillRect(0, 58, 128, 4); c.fillStyle = '#8a8a8a'; c.fillRect(44, 72, 40, 9); c.fillRect(54, 85, 20, 6); c.restore(); // v13: full-size face, thin white border
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.8, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 });
      const s2 = T.dia.sa * Math.SQRT2, rr = R + 0.0015, N = 8, ac = aFace - T.dia.da, th0 = T.dia.th * Math.PI / 180, dth = T.dia.sv * Math.SQRT2 / rr;
      for (const sz of [-1, 1]) { const pos = [], uv = [], idx = [];
        for (let i = 0; i <= N; i++) for (let k = 0; k <= N; k++) { const u = i / N, v = k / N, a = ac + (0.5 - u) * s2, t = th0 + (v - 0.5) * dth;
          const w = P(a, yc + rr * Math.sin(t), T.zc + sz * rr * Math.cos(t)); pos.push(w.x, w.y, w.z); uv.push(sz > 0 ? u : 1 - u, v); }
        for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) { const A = i * (N + 1) + k, B = A + N + 1; if (sz > 0) idx.push(A, B, A + 1, B, B + 1, A + 1); else idx.push(A, A + 1, B, B, A + 1, B + 1); }
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setIndex(idx); gg.computeVertexNormals();
        const d = mk(gg, mat); d.castShadow = false; rad.add(d); } }
    // v14 two thin white painted stripes on each side of the barrel (6003 photo): upper barrel and lower barrel, fore-aft, wrapped on the can
    { const sm = new THREE.MeshBasicMaterial({ color: 0xcfcbc1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }), rr = R + 0.0025;
      for (const st of T.stripes) for (const sz of [-1, 1]) { const pos = [], nrm = [], idx = [], N = 12, th = st.th * Math.PI / 180, dt = st.w / 2 / rr;
        for (let i = 0; i <= N; i++) { const a = aFace - (st.a0 + (st.a1 - st.a0) * i / N); for (const t of [th - dt, th + dt]) { const w = P(a, yc + rr * Math.sin(t), T.zc + sz * rr * Math.cos(t)); pos.push(w.x, w.y, w.z); nrm.push(0, Math.sin(t), sz * Math.cos(t)); } }
        for (let i = 0; i < N; i++) { const A = 2 * i; if (sz > 0) idx.push(A, A + 2, A + 1, A + 1, A + 2, A + 3); else idx.push(A, A + 1, A + 2, A + 1, A + 3, A + 2); }
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); gg.setIndex(idx);
        const m = mk(gg, sm); m.castShadow = m.receiveShadow = false; rad.add(m); } }
    // v12 white light ports: a transverse row under the nose at the aft end of the box (6003 photo)
    { const pm = new THREE.MeshStandardMaterial({ color: 0xece6d2, roughness: 0.35, emissive: 0x3a362a });
      for (const zz of T.ports.z) for (const sz of [-1, 1]) { const z = T.zc + sz * zz, y = Math.abs(zz) < R * T.boxW - 0.02 ? yB : (hitY(T.ports.a, z, false) ?? yB);
        const lt = mk(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16), pm, P(T.ports.a, y - 0.004, z)); rad.add(lt); /* v13: small separate round lights */ } }
    window.__mh60t = { aEnd: null, R, Rh, yc, yB, a0, aFace, aTipD, aCap, aShelf, aChin };
    // EO/IR gimbal under the chin, aft of the radar
    { const F = T.flir, fr = F.d / 2, yb = yB; const Fa = a0 + T.turA, Fz = 0, neck = T.turDrop - fr; // v11: under the aft half of the flat bottom, very short neck // v8: turret hangs from the plate underside
      fl.add(mk(new THREE.SphereGeometry(fr, 40, 28), M.mission));
      fl.add(mk(new THREE.CylinderGeometry(fr * 0.5, fr * 0.62, neck + fr * 0.4, 20), M.darkMetal, new THREE.Vector3(0, fr * 0.8 + neck / 2, 0))); // v12: yoke/mount up to the flat bottom
      const win = mk(new THREE.CircleGeometry(fr * 0.42, 32), M.lens, new THREE.Vector3(fr * 0.99, -fr * 0.05, 0)); win.rotation.y = Math.PI / 2; fl.add(win);
      const tyc = yb - T.turDrop; fl.position.copy(P(Fa, tyc, Fz)); window.__mh60t.tur = [Fa, tyc];
      }
    for (const z of [-0.16, 0, 0.16]) { const a = 0.80, y = hitY(a, z, true); if (y == null) continue;
      ant.add(mk(new THREE.CylinderGeometry(0.012, 0.016, 0.075, 10), M.darkMetal, P(a, y + 0.03, z))); }
    // v10: light-grey blade under the chin removed (not on 6003)
    { const a = 1.55, y = hitY(a, 0, false); if (y != null) { const dm = mk(new THREE.SphereGeometry(0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.lightGray, P(a, y + 0.01, 0)); dm.rotation.x = Math.PI; dm.scale.set(1, 0.5, 1); ant.add(dm); } }
  }
  return g;
}
