import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadHeli, GROUP, removeRotorCap } from './model.js';
import { fixGeometry } from './geomfix.js';
import { ZONES, PRESETS, NOSES, PROBE_NOSES } from './schemes.js';
import { ZKEYS, zoneUniforms, patchMaterial, textureRef, BREAKS, markNacelles } from './paint.js';
import { loadFonts, createMarks, fuselageOnly, migrate, USCG, FAA, newText } from './lettering.js';
import { setupLettering } from './lettering-ui.js';
import { buildHoist } from './hoist.js';
import { kitMaterials, buildKits, buildSearchlight, buildProbe, buildBifilar, buildTanks, buildBypass, P } from './kits.js';
import { buildDecals } from './decals.js';
import { setupPaintTools } from './planes.js';
import { setupStar } from './star-ui.js';

const q = new URLSearchParams(location.search);
const SHOT = q.has('shot'); if (SHOT) document.body.classList.add('shot');
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(q.get('bg') || '#c9d3dc');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;
const sun = new THREE.DirectionalLight('#fff6ea', 2.6); sun.position.set(9, 16, 7); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, new THREE.HemisphereLight('#dfe8f0', '#6b6257', 0.35));
const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: '#8e8b84', roughness: 0.92 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.target.set(0, 1.6, 0);
controls.minDistance = 2; controls.maxDistance = 80; controls.maxPolarAngle = Math.PI * 0.995;

// ---------- model + paint
const { holder, mesh } = await loadHeli();
scene.add(holder);
mesh.castShadow = mesh.receiveShadow = true;
fixGeometry(mesh, GROUP, BREAKS.NX);
window.__capTris = removeRotorCap(mesh, mesh.geometry.groups.findIndex(g => g.materialIndex === GROUP.mainRotor));
const U = zoneUniforms();
const mats = mesh.material;
const kindOf = { [GROUP.fuselage]: 0, [GROUP.mainRotor]: 1, [GROUP.tailRotor]: 2 };
mesh.geometry.groups.forEach(gr => { const m = mats[gr.materialIndex]; const k = kindOf[gr.materialIndex];
  if (k !== undefined && m.map) { patchMaterial(m, k, U, textureRef(m.map, k)); m.clearcoat = 0.25; }
});
// stock lettering ('BLACK HAWK' x2) inpainted out of the fuselage atlas offline (OpenCV Telea, panel lines restored)
{ const img = await new THREE.ImageLoader().loadAsync('model/fuselage_clean.png'); const fm = mats[GROUP.fuselage].map; fm.image = img; fm.needsUpdate = true; }
const glassMats = mats.filter(m => m.transparent);
const fus = mats[GROUP.fuselage];
// ---------- kits
const KM = kitMaterials(); const KITS = buildKits(KM);
for (const k in KITS) { KITS[k].visible = false; scene.add(KITS[k]); }
const HOIST = buildHoist(KM); scene.add(HOIST);
KM.tank = KM.hoist.clone(); KM.tankCap = new THREE.MeshPhysicalMaterial({ color: '#121212', roughness: 0.95, metalness: 0, clearcoat: 0 }); const TANKS = buildTanks(KM); scene.add(TANKS);
KM.bypass = new THREE.MeshPhysicalMaterial({ color: '#888', roughness: 0.5, clearcoat: 0.3, side: THREE.DoubleSide }); KM.bypassDark = new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 1, side: THREE.DoubleSide }); KM.bypassBolt = new THREE.MeshStandardMaterial({ color: '#777', roughness: 0.4, metalness: 0.6 }); 
const LIGHT = buildSearchlight(KM); scene.add(LIGHT);
scene.add(buildBifilar(KM));
let decals = null; let decalKey = '';
const NACSEL = markNacelles(mesh, GROUP.fuselage, BREAKS.NX, mats[GROUP.fuselage].map.image);
KM.skin = mats[GROUP.fuselage]; const BYPASS = buildBypass(KM, mesh); scene.add(BYPASS);
await loadFonts(); const FM = fuselageOnly(mesh, GROUP.fuselage); const MARKS = createMarks(scene, FM);
let PROBE = null, probeKey = '';
let LET = null;
const TOOLS = setupPaintTools({ U, scene, camera, renderer, controls, mesh, fusMatIndex: GROUP.fuselage, getS: () => S, onChange: () => { needs = true; }, requestDraw: () => { needs = true; } });
const STAR = setupStar({ fm: FM, camera, renderer, controls, getS: () => S, getDecals: () => decals, apply: () => apply(S) });
LET = setupLettering({ marks: MARKS, fm: FM, camera, renderer, controls, getS: () => S, onChange: () => { needs = true; }, requestDraw: () => { needs = true; } });

// ---------- scheme state
const clone = o => JSON.parse(JSON.stringify(o));
let S = clone(PRESETS[0]);
const lin = hex => new THREE.Color(hex); // Color() from hex converts sRGB -> linear working space
function apply(s, { rebuildDecals = true } = {}) {
  ZKEYS.forEach((k, i) => U.uC.value[i].copy(lin(s.colors[k] || ({ nacelle: '#121212', tankcap: '#121212' })[k] || '#ff00ff')));
  U.uAG.value = s.antiglare ? 1 : 0; U.uNac.value = s.nacelles ? 1 : 0; U.uST.value = s.stripe ? 1 : 0;
  fus.roughness = s.finish; fus.clearcoat = 0.45 * (1 - s.finish);
  KM.mission.color.copy(lin(s.colors.mission)); KM.radome.color.copy(lin(s.colors.mission)); KM.dome.color.copy(lin(s.colors.mission)).multiplyScalar(0.8); KM.hoist.color.copy(lin(s.colors.hoist));
  KM.nose.color.copy(lin(s.antiglare ? s.colors.antiglare : s.colors.nose)); KM.nose.roughness = s.antiglare ? 0.95 : s.finish; KM.nose.clearcoat = s.antiglare ? 0 : 0.3;
  s.planes = s.planes || []; s.regions = s.regions || []; s.panels = s.panels || {}; TOOLS.sync(false);
  glassMats.forEach(m => { m.color.copy(lin(s.colors.glass)); });
  for (const k in KITS) KITS[k].visible = (k === s.nose);
  HOIST.visible = true; /* hoist always installed */ TANKS.visible = !!s.tanks; KM.tank.color.copy(lin(s.colors.tank || s.colors.doors)); KM.tankCap.color.copy(lin(s.tankCaps ? (s.colors.tankcap || '#121212') : (s.colors.tank || s.colors.doors)));
  const pk = s.probeSide + '|' + s.nose;
  if (pk !== probeKey) { if (PROBE) scene.remove(PROBE); PROBE = buildProbe(KM, s.probeSide, s.nose); scene.add(PROBE); probeKey = pk; }
  KM.bypass.color.copy(lin(s.colors.cowl || s.colors.upper)); KM.bypass.roughness = s.finish; KM.bypass.clearcoat = 0.3;
  PROBE.visible = !!s.probe; KM.probe.color.copy(lin(s.colors.mission)); KM.probe.roughness = s.finish;
  KITS.mh60m.traverse(o => { if (o.userData.lidar) o.visible = !!s.lidar; });
  LIGHT.visible = s.light || s.nose === 'mh60t';
  LIGHT.userData.spot.intensity = s.light ? 600 : 0; KM.lamp.emissiveIntensity = s.light ? 6 : 0;
  migrate(s); MARKS.sync(s.marks);
  const key = JSON.stringify([s.cross, s.colors.cross, s.star]);
  if (rebuildDecals && key !== decalKey) { if (decals) { scene.remove(decals); decals.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); }
    decals = buildDecals(mesh, s); scene.add(decals); decalKey = key; }
  needs = true;
}
// ---------- views
const T0 = new THREE.Vector3(0.5, 1.7, 0);
const VIEWS = { 'Left': [-90, 4, 26], 'Right': [90, 4, 26], 'Front': [0, 4, 22], 'Rear': [180, 6, 24], 'Top': [90, 89.5, 30], 'Bottom': [90, -60, 24], '3/4 front': [40, 14, 22], '3/4 rear': [140, 14, 24], 'Nose close': [30, 8, 7.5, [5.7, 1.25, 0]] };
// az: 0 = from the front (+x), +90 = from the right side (+z), -90 = left side
export function setCam(az, el, dist, target, fov) {
  const t = target ? new THREE.Vector3(...target) : T0.clone(); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  if (fov) camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.set(t.x + dist * Math.cos(E) * Math.cos(A), t.y + dist * Math.sin(E), t.z + dist * Math.cos(E) * Math.sin(A));
  if (Math.abs(el) > 89) camera.up.set(-1, 0, 0); else camera.up.set(0, 1, 0);
  controls.target.copy(t); camera.lookAt(t); controls.update(); needs = true;
}
// ---------- render loop (with A|B compare)
let needs = true, cmp = null;
function resize() { const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); needs = true; }
window.addEventListener('resize', resize); resize();
controls.addEventListener('change', () => needs = true);
function draw() {
  const w = canvas.width / renderer.getPixelRatio(), h = canvas.height / renderer.getPixelRatio();
  if (!cmp) { renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h); renderer.render(scene, camera); return; }
  renderer.setScissorTest(true);
  apply(cmp[0]); renderer.setScissor(0, 0, w / 2, h); renderer.setViewport(0, 0, w, h); renderer.render(scene, camera);
  apply(cmp[1]); renderer.setScissor(w / 2, 0, w / 2, h); renderer.render(scene, camera);
  apply(S);
}
// ---------- equipment legend overlay: label lines like the reference graphic
let showLabels = false; const lab = document.getElementById('labels');
function labelTargets() { const out = []; const add = o => { if (o.userData.label && o.visible) out.push(o); };
  KITS[S.nose]?.children.forEach(add); if (PROBE?.visible) add(PROBE); if (HOIST.visible) out.push(Object.assign(HOIST, { userData: { ...HOIST.userData, label: HOIST.userData.label || 'Rescue hoist' } })); if (LIGHT.visible) { LIGHT.userData.label = 'Searchlight'; out.push(LIGHT); } return out; }
function drawLabels() {
  if (!showLabels || cmp) { lab.innerHTML = ''; return; }
  const r = canvas.getBoundingClientRect(), W = r.width, H = r.height, v = new THREE.Vector3(), b = new THREE.Box3();
  const pts = labelTargets().map(o => { b.setFromObject(o); b.getCenter(v); v.project(camera); return { o, x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, z: v.z }; }).filter(p => p.z < 1 && p.x > 0 && p.x < W && p.y > 0 && p.y < H);
  pts.sort((a, b) => a.x - b.x);
  const rowH = 30, y0 = H - 18 - rowH * (pts.length - 1);
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  pts.forEach((p, i) => { const ly = y0 + i * rowH; const name = p.o.userData.label; const tw = Math.min(W * 0.5, name.length * 7.2 + 8);
    const lx = Math.min(Math.max(p.x - tw + 4, 6), W - tw - 6);
    svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#d0212b"/><path d="M${p.x} ${p.y}V${ly}H${lx}" stroke="#d0212b" stroke-width="2" fill="none"/><text x="${lx + 2}" y="${ly - 6}" font-size="12" font-weight="700" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke" font-family="Arial, sans-serif">${name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`; });
  lab.innerHTML = svg + '</svg>';
}
function loop() { requestAnimationFrame(loop); controls.update(); if (needs || cmp) { needs = false; draw(); drawLabels(); } }

// ---------- UI
const $ = id => document.getElementById(id);
function opt(sel, items) { sel.innerHTML = items.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''); }
opt($('preset'), PRESETS.map((p, i) => [i, p.name])); opt($('nose'), NOSES);
for (const [name, v] of Object.entries(VIEWS)) { const b = document.createElement('button'); b.textContent = name; b.onclick = () => setCam(v[0], v[1], v[2], v[3]); $('views').appendChild(b); }
$('zones').innerHTML = ZONES.map(([k, l]) => `<div class="zone"><input type="color" data-z="${k}"><span>${l}</span></div>`).join('');
function syncUI() {
  TOOLS.sync(true);
  $('nose').value = S.nose; ['antiglare', 'stripe', 'hoist', 'light', 'cross', 'probe', 'lidar', 'tanks', 'nacelles', 'tankCaps'].forEach(k => $(k).checked = !!S[k]); $('probeSide').value = S.probeSide || 'right';
  $('finish').value = S.finish; migrate(S); LET?.render(); STAR.render();
  document.querySelectorAll('[data-z]').forEach(i => i.value = S.colors[i.dataset.z]);
}
$('preset').onchange = e => { S = clone(PRESETS[+e.target.value]); syncUI(); apply(S); };
$('nose').onchange = e => { S.nose = e.target.value; S.probe = PROBE_NOSES.includes(S.nose); syncUI(); apply(S); };
$('probeSide').onchange = e => { S.probeSide = e.target.value; apply(S); };
['antiglare', 'stripe', 'hoist', 'light', 'cross', 'probe', 'lidar', 'tanks', 'nacelles', 'tankCaps'].forEach(k => $(k).onchange = e => { S[k] = e.target.checked; apply(S); });
$('finish').oninput = e => { S.finish = +e.target.value; apply(S); };
document.querySelectorAll('[data-z]').forEach(i => i.oninput = () => { S.colors[i.dataset.z] = i.value; apply(S); });
$('labelsT').onchange = e => { showLabels = e.target.checked; needs = true; };
$('zdbg').onchange = e => { U.uDbg.value = e.target.checked ? 1 : 0; needs = true; };
$('shot').onclick = () => { draw(); const a = document.createElement('a'); a.download = (S.name || 'uh60').replace(/[^\w]+/g, '_') + '.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
// saved schemes in localStorage
const store = { get: () => { try { return JSON.parse(localStorage.getItem('uh60-schemes') || '[]'); } catch { return []; } }, set: v => localStorage.setItem('uh60-schemes', JSON.stringify(v)) };
function listSaved() {
  const L = store.get(); const all = [...PRESETS.map(p => ['p:' + p.name, '★ ' + p.name]), ...L.map((s, i) => ['s:' + i, s.name])];
  opt($('cmpA'), all); opt($('cmpB'), all); if (all.length > 1) $('cmpB').selectedIndex = 1;
  $('saved').innerHTML = L.map((s, i) => `<div class="item"><span>${s.name}</span><span><button data-load="${i}">Load</button><button data-del="${i}">✕</button></span></div>`).join('') || '<em>No saved schemes yet.</em>';
  $('saved').querySelectorAll('[data-load]').forEach(b => b.onclick = () => { S = clone(store.get()[+b.dataset.load]); syncUI(); apply(S); });
  $('saved').querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const L = store.get(); L.splice(+b.dataset.del, 1); store.set(L); listSaved(); });
}
const pick = v => v.startsWith('p:') ? clone(PRESETS.find(p => 'p:' + p.name === v)) : clone(store.get()[+v.slice(2)]);
$('save').onclick = () => { const L = store.get(); const s = clone(S); s.name = $('saveName').value || ('Scheme ' + (L.length + 1)); L.push(s); store.set(L); listSaved(); };
$('compare').onclick = () => { cmp = [pick($('cmpA').value), pick($('cmpB').value)]; $('split').hidden = false; };
$('cmpOff').onclick = () => { cmp = null; $('split').hidden = true; apply(S); };
$('export').onclick = () => { const b = new Blob([JSON.stringify({ format: 'uh60-3d-scheme/1', ...S }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (S.name || 'scheme').replace(/[^\w]+/g, '_') + '.json'; a.click(); };
$('importBtn').onclick = () => $('importFile').click();
$('importFile').onchange = async e => { try { const o = JSON.parse(await e.target.files[0].text()); S = { ...clone(PRESETS[0]), ...o, colors: { ...PRESETS[0].colors, ...(o.colors || {}) } }; if (o.probe === undefined) S.probe = PROBE_NOSES.includes(S.nose); syncUI(); apply(S); } catch (err) { alert('Not a valid scheme file'); } };

// ---------- automation hooks (used for verification renders)
window.APP = { NACSEL, TOOLS, MARKS, FM, LET, LT: { USCG, FAA, newText }, drawLabels, setLabels: v => { showLabels = v; }, THREE, scene, camera, renderer, setCam, apply, PRESETS, KITS, BREAKS, U, P, get S() { return S; }, set S(v) { S = v; syncUI(); apply(S); }, draw };
const pre = q.get('preset'); if (pre !== null) S = clone(PRESETS[+pre]);
if (q.get('nose')) S.nose = q.get('nose');
if (q.get('light')) S.light = q.get('light') === '1';
if (q.get('zones')) U.uDbg.value = 1;
if (q.get('labels')) { showLabels = true; $('labelsT').checked = true; }
syncUI(); listSaved(); apply(S);
const cam = (q.get('cam') || '').split(',').map(Number);
if (cam.length >= 3 && !isNaN(cam[0])) setCam(cam[0], cam[1], cam[2], cam.length >= 6 ? [cam[3], cam[4], cam[5]] : null, cam[6] || null);
else setCam(40, 14, 22);
$('loading').remove();
draw(); loop();
document.title = 'done';
