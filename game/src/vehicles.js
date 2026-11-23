// Crimson Tide Bay — cars: names, physics, traffic and damage. Every car
// has a condition that collisions eat and the garage restores.

import { CAR, WORLD } from './config.js';
import { makeRng, clamp, turnToward, angleTo, dist } from './random.js';
import { avenueX, avenueY, avenueCountX, avenueCountY, pushOutOfBuildings, isOnRoad } from './city.js';

export const CAR_MODELS = [
  { name: 'Vireo GT',        color: '#e0483e', top: 305, accel: 1.25, grip: 1.05, price: 4200 },
  { name: 'Veloz Comet RS',  color: '#ffb03a', top: 330, accel: 1.4,  grip: 1.1,  price: 6800 },
  { name: 'Barracuda Coupe', color: '#2fe8d8', top: 285, accel: 1.1,  grip: 1.0,  price: 3100 },
  { name: 'Palmera Wagon',   color: '#7fae56', top: 215, accel: 0.85, grip: 0.95, price: 1400 },
  { name: 'Muelle Pickup',   color: '#8a93a3', top: 225, accel: 0.9,  grip: 0.9,  price: 1600 },
  { name: 'Coral Cabrio',    color: '#ff4f9a', top: 265, accel: 1.05, grip: 1.0,  price: 3600 },
  { name: 'Ceniza Sedan',    color: '#5d6a86', top: 235, accel: 0.9,  grip: 0.95, price: 1200 },
  { name: 'Faro Roadster',   color: '#efe3cc', top: 295, accel: 1.2,  grip: 1.08, price: 4500 },
];

let carSeq = 1;

export function makeCar(x, y, angle, model, opts = {}) {
  return {
    id: carSeq++,
    x, y, angle,
    speed: 0,
    steer: 0,
    model,
    color: opts.color || model.color,
    length: CAR.length, width: CAR.width,
    condition: opts.condition !== undefined ? opts.condition : 82 + Math.random() * 18,
    police: !!opts.police,
    driver: opts.driver || null,   // 'traffic' | 'player' | 'cop' | null (parked)
    lights: true,
    dead: false,
    burning: 0,
    // traffic
    lane: opts.lane || 0,
    targetAvenue: -1,
    waitTimer: 0,
  };
}

export function carSpeedKmh(car) {
  return Math.round(Math.abs(car.speed) * 0.36);
}

// Arcade physics: steering bites harder at speed; top speed by condition.
export function applyDrive(car, dt, input) {
  const m = car.model;
  const topSpeed = m.top * (0.55 + 0.45 * (car.condition / 100)) * (car.engineTier ? 1 + car.engineTier * 0.09 : 1);
  if (input.up) {
    car.speed += CAR.accel * m.accel * dt * (car.speed < 0 ? 2.2 : 1);
  } else if (input.down) {
    if (car.speed > 12) car.speed -= CAR.brake * dt;
    else car.speed = Math.max(car.speed - CAR.accel * 0.7 * dt, -CAR.reverseMax);
  }
  car.speed -= car.speed * CAR.drag * dt;
  car.speed = clamp(car.speed, -CAR.reverseMax, topSpeed);
  const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  car.steer = steerInput;
  if (steerInput !== 0 && Math.abs(car.speed) > 4) {
    const grip = (car.tireTier ? 1 + car.tireTier * 0.08 : 1) * m.grip;
    const rate = CAR.turnRate * grip * clamp(Math.abs(car.speed) / 130, 0.25, 1) * Math.sign(car.speed);
    car.angle += steerInput * rate * dt;
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  return Math.abs(car.speed) > 175 && steerInput !== 0; // drifting?
}

// Traffic follows the avenue grid and keeps its distance.
export function updateTraffic(car, dt, cars) {
  if (car.driver !== 'traffic' || car.dead) return;
  const ax = car.x + Math.cos(car.angle) * 46;
  const ay = car.y + Math.sin(car.angle) * 46;
  let blocked = false;
  for (const other of cars) {
    if (other === car || other.dead) continue;
    if (dist(ax, ay, other.x, other.y) < 30) { blocked = true; break; }
  }
  const input = { up: !blocked, down: blocked && car.speed > 4, left: false, right: false };
  const nearCrossX = Math.abs(((car.x - WORLD.sandRim) % WORLD.pitch + WORLD.pitch) % WORLD.pitch - WORLD.roadWidth / 2) < 26;
  const nearCrossY = Math.abs(((car.y - WORLD.sandRim) % WORLD.pitch + WORLD.pitch) % WORLD.pitch - WORLD.roadWidth / 2) < 26;
  car.turnCooldown = Math.max(0, (car.turnCooldown || 0) - dt);
  if (nearCrossX && nearCrossY && car.turnCooldown <= 0 && Math.random() < 0.012) {
    car.pendingTurn = (Math.random() < 0.5 ? -1 : 1) * Math.PI / 2;
    car.turnCooldown = 3;
  }
  if (car.pendingTurn) {
    const target = car.angle + car.pendingTurn;
    car.angle = turnToward(car.angle, target, 1.9 * dt);
    if (Math.abs(car.angle - target) < 0.05) car.pendingTurn = 0;
  }
  applyDrive(car, dt, input);
  keepCarInWorld(car);
}

export function keepCarInWorld(car) {
  const pushed = pushOutOfBuildings(car.x, car.y, 17);
  if (pushed.x !== car.x || pushed.y !== car.y) {
    car.x = pushed.x; car.y = pushed.y;
    if (Math.abs(car.speed) > 60) damageCar(car, Math.abs(car.speed) * 0.05, null);
    car.speed *= 0.55;
  }
  car.x = clamp(car.x, 26, WORLD.width - 26);
  car.y = clamp(car.y, 26, WORLD.height - 26);
}

export function damageCar(car, amount, game) {
  if (car.dead) return;
  car.condition = clamp(car.condition - amount, 0, 100);
  if (car.condition <= 0) {
    car.dead = true;
    car.burning = 2.6;
    if (game) game.onCarDestroyed(car);
  }
}

export function collideCars(cars, game) {
  for (let i = 0; i < cars.length; i++) {
    const a = cars[i];
    if (a.dead) continue;
    for (let j = i + 1; j < cars.length; j++) {
      const b = cars[j];
      if (b.dead) continue;
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 40 && d > 0.01) {
        const rel = Math.abs(a.speed - b.speed);
        const push = (40 - d) / 2;
        const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
        if (rel > 55) {
          damageCar(a, rel * 0.06, game);
          damageCar(b, rel * 0.06, game);
          if (game) game.onCarsCrashed(a, b, rel);
        }
        const avg = (a.speed + b.speed) / 2;
        a.speed = avg * 0.8; b.speed = avg * 0.8;
      }
    }
  }
}

// --- Spawning ---

export function spawnTraffic(rng, count = CAR.trafficCount) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng() < 0.5;
    const ai = Math.floor(rng() * (vertical ? avenueCountX() : avenueCountY()));
    const along = WORLD.sandRim + rng() * (vertical ? WORLD.gridH : WORLD.gridW);
    const dir = rng() < 0.5 ? 0 : Math.PI;
    const laneOff = 13;
    let x, y, angle;
    if (vertical) {
      x = avenueX(ai) + (dir === 0 ? laneOff : -laneOff);
      y = along;
      angle = dir === 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = along;
      y = avenueY(ai) + (dir === 0 ? -laneOff : laneOff);
      angle = dir;
    }
    const model = CAR_MODELS[Math.floor(rng() * CAR_MODELS.length)];
    const car = makeCar(x, y, angle, model, { driver: 'traffic' });
    car.speed = 60 + rng() * 50;
    cars.push(car);
  }
  return cars;
}

export function spawnParked(rng, spots, count = CAR.parkedCount) {
  const cars = [];
  for (let i = 0; i < count && i < spots.length; i++) {
    const s = spots[Math.floor(rng() * spots.length)];
    const model = CAR_MODELS[Math.floor(rng() * CAR_MODELS.length)];
    cars.push(makeCar(s.x, s.y, s.angle, model, { driver: null, condition: 55 + rng() * 45 }));
  }
  return cars;
}

// Parking spots: tucked against block edges.
export function parkingSpots() {
  const spots = [];
  for (let by = 0; by < WORLD.blocksY; by += 2) {
    for (let bx = 1; bx < WORLD.blocksX; bx += 2) {
      const x = WORLD.sandRim + WORLD.roadWidth + bx * WORLD.pitch + 24;
      const y = WORLD.sandRim + by * WORLD.pitch + WORLD.roadWidth / 2;
      spots.push({ x, y, angle: 0 });
      spots.push({ x: x + 64, y, angle: 0 });
    }
  }
  return spots;
}

export function nearestCar(cars, x, y, maxDist) {
  let best = null, bd = maxDist;
  for (const c of cars) {
    if (c.dead) continue;
    const d = dist(x, y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export { isOnRoad, makeRng };
