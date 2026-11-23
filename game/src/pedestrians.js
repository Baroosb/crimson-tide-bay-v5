// Crimson Tide Bay — pedestrians: strolling the sidewalks and the
// beach, and running when it goes wrong.

import { WORLD } from './config.js';
import { makeRng, clamp, turnToward, angleTo, dist } from './random.js';
import { pushOutOfBuildings } from './city.js';

const SHIRTS = ['#e8a7b8', '#2fe8d8', '#ffd23e', '#7fae56', '#f2f4f6', '#ff8a3d', '#8a6bb8', '#4d7fa8', '#e0483e', '#efe3cc'];
const PANTS = ['#26324a', '#4a3626', '#33523a', '#5d6a86', '#22222a'];
const SKINS = ['#8a5a34', '#c98a5e', '#6e4525', '#e0aa72', '#54371e'];

export function makePed(x, y, rng) {
  return {
    x, y,
    angle: rng() * Math.PI * 2,
    speed: 34 + rng() * 26,
    moving: true,
    phase: rng() * 6,
    shirt: SHIRTS[Math.floor(rng() * SHIRTS.length)],
    pants: PANTS[Math.floor(rng() * PANTS.length)],
    skin: SKINS[Math.floor(rng() * SKINS.length)],
    state: 'stroll',       // 'stroll' | 'flee' | 'down' | 'stand'
    panic: 0,
    wanderTimer: 2 + rng() * 5,
    downTimer: 0,
    aiming: false,
    hostile: false,
    health: 30,
  };
}

export function spawnPeds(rng, count = 26) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    // Strollers hug the street grid.
    const onBeach = rng() < 0.22;
    let x, y;
    if (onBeach) {
      x = WORLD.sandRim + rng() * WORLD.gridW;
      y = WORLD.height - WORLD.sandRim + 16 + rng() * 46;
    } else {
      const vertical = rng() < 0.5;
      const ai = Math.floor(rng() * 10);
      if (vertical) {
        x = WORLD.sandRim + ai * WORLD.pitch + 8 + rng() * 10;
        y = WORLD.sandRim + rng() * WORLD.gridH;
      } else {
        x = WORLD.sandRim + rng() * WORLD.gridW;
        y = WORLD.sandRim + ai * WORLD.pitch + 8 + rng() * 10;
      }
    }
    peds.push(makePed(x, y, rng));
  }
  return peds;
}

export function updatePed(p, dt, danger) {
  if (p.state === 'down') {
    p.downTimer -= dt;
    p.moving = false;
    if (p.downTimer <= 0) { p.state = 'stroll'; p.health = 30; }
    return;
  }
  p.wanderTimer -= dt;
  if (danger && dist(p.x, p.y, danger.x, danger.y) < 130) {
    p.state = 'flee';
    p.panic = 1.6;
  }
  if (p.state === 'flee') {
    p.panic -= dt;
    if (p.panic <= 0) p.state = 'stroll';
    if (danger) {
      const away = angleTo(danger.x, danger.y, p.x, p.y);
      p.angle = turnToward(p.angle, away, 6 * dt);
    }
    p.moving = true;
    movePed(p, dt, 148);
    return;
  }
  if (p.wanderTimer <= 0) {
    p.wanderTimer = 2.5 + Math.random() * 5;
    if (Math.random() < 0.22) p.state = p.state === 'stand' ? 'stroll' : 'stand';
    else p.angle = Math.random() * Math.PI * 2;
  }
  p.moving = p.state === 'stroll';
  if (p.moving) movePed(p, dt, p.speed);
}

function movePed(p, dt, speed) {
  let nx = p.x + Math.cos(p.angle) * speed * dt;
  let ny = p.y + Math.sin(p.angle) * speed * dt;
  const pushed = pushOutOfBuildings(nx, ny, 10);
  if (pushed.x !== nx || pushed.y !== ny) p.angle += Math.PI / 2.5;
  nx = clamp(pushed.x, 14, WORLD.width - 14);
  ny = clamp(pushed.y, 14, WORLD.height - 14);
  p.x = nx; p.y = ny;
}

// Everyone in earshot runs.
export function scarePeds(peds, x, y, radius = 170) {
  for (const p of peds) {
    if (p.state !== 'down' && dist(p.x, p.y, x, y) < radius) {
      p.state = 'flee';
      p.panic = 1.4 + Math.random();
      p.angle = angleTo(x, y, p.x, p.y);
    }
  }
}

export function knockDown(p, seconds = 6) {
  p.state = 'down';
  p.downTimer = seconds;
  p.moving = false;
}
