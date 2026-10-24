// Text / cross decals projected onto the fuselage with DecalGeometry. Each item is projected separately on the
// left and right side with the projector rotated so the text reads left-to-right from both sides (never mirrored).
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { P } from './kits.js';
function textTexture(text, color, font = '700 160px "Arial Narrow", Arial, Helvetica, sans-serif') {
  const c = document.createElement('canvas'); const g = c.getContext('2d'); g.font = font;
  const w = Math.max(64, Math.ceil(g.measureText(text).width) + 40); c.width = w; c.height = 200;
  g.font = font; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 20, 104);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { t, aspect: w / 200 };
}
function crossTexture(color) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); g.fillStyle = color; g.fillRect(88, 24, 80, 208); g.fillRect(24, 88, 208, 80);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// placements: a (aft of nose), y, half-width of hull there (projector centre), height of text in metres
export const SPOTS = {
  tail: { a: 12.55, y: 1.62, hw: 0.30, h: 0.34, depth: 0.7 },
  program: { a: 7.15, y: 2.05, hw: 1.20, h: 0.24, depth: 0.9 },
  logo: { a: 2.55, y: 1.20, hw: 1.30, h: 0.20, depth: 0.9 },
  cross: { a: 4.15, y: 1.72, hw: 1.30, h: 0.62, depth: 0.9 },
};
export function buildDecals(mesh, s) {
  const g = new THREE.Group(); g.name = 'decals';
  const items = [];
  if (s.tail) items.push(['tail', s.tail]);
  if (s.program) items.push(['program', s.program]);
  if (s.logo) items.push(['logo', s.logo]);
  for (const [k, text] of items) {
    const sp = SPOTS[k]; const { t, aspect } = textTexture(text, s.colors.text);
    const w = sp.h * aspect * 1.0;
    for (const side of [1, -1]) {
      // right side (+z): projector x axis = +x (toward nose) so text reads nose-ward; left side: rotate 180 deg about y
      const ori = new THREE.Euler(0, side > 0 ? 0 : Math.PI, 0);
      const pos = P(sp.a, sp.y, side * sp.hw);
      const geo = new DecalGeometry(mesh, pos, ori, new THREE.Vector3(w, sp.h * 1.25, sp.depth));
      const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.6 });
      const o = new THREE.Mesh(geo, m); o.receiveShadow = true; o.renderOrder = 2; g.add(o);
    }
  }
  if (s.cross) {
    const t = crossTexture(s.colors.cross); const sp = SPOTS.cross;
    for (const side of [1, -1]) {
      const geo = new DecalGeometry(mesh, P(sp.a, sp.y, side * sp.hw), new THREE.Euler(0, side > 0 ? 0 : Math.PI, 0), new THREE.Vector3(sp.h, sp.h, sp.depth));
      const o = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.6 }));
      o.renderOrder = 2; g.add(o);
    }
  }
  return g;
}
