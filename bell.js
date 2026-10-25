// Bell 206B JetRanger paint studio (separate page so the UH-60 studio is untouched).
// World frame matches the UH-60 page: nose tip at x = 6.243, +y up, +z right side, ground y = 0.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadFonts, createMarks, newText, IN } from './lettering.js';
import { setupLettering } from './lettering-ui.js';

const NX = 6.243, $ = id => document.getElementById(id), q = new URLSearchParams(location.search);
const KEY = 'bell206-schemes', CUR = 'bell206-current';
if (q.has('shot')) document.body.classList.add('shot');
$('aircraft').onchange = e => { if (e.target.value === 'uh60') location.href = 'index.html'; };

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(q.get('bg') || '#c9d3dc');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.9;
const sun = new THREE.DirectionalLight('#fff6ea', 2.6); sun.position.set(9, 16, 7); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, new THREE.HemisphereLight('#dfe8f0', '#6b6257', 0.35));
const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: '#8e8b84', roughness: 0.92 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true;
controls.minDistance = 2; controls.maxDistance = 60; controls.maxPolarAngle = Math.PI * 0.995;

// ---------- model
const gltf = await new GLTFLoader().loadAsync('model/bell206.glb');
const P = {}; gltf.scene.traverse(o => { if (o.isMesh) { P[o.name] = o; o.castShadow = o.receiveShadow = o.name !== 'glass'; } });
scene.add(gltf.scene);
const ctr = n => { const b = new THREE.Box3().setFromObject(P[n]); return b.getCenter(new THREE.Vector3()); };
const MR = ctr('mrhub'), TR = ctr('trhub');
const U = { base: { value: new THREE.Color() }, stC: { value: new THREE.Color() }, st: { value: new THREE.Vector4() }, acC: { value: new THREE.Color() }, ac: { value: new THREE.Vector4() } };
// body: greyscale detail map (livery removed offline) x zone colour picked from world position
const body = P.body.material; body.color.set('#ffffff');
body.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; varying vec3 vNw;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz; vNw = normalize(mat3(modelMatrix) * objectNormal);');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vW; varying vec3 vNw; uniform vec3 base, stC, acC; uniform vec4 st, ac;
vec3 zoneCol() { float a = ${NX.toFixed(3)} - vW.x; float t = clamp(a / 9.6, 0.0, 1.0); vec3 c = base;
  float aw = fwidth(vW.y) + 0.002;
  if (ac.z > 0.5 && (ac.w > 0.5 || a < 4.9)) { float ly = mix(ac.x, ac.y, t); c = mix(c, acC, 1.0 - smoothstep(ly - aw, ly + aw, vW.y)); }
  if (st.w > 0.0) { float cy = mix(st.x, st.y, t); float d = abs(vW.y - cy) - st.w * 0.5; c = mix(c, stC, (1.0 - smoothstep(-aw, aw, d)) * smoothstep(0.9, 0.75, abs(normalize(vNw).y))); }
  return c; }`).replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= zoneCol() * 1.15;');
};
// rotor tips: blades tinted beyond (radius - tipLen) from their hub
const TU = { tipC: { value: new THREE.Color() }, tipOn: { value: 0 }, hub: { value: MR }, rTip: { value: 4.75 } };
function tipPatch(mat, hub, rTip, axis) { const u = { ...TU, hub: { value: hub }, rTip: { value: rTip } };
  mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform vec3 tipC, hub; uniform float tipOn, rTip;')
      .replace('#include <map_fragment>', `#include <map_fragment>\n{ vec3 d = vW - hub; float r = ${axis === 'y' ? 'length(d.xz)' : 'length(d.xy)'}; if (tipOn > 0.5 && r > rTip) diffuseColor.rgb = tipC; }`); };
  return u; }
const TIPS = [tipPatch(P.mrblade.material, MR, 5.08 - 0.30, 'y'), tipPatch(P.trblade.material, TR, 0.80 - 0.10, 'z')];
const skidStock = P.skids.material.map, skidMat = P.skids.material;

// ---------- schemes
const PRESETS = {
  'Classic white / blue stripe': { base: '#f2f2ee', finish: 'gloss', st: { on: true, color: '#1b3f8f', wIn: 6, f: 1.18, r: 1.68 }, ac: { on: false, color: '#1b3f8f', f: 0.9, r: 1.5, boom: false } },
  'Two-tone red / white': { base: '#f4f4f0', finish: 'gloss', st: { on: true, color: '#111111', wIn: 2, f: 1.12, r: 1.62 }, ac: { on: true, color: '#b0151c', f: 1.0, r: 1.52, boom: true } },
  'Police dark blue': { base: '#16213d', finish: 'gloss', st: { on: true, color: '#e9c33b', wIn: 4, f: 1.15, r: 1.66 }, ac: { on: false, color: '#ffffff', f: 0.9, r: 1.5, boom: false } },
  'News yellow': { base: '#f1c40f', finish: 'gloss', st: { on: true, color: '#101010', wIn: 8, f: 1.15, r: 1.66 }, ac: { on: false, color: '#101010', f: 0.9, r: 1.5, boom: false } },
  'Army trainer (TH-67 style) matte': { base: '#ffffff', finish: 'matte', st: { on: false, color: '#e33b1e', wIn: 6, f: 1.2, r: 1.7 }, ac: { on: false, color: '#e33b1e', f: 1.0, r: 1.5, boom: false } },
  'Plain white': { base: '#f4f4f1', finish: 'gloss', st: { on: false, color: '#1b3f8f', wIn: 6, f: 1.18, r: 1.68 }, ac: { on: false, color: '#1b3f8f', f: 0.9, r: 1.5, boom: false } },
};
const DEF = () => ({ aircraft: 'bell206', name: '', ...JSON.parse(JSON.stringify(PRESETS['Classic white / blue stripe'])), sk: { on: false, color: '#2b2b2b' }, tp: { on: false, color: '#ffffff' }, marks: [] });
let S = (() => { try { const s = JSON.parse(localStorage.getItem(CUR)); if (s && s.aircraft === 'bell206') return { ...DEF(), ...s }; } catch {} return DEF(); })();
if (q.has('scheme')) try { S = { ...DEF(), ...JSON.parse(q.get('scheme')) }; } catch {}

let needs = true;
function apply() {
  U.base.value.set(S.base); U.stC.value.set(S.st.color); U.acC.value.set(S.ac.color);
  U.st.value.set(S.st.f, S.st.r, 0, S.st.on ? S.st.wIn * IN : 0); U.ac.value.set(S.ac.f, S.ac.r, S.ac.on ? 1 : 0, S.ac.boom ? 1 : 0);
  const matte = S.finish === 'matte'; body.roughness = matte ? 0.82 : 0.28; body.metalness = 0; body.envMapIntensity = matte ? 0.5 : 1.0;
  if (S.sk.on) { skidMat.map = P.body.material.map; skidMat.color.set(S.sk.color); skidMat.color.multiplyScalar(1.15); } else { skidMat.map = skidStock; skidMat.color.set('#ffffff'); }
  skidMat.roughness = matte ? 0.8 : 0.45; skidMat.needsUpdate = true;
  for (const t of TIPS) { t.tipOn.value = S.tp.on ? 1 : 0; t.tipC.value.set(S.tp.color); }
  MARKS.sync(S.marks); needs = true;
}
const save = () => { localStorage.setItem(CUR, JSON.stringify(S)); };
const bind = (id, get, set, ev = 'input') => { $(id).addEventListener(ev, () => { set($(id).type === 'checkbox' ? $(id).checked : $(id).type === 'range' || $(id).type === 'number' ? +$(id).value : $(id).value); apply(); save(); }); };
const F = [['base', () => S.base, v => S.base = v], ['finish', () => S.finish, v => S.finish = v],
  ['stOn', () => S.st.on, v => S.st.on = v], ['stColor', () => S.st.color, v => S.st.color = v], ['stW', () => S.st.wIn, v => S.st.wIn = v], ['stF', () => S.st.f, v => S.st.f = v], ['stR', () => S.st.r, v => S.st.r = v],
  ['acOn', () => S.ac.on, v => S.ac.on = v], ['acColor', () => S.ac.color, v => S.ac.color = v], ['acBoom', () => S.ac.boom, v => S.ac.boom = v], ['acF', () => S.ac.f, v => S.ac.f = v], ['acR', () => S.ac.r, v => S.ac.r = v],
  ['skOn', () => S.sk.on, v => S.sk.on = v], ['skColor', () => S.sk.color, v => S.sk.color = v], ['tpOn', () => S.tp.on, v => S.tp.on = v], ['tpColor', () => S.tp.color, v => S.tp.color = v]];
function syncUI() { for (const [id, g] of F) { const e = $(id); if (e.type === 'checkbox') e.checked = g(); else e.value = g(); } $('name').value = S.name || ''; LET?.render(); }
for (const [id, , s] of F) bind(id, null, s, ['finish'].includes(id) || $(id).type === 'checkbox' ? 'change' : 'input');
$('preset').innerHTML = '<option value="">— choose —</option>' + Object.keys(PRESETS).map(k => `<option>${k}</option>`).join('');
$('preset').onchange = e => { const p = PRESETS[e.target.value]; if (!p) return; Object.assign(S, JSON.parse(JSON.stringify(p))); syncUI(); apply(); save(); };

// ---------- lettering (shared tool, projected onto the painted body)
await loadFonts(); const MARKS = createMarks(scene, P.body);
P.body.updateMatrixWorld(true);
let LET = setupLettering({ marks: MARKS, fm: P.body, camera, renderer, controls, getS: () => S, onChange: () => { needs = true; save(); }, requestDraw: () => { needs = true; } });
$('bellN').onclick = () => { S.marks.push(newText({ text: 'N206JR', font: 'Barlow', hIn: 12, a: 6.55, y: 1.66, faa: true, color: '#111111' })); LET.sync(); apply(); save(); };
$('bellBelly').onclick = () => { S.marks.push(newText({ text: 'N206JR', font: 'Barlow', hIn: 12, a: 1.75, y: 0.4, side: 0, z: 0, both: false, faa: true, color: '#111111' })); LET.sync(); apply(); save(); };

// ---------- saved schemes
const store = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const listSaved = () => { $('saved').innerHTML = Object.keys(store()).map(k => `<option>${k}</option>`).join(''); };
$('save').onclick = () => { S.name = $('name').value.trim() || 'Untitled'; const st = store(); st[S.name] = S; localStorage.setItem(KEY, JSON.stringify(st)); listSaved(); save(); };
$('load').onclick = () => { const s = store()[$('saved').value]; if (s) { S = { ...DEF(), ...JSON.parse(JSON.stringify(s)) }; syncUI(); apply(); save(); } };
$('del').onclick = () => { const st = store(); delete st[$('saved').value]; localStorage.setItem(KEY, JSON.stringify(st)); listSaved(); };
$('export').onclick = () => { const a = document.createElement('a'); a.download = (S.name || 'bell206').replace(/[^\w]+/g, '_') + '.json'; a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); a.click(); };
$('import').onclick = () => $('file').click();
$('file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const s = JSON.parse(await f.text()); if (s.aircraft && s.aircraft !== 'bell206') { alert('That scheme is for a different aircraft.'); return; } S = { ...DEF(), ...s, aircraft: 'bell206' }; syncUI(); apply(); save(); } catch { alert('Not a valid scheme file'); } };
$('shot').onclick = () => { draw(); const a = document.createElement('a'); a.download = (S.name || 'bell206').replace(/[^\w]+/g, '_') + '.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
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
