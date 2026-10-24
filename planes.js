// Paint-break planes, plane regions and individually painted panels.
// Scheme data:  s.planes  = [{ name, kind: 'vertical'|'horizontal'|'free', a, y, z, yaw, pitch }]   (a = m aft of nose tip, angles in degrees)
//               s.regions = [{ name, color, req: [-1|0|1 per plane] }]   +1 = front/above/+ side, -1 = behind/below/- side
//               s.panels  = { 'panelId:R' | 'panelId:L': '#rrggbb' }
// Layer order in the shader: base zones -> plane regions (later wins) -> painted panels -> anti-glare (always matte).
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { MAXP, MAXR, BREAKS } from './paint.js';
const NX = BREAKS.NX;
export function planeNormal(pl) {
  const n = pl.kind === 'horizontal' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  return n.applyEuler(new THREE.Euler(0, (pl.yaw || 0) * Math.PI / 180, (pl.pitch || 0) * Math.PI / 180, 'YZX')).normalize();
}
export function planePoint(pl) { return new THREE.Vector3(NX - pl.a, pl.y, pl.z || 0); }
const SIDE = { vertical: ['front', 'behind'], horizontal: ['above', 'below'], free: ['+ side', '− side'] };
export function setupPaintTools({ U, scene, camera, renderer, controls, mesh, getS, onChange, requestDraw, fusMatIndex }) {
  // ---- panel ID map + colour table
  const panC = new THREE.DataTexture(new Float32Array(256 * 2 * 4), 256, 2, THREE.RGBAFormat, THREE.FloatType);
  panC.magFilter = panC.minFilter = THREE.NearestFilter; panC.needsUpdate = true; U.uPanC.value = panC;
  let idPix = null;
  new THREE.TextureLoader().load('./model/panels.png', t => {
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; U.uPanId.value = t; U.uPanOn.value = 1;
    const c = document.createElement('canvas'); c.width = t.image.width; c.height = t.image.height; const g = c.getContext('2d'); g.drawImage(t.image, 0, 0);
    idPix = { d: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height }; requestDraw();
  });
  const sel = new Set();
  function panelAt(uv) { if (!idPix) return -1; const x = Math.min(idPix.w - 1, Math.floor(uv.x * idPix.w)), y = Math.min(idPix.h - 1, Math.floor((1 - uv.y) * idPix.h)); return idPix.d[(y * idPix.w + x) * 4]; }
  function syncPanels() {
    const s = getS(), d = panC.image.data; d.fill(0);
    for (const [k, hex] of Object.entries(s.panels || {})) { const [id, sd] = k.split(':'); const i = (+id + (sd === 'R' ? 256 : 0)) * 4; const c = new THREE.Color(hex); d[i] = c.r; d[i + 1] = c.g; d[i + 2] = c.b; d[i + 3] = 1; }
    for (const k of sel) { const [id, sd] = k.split(':'); const i = (+id + (sd === 'R' ? 256 : 0)) * 4; d[i + 3] += 2; }
    panC.needsUpdate = true;
  }
  // ---- planes
  const visGroup = new THREE.Group(); visGroup.name = 'planeVis'; scene.add(visGroup);
  const tc = new TransformControls(camera, renderer.domElement); tc.setSize(0.8);
  const helper = tc.getHelper(); scene.add(helper);
  tc.addEventListener('dragging-changed', e => { controls.enabled = !e.value; });
  tc.addEventListener('change', requestDraw);
  let active = -1, showPlanes = true;
  tc.addEventListener('objectChange', () => {
    const s = getS(), pl = s.planes[active], o = tc.object; if (!pl || !o) return;
    pl.a = +(NX - o.position.x).toFixed(3); pl.y = +o.position.y.toFixed(3); pl.z = +o.position.z.toFixed(3);
    // recover yaw/pitch from the gizmo orientation
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(o.quaternion), D = 180 / Math.PI;
    if (pl.kind === 'horizontal') { if (n.y < 0) n.negate(); pl.pitch = +(Math.atan2(Math.hypot(n.x, n.z), n.y) * D).toFixed(1); pl.yaw = Math.hypot(n.x, n.z) > 1e-4 ? +(Math.atan2(n.z, -n.x) * D).toFixed(1) : (pl.yaw || 0); }
    else { if (n.x < 0) n.negate(); pl.pitch = +(Math.asin(Math.max(-1, Math.min(1, n.y))) * D).toFixed(1); pl.yaw = +(Math.atan2(-n.z, n.x) * D).toFixed(1); }
    syncPlanes(false); onChange();
  });
  function syncPlanes(rebuildVis = true) {
    const s = getS(); const P = s.planes || [], R = s.regions || [];
    U.uPN.value = Math.min(P.length, MAXP); U.uRN.value = Math.min(R.length, MAXR);
    P.slice(0, MAXP).forEach((pl, i) => { const n = planeNormal(pl); U.uPl.value[i].set(n.x, n.y, n.z, n.dot(planePoint(pl))); });
    R.slice(0, MAXR).forEach((r, i) => { U.uRC.value[i].set(r.color); const q = r.req || []; for (let k = 0; k < 2; k++) U.uRS.value[i * 2 + k].set(q[k * 4] || 0, q[k * 4 + 1] || 0, q[k * 4 + 2] || 0, q[k * 4 + 3] || 0); });
    // visible translucent planes
    while (visGroup.children.length > P.length) { const o = visGroup.children.pop(); o.geometry.dispose(); }
    P.forEach((pl, i) => {
      let o = visGroup.children[i];
      if (!o) { o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#29a3ff', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), new THREE.LineBasicMaterial({ color: '#0a6fd6' })); o.add(edge); visGroup.add(o); }
      const n = planeNormal(pl); o.position.copy(planePoint(pl));
      // keep plane rectangle roughly aligned with the airframe
      if (pl.kind === 'horizontal') { o.quaternion.setFromEuler(new THREE.Euler(0, (pl.yaw || 0) * Math.PI / 180, (pl.pitch || 0) * Math.PI / 180, 'YZX')); o.rotateX(-Math.PI / 2); o.scale.set(20, 5, 1); }
      else { o.quaternion.setFromEuler(new THREE.Euler(0, (pl.yaw || 0) * Math.PI / 180, (pl.pitch || 0) * Math.PI / 180, 'YZX')); o.rotateY(Math.PI / 2); o.scale.set(5, 6, 1); }
      o.material.color.set(i === active ? '#ffb000' : '#29a3ff'); o.visible = showPlanes; o.userData.planeIndex = i;
    });
    if (active >= 0 && visGroup.children[active] && showPlanes) { tc.attach(visGroup.children[active]); } else tc.detach();
    if (rebuildVis) renderUI();
    requestDraw();
  }
  // ---- UI
  const $ = id => document.getElementById(id);
  const num = (v, min, max, step, key, i, lab) => `<label class="sl">${lab}<input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-pl="${i}" data-k="${key}"><output>${(+v).toFixed(2)}</output></label>`;
  function renderUI() {
    const s = getS(); const P = s.planes || [], R = s.regions || [];
    $('planes').innerHTML = P.map((pl, i) => `<div class="plane${i === active ? ' act' : ''}"><div class="row"><b>${i + 1}. ${pl.name || pl.kind}</b>
      <button data-sel="${i}">${i === active ? 'Editing' : 'Edit / gizmo'}</button><button data-delp="${i}">✕</button></div>
      ${num(pl.a, -1, 19, 0.01, 'a', i, 'Position aft of nose (m)')}${num(pl.y, -0.5, 4.5, 0.01, 'y', i, 'Height (m)')}
      ${pl.kind === 'free' ? num(pl.z || 0, -2, 2, 0.01, 'z', i, 'Sideways (m)') : ''}
      ${num(pl.pitch || 0, -60, 60, 0.5, 'pitch', i, pl.kind === 'horizontal' ? 'Angle fore-aft (°)' : 'Lean (°)')}
      ${pl.kind !== 'horizontal' ? num(pl.yaw || 0, -60, 60, 0.5, 'yaw', i, 'Sweep (°)') : num(pl.yaw || 0, -60, 60, 0.5, 'yaw', i, 'Tilt direction (°)')}</div>`).join('') || '<em>No planes yet.</em>';
    $('regions').innerHTML = R.map((r, i) => `<div class="region"><div class="row"><input type="color" value="${r.color}" data-rc="${i}"><input value="${r.name || ''}" data-rn="${i}" style="width:8em"><button data-delr="${i}">✕</button></div>
      <div class="row">${P.map((pl, k) => `<label>P${k + 1}<select data-rq="${i}" data-p="${k}"><option value="0">any</option><option value="1">${SIDE[pl.kind][0]}</option><option value="-1">${SIDE[pl.kind][1]}</option></select></label>`).join('')}</div></div>`).join('') || '<em>No regions yet.</em>';
    R.forEach((r, i) => P.forEach((_, k) => { const e = document.querySelector(`[data-rq="${i}"][data-p="${k}"]`); if (e) e.value = String((r.req || [])[k] || 0); }));
    document.querySelectorAll('[data-pl]').forEach(e => e.oninput = () => { const pl = getS().planes[+e.dataset.pl]; pl[e.dataset.k] = +e.value; e.nextElementSibling.value = (+e.value).toFixed(2); syncPlanes(false); onChange(); });
    document.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => { active = active === +b.dataset.sel ? -1 : +b.dataset.sel; syncPlanes(); });
    document.querySelectorAll('[data-delp]').forEach(b => b.onclick = () => { const s = getS(), i = +b.dataset.delp; s.planes.splice(i, 1); (s.regions || []).forEach(r => r.req && r.req.splice(i, 1)); active = -1; syncPlanes(); onChange(); });
    document.querySelectorAll('[data-rc]').forEach(e => e.oninput = () => { getS().regions[+e.dataset.rc].color = e.value; syncPlanes(false); onChange(); });
    document.querySelectorAll('[data-rn]').forEach(e => e.onchange = () => { getS().regions[+e.dataset.rn].name = e.value; onChange(); });
    document.querySelectorAll('[data-rq]').forEach(e => e.onchange = () => { const r = getS().regions[+e.dataset.rq]; r.req = r.req || []; r.req[+e.dataset.p] = +e.value; syncPlanes(false); onChange(); });
    document.querySelectorAll('[data-delr]').forEach(b => b.onclick = () => { getS().regions.splice(+b.dataset.delr, 1); syncPlanes(); onChange(); });
    $('selInfo').textContent = sel.size ? `${sel.size} panel(s) selected` : 'Click a panel (Shift = add)';
  }
  $('addV').onclick = () => addPlane({ name: 'Vertical break', kind: 'vertical', a: 4.5, y: 1.6, z: 0, yaw: 0, pitch: 0 });
  $('addH').onclick = () => addPlane({ name: 'Horizontal break', kind: 'horizontal', a: 6, y: 1.6, z: 0, yaw: 0, pitch: 0 });
  $('addF').onclick = () => addPlane({ name: 'Free plane', kind: 'free', a: 6, y: 1.6, z: 0, yaw: 30, pitch: 20 });
  $('addR').onclick = () => { const s = getS(); (s.regions = s.regions || []).push({ name: 'Region ' + (s.regions.length + 1), color: '#c8102e', req: (s.planes || []).map(() => 0) }); syncPlanes(); onChange(); };
  $('showPlanes').onchange = e => { showPlanes = e.target.checked; syncPlanes(); };
  $('gizmoMode').onchange = e => tc.setMode(e.target.value);
  function addPlane(pl) { const s = getS(); if ((s.planes = s.planes || []).length >= MAXP) return alert('Max ' + MAXP + ' planes'); s.planes.push(pl); (s.regions || []).forEach(r => { r.req = r.req || []; r.req.length = s.planes.length; for (let k = 0; k < r.req.length; k++) r.req[k] = r.req[k] || 0; }); active = s.planes.length - 1; syncPlanes(); onChange(); }
  // panel painting
  $('panelColor').oninput = () => {};
  $('paintSel').onclick = () => { const s = getS(); s.panels = s.panels || {}; for (const k of sel) s.panels[k] = $('panelColor').value; syncPanels(); onChange(); };
  $('clearSel').onclick = () => { const s = getS(); for (const k of sel) delete (s.panels || {})[k]; syncPanels(); onChange(); };
  $('deselect').onclick = () => { sel.clear(); syncPanels(); renderUI(); requestDraw(); };
  $('mirrorSel').onclick = () => { for (const k of [...sel]) { const [id, sd] = k.split(':'); sel.add(id + ':' + (sd === 'R' ? 'L' : 'R')); } syncPanels(); renderUI(); requestDraw(); };
  // click picking (ignores drags and gizmo use)
  const ray = new THREE.Raycaster(); let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4 || tc.dragging || !$('panelMode').checked) return;
    const r = renderer.domElement.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
    const hit = ray.intersectObject(mesh, false).find(h => mesh.geometry.groups.some(g => g.materialIndex === fusMatIndex && h.faceIndex * 3 >= g.start && h.faceIndex * 3 < g.start + g.count));
    if (!e.shiftKey) sel.clear();
    if (hit && hit.uv) { const id = panelAt(hit.uv); if (id >= 0) { const k = id + ':' + (hit.point.z > 0 ? 'R' : 'L'); if (e.shiftKey && sel.has(k)) sel.delete(k); else sel.add(k); } }
    syncPanels(); renderUI(); requestDraw();
  });
  function sync(ui = true) { syncPanels(); syncPlanes(ui); }
  return { sync, sel, panelAt, setActive: i => { active = i; syncPlanes(); }, setShowPlanes: v => { showPlanes = v; syncPlanes(); }, tc };
}
