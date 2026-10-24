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
export const AG = [1.30, 1.95, 0.74, 2.45];
export function zoneUniforms() {
  const u = { uC: { value: ZKEYS.map(() => new THREE.Color()) }, uAG: { value: 0 }, uST: { value: 0 }, uDbg: { value: 0 },
    // anti-glare break (re-derived from MH-60T photos): x = a of the vertical break just ahead of the cockpit-door front frame/hinges,
    // y = door-window sill height where it turns to follow the windscreen rear pillar, z = aft slope of that pillar (m a per m y),
    // w = windscreen top / roof line height; above it the break holds at the windscreen top edge
    uAGp: { value: new THREE.Vector4(...AG) },
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
const AGF = `bool agf(vec3 w){ float a=${glsl(B.NX)}-w.x; float lim=uAGp.x + uAGp.z*clamp(w.y-uAGp.y,0.0,uAGp.w-uAGp.y); return a<lim; }`;
const DBG = `vec3 dbgC(int i){ float h=fract(float(i)*0.618); return 0.5+0.5*cos(6.2832*(h+vec3(0.0,0.33,0.67))); }`;
export function patchMaterial(m, kind, U, ref) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U); sh.uniforms.uRef = { value: ref };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vW; uniform vec3 uC[${ZKEYS.length}]; uniform float uAG,uST,uDbg,uRef,uPanOn; uniform vec4 uAGp;
      uniform int uPN,uRN; uniform vec4 uPl[${MAXP}]; uniform vec4 uRS[${MAXR * 2}]; uniform vec3 uRC[${MAXR}];
      uniform sampler2D uPanId, uPanC; float agM=0.0; ${DBG} ${AGF}
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
        if(uAG>0.5 && agf(vW)){ col=uC[${ZI('antiglare')}]; agM=1.0; }
      }` : ''}
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
