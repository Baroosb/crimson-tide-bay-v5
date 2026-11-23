// Crimson Tide Bay — the player on foot: walking, sprinting, cars, damage.

import { PLAYER } from './config.js';
import { pressed } from './input.js';
import { pushOutOfBuildings, isInWorld } from './city.js';
import { clamp } from './random.js';

export const PLAYER_IDENTITY = {
  name: 'Lucia Ferrer',
  shirt: '#ff7847',
  pants: '#26324a',
  skin: '#b97a4e',
};

export function makePlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    health: PLAYER.health,
    armor: PLAYER.armor,
    car: null,          // the car being driven, or null on foot
    moving: false,
    phase: Math.random() * 6,
    shirt: PLAYER_IDENTITY.shirt,
    pants: PLAYER_IDENTITY.pants,
    skin: PLAYER_IDENTITY.skin,
    aiming: false,
    dead: false,
  };
}

// One frame of on-foot movement.
export function updatePlayer(p, dt, world) {
  if (p.car || p.dead) { p.moving = false; return; }
  let mx = 0, my = 0;
  if (pressed('up')) my -= 1;
  if (pressed('down')) my += 1;
  if (pressed('left')) mx -= 1;
  if (pressed('right')) mx += 1;
  p.moving = mx !== 0 || my !== 0;
  if (!p.moving) return;
  const len = Math.sqrt(mx * mx + my * my);
  const speed = pressed('sprint') ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const vx = (mx / len) * speed * dt;
  const vy = (my / len) * speed * dt;
  p.angle = Math.atan2(my, mx);
  let nx = p.x + vx, ny = p.y + vy;
  const pushed = pushOutOfBuildings(nx, ny, p.radius);
  nx = pushed.x; ny = pushed.y;
  if (isInWorld(nx, ny)) { p.x = nx; p.y = ny; }
  p.phase += dt * (pressed('sprint') ? 1.6 : 1);
}

// Armour soaks its share first. Returns true if it killed.
export function hurtPlayer(p, amount) {
  if (p.dead) return false;
  let left = amount;
  if (p.armor > 0) {
    const soaked = Math.min(p.armor, left * 0.6);
    p.armor -= soaked;
    left -= soaked;
  }
  p.health = clamp(p.health - left, 0, PLAYER.health);
  if (p.health <= 0) { p.dead = true; return true; }
  return false;
}

export function healPlayer(p, amount) {
  if (p.dead) return;
  p.health = clamp(p.health + amount, 0, PLAYER.health);
}
