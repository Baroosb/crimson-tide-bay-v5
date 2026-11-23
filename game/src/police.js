// Crimson Tide Bay — the Bay PD: patrol cars, foot cops, roadblocks,
// AIR ONE. The wanted level lives in game.js; this owns the units.

import { WORLD, LAW, CAR } from './config.js';
import { clamp, turnToward, angleTo, dist } from './random.js';
import { applyDrive, damageCar } from './vehicles.js';
import { pushOutOfBuildings } from './city.js';

export const COP_MODEL = { name: 'Interceptor', color: '#20242e', top: 315, accel: 1.3, grip: 1.12, price: 0 };
export const COP_COLORS = { body: '#232833', stripe: '#f2f4f6' };

export const police = {
  cars: [],       // cop cars (also in the world's car list via game.js)
  foot: [],       // foot cops {x,y,angle,...}
  heli: null,     // {x,y,angle,on,targetX,targetY,radius}
  roadblocks: [], // {x,y,angle,cars:[a,b],barriers:n}
  spawnTimer: 0,
};

export function resetPolice() {
  police.cars.length = 0;
  police.foot.length = 0;
  police.roadblocks.length = 0;
  police.heli = { x: -200, y: -200, angle: 0, on: false, targetX: 0, targetY: 0, radius: 86 };
  police.spawnTimer = 0;
}

// Units sent per wanted level.
export function desiredUnits(stars) {
  return [
    { cars: 0, foot: 0, heli: false, blocks: 0 },
    { cars: 1, foot: 1, heli: false, blocks: 0 },
    { cars: 2, foot: 2, heli: false, blocks: 1 },
    { cars: 3, foot: 2, heli: true,  blocks: 1 },
    { cars: 4, foot: 3, heli: true,  blocks: 2 },
    { cars: 6, foot: 4, heli: true,  blocks: 2 },
  ][clamp(stars, 0, 5)];
}

function spawnCopCar(game, target) {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = target.x + (Math.random() - 0.5) * 300; y = target.y - 620; }
  else if (side === 1) { x = target.x + (Math.random() - 0.5) * 300; y = target.y + 620; }
  else if (side === 2) { x = target.x - 620; y = target.y + (Math.random() - 0.5) * 300; }
  else { x = target.x + 620; y = target.y + (Math.random() - 0.5) * 300; }
  x = clamp(x, 40, WORLD.width - 40);
  y = clamp(y, 40, WORLD.height - 40);
  const car = game.addCar(x, y, angleTo(x, y, target.x, target.y), COP_MODEL, { police: true, driver: 'cop', color: COP_COLORS.body });
  car.unitName = nextUnitName();
  police.cars.push(car);
  return car;
}

function spawnFootCop(game, target) {
  const a = Math.random() * Math.PI * 2;
  const cop = {
    x: clamp(target.x + Math.cos(a) * 300, 30, WORLD.width - 30),
    y: clamp(target.y + Math.sin(a) * 300, 30, WORLD.height - 30),
    angle: 0, moving: true, phase: Math.random() * 6,
    shirt: '#2b3a55', pants: '#1d2432', skin: '#c98a5e',
    aiming: false, shootTimer: 1 + Math.random() * 2,
    unitName: nextUnitName(),
  };
  police.foot.push(cop);
  return cop;
}

const UNIT_POOL = [
  ['TARPON', 'RAMMING'], ['BULWARK', 'ROADBLOCK'], ['MARLIN', 'PURSUIT'],
  ['KESTREL', 'INTERCEPT'], ['SIERRA', 'TACTICAL'], ['DELTA', 'PURSUIT'],
  ['HARBOR', 'FLANKING'], ['VIGIL', 'MARKSMAN'], ['OSPREY', 'PURSUIT'],
  ['CORAL', 'INTERCEPT'],
];
let unitSeq = 0;
export function nextUnitName() {
  const [call, role] = UNIT_POOL[unitSeq % UNIT_POOL.length];
  const num = 3 + (unitSeq % 14);
  unitSeq++;
  return { label: `${call} ${num}`, role };
}

// Two interceptors nose-to-nose across the road ahead, gap at one side.
export function placeRoadblock(game, target, heading) {
  const d = 430;
  const x = clamp(target.x + Math.cos(heading) * d, 60, WORLD.width - 60);
  const y = clamp(target.y + Math.sin(heading) * d, 60, WORLD.height - 60);
  const across = heading + Math.PI / 2;
  const gapSide = Math.random() < 0.5 ? -1 : 1;
  const cars = [];
  for (const s of [-1, 1]) {
    if (s === gapSide && Math.random() < 0.4) continue;
    const cx = x + Math.cos(across) * s * 21;
    const cy = y + Math.sin(across) * s * 21;
    const car = game.addCar(cx, cy, across, COP_MODEL, { police: true, driver: 'block', color: COP_COLORS.body });
    car.unitName = { label: 'BULWARK ' + (2 + Math.floor(Math.random() * 8)), role: 'ROADBLOCK' };
    cars.push(car);
    police.cars.push(car);
  }
  const block = { x, y, angle: heading, cars };
  police.roadblocks.push(block);
  return block;
}

export function updatePolice(game, dt) {
  const target = game.playerPos();
  const stars = game.wanted;
  const want = desiredUnits(stars);
  const p = game.player;

  police.spawnTimer -= dt;
  if (stars > 0 && police.spawnTimer <= 0) {
    police.spawnTimer = 1.6;
    const liveCars = police.cars.filter((c) => !c.dead && c.driver === 'cop');
    if (liveCars.length < want.cars) spawnCopCar(game, target);
    if (police.foot.length < want.foot) spawnFootCop(game, target);
    if (want.blocks > police.roadblocks.length && p.car && Math.abs(p.car.speed) > 60) {
      placeRoadblock(game, target, p.car.angle);
    }
  }
  if (stars === 0) {
    for (const c of police.cars) if (c.driver === 'cop') c.driver = 'leave';
  }
  for (let i = police.roadblocks.length - 1; i >= 0; i--) {
    const b = police.roadblocks[i];
    if (stars < 2 || dist(b.x, b.y, target.x, target.y) > 900) {
      for (const c of b.cars) { c.driver = 'leave'; }
      police.roadblocks.splice(i, 1);
    }
  }
  const heli = police.heli;
  if (want.heli) {
    if (!heli.on) { heli.on = true; heli.x = target.x - 500; heli.y = target.y - 400; }
    const ha = angleTo(heli.x, heli.y, target.x, target.y);
    heli.angle = turnToward(heli.angle, ha, 1.6 * dt);
    const hd = dist(heli.x, heli.y, target.x, target.y);
    const orbit = 120;
    const moveA = hd > orbit ? ha : ha + Math.PI / 2;
    heli.x += Math.cos(moveA) * 190 * dt;
    heli.y += Math.sin(moveA) * 190 * dt;
    heli.targetX = target.x;
    heli.targetY = target.y;
  } else if (heli.on) {
    heli.x -= 260 * dt; heli.y -= 200 * dt;
    if (heli.x < -260 || heli.y < -260) heli.on = false;
  }

  // Pursuit cars aim just behind the player's car; foot cops make the bust.
  for (const car of police.cars) {
    if (car.dead) continue;
    if (car.driver === 'leave') {
      applyDrive(car, dt, { up: true, down: false, left: false, right: false });
      continue;
    }
    if (car.driver !== 'cop') continue;
    const aimX = target.x - Math.cos(game.playerAngle()) * 26;
    const aimY = target.y - Math.sin(game.playerAngle()) * 26;
    const want1 = angleTo(car.x, car.y, aimX, aimY);
    let dAng = want1 - car.angle;
    while (dAng > Math.PI) dAng -= Math.PI * 2;
    while (dAng < -Math.PI) dAng += Math.PI * 2;
    const input = {
      up: Math.abs(dAng) < 2.2,
      down: Math.abs(dAng) >= 2.2 && car.speed > 30,
      left: dAng < -0.08,
      right: dAng > 0.08,
    };
    applyDrive(car, dt, input);
    if (p.car && dist(car.x, car.y, p.car.x, p.car.y) < 42 && Math.abs(car.speed) > 90) {
      damageCar(p.car, 2.2, game);
      damageCar(car, 1.4, game);
    }
  }
  for (const cop of police.foot) {
    const d = dist(cop.x, cop.y, target.x, target.y);
    cop.angle = angleTo(cop.x, cop.y, target.x, target.y);
    cop.aiming = stars >= LAW.copShootStars && d < 260 && !p.car;
    if (d > 30) {
      cop.moving = true;
      let nx = cop.x + Math.cos(cop.angle) * 118 * dt;
      let ny = cop.y + Math.sin(cop.angle) * 118 * dt;
      const pushed = pushOutOfBuildings(nx, ny, 10);
      cop.x = pushed.x; cop.y = pushed.y;
    } else cop.moving = false;
    if (cop.aiming && !p.car) {
      cop.shootTimer -= dt;
      if (cop.shootTimer <= 0) {
        cop.shootTimer = 0.9 + Math.random() * 1.1;
        game.copShoot(cop);
      }
    }
  }
  for (let i = police.cars.length - 1; i >= 0; i--) {
    const c = police.cars[i];
    if ((c.driver === 'leave' && dist(c.x, c.y, target.x, target.y) > 1000) || (c.dead && c.burning <= 0 && stars === 0)) {
      game.removeCar(c);
      police.cars.splice(i, 1);
    }
  }
}

export function anyCopSees(game) {
  const t = game.playerPos();
  for (const c of police.cars) {
    if (!c.dead && dist(c.x, c.y, t.x, t.y) < LAW.sightRange) return true;
  }
  for (const f of police.foot) {
    if (dist(f.x, f.y, t.x, t.y) < LAW.sightRange * 0.7) return true;
  }
  return police.heli && police.heli.on;
}

export function nearestCopDist(game) {
  const t = game.playerPos();
  let best = Infinity;
  for (const c of police.cars) if (!c.dead) best = Math.min(best, dist(c.x, c.y, t.x, t.y));
  for (const f of police.foot) best = Math.min(best, dist(f.x, f.y, t.x, t.y));
  return best;
}
