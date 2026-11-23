// Crimson Tide Bay — the nine named districts: where each lies, and
// which district any point of the city belongs to.

import { WORLD } from './config.js';

const COLS = [
  { from: 0, to: 3 },   // blocks 0..3
  { from: 3, to: 7 },   // blocks 3..7
  { from: 7, to: 10 },  // blocks 7..10
];
const ROWS = [
  { from: 0, to: 3 },
  { from: 3, to: 5 },
  { from: 5, to: 8 },
];

function rect(col, row) {
  const c = COLS[col], r = ROWS[row];
  const x0 = WORLD.sandRim + c.from * WORLD.pitch;
  const y0 = WORLD.sandRim + r.from * WORLD.pitch;
  const x1 = WORLD.sandRim + c.to * WORLD.pitch + WORLD.roadWidth;
  const y1 = WORLD.sandRim + r.to * WORLD.pitch + WORLD.roadWidth;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export const DISTRICTS = [
  { id: 'palmera', name: 'Villa Palmera',    tag: 'Palm-shaded residences', ...rect(0, 0), tint: '#7fae56' },
  { id: 'mercado', name: 'Mercado Alto',     tag: 'The hill market',        ...rect(1, 0), tint: '#d9a441' },
  { id: 'puerto',  name: 'Puerto Alba',      tag: 'Harbour and cranes',     ...rect(2, 0), tint: '#4d7fa8' },
  { id: 'ceniza',  name: 'Barrio Ceniza',    tag: 'The old ash quarter',    ...rect(0, 1), tint: '#a8765a' },
  { id: 'centro',  name: 'Centro Coral',     tag: 'Downtown towers',        ...rect(1, 1), tint: '#c65b7c' },
  { id: 'muelles', name: 'Muelles del Este', tag: 'East docks',             ...rect(2, 1), tint: '#5a8a7d' },
  { id: 'costa',   name: 'Costa Dorada',     tag: 'The golden beach',       ...rect(0, 2), tint: '#e8c268' },
  { id: 'paseo',   name: 'Paseo del Mar',    tag: 'Boardwalk and hotels',   ...rect(1, 2), tint: '#e07f4f' },
  { id: 'faro',    name: 'Faro Quemado',     tag: 'The burnt lighthouse',   ...rect(2, 2), tint: '#8a6bb8' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return null; // open water or beach rim
}

export function districtById(id) {
  return DISTRICTS.find((d) => d.id === id) || null;
}

export function districtCenter(d) {
  return { x: d.x + d.w / 2, y: d.y + d.h / 2 };
}
