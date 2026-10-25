// Bell 505 Jet Ranger X paint studio. Geometry is original procedural work (bell505-model.js).
// World frame matches the UH-60 page: nose tip at x = 6.243, +y up, +z right side, ground y = 0.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadFonts, createMarks, newText, IN } from './lettering.js';
import { setupLettering } from './lettering-ui.js';
import { buildBell505, DIM } from './bell505-model.js';

const NX = 6.243, $ = id => document.getElementById(id), q = new URLSearchParams(location.search);
const KEY = 'bell505-schemes', CUR = 'bell505-current';
if (q.has('shot')) document.body.classList.add('shot');
$('aircraft').onchange = e => { if (e.target.value === 'uh60') location.href = 'index.html'; if (e.target.value === '206') location.href = 'bell.html'; };

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMappingExposure = 0.7; // deeper reds, closer to photos
const scene = new THREE.Scene(); scene.background = new THREE.Color(q.get('bg') || '#c9d3dc');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.7;
const sun = new THREE.DirectionalLight('#fff6ea', 2.2); sun.position.set(9, 16, 7); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, new THREE.HemisphereLight('#dfe8f0', '#6b6257', 0.35));
const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: '#8e8b84', roughness: 0.92 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true;
controls.minDistance = 2; controls.maxDistance = 60; controls.maxPolarAngle = Math.PI * 0.995;

// ---------- model
const B = buildBell505(), P = B.P; for (const o of Object.values(P)) o.castShadow = o.receiveShadow = o.name !== 'glass';
scene.add(B.root);
const ctr = n => { const b = new THREE.Box3().setFromObject(P[n]); return b.getCenter(new THREE.Vector3()); };
const MR = new THREE.Vector3(NX - DIM.mrA, DIM.mrY, 0), TR = new THREE.Vector3(NX - DIM.trA, DIM.trY, 0);
const U = { base: { value: new THREE.Color() }, stC: { value: new THREE.Color() }, st: { value: new THREE.Vector4() }, acC: { value: new THREE.Color() }, ac: { value: new THREE.Vector4() } };
// body: greyscale detail map (livery removed offline) x zone colour picked from world position
const body = P.body.material; body.color.set('#ffffff');
body.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; varying vec3 vNw;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz; vNw = normalize(mat3(modelMatrix) * objectNormal);');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vW; varying vec3 vNw; uniform vec3 base, stC, acC; uniform vec4 st, ac;
vec3 zoneCol() { float a = ${NX.toFixed(3)} - vW.x; float t = clamp(a / 10.0, 0.0, 1.0); vec3 c = base;
  float aw = fwidth(vW.y) + 0.002;
  if (ac.z > 0.5 && (ac.w > 0.5 || a < 5.3)) { float ly = mix(ac.x, ac.y, t); c = mix(c, acC, 1.0 - smoothstep(ly - aw, ly + aw, vW.y)); }
  if (st.w > 0.0) { float cy = mix(st.x, st.y, t); float d = abs(vW.y - cy) - st.w * 0.5; c = mix(c, stC, (1.0 - smoothstep(-aw, aw, d)) * smoothstep(0.9, 0.75, abs(normalize(vNw).y))); }
  return c; }`).replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = zoneCol();');
};
// rotor tips: blades tinted beyond (radius - tipLen) from their hub
const TU = { tipC: { value: new THREE.Color() }, tipOn: { value: 0 }, hub: { value: MR }, rTip: { value: 4.75 } };
function tipPatch(mat, hub, rTip, axis) { const u = { ...TU, hub: { value: hub }, rTip: { value: rTip } };
  mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform vec3 tipC, hub; uniform float tipOn, rTip;')
      .replace('#include <color_fragment>', `#include <color_fragment>\n{ vec3 d = vW - hub; float r = ${axis === 'y' ? 'length(d.xz)' : 'length(d.xy)'}; if (tipOn > 0.5 && r > rTip) diffuseColor.rgb = tipC; }`); };
  return u; }
const TIPS = [tipPatch(P.mrblade.material, MR, DIM.mrR - 0.30, 'y'), tipPatch(P.trblade.material, TR, DIM.trR - 0.10, 'z')];
const skidMat = P.skids.material;

// ---------- schemes
const PRESETS = {
  'Plain bright red': { base: '#d4141c', finish: 'gloss', st: { on: false, color: '#ffffff', wIn: 6, f: 1.25, r: 1.70 }, ac: { on: false, color: '#ffffff', f: 0.95, r: 1.55, boom: false } },
};
const DEF = () => ({ aircraft: 'bell505', name: '', ...JSON.parse(JSON.stringify(PRESETS['Plain bright red'])), glass: 'dark', sk: { on: false, color: '#2b2b2b' }, tp: { on: false, color: '#ffffff' }, marks: [] });
let S = (() => { try { const s = JSON.parse(localStorage.getItem(CUR)); if (s && s.aircraft === 'bell505') return { ...DEF(), ...s }; } catch {} return DEF(); })();
if (q.has('scheme')) try { S = { ...DEF(), ...JSON.parse(q.get('scheme')) }; } catch {}

let needs = true;
function apply() {
  U.base.value.set(S.base); U.stC.value.set(S.st.color); U.acC.value.set(S.ac.color);
  U.st.value.set(S.st.f, S.st.r, 0, S.st.on ? S.st.wIn * IN : 0); U.ac.value.set(S.ac.f, S.ac.r, S.ac.on ? 1 : 0, S.ac.boom ? 1 : 0);
  const matte = S.finish === 'matte'; body.roughness = matte ? 0.82 : 0.28; body.metalness = 0; body.envMapIntensity = matte ? 0.5 : 1.0;
  if (S.sk.on) { skidMat.color.set(S.sk.color); skidMat.metalness = 0.1; } else { skidMat.color.set('#2c2d2f'); skidMat.metalness = 0.3; }
  { const g = P.glass.material, dk = S.glass !== 'clear'; g.color.set(dk ? '#0b0f12' : '#9fb6c4'); g.opacity = dk ? 0.70 : 0.42; g.envMapIntensity = dk ? 3.5 : 1.3; g.clearcoat = 1; g.clearcoatRoughness = 0.03; g.needsUpdate = true; }
  skidMat.roughness = matte ? 0.8 : 0.45; skidMat.needsUpdate = true;
  for (const t of TIPS) { t.tipOn.value = S.tp.on ? 1 : 0; t.tipC.value.set(S.tp.color); }
  MARKS.sync(S.marks); needs = true;
}
const save = () => { localStorage.setItem(CUR, JSON.stringify(S)); };
const bind = (id, get, set, ev = 'input') => { $(id).addEventListener(ev, () => { set($(id).type === 'checkbox' ? $(id).checked : $(id).type === 'range' || $(id).type === 'number' ? +$(id).value : $(id).value); apply(); save(); }); };
const F = [['base', () => S.base, v => S.base = v], ['finish', () => S.finish, v => S.finish = v], ['glass', () => S.glass || 'dark', v => S.glass = v],
  ['stOn', () => S.st.on, v => S.st.on = v], ['stColor', () => S.st.color, v => S.st.color = v], ['stW', () => S.st.wIn, v => S.st.wIn = v], ['stF', () => S.st.f, v => S.st.f = v], ['stR', () => S.st.r, v => S.st.r = v],
  ['acOn', () => S.ac.on, v => S.ac.on = v], ['acColor', () => S.ac.color, v => S.ac.color = v], ['acBoom', () => S.ac.boom, v => S.ac.boom = v], ['acF', () => S.ac.f, v => S.ac.f = v], ['acR', () => S.ac.r, v => S.ac.r = v],
  ['skOn', () => S.sk.on, v => S.sk.on = v], ['skColor', () => S.sk.color, v => S.sk.color = v], ['tpOn', () => S.tp.on, v => S.tp.on = v], ['tpColor', () => S.tp.color, v => S.tp.color = v]];
function syncUI() { for (const [id, g] of F) { const e = $(id); if (e.type === 'checkbox') e.checked = g(); else e.value = g(); } $('name').value = S.name || ''; LET?.render(); }
for (const [id, , s] of F) bind(id, null, s, ['finish', 'glass'].includes(id) || $(id).type === 'checkbox' ? 'change' : 'input');
$('preset').innerHTML = '<option value="">— choose —</option>' + Object.keys(PRESETS).map(k => `<option>${k}</option>`).join('');
$('preset').onchange = e => { const p = PRESETS[e.target.value]; if (!p) return; Object.assign(S, JSON.parse(JSON.stringify(p))); syncUI(); apply(); save(); };

// ---------- lettering (shared tool, projected onto the painted body)
await loadFonts(); const MARKS = createMarks(scene, P.body);
P.body.updateMatrixWorld(true);
let LET = setupLettering({ marks: MARKS, fm: P.body, camera, renderer, controls, getS: () => S, onChange: () => { needs = true; save(); }, requestDraw: () => { needs = true; } });
$('bellN').onclick = () => { S.marks.push(newText({ text: 'N505JX', font: 'Barlow', hIn: 12, a: 6.55, y: 1.40, faa: true, color: '#111111' })); LET.sync(); apply(); save(); };
$('bellBelly').onclick = () => { S.marks.push(newText({ text: 'N505JX', font: 'Barlow', hIn: 12, a: 1.75, y: 0.4, side: 0, z: 0, both: false, faa: true, color: '#111111' })); LET.sync(); apply(); save(); };

// ---------- saved schemes
const store = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const listSaved = () => { $('saved').innerHTML = Object.keys(store()).map(k => `<option>${k}</option>`).join(''); };
$('save').onclick = () => { S.name = $('name').value.trim() || 'Untitled'; const st = store(); st[S.name] = S; localStorage.setItem(KEY, JSON.stringify(st)); listSaved(); save(); };
$('load').onclick = () => { const s = store()[$('saved').value]; if (s) { S = { ...DEF(), ...JSON.parse(JSON.stringify(s)) }; syncUI(); apply(); save(); } };
$('del').onclick = () => { const st = store(); delete st[$('saved').value]; localStorage.setItem(KEY, JSON.stringify(st)); listSaved(); };
$('export').onclick = () => { const a = document.createElement('a'); a.download = (S.name || 'bell505').replace(/[^\w]+/g, '_') + '.json'; a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); a.click(); };
$('import').onclick = () => $('file').click();
$('file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const s = JSON.parse(await f.text()); if (s.aircraft && s.aircraft !== 'bell505') { alert('That scheme is for a different aircraft.'); return; } S = { ...DEF(), ...s, aircraft: 'bell505' }; syncUI(); apply(); save(); } catch { alert('Not a valid scheme file'); } };
$('shot').onclick = () => { draw(); const a = document.createElement('a'); a.download = (S.name || 'bell505').replace(/[^\w]+/g, '_') + '.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
listSaved();

// ---------- camera + loop
const T0 = new THREE.Vector3(1.6, 1.4, 0);
function setCam(az, el, dist, target, fov) { const t = target ? new THREE.Vector3(...target) : T0.clone(); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  camera.position.set(t.x + dist * Math.cos(E) * Math.cos(A), t.y + dist * Math.sin(E), t.z + dist * Math.cos(E) * Math.sin(A));
  camera.up.set(Math.abs(el) > 89 ? -1 : 0, Math.abs(el) > 89 ? 0 : 1, 0); controls.target.copy(t); camera.lookAt(t); controls.update(); needs = true; }
const VIEWS = { '3/4 front': [35, 12, 15], Left: [-90, 3, 17], Right: [90, 3, 17], Front: [0, 4, 17], Rear: [180, 8, 18], Top: [0, 90, 22], Belly: [0, -89.9, 18] };
for (const [n, v] of Object.entries(VIEWS)) { const b = document.createElement('button'); b.textContent = n; b.onclick = () => setCam(...v); $('views').appendChild(b); }
let spin = false; $('spin').onchange = e => { spin = e.target.checked; };
function resize() { const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); needs = true; }
new ResizeObserver(resize).observe(canvas.parentElement); resize();
controls.addEventListener('change', () => { needs = true; });
const mrot = [P.mrhub, P.mrblade], trot = [P.trhub, P.trblade];
function spinAbout(objs, c, axis, ang) { const m = new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeRotationAxis(axis, ang)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z)); for (const o of objs) { o.applyMatrix4(m); } }
function draw() { renderer.render(scene, camera); }
let last = performance.now();
renderer.setAnimationLoop(t => { const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (spin) { spinAbout(mrot, MR, new THREE.Vector3(0, 1, 0), dt * 40); spinAbout(trot, TR, new THREE.Vector3(0, 0, 1), dt * 230); needs = true; }
  if (controls.update() || needs) { needs = false; draw(); } });
syncUI(); apply();
const cam = (q.get('cam') || '').split(',').map(Number);
if (cam.length >= 3 && !isNaN(cam[0])) setCam(cam[0], cam[1], cam[2], cam.length >= 6 ? [cam[3], cam[4], cam[5]] : null, cam[6] || null); else setCam(...VIEWS['3/4 front']);
$('loading').remove();
window.APP = { THREE, scene, camera, renderer, setCam, P, apply, PRESETS, get S() { return S; }, set S(v) { S = { ...DEF(), ...v }; syncUI(); apply(); }, draw, LET, MARKS, MR, TR };
requestAnimationFrame(() => requestAnimationFrame(() => { draw(); document.title = 'done'; }));
