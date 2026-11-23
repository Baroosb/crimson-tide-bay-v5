// Crimson Tide Bay — the dispatch panel: every unit with a callsign, a
// tactical role and a live distance, plus the dispatcher's commentary.

import { dist } from './random.js';
import { police } from './police.js';

const DISPATCH_LINES = [
  'Dispatch: all units, suspect vehicle is the {car}. Move to intercept.',
  'Dispatch: TARPON is primary. BULWARK, set the block on the coast road.',
  'Dispatch: AIR ONE has the light. Ground units, box them in.',
  'Dispatch: suspect last seen in {district}. Converge and contain.',
  'Dispatch: do not let them reach the Paseo. Repeat, contain at the Paseo.',
  'Dispatch: shots fired. Weapons free at four stars, hold at three.',
  'Dispatch: roadblock is set. KESTREL, cover the side streets.',
];

// Panel rows for this frame: five nearest units, heli first.
export function dispatchRows(game) {
  const t = game.playerPos();
  const rows = [];
  if (police.heli && police.heli.on) {
    rows.push({ label: 'AIR ONE', role: 'SPOTLIGHT', dist: Math.round(dist(police.heli.x, police.heli.y, t.x, t.y) / 4) });
  }
  const units = [];
  for (const c of police.cars) {
    if (c.dead || !c.unitName) continue;
    units.push({ label: c.unitName.label, role: c.unitName.role, d: dist(c.x, c.y, t.x, t.y) });
  }
  for (const f of police.foot) {
    if (!f.unitName) continue;
    units.push({ label: f.unitName.label, role: 'FOOT PATROL', d: dist(f.x, f.y, t.x, t.y) });
  }
  units.sort((a, b) => a.d - b.d);
  for (const u of units.slice(0, 4)) {
    rows.push({ label: u.label, role: u.role, dist: Math.max(3, Math.round(u.d / 4)) });
  }
  return rows;
}

// Short variants for staged captures: sized to never end mid-word.
const SHORT_DISPATCH_LINES = [
  'Dispatch: all units — suspect: {car}.',
  'Dispatch: TARPON primary. BULWARK has the block.',
  'Dispatch: AIR ONE has the light. Box them in.',
  'Dispatch: suspect in {district}. Converge.',
  'Dispatch: do not let them reach the Paseo.',
  'Dispatch: shots fired. Weapons free at four.',
  'Dispatch: roadblock set. KESTREL, side streets.',
];

// The dispatcher's line, rotating slowly, filled with live facts.
export function dispatchLine(game, short = false) {
  const lines = short ? SHORT_DISPATCH_LINES : DISPATCH_LINES;
  const idx = Math.floor(game.time / 9) % lines.length;
  const carName = game.player.car ? game.player.car.model.name : 'a suspect on foot';
  const district = game.currentDistrict ? game.currentDistrict.name : 'the waterfront';
  return lines[idx]
    .replace('{car}', carName)
    .replace('{district}', district);
}
