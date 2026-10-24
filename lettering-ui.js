// Lettering panel + on-model interaction: click-to-place, drag across the surface, wheel to resize (live inches), Shift+wheel to rotate.
import * as THREE from 'three';
import { FONTS, USCG, FAA, newText, IN } from './lettering.js';
const NX = 6.243;
export function setupLettering({ marks, fm, camera, renderer, controls, getS, onChange, requestDraw }) {
  const $ = id => document.getElementById(id); const el = renderer.domElement; const tip = $('markTip');
  let sel = null, placing = null, drag = null, eat = false;
  const ray = new THREE.Raycaster();
  const ndc = e => { const r = el.getBoundingClientRect(); return new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); };
  const L = () => (getS().marks = getS().marks || []);
  const byId = id => L().find(m => m.id === id);
  function showTip(e, it, extra = '') { if (!it) { tip.hidden = true; return; } const r = el.getBoundingClientRect(); tip.hidden = false; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px';
    tip.textContent = `${label(it)}: ${it.hIn.toFixed(1)} in tall (${(it.hIn * 2.54).toFixed(1)} cm)${extra}`; }
  const label = it => it.kind === 'text' ? `“${it.text}”` : ({ jet: 'JET INTAKE chevron', danger: 'DANGER box', rescue: 'RESCUE arrow' })[it.kind];
  function hitMark(e) { ray.setFromCamera(ndc(e), camera); const h = ray.intersectObjects(marks.meshes(), false)[0]; return h ? h.object.userData : null; }
  function hitSurf(e) { ray.setFromCamera(ndc(e), camera); return ray.intersectObject(fm, false)[0] || null; }
  const changed = (full = false) => { marks.sync(L()); requestDraw(); if (full) { render(); onChange(); } };
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (placing) { const h = hitSurf(e); const it = byId(placing); if (h && it) { it.a = NX - h.point.x; it.y = h.point.y; it.side = h.point.z > 0 ? 1 : -1; sel = it.id; } placing = null; el.style.cursor = ''; eat = true; e.stopImmediatePropagation(); changed(true); return; }
    const m = hitMark(e); if (!m) return;
    sel = m.mid; const it = byId(sel); if (!it) return;
    drag = { id: sel, side: m.side }; eat = true; controls.enabled = false; e.stopImmediatePropagation(); el.setPointerCapture(e.pointerId); render(); showTip(e, it);
  }, { capture: true });
  el.addEventListener('pointermove', e => {
    if (!drag) { const m = hitMark(e); el.style.cursor = placing ? 'crosshair' : m ? 'grab' : ''; return; }
    const it = byId(drag.id); const h = hitSurf(e); if (!it || !h) return;
    it.a = +(NX - h.point.x).toFixed(3); it.y = +h.point.y.toFixed(3); const sd = h.point.z > 0 ? 1 : -1; if (!it.both) it.side = sd;
    showTip(e, it, `  @ ${(it.a / IN).toFixed(0)} in aft of nose, ${(it.y / IN).toFixed(0)} in above ground`); changed();
  });
  el.addEventListener('pointerup', e => { if (eat) { eat = false; e.stopImmediatePropagation(); } if (!drag) return; drag = null; controls.enabled = true; tip.hidden = true; changed(true); }, { capture: true });
  el.addEventListener('wheel', e => {
    const m = hitMark(e); if (!m) return; const it = byId(m.mid); if (!it) return;
    e.preventDefault(); e.stopImmediatePropagation(); sel = it.id;
    if (e.shiftKey) it.rot = Math.round(((it.rot || 0) + (e.deltaY > 0 ? -2 : 2)) * 10) / 10;
    else it.hIn = Math.max(0.5, Math.round(it.hIn * (e.deltaY > 0 ? 0.96 : 1.04) * 10) / 10);
    showTip(e, it, e.shiftKey ? `, rot ${it.rot}°` : ''); changed(); clearTimeout(wt); wt = setTimeout(() => { tip.hidden = true; render(); onChange(); }, 700);
  }, { capture: true, passive: false });
  let wt = 0;
  // ---------- panel
  const fontOpts = FONTS.map(f => `<option value="${f[0]}">${f[0]} (${f[3]})</option>`).join('');
  function row(it) {
    const isT = it.kind === 'text';
    const faaChk = isT && it.faa ? (it.hIn >= 12 ? '<span class="ok">✓ ≥12 in (45.29(b)(3))</span>' : '<span class="bad">✗ under 12 in</span>') : '';
    const dsz = isT && /^(RESTRICTED|EXPERIMENTAL|LIMITED|PROVISIONAL)$/i.test(it.text) ? (it.hIn >= 2 && it.hIn <= 6 ? '<span class="ok">✓ 2–6 in (45.23(b))</span>' : '<span class="bad">✗ must be 2–6 in</span>') : '';
    return `<div class="mark ${it.id === sel ? 'sel' : ''}" data-id="${it.id}">
      <div class="row">${isT ? `<input data-k="text" value="${(it.text || '').replace(/"/g, '&quot;')}" maxlength="40">` : `<b>${label(it)}</b>`}
        <button data-act="place" title="Click on the model to place">Place</button><button data-act="dup">Dup</button><button data-act="del">✕</button></div>
      ${isT ? `<div class="row"><select data-k="font">${fontOpts}</select><label><input type="checkbox" data-k="faa" ${it.faa ? 'checked' : ''}> FAA proportions</label></div>` : ''}
      <div class="row"><input type="color" data-k="color" value="${it.color}" title="Colour">${isT ? `<input type="color" data-k="outline" value="${it.outline || '#ffffff'}" title="Outline colour"><label>Outline <input type="number" data-k="outlineIn" step="0.1" min="0" max="3" value="${it.outlineIn || 0}"> in</label>` : `<input type="color" data-k="color2" value="${it.color2}" title="Text / outline colour">`}</div>
      <div class="row"><label>Height <input type="number" data-k="hIn" step="0.5" min="0.5" max="96" value="${it.hIn}"> in</label><input type="range" data-k="hIn" min="0.5" max="48" step="0.5" value="${it.hIn}"><span class="hin">${it.hIn.toFixed(1)} in</span>${faaChk}${dsz}</div>
      <div class="row"><label>Rotate <input type="range" data-k="rot" min="-180" max="180" step="1" value="${it.rot || 0}"></label>${isT && !it.faa ? `<label>Width <input type="range" data-k="sx" min="0.5" max="1.6" step="0.02" value="${it.sx || 1}"></label>` : ''}</div>
      <div class="row"><label><input type="checkbox" data-k="both" ${it.both ? 'checked' : ''}> Mirror to other side</label><select data-k="side" ${it.both ? 'disabled' : ''}><option value="1">Right side</option><option value="-1">Left side</option></select>
        <span class="hint">${(it.a / IN).toFixed(0)} in aft, ${(it.y / IN).toFixed(0)} in up</span></div></div>`;
  }
  function render() {
    const s = getS(); const box = $('marks'); box.innerHTML = L().map(row).join('') || '<em>No lettering. Add text or a quick-start below.</em>';
    box.querySelectorAll('.mark').forEach(d => { const it = byId(d.dataset.id);
      d.querySelectorAll('select[data-k="font"]').forEach(x => x.value = it.font); d.querySelectorAll('select[data-k="side"]').forEach(x => x.value = String(it.side || 1));
      d.onclick = () => { if (sel !== it.id) { sel = it.id; box.querySelectorAll('.mark').forEach(z => z.classList.toggle('sel', z.dataset.id === sel)); } };
      d.querySelectorAll('[data-k]').forEach(x => { const k = x.dataset.k; const ev = x.type === 'range' || x.type === 'text' || x.type === 'color' ? 'input' : 'change';
        x.addEventListener(ev, () => { let v = x.type === 'checkbox' ? x.checked : x.type === 'number' || x.type === 'range' ? +x.value : x.value; if (k === 'side') v = +v; it[k] = v;
          if (k === 'hIn') { d.querySelectorAll('[data-k="hIn"]').forEach(z => { if (z !== x) z.value = v; }); d.querySelector('.hin').textContent = (+v).toFixed(1) + ' in'; }
          changed(); });
        x.addEventListener('change', () => { render(); onChange(); }); });
      d.querySelectorAll('[data-act]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const a = b.dataset.act;
        if (a === 'del') { s.marks = L().filter(m => m !== it); changed(true); }
        if (a === 'dup') { const c = { ...JSON.parse(JSON.stringify(it)), id: 'm' + Math.random().toString(36).slice(2, 9) }; c.y -= c.hIn * IN * 1.6; L().push(c); changed(true); }
        if (a === 'place') { placing = it.id; el.style.cursor = 'crosshair'; } }); });
    $('uscgJet').checked = L().some(m => m.group === 'jet'); $('uscgRescue').checked = L().some(m => m.group === 'rescue');
  }
  $('addText').onclick = () => { const it = newText({ text: 'TEXT' }); L().push(it); sel = it.id; placing = it.id; el.style.cursor = 'crosshair'; changed(true); };
  $('faaN').onclick = () => { L().push(...FAA.nnumber()); changed(true); };
  $('faaR').onclick = () => { L().push(...FAA.restricted('RESTRICTED')); changed(true); };
  $('faaX').onclick = () => { L().push(...FAA.restricted('EXPERIMENTAL')); changed(true); };
  const tog = (id, g) => $(id).onchange = e => { const s = getS(); s.marks = L().filter(m => m.group !== g); if (e.target.checked) s.marks.push(...USCG[g]()); changed(true); };
  tog('uscgJet', 'jet'); tog('uscgRescue', 'rescue');
  return { render, sync: () => { marks.sync(L()); render(); } };
}
