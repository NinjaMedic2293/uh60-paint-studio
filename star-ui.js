// Texas-flag star: drag it within the blue field on the model, mouse-wheel to resize, or use the panel (sizes in real-world inches).
// The star stays inside the blue field: its centre is clamped so the star's points never cross the field's aft edge (paint-break plane P1).
import * as THREE from 'three';
import { IN } from './lettering.js';
const NX = 6.243;
export const STAR_DEFAULT = { a: 3.0, y: 1.62, size: 0.75 };
const R = st => st.size * 124 / 256; // tip radius of the star artwork
export function clampStar(s) {
  const st = s.star; if (!st) return;
  const v = (s.planes || []).find(p => p.kind === 'vertical'); const aft = v ? v.a : 4.10;
  st.size = Math.min(1.5, Math.max(4 * IN, st.size)); const r = R(st);
  st.a = Math.min(aft - r - 0.02, Math.max(1.3 + r, st.a)); st.y = Math.min(2.25 - r, Math.max(1.0 + r, st.y));
}
export function setupStar({ fm, camera, renderer, controls, getS, getDecals, apply }) {
  const $ = id => document.getElementById(id); const el = renderer.domElement; const tip = $('markTip'); const ray = new THREE.Raycaster();
  const ndc = e => { const r = el.getBoundingClientRect(); return new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); };
  const hitStar = e => { const d = getDecals(); if (!d || !getS().star) return false; const ms = []; d.traverse(o => { if (o.userData.star) ms.push(o); }); ray.setFromCamera(ndc(e), camera); return ray.intersectObjects(ms, false).length > 0; };
  const show = e => { const st = getS().star, r = el.getBoundingClientRect(); tip.hidden = false; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px'; tip.textContent = `Texas star: ${(st.size / IN).toFixed(1)} in across the points`; };
  const upd = () => { clampStar(getS()); apply(); render(); };
  let drag = false, wt = 0;
  el.addEventListener('pointerdown', e => { if (e.button !== 0 || !hitStar(e)) return; drag = true; controls.enabled = false; e.stopImmediatePropagation(); el.setPointerCapture(e.pointerId); show(e); }, { capture: true });
  el.addEventListener('pointermove', e => { if (!drag) { if (hitStar(e)) el.style.cursor = 'grab'; return; } ray.setFromCamera(ndc(e), camera); const h = ray.intersectObject(fm, false)[0]; if (!h) return;
    const st = getS().star; st.a = +(NX - h.point.x).toFixed(3); st.y = +h.point.y.toFixed(3); upd(); show(e); }, { capture: true });
  el.addEventListener('pointerup', e => { if (!drag) return; drag = false; controls.enabled = true; tip.hidden = true; e.stopImmediatePropagation(); }, { capture: true });
  el.addEventListener('wheel', e => { if (!hitStar(e)) return; e.preventDefault(); e.stopImmediatePropagation(); const st = getS().star;
    st.size = Math.round(st.size / IN * (e.deltaY > 0 ? 0.96 : 1.04) * 10) / 10 * IN; upd(); show(e); clearTimeout(wt); wt = setTimeout(() => tip.hidden = true, 700); }, { capture: true, passive: false });
  function render() {
    const st = getS().star; $('starBox').hidden = !st; if (!st) return;
    const sz = (st.size / IN).toFixed(1); $('starIn').value = sz; $('starRng').value = sz; $('starHin').textContent = `${sz} in (${(st.size * 100).toFixed(0)} cm)`;
    $('starA').value = ((st.a - STAR_DEFAULT.a) / IN).toFixed(1); $('starY').value = ((st.y - STAR_DEFAULT.y) / IN).toFixed(1);
  }
  const num = (id, f) => $(id).addEventListener('input', e => { const v = +e.target.value; if (!isFinite(v)) return; f(getS().star, v); clampStar(getS()); apply(); if (id === 'starRng' || id === 'starIn') { const st = getS().star; $('starHin').textContent = `${(st.size / IN).toFixed(1)} in (${(st.size * 100).toFixed(0)} cm)`; $(id === 'starRng' ? 'starIn' : 'starRng').value = (st.size / IN).toFixed(1); } });
  num('starIn', (st, v) => st.size = v * IN); num('starRng', (st, v) => st.size = v * IN);
  num('starA', (st, v) => st.a = STAR_DEFAULT.a + v * IN); num('starY', (st, v) => st.y = STAR_DEFAULT.y + v * IN);
  ['starIn', 'starA', 'starY'].forEach(id => $(id).addEventListener('change', render));
  $('starReset').onclick = () => { Object.assign(getS().star, STAR_DEFAULT); apply(); render(); };
  return { render };
}
