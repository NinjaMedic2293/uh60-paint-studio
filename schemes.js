// Zones and presets. Colours are sRGB hex. FS 595 notes carried over from the 2D studio.
export const ZONES = [
  ['upper', 'Upper fuselage'], ['belly', 'Lower fuselage / belly'], ['stripe', 'Cheat line / stripe'],
  ['nose', 'Nose'], ['antiglare', 'Black nose / anti-glare (MH-60T break)'], ['doors', 'Cabin doors'],
  ['cowl', 'Engine cowlings'], ['boom', 'Tail boom'], ['band', 'Tail band'], ['fin', 'Vertical fin'],
  ['stab', 'Stabilator'], ['blades', 'Rotor blades'], ['tips', 'Blade tips'], ['gear', 'Landing gear'],
  ['hoist', 'Rescue hoist'], ['mission', 'Mission equipment (radome, turret, probe)'],
  ['glass', 'Window tint'], ['text', 'Markings text'], ['cross', 'Medical cross'],
];
const base = { upper: '#4a4f2a', belly: '#4a4f2a', stripe: '#4a4f2a', nose: '#4a4f2a', antiglare: '#141414', doors: '#4a4f2a', cowl: '#42472a', boom: '#4a4f2a', band: '#4a4f2a', fin: '#4a4f2a', stab: '#4a4f2a', blades: '#2b2b2b', tips: '#f2d21b', gear: '#3a3a3a', hoist: '#4a4f2a', mission: '#1e1f20', glass: '#2c3e50', text: '#1b1b1b', cross: '#c8102e' };
export const PROBE_NOSES = ['hh60g', 'hh60w', 'mh60m'];
const mk = (name, c, extra = {}) => ({ name, colors: { ...base, ...c }, tail: '26319', program: '', logo: '', nose: 'uh60l', antiglare: false, stripe: false, cross: false, hoist: true, light: false, finish: 0.55, probeSide: 'right', lidar: false, planes: [], regions: [], panels: {}, star: null, ...extra, probe: extra.probe ?? PROBE_NOSES.includes(extra.nose) });
const all = (c) => Object.fromEntries(['upper', 'belly', 'stripe', 'nose', 'doors', 'cowl', 'boom', 'band', 'fin', 'stab', 'hoist'].map(k => [k, c]));
export const PRESETS = [
  mk('Army Olive Drab (FS 34031)', { ...all('#383c2c'), cowl: '#34382a' }, { tail: '26319', program: 'UNITED STATES ARMY', finish: 0.8 }),
  mk('Gray two-tone (FS 36118 / 36375)', { ...all('#4d5157'), belly: '#8a9097', stab: '#8a9097', tips: '#f2f2f2', mission: '#2a2c2e' }, { nose: 'hh60g', tail: '26466', program: 'U.S. AIR FORCE', finish: 0.7 }),
  mk('Red / white firefighting', { ...all('#ffffff'), belly: '#c8102e', stripe: '#1b1b1b', nose: '#c8102e', boom: '#c8102e', band: '#ffffff', fin: '#c8102e', hoist: '#c8102e', gear: '#555555' }, { stripe: true, tail: 'N60FH', program: 'FIRE RESCUE', logo: 'AIR ATTACK 1', finish: 0.35 }),
  mk('Medevac (white, red cross)', { ...all('#ffffff'), stripe: '#c8102e', band: '#c8102e', fin: '#c8102e', gear: '#777777' }, { stripe: true, cross: true, tail: 'N911LF', program: 'AIR MEDICAL', logo: 'LIFE FLIGHT', finish: 0.35 }),
  mk('Law enforcement (navy / white)', { ...all('#ffffff'), belly: '#14213d', stripe: '#b8860b', nose: '#14213d', boom: '#14213d', band: '#b8860b', fin: '#14213d', stab: '#14213d', hoist: '#14213d', gear: '#444444', text: '#14213d', tips: '#ffffff' }, { stripe: true, tail: 'N1SO', program: 'SHERIFF AIR UNIT', logo: 'AIR 1', finish: 0.35 }),
  mk('Coast Guard MH-60T (orange / white)', { ...all('#e8612c'), upper: '#e8612c', belly: '#e8612c', doors: '#ffffff', cowl: '#ffffff', boom: '#ffffff', band: '#e8612c', fin: '#e8612c', stab: '#e8612c', hoist: '#e8612c', stripe: '#ffffff', gear: '#555555', tips: '#f2f2f2', mission: '#151515' }, { nose: 'mh60t', antiglare: true, light: true, hoist: true, tanks: true, tail: '6030', program: 'U.S. COAST GUARD', logo: 'RESCUE', finish: 0.35 }),
  mk('Corporate stripe (charcoal / volt)', { ...all('#23272e'), stripe: '#c6f432', cowl: '#3a3f48', band: '#c6f432', stab: '#c6f432', hoist: '#c6f432', gear: '#111111', text: '#ffffff', tips: '#c6f432' }, { stripe: true, tail: 'N60TA', program: 'TODD AVIATION', logo: 'TA', finish: 0.3 }),
  mk('All-black 160th SOAR (MH-60M)', { ...all('#1d1f1e'), cowl: '#202221', blades: '#1a1a1a', tips: '#2a2a2a', gear: '#1a1a1a', mission: '#161718', text: '#2c2d2c' }, { nose: 'mh60m', probeSide: 'left', tail: '', program: '', finish: 0.85 }),
  mk('HH-60W gray (FS 36118)', { ...all('#596066'), mission: '#202224', tips: '#e0e0e0', text: '#2a2c2e' }, { nose: 'hh60w', tail: '4521', program: '', finish: 0.75 }),
];
// Texas flag, built only from paint-break planes: P1 vertical = aft end of the blue field, P2 horizontal = white/red split.
PRESETS.push(mk('Texas flag (paint-break planes demo)', { ...all('#ffffff'), antiglare: '#111111', tips: '#ffffff', gear: '#3a3a3a', mission: '#151515', text: '#111111', hoist: '#ffffff' },
  { nose: 'uh60l', antiglare: true, hoist: false, tail: 'N836TX', program: '', finish: 0.35,
    planes: [{ name: 'Blue field aft edge', kind: 'vertical', a: 4.10, y: 1.6, z: 0, yaw: 0, pitch: 0 }, { name: 'White / red split', kind: 'horizontal', a: 8, y: 1.55, z: 0, yaw: 0, pitch: 2.5 }],
    regions: [{ name: 'Blue', color: '#002868', req: [1, 0] }, { name: 'White', color: '#ffffff', req: [-1, 1] }, { name: 'Red', color: '#bf0a30', req: [-1, -1] }],
    star: { a: 3.0, y: 1.62, size: 0.75, color: '#ffffff' } }));
export const NOSES = [['uh60l', 'UH-60L standard'], ['hh60g', 'HH-60G Pave Hawk'], ['mh60t', 'MH-60T Jayhawk'], ['hh60w', 'HH-60W Jolly Green II'], ['mh60m', 'MH-60M (160th SOAR)']];
