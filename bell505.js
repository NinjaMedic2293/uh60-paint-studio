// Bell 505 Jet Ranger X paint studio. Geometry: original subdivision-surface model built in Blender from the Bell spec-book three-view (model/bell505.glb).
// World frame matches the UH-60 page: nose tip at x = 6.243, +y up, +z right side, ground y = 0.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadFonts, createMarks, newText, IN } from './lettering.js';
import { setupLettering } from './lettering-ui.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const NX = 6.243, $ = id => document.getElementById(id), q = new URLSearchParams(location.search);
const KEY = 'bell505-schemes', CUR = 'bell505-current';
if (q.has('shot')) document.body.classList.add('shot');
$('aircraft').onchange = e => { if (e.target.value === 'uh60') location.href = 'index.html'; if (e.target.value === '206') location.href = 'bell.html'; };

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMappingExposure = 0.7; // deeper reds, closer to photos
const scene = new THREE.Scene(); scene.background = new THREE.Color(q.get('bg') || '#c9d3dc'); const SKYBG = !q.get('bg');
// procedural outdoor sky environment: warm hazy horizon, soft blue zenith, darker ground, sun glow + cloud bands (soft, natural reflections)
{ const es = new THREE.Scene(), sg = new THREE.SphereGeometry(50, 64, 32), col = [], v = new THREE.Vector3(), sd = new THREE.Vector3(9, 16, 7).normalize();
  const zen = new THREE.Color('#7f9cbc'), hor = new THREE.Color('#f2e8dc'), gnd = new THREE.Color('#5e5850'), sunC = new THREE.Color('#fff4e0');
  for (let i = 0; i < sg.attributes.position.count; i++) { v.fromBufferAttribute(sg.attributes.position, i).normalize(); const c = new THREE.Color();
    if (v.y >= 0) c.copy(hor).lerp(zen, Math.pow(v.y, 0.6)); else c.copy(hor).lerp(gnd, Math.min(1, -v.y * 6));
    if (v.y > 0.05 && v.y < 0.4) c.lerp(new THREE.Color('#ffffff'), 0.9 * Math.pow(Math.max(0, Math.sin(v.x * 7 + v.z * 3)), 3) * (1 - Math.abs(v.y - 0.2) / 0.2));
    c.lerp(sunC, Math.pow(Math.max(0, v.dot(sd)), 40)); c.multiplyScalar(1 + 6 * Math.pow(Math.max(0, v.dot(sd)), 400)); col.push(c.r, c.g, c.b); }
  sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); es.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(es, 0.02).texture;
  if (SKYBG) { // outdoor backdrop matching the env: equirect sky gradient with soft clouds and a distant treeline
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024; const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#6f8fb3'); g.addColorStop(0.75, '#bfcad3'); g.addColorStop(1, '#e6e2da'); x.fillStyle = g; x.fillRect(0, 0, 2048, 512);
    let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 60; k++) { const cx = 150 + rnd() * 1748, cy = 250 + rnd() * 220, r = 30 + rnd() * 90, gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
    x.fillStyle = '#56624a'; x.beginPath(); x.moveTo(0, 512); for (let i = 0; i <= 2048; i += 2) x.lineTo(i, 512 - (2.5 + 3 * Math.abs(Math.sin(i * 0.011) + 0.6 * Math.sin(i * 0.047)) + 1.2 * Math.sin(i * 0.31) * Math.sin(i * 0.07))); x.lineTo(2048, 512); x.fill();
    x.fillStyle = '#6d7457'; x.fillRect(0, 512, 2048, 512);
    const t = new THREE.CanvasTexture(cv); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
    // sharp reflections: blend the detailed backdrop (clouds, treeline, horizon) into the environment
    { const pm = new THREE.PMREMGenerator(renderer), es2 = new THREE.Scene(); es2.add(new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide }))); const sunM = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 7.6, 7) })); sunM.position.copy(sd).multiplyScalar(45); es2.add(sunM); scene.environment = pm.fromScene(es2, 0).texture; } } } scene.environmentIntensity = 1.5;
const sun = new THREE.DirectionalLight('#fff1e0', 1.0); sun.position.set(9, 16, 7); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, new THREE.HemisphereLight('#fff0dc', '#7a5844', 1.6));
function groundMat() { if (!SKYBG) return new THREE.MeshStandardMaterial({ color: '#8e8b84', roughness: 0.92 });
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const x = cv.getContext('2d'); x.fillStyle = '#5f6b3c'; x.fillRect(0, 0, 1024, 1024);
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 160000; k++) { const v = 70 + rnd() * 50 | 0; x.fillStyle = `rgb(${v - 10},${v + 15},${v - 40})`; x.fillRect(rnd() * 1024, rnd() * 1024, 1, 1); }
  const r = 512 * 9 / 80; x.fillStyle = '#6e6d69'; x.beginPath(); x.arc(512, 512, r, 0, 7); x.fill(); // tarmac pad under the aircraft
  for (let k = 0; k < 6000; k++) { const a = rnd() * 7, d = Math.sqrt(rnd()) * r, v = 95 + rnd() * 30 | 0; x.fillStyle = `rgb(${v},${v},${v - 4})`; x.fillRect(512 + Math.cos(a) * d, 512 + Math.sin(a) * d, 1, 1); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); }
const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), groundMat());
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
{ const cv = document.createElement('canvas'); cv.width = cv.height = 256; const cx = cv.getContext('2d'), gr = cx.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256);
  const cs = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  cs.scale.set(2.6, 1.3, 1); cs.rotation.x = -Math.PI / 2; cs.position.set(6.243 - 2.4, 0.004, 0); cs.renderOrder = 1; scene.add(cs); } // soft contact shadow / ambient occlusion under the airframe
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true;
controls.minDistance = 2; controls.maxDistance = 60; controls.maxPolarAngle = Math.PI * 0.995;

// ---------- model
const gltf = await new GLTFLoader().loadAsync('model/bell505.glb');
const P = {}; gltf.scene.traverse(o => { if (o.isMesh) { P[o.name] = o; o.castShadow = o.receiveShadow = o.name !== 'glass';
  const m = o.material; if (o.name === 'body' || o.name === 'glass') { const pm = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(pm, m); o.material = pm; } } });
P.glass.material.transparent = true; P.glass.material.depthWrite = false; P.glass.renderOrder = 2;
scene.add(gltf.scene);
const ctr = n => { const b = new THREE.Box3().setFromObject(P[n]); return b.getCenter(new THREE.Vector3()); };
const MR = ctr('mrhub'), TR = ctr('trhub'); // rotor is modelled with the 3.5 deg forward mast tilt
const TILT = 3.5 * Math.PI / 180, MAXIS = new THREE.Vector3(Math.sin(TILT), Math.cos(TILT), 0);
const DIM = { mrR: new THREE.Box3().setFromObject(P.mrblade).getSize(new THREE.Vector3()).toArray().sort((a,b)=>b-a)[0] / 2, trR: new THREE.Box3().setFromObject(P.trblade).getSize(new THREE.Vector3()).y / 2 };
const U = { base: { value: new THREE.Color() }, stC: { value: new THREE.Color() }, st: { value: new THREE.Vector4() }, acC: { value: new THREE.Color() }, ac: { value: new THREE.Vector4() } };
// body: greyscale detail map (livery removed offline) x zone colour picked from world position
const body = P.body.material; body.color.set('#ffffff');
body.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; varying vec3 vNw;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz; vNw = normalize(mat3(modelMatrix) * objectNormal);');
  sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor *= 0.8 + 0.4 * vn(vW * 6.0);').replace('#include <common>', `#include <common>
varying vec3 vW; varying vec3 vNw; uniform vec3 base, stC, acC; uniform vec4 st, ac;
float hn(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hn(i), hn(i + vec3(1,0,0)), f.x), mix(hn(i + vec3(0,1,0)), hn(i + vec3(1,1,0)), f.x), f.y), mix(mix(hn(i + vec3(0,0,1)), hn(i + vec3(1,0,1)), f.x), mix(hn(i + vec3(0,1,1)), hn(i + vec3(1,1,1)), f.x), f.y), f.z); }
float bakedAO() { vec3 n = normalize(vNw); float down = smoothstep(0.2, -0.9, n.y); float low = 1.0 - smoothstep(0.3, 1.4, vW.y);
  return 1.0 - 0.35 * down - 0.15 * low * (0.5 + 0.5 * down); }
vec3 zoneCol() { float a = ${NX.toFixed(3)} - vW.x; float t = clamp(a / 10.0, 0.0, 1.0); vec3 c = base;
  float aw = fwidth(vW.y) + 0.002;
  if (ac.z > 0.5 && (ac.w > 0.5 || a < 5.3)) { float ly = mix(ac.x, ac.y, t); c = mix(c, acC, 1.0 - smoothstep(ly - aw, ly + aw, vW.y)); }
  if (st.w > 0.0) { float cy = mix(st.x, st.y, t); float d = abs(vW.y - cy) - st.w * 0.5; c = mix(c, stC, (1.0 - smoothstep(-aw, aw, d)) * smoothstep(0.9, 0.75, abs(normalize(vNw).y))); }
  return c; }`).replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = zoneCol() * (0.97 + 0.06 * vn(vW * 2.5)) * bakedAO();');
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
  'Plain bright red': { base: '#D10000', finish: 'gloss', st: { on: false, color: '#ffffff', wIn: 6, f: 1.25, r: 1.70 }, ac: { on: false, color: '#ffffff', f: 0.95, r: 1.55, boom: false } },
};
const DEF = () => ({ aircraft: 'bell505', name: '', ...JSON.parse(JSON.stringify(PRESETS['Plain bright red'])), glass: 'dark', sk: { on: false, color: '#2b2b2b' }, tp: { on: false, color: '#ffffff' }, marks: [] });
let S = (() => { try { const s = JSON.parse(localStorage.getItem(CUR)); if (s && s.aircraft === 'bell505') return { ...DEF(), ...s }; } catch {} return DEF(); })();
if (q.has('scheme')) try { S = { ...DEF(), ...JSON.parse(q.get('scheme')) }; } catch {}

let needs = true;
function apply() {
  U.base.value.set(S.base); U.stC.value.set(S.st.color); U.acC.value.set(S.ac.color);
  U.st.value.set(S.st.f, S.st.r, 0, S.st.on ? S.st.wIn * IN : 0); U.ac.value.set(S.ac.f, S.ac.r, S.ac.on ? 1 : 0, S.ac.boom ? 1 : 0);
  const matte = S.finish === 'matte'; body.roughness = matte ? 0.82 : 0.38; body.metalness = 0; body.envMapIntensity = matte ? 0.5 : 1.0; body.clearcoat = matte ? 0 : 1; body.clearcoatRoughness = 0.06;
  if (S.sk.on) { skidMat.color.set(S.sk.color); skidMat.metalness = 0.1; } else { skidMat.color.set('#2c2d2f'); skidMat.metalness = 0.3; }
  { const g = P.glass.material, dk = S.glass !== 'clear'; g.color.set(dk ? '#141b20' : '#9fb6c4'); g.opacity = dk ? 0.66 : 0.40; g.envMapIntensity = dk ? 4.5 : 1.8; g.clearcoat = 1; g.clearcoatRoughness = 0.03; g.needsUpdate = true; }
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
  if (spin) { spinAbout(mrot, MR, MAXIS, dt * 40); spinAbout(trot, TR, new THREE.Vector3(0, 0, 1), dt * 230); needs = true; }
  if (controls.update() || needs) { needs = false; draw(); } });
syncUI(); apply();
const cam = (q.get('cam') || '').split(',').map(Number);
if (cam.length >= 3 && !isNaN(cam[0])) setCam(cam[0], cam[1], cam[2], cam.length >= 6 ? [cam[3], cam[4], cam[5]] : null, cam[6] || null); else setCam(...VIEWS['3/4 front']);
$('loading').remove();
window.APP = { THREE, scene, camera, renderer, setCam, P, apply, PRESETS, get S() { return S; }, set S(v) { S = { ...DEF(), ...v }; syncUI(); apply(); }, draw, LET, MARKS, MR, TR };
requestAnimationFrame(() => requestAnimationFrame(() => { draw(); document.title = 'done'; }));
