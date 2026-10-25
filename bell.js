// Bell 206B JetRanger paint studio (separate page so the UH-60 studio is untouched).
// World frame matches the UH-60 page: nose tip at x = 6.243, +y up, +z right side, ground y = 0.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadFonts, createMarks, newText, IN } from './lettering.js';
import { setupLettering } from './lettering-ui.js';

const NX = 6.243, $ = id => document.getElementById(id), q = new URLSearchParams(location.search);
const KEY = 'bell206-schemes', CUR = 'bell206-current-v2'; // v2: new no-graphics default (old autosave ignored, saved schemes kept)
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
// main rotor: FG model sits ~0.16 m high vs the 206B's 2.91 m hub height; drop it and tilt the mast 2 deg forward about its base
const TILT = 2 * Math.PI / 180, MAST0 = new THREE.Vector3(MR.x, 2.30, 0);
const mastM = new THREE.Matrix4().makeTranslation(MAST0.x, MAST0.y, 0).multiply(new THREE.Matrix4().makeRotationZ(-TILT)).multiply(new THREE.Matrix4().makeTranslation(-MAST0.x, -MAST0.y + -0.16, 0));
for (const n of ['mrhub', 'mrblade']) { P[n].applyMatrix4(mastM); P[n].updateMatrixWorld(true); }
MR.applyMatrix4(mastM); const MAXIS = new THREE.Vector3(Math.sin(TILT), Math.cos(TILT), 0);
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
// ---------- skid gear (rebuilt to 206B photo proportions; the FG skids sat ~0.25 m aft and were thin)
P.skids.visible = false;
const skidMat = new THREE.MeshStandardMaterial({ color: '#cfd2d4', metalness: 0.35, roughness: 0.45 });
const GEAR = new THREE.Group(); GEAR.name = 'gear'; scene.add(GEAR);
{ const SK_R = 0.044, CT_R = 0.040, TRACK = 0.96, A0 = 0.86, A1 = 3.86, ACT = [1.74, 3.50];
  const X = a => NX - a, tube = (pts, r) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 48, r, 14, false), skidMat);
  const cap = (p, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), skidMat); m.position.copy(p); return m; };
  for (const sd of [1, -1]) { const z = sd * TRACK, V = (a, y) => new THREE.Vector3(X(a), y, z);
    const pts = [V(A0, 0.36), V(A0 + 0.10, 0.20), V(A0 + 0.30, SK_R + 0.01), V(A0 + 0.6, SK_R), V(A1 - 0.2, SK_R), V(A1, SK_R + 0.005)];
    GEAR.add(tube(pts, SK_R), cap(pts[0], SK_R), cap(pts[pts.length - 1], SK_R)); }
  for (const a of ACT) { const x = X(a), V = (z, y) => new THREE.Vector3(x, y, z); const top = 0.47;
    const pts = [V(-TRACK, SK_R), V(-TRACK + 0.04, 0.17), V(-TRACK + 0.12, 0.31), V(-TRACK + 0.24, 0.41), V(-0.5, top), V(0, top + 0.01), V(0.5, top), V(TRACK - 0.24, 0.41), V(TRACK - 0.12, 0.31), V(TRACK - 0.04, 0.17), V(TRACK, SK_R)];
    GEAR.add(tube(pts, CT_R)); }
  GEAR.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); }
// ---------- simple cabin: 2 crew seats + 3-place rear bench (no pilots)
const CAB = new THREE.Group(); CAB.name = 'cabin'; scene.add(CAB);
{ const rc = new THREE.Raycaster(); const floorAt = (a, z) => { rc.set(new THREE.Vector3(NX - a, 1.6, z), new THREE.Vector3(0, -1, 0)); const h = rc.intersectObject(P.interior, false)[0]; return h ? h.point.y : 0.62; };
  const fab = new THREE.MeshStandardMaterial({ color: '#6c665d', roughness: 0.9 }), frame = new THREE.MeshStandardMaterial({ color: '#4a4c4f', roughness: 0.6, metalness: 0.3 });
  const box = (w, h, d, m) => new THREE.Mesh(new RoundedBoxGeometry(d, h, w, 3, Math.min(w, h, d) * 0.35), m);
  const seat = (a, z, w, fy, back = 0.62) => { const g = new THREE.Group(); const c = box(w, 0.11, 0.46, fab); c.position.set(0, 0.06, 0); const b = box(w, back, 0.10, fab); b.position.set(-0.24, back / 2 + 0.05, 0); b.rotation.z = 0.2;
    const leg = box(w * 0.8, 0.30, 0.36, frame); leg.position.set(0, -0.15, 0); g.add(c, b, leg); g.position.set(NX - a, fy + 0.30, z); return g; };
  for (const z of [0.30, -0.30]) CAB.add(seat(1.80, z, 0.44, floorAt(1.80, z)));
  const fr = floorAt(2.70, 0); for (const z of [0.40, 0, -0.40]) CAB.add(seat(2.70, z, 0.39, fr, 0.58));
  CAB.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); window.__floor = [floorAt(1.8, 0.3), fr]; }

// ---------- schemes
const NOST = { on: false, color: '#1b3f8f', wIn: 6, f: 1.18, r: 1.68 }, NOAC = { on: false, color: '#1b3f8f', f: 0.9, r: 1.5, boom: false };
// one preset only; every graphic (stripe, accent, lettering) is off until the user adds it
const PRESETS = { 'Plain bright red': { base: '#d10000', finish: 'gloss', st: { ...NOST }, ac: { ...NOAC } } };
const DEF = () => ({ aircraft: 'bell206', name: '', base: '#f4f4f1', finish: 'gloss', st: { ...NOST }, ac: { ...NOAC }, sk: { on: false, color: '#2b2b2b' }, tp: { on: false, color: '#ffffff' }, marks: [] });
let S = (() => { try { const s = JSON.parse(localStorage.getItem(CUR)); if (s && s.aircraft === 'bell206') return { ...DEF(), ...s }; } catch {} return DEF(); })();
if (q.has('scheme')) try { S = { ...DEF(), ...JSON.parse(q.get('scheme')) }; } catch {}

let needs = true;
function apply() {
  U.base.value.set(S.base); U.stC.value.set(S.st.color); U.acC.value.set(S.ac.color);
  U.st.value.set(S.st.f, S.st.r, 0, S.st.on ? S.st.wIn * IN : 0); U.ac.value.set(S.ac.f, S.ac.r, S.ac.on ? 1 : 0, S.ac.boom ? 1 : 0);
  const matte = S.finish === 'matte'; body.roughness = matte ? 0.82 : 0.28; body.metalness = 0; body.envMapIntensity = matte ? 0.5 : 1.0;
  skidMat.color.set(S.sk.on ? S.sk.color : '#cfd2d4');
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
  if (spin) { spinAbout(mrot, MR, MAXIS, dt * 40); spinAbout(trot, TR, new THREE.Vector3(0, 0, 1), dt * 230); needs = true; }
  if (controls.update() || needs) { needs = false; draw(); } });
syncUI(); apply();
const cam = (q.get('cam') || '').split(',').map(Number);
if (cam.length >= 3 && !isNaN(cam[0])) setCam(cam[0], cam[1], cam[2], cam.length >= 6 ? [cam[3], cam[4], cam[5]] : null, cam[6] || null); else setCam(...VIEWS['3/4 front']);
$('loading').remove();
window.APP = { GEAR, CAB, THREE, scene, camera, renderer, setCam, P, apply, PRESETS, get S() { return S; }, set S(v) { S = { ...DEF(), ...v }; syncUI(); apply(); }, draw, LET, MARKS, MR, TR };
requestAnimationFrame(() => requestAnimationFrame(() => { draw(); document.title = 'done'; }));
