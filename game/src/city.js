// Crimson Tide Bay — the city: blocks, buildings, street furniture, built
// once; answers ground questions (road? solid? what stands here?).

import { WORLD, PALETTE } from './config.js';
import { makeRng, hash2 } from './random.js';
import { DISTRICTS, districtAt } from './districts.js';

export const city = {
  buildings: [],   // {x,y,w,h,height,roof,districtId,hue,props:[],neon}
  palms: [],       // {x,y,lean,size}
  lamps: [],       // {x,y}
  parks: [],       // block rects left green
  garage: null,    // {x,y,w,h} the Paseo del Mar garage building
  docks: [],       // harbour crane bases in Puerto Alba
  built: false,
};

const ROOF_STYLES = ['terracotta', 'pastel', 'slate', 'whitewash', 'teal'];
const ROOF_COLORS = {
  terracotta: '#c96a4a',
  pastel: '#e8a7b8',
  slate: '#5d6a86',
  whitewash: '#efe3cc',
  teal: '#3f9a94',
};

// Parks stay green; the garage sits on the Paseo waterfront block.
const PARK_BLOCKS = new Set(['2,1', '6,4', '1,6', '8,2']);
const GARAGE_BLOCK = '5,7';

export function buildCity(seed = 7) {
  const rng = makeRng(seed * 1000 + 17);
  city.buildings.length = 0;
  city.palms.length = 0;
  city.lamps.length = 0;
  city.parks.length = 0;
  city.docks.length = 0;
  city.garage = null;

  for (let by = 0; by < WORLD.blocksY; by++) {
    for (let bx = 0; bx < WORLD.blocksX; bx++) {
      const key = bx + ',' + by;
      const bx0 = WORLD.sandRim + WORLD.roadWidth + bx * WORLD.pitch;
      const by0 = WORLD.sandRim + WORLD.roadWidth + by * WORLD.pitch;
      const bs = WORLD.blockSize;
      const district = districtAt(bx0 + bs / 2, by0 + bs / 2);
      const did = district ? district.id : 'costa';

      if (PARK_BLOCKS.has(key)) {
        city.parks.push({ x: bx0, y: by0, w: bs, h: bs });
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + hash2(bx, by) * 2;
          city.palms.push({
            x: bx0 + bs / 2 + Math.cos(a) * bs * 0.36,
            y: by0 + bs / 2 + Math.sin(a) * bs * 0.36,
            lean: hash2(bx * 3 + i, by) * 0.7 - 0.35,
            size: 13 + hash2(i, by * 5) * 6,
          });
        }
        continue;
      }

      if (key === GARAGE_BLOCK) {
        city.garage = { x: bx0 + 18, y: by0 + 30, w: bs - 36, h: bs - 60, districtId: did };
        city.buildings.push({
          x: city.garage.x, y: city.garage.y, w: city.garage.w, h: city.garage.h,
          height: 14, roof: 'slate', districtId: did, hue: 0.5, props: ['sign-garage'], neon: PALETTE.neonTeal, garage: true,
        });
        continue;
      }

      // 2×2 lots per block; most get one building each.
      const lots = 2;
      const lot = bs / lots;
      for (let lx = 0; lx < lots; lx++) {
        for (let ly = 0; ly < lots; ly++) {
          const h1 = hash2(bx * 31 + lx * 7, by * 17 + ly * 5);
          if (h1 < 0.12) continue; // empty lot
          const pad = 10 + h1 * 10;
          const w = lot - pad * 2;
          const h = lot - pad * 2;
          const x = bx0 + lx * lot + pad;
          const y = by0 + ly * lot + pad;
          const tall = did === 'centro' ? 46 + h1 * 55 : did === 'mercado' ? 26 + h1 * 30 : 12 + h1 * 26;
          const roof = ROOF_STYLES[Math.floor(hash2(bx + lx, by + ly) * ROOF_STYLES.length) % ROOF_STYLES.length];
          const props = [];
          if (hash2(lx + 40, ly + by) > 0.45) props.push('ac');
          if (hash2(lx, ly + 80) > 0.72) props.push('skylight');
          if (hash2(lx + 9, ly + 3) > 0.86) props.push('pool');
          if (tall > 60 && hash2(lx + 77, ly) > 0.6) props.push('watertower');
          if (did === 'puerto' && hash2(lx + 5, ly + 55) > 0.55) props.push('crates');
          const neon = (did === 'centro' || did === 'paseo') && hash2(lx + 21, ly + 33) > 0.62
            ? [PALETTE.neonPink, PALETTE.neonTeal, PALETTE.neonAmber][Math.floor(hash2(lx, ly + 99) * 3) % 3]
            : null;
          city.buildings.push({ x, y, w, h, height: tall, roof, districtId: did, hue: h1, props, neon });
        }
      }

      if (hash2(bx + 100, by) > 0.3) {
        city.palms.push({ x: bx0 - 14, y: by0 + 20 + rng() * 40, lean: rng() * 0.6 - 0.3, size: 12 + rng() * 6 });
      }
      if (hash2(bx, by + 100) > 0.3) {
        city.palms.push({ x: bx0 + bs + 14, y: by0 + bs - 20 - rng() * 40, lean: rng() * 0.6 - 0.3, size: 12 + rng() * 6 });
      }
      city.lamps.push({ x: bx0 - 16, y: by0 - 16 }, { x: bx0 + bs + 16, y: by0 + bs + 16 });
    }
  }

  for (let i = 0; i < 46; i++) {
    const side = Math.floor(rng() * 4);
    const t = rng();
    let x, y;
    if (side === 0) { x = t * WORLD.width; y = 40 + rng() * 70; }
    else if (side === 1) { x = t * WORLD.width; y = WORLD.height - 110 + rng() * 70; }
    else if (side === 2) { x = 40 + rng() * 70; y = t * WORLD.height; }
    else { x = WORLD.width - 110 + rng() * 70; y = t * WORLD.height; }
    city.palms.push({ x, y, lean: rng() * 0.8 - 0.4, size: 13 + rng() * 8 });
  }

  for (let i = 0; i < 3; i++) {
    city.docks.push({ x: WORLD.width - WORLD.sandRim + 26, y: 320 + i * 260, h: 90 + i * 14 });
  }
  city.built = true;
  return city;
}

// --- Ground questions ---

export function isOnRoad(x, y) {
  const gx = x - WORLD.sandRim, gy = y - WORLD.sandRim;
  if (gx < 0 || gy < 0 || gx > WORLD.gridW || gy > WORLD.gridH) return false;
  const mx = gx % WORLD.pitch, my = gy % WORLD.pitch;
  return mx < WORLD.roadWidth || my < WORLD.roadWidth;
}

export function isInWorld(x, y) {
  return x >= 8 && y >= 8 && x <= WORLD.width - 8 && y <= WORLD.height - 8;
}

export function buildingAt(x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// Push a circle out of every building it overlaps.
export function pushOutOfBuildings(x, y, r) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - nx, dy = y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 < 0.0001) { y = b.y - r; continue; }
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * r;
      y = ny + (dy / d) * r;
    }
  }
  return { x, y };
}

export function avenueX(i) { return WORLD.sandRim + WORLD.roadWidth / 2 + i * WORLD.pitch; }
export function avenueY(i) { return WORLD.sandRim + WORLD.roadWidth / 2 + i * WORLD.pitch; }
export function avenueCountX() { return WORLD.blocksX + 1; }
export function avenueCountY() { return WORLD.blocksY + 1; }

export function roofColor(b) {
  return ROOF_COLORS[b.roof] || '#c96a4a';
}

export { DISTRICTS };
