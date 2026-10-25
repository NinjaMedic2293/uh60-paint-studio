// Procedural zone mask evaluated per fragment in model space (metres; a = metres aft of the nose tip).
// Break positions are aligned to panel lines read off the model's own texture (see BREAKS).
import * as THREE from 'three';
import { ZONES } from './schemes.js';
export const ZKEYS = ZONES.map(z => z[0]);
export const BREAKS = {
  NX: 6.243,          // fuselage nose tip x
  noseA: 1.42,        // nose cone / windshield-frame panel joint
  agA: 1.92,          // MH-60T black break: panel joint just ahead of the cockpit door
  belt: 1.02,         // belly break: lower longeron panel line
  s0: 1.50, s1: 1.68, // cheat line band (window-sill panel row)
  cowlY: 2.74,        // cowling lower edge (cabin roof line)
  door0: 3.30, door1: 5.02, doorY0: 0.70, doorY1: 2.62, // sliding cabin door panel
  boomA: 8.30,        // cabin / tail cone joint
  band0: 11.25, band1: 11.95, // tail band
  finA: 13.80, finY: 2.05, stabA: 13.20,
  rotorHub: [1.63, 0.0], rotorR: 8.26, tipLen: 0.55,
  trHub: [-8.36, 3.91], trR: 1.52, trTip: 0.20,
};
const glsl = (n) => n.toFixed(4);
export const MAXP = 8, MAXR = 8;
// MH-60T anti-glare: side break curve from belly (aBelly at y<=yLow) up to the windscreen rear upper corner (aTop,yTop);
// above yRoof (within |z|<zRoof) the black covers the cabin roof back to the upper-cowling forward edge (aRoof).
export const AG = [1.40, 0.80, 1.78, 2.25];
export const AGC = { a0: 1.80, a1: 2.80, y: 2.405, z: 0.72 };
// v9.3: the single large upper access door (sliding cover) is panel 100 in model/panels.png; it stays body colour to its edge
export const AG_DOOR_PID = 100;
// v10.1: MH-60T break follows the real seams (6003/6008/6029/6019): the whole nose skin panel on each side (76 L / 43 R)
// is black and ends at the cockpit-door forward frame seam (a~1.25, vertical from the chin up to the sill, then raked aft up the windscreen post);
// nose tip / chin panels are black; under the chin the break is a straight transverse line at that same station.
// The cockpit doors (73 / 40) and the upper access door (100) stay body colour; the cockpit roof keeps the agf roof rule.
export const AG_NOSE_PIDS = [76, 43, 45, 77, 70, 38, 5, 24, 13];
export const AG_BELLY_PIDS = [3, 9, 17, 23, 27, 34, 66];
export const AG_BREAK_A = 1.25; // cockpit-door forward frame seam (MH-60T 6003/6008)
export const AG_POST_K = 0.56, AG_POST_Y = 1.45; // break rakes aft up the windscreen post
// v10.2: post black widened aft (6003/6008/6029: black ~0.08 m wider than the glass edge, onto the door frame);
// v10.4 (6003 matched-camera overlay): no sill step; door-window forward/upper frame stays body colour; a black
// 'eyebrow' runs along the roof rail above the door window (y>AG_BROW_Y) from the windscreen aft to the door aft frame.
export const AG_BROW_Y = 2.17, AG_BROW_A = 2.17;
// bottom of the break curves forward around the chin-window frame's lower-aft corner into the belly (6003).
export const AG_POST_W = 0.0, AG_CHIN_DA = 0.05, AG_CHIN_Y0 = 0.90, AG_CHIN_Y1 = 0.62;
const pidList = (L) => L.map(i => `abs(id-${i}.0)<0.5`).join(' || ');

export const AGQ = [2.40, 2.28, 0.95, 0];
export function zoneUniforms() {
  const u = { uC: { value: ZKEYS.map(() => new THREE.Color()) }, uAG: { value: 0 }, uNac: { value: 0 }, uST: { value: 0 }, uDbg: { value: 0 },
    // anti-glare break (re-derived from MH-60T photos): x = a of the vertical break just ahead of the cockpit-door front frame/hinges,
    // y = door-window sill height where it turns to follow the windscreen rear pillar, z = aft slope of that pillar (m a per m y),
    // w = windscreen top / roof line height; above it the break holds at the windscreen top edge
    uAGp: { value: new THREE.Vector4(...AG) }, uAGq: { value: new THREE.Vector4(...AGQ) },
    uPN: { value: 0 }, uPl: { value: Array.from({ length: MAXP }, () => new THREE.Vector4(0, 1, 0, -99)) },
    uRN: { value: 0 }, uRS: { value: Array.from({ length: MAXR * 2 }, () => new THREE.Vector4()) }, uRC: { value: Array.from({ length: MAXR }, () => new THREE.Color()) },
    uPanId: { value: null }, uPanC: { value: null }, uPanOn: { value: 0 } };
  return u;
}
const B = BREAKS;
const ZI = k => ZKEYS.indexOf(k);
// kind 0 fuselage, 1 main rotor, 2 tail rotor
function zoneGLSL(kind) {
  if (kind === 1) return `int zf(vec3 w){ float r=length(w.xz-vec2(${glsl(B.rotorHub[0])},${glsl(B.rotorHub[1])})); if(r>${glsl(B.rotorR - B.tipLen)}) return ${ZI('tips')}; if(r>1.05) return ${ZI('blades')}; return -1; }`;
  if (kind === 2) return `int zf(vec3 w){ float r=length(w.xy-vec2(${glsl(B.trHub[0])},${glsl(B.trHub[1])})); if(r>${glsl(B.trR - B.trTip)}) return ${ZI('tips')}; if(r>0.30) return ${ZI('blades')}; return -1; }`;
  return `int zf(vec3 w){
    float a=${glsl(B.NX)}-w.x, y=w.y, az=abs(w.z);
    if(a>${glsl(B.finA)} && y>${glsl(B.finY)} && az<0.55) return ${ZI('fin')};
    if(a>${glsl(B.stabA)} && az>0.42 && y<2.6) return ${ZI('stab')};
    if(a>2.7 && a<4.25 && az>0.95 && y<1.05) return ${ZI('gear')};
    if(a>11.3 && a<12.8 && y<0.95 && az<0.35) return ${ZI('gear')};
    if(a<${glsl(B.noseA)} && y<1.62) return ${ZI('nose')};
    if(a>${glsl(B.boomA)}){ if(a>${glsl(B.band0)} && a<${glsl(B.band1)}) return ${ZI('band')}; return ${ZI('boom')}; }
    if(y>${glsl(B.cowlY)} && a>2.55) return ${ZI('cowl')};
    if(az>0.9 && a>${glsl(B.door0)} && a<${glsl(B.door1)} && y>${glsl(B.doorY0)} && y<${glsl(B.doorY1)}) return ${ZI('doors')};
    if(uST>0.5 && y>${glsl(B.s0)} && y<${glsl(B.s1)}) return ${ZI('stripe')};
    if(y<${glsl(B.belt)}) return ${ZI('belly')};
    return ${ZI('upper')};
  }`;
}
const NACD = `#define NAC_IY 2.68\n#define NAC_IZ 0.965\n#define NAC_IR 0.315\n#define NAC_IA0 4.22\n#define NAC_IA1 5.0\n#define NAC_IL 4.56\n#define NAC_DR 0.255\n#define NAC_EA 6.98\n`;
const AGF = `bool agf(vec3 w){ float a=${glsl(B.NX)}-w.x; float t=clamp((w.y-uAGp.y)/(uAGp.w-uAGp.y),0.0,1.0); float lim=uAGp.x+(uAGp.z-uAGp.x)*sqrt(t); if(w.y>uAGq.y && abs(w.z)<uAGq.z) lim=max(lim,uAGq.x); return a<lim; }`;
const AGPAN = `float agBrk(float y){ float c=smoothstep(${glsl(AG_CHIN_Y0)},${glsl(AG_CHIN_Y1)},y);
  return ${glsl(AG_BREAK_A)} - ${glsl(AG_CHIN_DA)}*c*c + max(0.0,y-${glsl(AG_POST_Y)})*${glsl(AG_POST_K)} + ${glsl(AG_POST_W)}*step(${glsl(AG_POST_Y)},y); }
bool agPan(vec2 uv, vec3 w){ if(uPanOn<0.5) return agf(w) && vNac<2.5;
  float id=floor(texture2D(uPanId,uv).r*255.0+0.5); float a=${glsl(B.NX)}-w.x;
  if(abs(id-${AG_DOOR_PID}.0)<0.5) return false;
  if(w.y>${glsl(AG_BROW_Y)} && a<${glsl(AG_BROW_A)} && a>0.8) return true;
  if(${pidList(AG_NOSE_PIDS)}) return a < agBrk(w.y) || (w.y>uAGq.y && agf(w));
  if(${pidList(AG_BELLY_PIDS)}) return a<agBrk(w.y);
  return w.y>uAGq.y && agf(w); }`;
const DBG = `vec3 dbgC(int i){ float h=fract(float(i)*0.618); return 0.5+0.5*cos(6.2832*(h+vec3(0.0,0.33,0.67))); }`;
export function patchMaterial(m, kind, U, ref) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U); sh.uniforms.uRef = { value: ref };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;' + (kind === 0 ? '\nattribute float aNac; varying float vNac;' : ''))
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW=(modelMatrix*vec4(transformed,1.0)).xyz;' + (kind === 0 ? ' vNac=aNac;' : ''));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vW; uniform vec3 uC[${ZKEYS.length}]; ${kind === 0 ? 'varying float vNac;' : ''} uniform float uNac,uAG,uST,uDbg,uRef,uPanOn; uniform vec4 uAGp,uAGq;
      uniform int uPN,uRN; uniform vec4 uPl[${MAXP}]; uniform vec4 uRS[${MAXR * 2}]; uniform vec3 uRC[${MAXR}];
      uniform sampler2D uPanId, uPanC; float agM=0.0; ${DBG} ${AGF}
      ${kind === 0 ? AGPAN : ''}
      ${kind === 0 ? `bool agDoor(vec2 uv){ if(uPanOn>0.5){ float id=floor(texture2D(uPanId,uv).r*255.0+0.5); return abs(id-${AG_DOOR_PID}.0)<0.5; } return vNac>2.5; }` : ''}
${NACD}
      ${zoneGLSL(kind)}`)
      .replace('#include <map_fragment>', `
      vec4 tx=texture2D(map,vMapUv);
      int z=zf(vW);
      float pm = ${kind === 0 ? 'smoothstep(0.0,0.025,tx.g-max(tx.r,tx.b)*1.02)' : '1.0'};
      if(z<0) pm=0.0;
      float lum=dot(tx.rgb,vec3(.3,.59,.11))/uRef;
      vec3 col=uC[0]; for(int i=0;i<${ZKEYS.length};i++){ if(i==z) col=uC[i]; }
      ${kind === 0 ? `
      if(z>=0 && z!=${ZI('gear')}){
        // layer 2: paint-break plane regions (later regions win). uRS holds a -1/0/+1 side requirement per plane.
        for(int r=0;r<${MAXR};r++){ if(r>=uRN) break; bool ok=true;
          for(int p=0;p<${MAXP};p++){ if(p>=uPN) break; float req=uRS[r*2+p/4][p%4]; float sd=dot(uPl[p].xyz,vW)-uPl[p].w;
            if((req>0.5&&sd<0.0)||(req<-0.5&&sd>=0.0)) ok=false; }
          if(ok) col=uRC[r]; }
        // layer 3: individually painted panels (UV panel-ID map, split left/right by model z)
        if(uPanOn>0.5){ float pid=floor(texture2D(uPanId,vMapUv).r*255.0+0.5); float sd=vW.z>0.0?1.0:0.0;
          vec4 pc=texture2D(uPanC,vec2((pid+0.5)/256.0,(sd+0.5)/2.0));
          if(mod(pc.a,2.0)>0.5) col=pc.rgb;
          if(pc.a>1.5) col=mix(col,vec3(0.05,0.75,1.0),0.45); }
        // layer 4: MH-60T anti-glare on top, always matte
        if(uAG>0.5 && ${kind === 0 ? 'agPan(vMapUv, vW)' : 'agf(vW)'}){ col=uC[${ZI('antiglare')}]; agM=1.0; }
      }
      // layer 5: engine nacelle flat black, selected by mesh faces (markNacelles): 1 = inlet lip torus, 2 = exhaust opening surfaces
      if(uNac>0.5){ float nk=step(0.5,vNac)*step(vNac,2.5);
        if(nk>0.0){ col=uC[${ZI('nacelle')}]; pm=1.0; agM=1.0; lum=min(lum,1.0); } }` : ''}
      vec3 paint=col*clamp(mix(1.0,lum,0.85),0.45,1.45);
      if(uDbg>0.5 && z>=0) paint=dbgC(z)*clamp(lum,0.6,1.2);
      diffuseColor.rgb*=mix(tx.rgb,paint,pm); agM*=pm;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.95, agM);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n material.clearcoat *= (1.0-agM);\n#endif\n material.specularF90 *= mix(1.0,0.35,agM);');
  };
  m.customProgramCacheKey = () => 'zone' + kind;
  m.needsUpdate = true;
}
// mean linear luminance of the paint texels of a texture (for normalising panel-line shading)
export function textureRef(tex, kind) {
  const im = tex.image; if (!im) return 0.1;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.drawImage(im, 0, 0, 64, 64); const d = g.getImageData(0, 0, 64, 64).data; let s = 0, n = 0;
  const L = v => Math.pow(v / 255, 2.2);
  for (let i = 0; i < d.length; i += 4) { const r = L(d[i]), gg = L(d[i + 1]), b = L(d[i + 2]); if (kind === 0 && !(gg - Math.max(r, b) * 1.02 > 0)) continue; s += .3 * r + .59 * gg + .11 * b; n++; }
  return n ? s / n : 0.1;
}

// Per-face nacelle selection on the fuselage mesh (non-indexed): flags the inlet lip torus faces (forward-facing faces of the rim
// ring around each inlet opening) and the exhaust opening's own (unpainted, interior) faces. Writes attribute aNac (0/1/2).
export function markNacelles(mesh, matIndex, NX, img) {
  const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, n = P.count;
  const out = new Float32Array(n); const gr = g.groups.find(q => q.materialIndex === matIndex);
  let d = null, W = 0, H = 0; if (img) { const c = document.createElement('canvas'); W = c.width = img.width; H = c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); d = x.getImageData(0, 0, W, H).data; }
  const paint = (u, v) => { if (!d) return true; const px = ((Math.floor(u * W) % W) + W) % W, py = ((Math.floor((1 - v) * H) % H) + H) % H, k = (py * W + px) * 4; return d[k + 1] - Math.max(d[k], d[k + 2]) * 1.02 > 0; };
  const M = mesh.matrixWorld, nm = new THREE.Matrix3().getNormalMatrix(M); const v = [0, 1, 2].map(() => new THREE.Vector3()), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3(), c = new THREE.Vector3();
  let nl = 0, ne = 0, nc = 0;
  for (let t = gr.start; t < gr.start + gr.count; t += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, t + k).applyMatrix4(M);
    c.copy(v[0]).add(v[1]).add(v[2]).divideScalar(3); fn.crossVectors(e1.subVectors(v[1], v[0]), e2.subVectors(v[2], v[0])).normalize();
    if (N) { const nn = new THREE.Vector3().fromBufferAttribute(N, t).applyMatrix3(nm); if (nn.dot(fn) < 0) fn.negate(); }
    const a = NX - c.x, az = Math.abs(c.z), r = Math.hypot(c.y - NAC.iy, az - NAC.iz); let f = 0;
    const L = Math.max(v[0].distanceTo(v[1]), v[1].distanceTo(v[2]), v[2].distanceTo(v[0]));
    if (a > NAC.a0 && a < NAC.a1 && r > NAC.r0 && r < NAC.r1 && fn.x > NAC.fx && L < NAC.L) f = 1;
    // outer side of the rim lip: the small outward-facing band of faces from the ring back to the lip/cowl seam (next ring is the long cowl faces)
    else if (a > NAC.o0 && a < NAC.o1 && r > NAC.r0 && r < NAC.or1 && L < NAC.oL && Math.abs(fn.dot(new THREE.Vector3(0, c.y - NAC.iy, (c.z - Math.sign(c.z) * NAC.iz)).normalize())) > 0.8) f = 1;
    else if (a > NAC.e0 && a < NAC.e1 && c.y > 2.12 && c.y < 3.02 && az > 0.6 && az < 1.7) { const uu = (U.getX(t) + U.getX(t + 1) + U.getX(t + 2)) / 3, vv = (U.getY(t) + U.getY(t + 1) + U.getY(t + 2)) / 3; if (!paint(uu, vv)) f = 2; }
    // v9.2: sliding upper fairing / transmission cover (raised above the cockpit roof, aft of its nose tip) stays body colour: excluded from anti-glare
    else if (a > AGC.a0 && a < AGC.a1 && c.y > AGC.y && az < AGC.z) f = 3;
    if (f) { out[t] = out[t + 1] = out[t + 2] = f; f === 1 ? nl++ : f === 2 ? ne++ : nc++; }
  }
  g.setAttribute('aNac', new THREE.BufferAttribute(out, 1)); return { lip: nl, exhaust: ne, cover: nc };
}
export const NAC = { iy: 2.68, iz: 0.965, a0: 4.28, a1: 4.40, r0: 0.16, r1: 0.37, fx: 0.25, L: 0.105, o0: 4.37, o1: 4.43, or1: 0.335, oL: 0.125, e0: 6.6, e1: 7.85 };
