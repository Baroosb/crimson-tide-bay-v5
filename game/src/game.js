// Crimson Tide Bay — the game itself: state, loop, heat and law, fire and
// money, saves, screens, and the staged scenes (?shot=cover|map|mission|title).

import { WORLD, LAW, HEAT, repTier } from './config.js';
import { makeRng, clamp, dist, angleTo } from './random.js';
import { initInput, pressed, tapped, mouse, clearTaps } from './input.js';
import { buildCity, city, buildingAt } from './city.js';
import { districtAt } from './districts.js';
import { buildStaticLayer, drawGround, drawBuilding, drawPalm, drawCarShape, drawPerson, drawHeli, drawSpotlight, drawLampPools, drawCrate } from './render.js';
import { applyGrade } from './grading.js';
import { drawHUD, drawDistrictCard, drawBanner } from './hud.js';
import { drawTitleScreen, drawMapScreen, drawPauseScreen, drawGarageScreen, drawEndScreen } from './menus.js';
import { makePlayer, updatePlayer, hurtPlayer } from './player.js';
import { makeCar, spawnTraffic, spawnParked, parkingSpots, updateTraffic, collideCars, damageCar, nearestCar, keepCarInWorld, applyDrive, CAR_MODELS } from './vehicles.js';
import { spawnPeds, updatePed, scarePeds, knockDown } from './pedestrians.js';
import { police, resetPolice, updatePolice, anyCopSees, nearestCopDist, placeRoadblock } from './police.js';
import { MissionRunner } from './missions.js';
import { RaceRunner } from './races.js';
import { makeDialogue, say, updateDialogue, LINES } from './crew.js';
import { weaponById, cycleWeapon, GRENADE } from './weapons.js';
import { stationByIndex } from './radio.js';
import { GARAGE_SERVICES, serviceAvailable, applyService } from './garage.js';
import { readAllSlots, writeSlot, emptyCareer } from './save.js';
import { initAudio, resumeAudio, setEngine, setSiren, setRadio, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();
initInput(canvas);

const HEAT_FOR_STARS = [0, 20, 55, 105, 170, 250];
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = Number(params.get('seed') || 7);

const game = {
  state: 'title', time: 0, cash: 240, rep: 0, heat: 0, wanted: 0,
  player: null, cars: [], peds: [], hostiles: [], bullets: [], grenadesInFlight: [],
  particles: [], flashes: [], skids: [],
  camera: { x: 0, y: 0, shake: 0 },
  zoom: 1, shotMode: !!SHOT, crates: [],
  missions: null, races: null, dialogue: makeDialogue(),
  bannerData: null, districtCard: null, districtId: null, currentDistrict: null,
  promptText: null, bust: 0, hurtFlash: 0, radioIdx: -1,
  weaponId: 'vesper', grenades: 3, fireTimer: 0,
  abilityCooldowns: { mira: 0, tomas: 0, ibrahim: 0 }, eyesOutTimer: 0,
  career: emptyCareer(), raceBests: {}, slots: [], clickRects: [],
  garageNote: '', tailCar: null, endText: '', storyDone: false, saidHeat: 0,

  playerPos() { return this.player.car ? { x: this.player.car.x, y: this.player.car.y } : { x: this.player.x, y: this.player.y }; },
  playerAngle() { return this.player.car ? this.player.car.angle : this.player.angle; },
  repBonus() { return repTier(this.rep).payBonus; },
  banner(title, sub, color) { this.bannerData = { title, sub, color, ttl: 3.4 }; },
  sfxCash() { sfx.cash(); },
  sfxBlip() { sfx.blip(); },
  addHeat(amount) { this.heat = clamp(this.heat + amount, 0, 320); this.syncWanted(); },
  syncWanted() {
    let stars = 0;
    for (let i = 0; i < HEAT_FOR_STARS.length; i++) if (this.heat >= HEAT_FOR_STARS[i]) stars = i;
    this.wanted = stars;
    if (stars > this.career.topStars) this.career.topStars = stars;
    if (stars >= 2 && this.saidHeat < 2) { this.saidHeat = 2; for (const [w, t] of LINES.heat2) say(this.dialogue, w, t); }
    if (stars >= 3 && this.saidHeat < 3) { this.saidHeat = 3; for (const [w, t] of LINES.heat3) say(this.dialogue, w, t); }
    if (stars >= 5 && this.saidHeat < 5) { this.saidHeat = 5; for (const [w, t] of LINES.heat5) say(this.dialogue, w, t); }
    if (stars === 0) this.saidHeat = 0;
  },
  addCar(x, y, angle, model, opts) { const car = makeCar(x, y, angle, model, opts); this.cars.push(car); return car; },
  removeCar(car) { const i = this.cars.indexOf(car); if (i >= 0) this.cars.splice(i, 1); },

  onCarsCrashed(a, b, relSpeed) {
    const p = this.player;
    if (!p.car || (a !== p.car && b !== p.car)) return;
    this.camera.shake = Math.min(9, relSpeed * 0.05);
    sfx.crash();
    this.spawnSparks((a.x + b.x) / 2, (a.y + b.y) / 2, 8);
    if (relSpeed > 85 && anyCopSees(this)) this.addHeat(HEAT.hitCar);
    if (b.police || a.police) this.addHeat(HEAT.hitCop * 0.5);
  },
  onCarDestroyed(car) { car.burning = 2.4; },
  copShoot(cop) {
    const t = this.playerPos();
    const a = angleTo(cop.x, cop.y, t.x, t.y) + (Math.random() - 0.5) * 0.16;
    this.bullets.push({ x: cop.x, y: cop.y, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 0.5, damage: 6, from: 'cop' });
    this.flashes.push({ x: cop.x + Math.cos(a) * 16, y: cop.y + Math.sin(a) * 16, r: 9, ttl: 0.05 });
  },
  spawnShootout(stage) {
    this.hostiles = [];
    for (let i = 0; i < stage.count; i++) {
      const a = (i / stage.count) * Math.PI * 2 + 0.5;
      this.hostiles.push({
        x: stage.at.x + Math.cos(a) * (60 + i * 17), y: stage.at.y + Math.sin(a) * (60 + i * 13),
        angle: a + Math.PI, moving: false, phase: Math.random() * 6,
        shirt: '#3a3f52', pants: '#22222a', skin: '#8a5a34',
        state: 'stand', aiming: true, hostile: true, health: 30, shootTimer: 1 + Math.random() * 1.6,
      });
    }
    this.missions.hostiles = this.hostiles;
  },
  markStealCar(stage) {
    const model = CAR_MODELS.find((m) => m.name === stage.model) || CAR_MODELS[0];
    return this.addCar(stage.at.x + 30, stage.at.y + 44, 0.3, model, { driver: null, condition: 88 });
  },
  spawnTailCar() {
    const model = CAR_MODELS.find((m) => m.name === 'Ceniza Sedan');
    const pos = this.playerPos();
    this.tailCar = this.addCar(pos.x + 260, pos.y - 120, 0, model, { driver: 'traffic', color: '#191d26' });
  },
  startRace(raceId, fromMission) {
    const race = this.races.byId(raceId);
    if (race) this.races.start(race, fromMission);
  },
};

function setupWorld(seed) {
  buildCity(seed);
  buildStaticLayer();
  resetPolice();
  const rng = makeRng(seed * 31 + 5);
  game.cars = [];
  game.peds = spawnPeds(rng, 26);
  game.hostiles = [];
  game.bullets = [];
  game.grenadesInFlight = [];
  game.particles = [];
  game.flashes = [];
  game.skids = [];
  game.crates = [];
  game.zoom = 1;
  game.tailCar = null;
  for (const c of spawnTraffic(rng)) game.cars.push(c);
  for (const c of spawnParked(rng, parkingSpots())) game.cars.push(c);
  game.player = makePlayer(WORLD.width / 2 - 200, WORLD.height - WORLD.sandRim - 60);
  game.missions = new MissionRunner(game);
  game.races = new RaceRunner(game);
  game.dialogue = makeDialogue();
  game.camera.x = clamp(game.player.x - canvas.width / 2, 0, Math.max(0, WORLD.width - canvas.width));
  game.camera.y = clamp(game.player.y - canvas.height / 2, 0, Math.max(0, WORLD.height - canvas.height));
}

function newRun() {
  game.cash = 240; game.rep = 0; game.heat = 0; game.wanted = 0; game.bust = 0;
  game.career = emptyCareer();
  game.raceBests = {};
  game.weaponId = 'vesper';
  game.grenades = 3;
  game.storyDone = false;
  setupWorld(SEED);
  game.state = 'play';
  for (const [w, t] of LINES.start) say(game.dialogue, w, t, 5);
}

function loadSlot(i) {
  const slot = game.slots[i];
  if (!slot) return;
  newRun();
  game.cash = slot.cash;
  game.rep = slot.rep;
  game.missions.storyIndex = Math.min(slot.storyIndex || 0, 10);
  game.career = { ...emptyCareer(), ...slot.career };
  game.raceBests = { ...slot.raceBests };
  game.banner('WELCOME BACK', 'The Bay kept your seat warm.', '#2fe8d8');
}

function respawn() {
  game.heat = 0;
  game.syncWanted();
  resetPolice();
  game.bust = 0;
  if (game.player.car) { game.player.car.driver = null; game.player.car = null; }
  game.player.health = 100;
  game.player.dead = false;
  game.player.x = WORLD.width / 2 - 200;
  game.player.y = WORLD.height - WORLD.sandRim - 60;
  game.state = 'play';
}

function spawnParticles(x, y, n, kind, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = kind === 'fire' ? 20 + Math.random() * 40 : 60 + Math.random() * 130;
    game.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'fire' ? 26 : 0),
      life: 0, max: kind === 'smoke' ? 1.4 : 0.5 + Math.random() * 0.5,
      kind, color, size: kind === 'fire' ? 5 + Math.random() * 6 : 2 + Math.random() * 3,
    });
  }
}
game.spawnSparks = (x, y, n) => spawnParticles(x, y, n, 'spark', '#ffd23e');

function explode(x, y) {
  spawnParticles(x, y, 26, 'fire', '#ff7847');
  spawnParticles(x, y, 16, 'smoke', '#55555e');
  spawnParticles(x, y, 12, 'spark', '#ffd23e');
  game.flashes.push({ x, y, r: 74, ttl: 0.16 });
  game.camera.shake = 12;
  sfx.explosion();
  scarePeds(game.peds, x, y, 260);
  for (const c of game.cars) if (dist(x, y, c.x, c.y) < 95 && !c.dead) damageCar(c, 34, game);
  for (const p of game.peds) if (dist(x, y, p.x, p.y) < 80 && p.state !== 'down') knockDown(p, 7);
  const pp = game.playerPos();
  if (dist(x, y, pp.x, pp.y) < 85) hurtPlayer(game.player, 16);
  if (anyCopSees(game)) game.addHeat(HEAT.explosion);
}

function update(dt) {
  game.time += dt;
  const p = game.player;
  updateDialogue(game.dialogue, dt);
  if (game.bannerData) { game.bannerData.ttl -= dt; if (game.bannerData.ttl <= 0) game.bannerData = null; }
  if (game.districtCard) { game.districtCard.ttl -= dt; if (game.districtCard.ttl <= 0) game.districtCard = null; }
  if (game.hurtFlash > 0) game.hurtFlash -= dt * 2.4;
  for (const id of Object.keys(game.abilityCooldowns)) if (game.abilityCooldowns[id] > 0) game.abilityCooldowns[id] -= dt;
  if (game.eyesOutTimer > 0) game.eyesOutTimer -= dt;

  const pos = game.playerPos();
  const d = districtAt(pos.x, pos.y);
  game.currentDistrict = d;
  const did = d ? d.id : null;
  if (did !== game.districtId) {
    game.districtId = did;
    if (d) game.districtCard = { name: d.name, tag: d.tag, ttl: 2.6 };
  }
  if (tapped('pause')) { game.state = 'pause'; return; }
  if (tapped('map')) { game.state = 'map'; return; }
  tryAbilities();

  if (p.car) {
    const car = p.car;
    const wasSpeed = Math.abs(car.speed);
    const drifting = applyDrive(car, dt, { up: pressed('up'), down: pressed('down'), left: pressed('left'), right: pressed('right') });
    keepCarInWorld(car);
    game.career.distanceKm += Math.abs(car.speed) * dt / 1000;
    if (drifting && Math.random() < 0.7) {
      game.skids.push({ x: car.x - Math.cos(car.angle) * 16, y: car.y - Math.sin(car.angle) * 16, a: car.angle, ttl: 7 });
      if (game.skids.length > 420) game.skids.splice(0, game.skids.length - 420);
    }
    if (wasSpeed > 200 && Math.abs(car.speed) < 60) game.camera.shake = Math.max(game.camera.shake, 4);
    setEngine(true, Math.abs(car.speed) / 300);
    if (tapped('enter')) exitCar();
  } else {
    setEngine(false, 0);
    updatePlayer(p, dt, game);
    tryShoot(dt);
    if (tapped('enter')) tryEnterCar();
  }

  for (const car of game.cars) if (car.driver === 'traffic') updateTraffic(car, dt, game.cars);
  updatePolice(game, dt);
  collideCars(game.cars, game);
  const danger = (game.wanted > 0 || game.hostiles.some((h) => h.state !== 'down')) ? pos : null;
  for (const ped of game.peds) updatePed(ped, dt, danger);
  updateHostiles(dt);
  updateBullets(dt);
  updateEffects(dt);

  for (const car of game.cars) {
    if (Math.abs(car.speed) < 42 || car.dead) continue;
    for (const ped of [...game.peds, ...game.hostiles]) {
      if (ped.state === 'down') continue;
      if (dist(car.x, car.y, ped.x, ped.y) < 25) {
        knockDown(ped, ped.hostile ? 999 : 6);
        if (ped.hostile) ped.health = 0;
        sfx.crash();
        if (car === p.car && anyCopSees(game)) game.addHeat(ped.hostile ? 6 : HEAT.hitPed);
      }
    }
  }
  if (game.missions) game.missions.update(dt);
  if (game.races) game.races.update(dt);

  const seen = anyCopSees(game);
  if (!seen && game.wanted > 0) game.addHeat(-LAW.decayPerSecond * dt * (game.eyesOutTimer > 0 ? 2.4 : 1) * 3.2);
  const nearCop = nearestCopDist(game);
  const speedNow = p.car ? Math.abs(p.car.speed) : (p.moving ? 60 : 0);
  if (game.wanted > 0 && nearCop < 48 && speedNow < 26) {
    game.bust += dt / LAW.bustFillSeconds;
    if (Math.random() < dt * 2) say(game.dialogue, LINES.bustedNear[0][0], LINES.bustedNear[0][1], 2.6);
    if (game.bust >= 1) return busted();
  } else {
    game.bust = Math.max(0, game.bust - dt * 0.7);
  }
  setSiren(game.wanted > 0 && nearCop < 560);
  updatePrompts();

  const vw = canvas.width, vh = canvas.height;
  const tx = clamp(pos.x - vw / 2, 0, Math.max(0, WORLD.width - vw));
  const ty = clamp(pos.y - vh / 2, 0, Math.max(0, WORLD.height - vh));
  game.camera.x += (tx - game.camera.x) * Math.min(1, dt * 5);
  game.camera.y += (ty - game.camera.y) * Math.min(1, dt * 5);
  if (game.camera.shake > 0) game.camera.shake = Math.max(0, game.camera.shake - dt * 26);
}

function tryAbilities() {
  const g = game;
  const fire = (id, cooldown, fn) => {
    if (g.abilityCooldowns[id] > 0 || !fn()) return;
    g.abilityCooldowns[id] = cooldown;
    sfx.blip();
  };
  if (tapped('ability1')) fire('mira', 75, () => {
    if (g.wanted === 0) return false;
    g.addHeat(-58);
    say(g.dialogue, 'mira', 'Plates swapped. You are a different rumour now.', 3.4);
    return true;
  });
  if (tapped('ability2')) fire('tomas', 60, () => {
    const car = g.player.car;
    if (!car || car.condition > 96) return false;
    car.condition = Math.min(100, car.condition + 40);
    car.dead = false;
    say(g.dialogue, 'tomas', 'Patched. Do not tell me how you bent her.', 3.4);
    return true;
  });
  if (tapped('ability3')) fire('ibrahim', 90, () => {
    g.eyesOutTimer = 20;
    say(g.dialogue, 'ibrahim', 'I have every unit on the glass. Heat will melt faster now.', 3.6);
    return true;
  });
}

function tryEnterCar() {
  const p = game.player;
  const car = nearestCar(game.cars, p.x, p.y, 56);
  if (!car) return;
  const wasParked = !car.driver;
  if (car.driver === 'traffic') {
    const bail = game.peds[0];
    if (bail) { bail.x = car.x + 20; bail.y = car.y + 14; bail.state = 'flee'; bail.panic = 2; }
  }
  car.driver = 'player';
  p.car = car;
  p.x = car.x; p.y = car.y;
  if (!car.stolen) {
    car.stolen = true;
    game.career.carsStolen++;
    const witnessed = anyCopSees(game) || game.peds.some((pd) => dist(pd.x, pd.y, car.x, car.y) < 130);
    game.addHeat(witnessed ? HEAT.stealCar : 4);
    if (wasParked && Math.random() < 0.4) say(game.dialogue, LINES.carSteal[0][0], LINES.carSteal[0][1], 3.2);
  }
}

function exitCar() {
  const p = game.player;
  const car = p.car;
  if (!car) return;
  car.driver = null;
  car.speed = 0;
  p.car = null;
  p.x = car.x - Math.sin(car.angle) * 26;
  p.y = car.y + Math.cos(car.angle) * 26;
}

function tryShoot(dt) {
  const p = game.player;
  game.fireTimer -= dt;
  const wp = weaponById(game.weaponId);
  const wx = game.camera.x + mouse.x, wy = game.camera.y + mouse.y;
  const wantFire = mouse.down || pressed('fire');
  p.aiming = wantFire;
  if (wantFire) p.angle = angleTo(p.x, p.y, wx, wy);
  if (tapped('weapons')) game.weaponId = cycleWeapon(game.weaponId, game.rep).id;
  if (tapped('grenade')) throwGrenade(wx, wy);
  if (!wantFire || game.fireTimer > 0) return;
  game.fireTimer = wp.rate;
  game.career.shotsFired++;
  if (wp.id === 'fists') {
    for (const h of [...game.hostiles, ...game.peds]) {
      if (h.state !== 'down' && dist(p.x, p.y, h.x, h.y) < 32) {
        h.health -= wp.damage;
        if (h.health <= 0) knockDown(h, h.hostile ? 999 : 6);
      }
    }
    return;
  }
  const pellets = wp.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const a = p.angle + (Math.random() - 0.5) * 2 * wp.spread;
    game.bullets.push({
      x: p.x + Math.cos(p.angle) * 16, y: p.y + Math.sin(p.angle) * 16,
      vx: Math.cos(a) * wp.speed, vy: Math.sin(a) * wp.speed,
      life: wp.range / wp.speed, damage: wp.damage, from: 'player',
    });
  }
  game.flashes.push({ x: p.x + Math.cos(p.angle) * 22, y: p.y + Math.sin(p.angle) * 22, r: 11, ttl: 0.05 });
  sfx.shot(wp.id);
  scarePeds(game.peds, p.x, p.y, 190);
  if (anyCopSees(game)) game.addHeat(HEAT.shotFired);
}

function throwGrenade(wx, wy) {
  if (game.grenades <= 0) return;
  game.grenades--;
  const p = game.player;
  game.grenadesInFlight.push({ x: p.x, y: p.y, tx: wx, ty: wy, t: 0, fuse: GRENADE.fuse });
}

function updateHostiles(dt) {
  const pos = game.playerPos();
  for (const h of game.hostiles) {
    if (h.state === 'down') continue;
    const d = dist(h.x, h.y, pos.x, pos.y);
    h.angle = angleTo(h.x, h.y, pos.x, pos.y);
    h.aiming = d < 300;
    if (d > 110) {
      h.moving = true;
      h.x += Math.cos(h.angle) * 74 * dt;
      h.y += Math.sin(h.angle) * 74 * dt;
    } else h.moving = false;
    if (d < 290 && !game.player.car) {
      h.shootTimer -= dt;
      if (h.shootTimer <= 0) {
        h.shootTimer = 1.1 + Math.random() * 1.3;
        game.copShoot(h);
      }
    }
  }
}

function updateBullets(dt) {
  const p = game.player;
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || buildingAt(b.x, b.y);
    if (!dead && b.from === 'player') {
      for (const h of [...game.hostiles, ...police.foot]) {
        if (h.state !== 'down' && dist(b.x, b.y, h.x, h.y) < 11) {
          h.health = (h.health || 30) - b.damage;
          if (h.health <= 0) {
            if (h.hostile) knockDown(h, 999);
            else { h.state = 'down'; h.downTimer = 8; game.addHeat(HEAT.hitCop); }
          }
          dead = true;
          break;
        }
      }
      if (!dead) for (const ped of game.peds) {
        if (ped.state !== 'down' && dist(b.x, b.y, ped.x, ped.y) < 10) {
          ped.health -= b.damage;
          if (ped.health <= 0) { knockDown(ped, 8); game.addHeat(HEAT.killPed); }
          dead = true;
          break;
        }
      }
      if (!dead) for (const car of game.cars) {
        if (!car.dead && dist(b.x, b.y, car.x, car.y) < 27) {
          damageCar(car, b.damage * 0.35, game);
          game.spawnSparks(b.x, b.y, 2);
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.from === 'cop' && !p.car) {
      if (dist(b.x, b.y, p.x, p.y) < 12) {
        hurtPlayer(p, b.damage);
        game.hurtFlash = 0.7;
        if (p.dead) return wasted();
        dead = true;
      }
    }
    if (dead) game.bullets.splice(i, 1);
  }
  for (let i = game.grenadesInFlight.length - 1; i >= 0; i--) {
    const g = game.grenadesInFlight[i];
    g.t += dt;
    g.fuse -= dt;
    const k = Math.min(1, g.t / 0.45);
    g.x += (g.tx - g.x) * k * dt * 4;
    g.y += (g.ty - g.y) * k * dt * 4;
    if (g.fuse <= 0) {
      explode(g.tx, g.ty);
      game.grenadesInFlight.splice(i, 1);
    }
  }
}

function updateEffects(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const pt = game.particles[i];
    pt.life += dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.kind === 'smoke') pt.vy -= 14 * dt;
    if (pt.life >= pt.max) game.particles.splice(i, 1);
  }
  for (let i = game.flashes.length - 1; i >= 0; i--) {
    game.flashes[i].ttl -= dt;
    if (game.flashes[i].ttl <= 0) game.flashes.splice(i, 1);
  }
  for (let i = game.skids.length - 1; i >= 0; i--) {
    game.skids[i].ttl -= dt;
    if (game.skids[i].ttl <= 0) game.skids.splice(i, 1);
  }
  for (const car of game.cars) {
    if (car.burning > 0) {
      car.burning -= dt;
      spawnParticles(car.x, car.y - 6, 2, Math.random() < 0.6 ? 'fire' : 'smoke', '#ff7847');
      if (car.burning <= 0) {
        car.burning = 0;
        car.exploded = true;
        explode(car.x, car.y);
      }
    }
  }
}

function updatePrompts() {
  const g = game;
  const p = g.player;
  g.promptText = null;
  const pos = g.playerPos();
  if (city.garage && dist(pos.x, pos.y, city.garage.x + city.garage.w / 2, city.garage.y + city.garage.h / 2) < 130) {
    g.promptText = 'G — Tideworks Garage';
    if (tapped('garage')) { g.state = 'garage'; g.garageNote = ''; }
    return;
  }
  if (!p.car) {
    const car = nearestCar(g.cars, p.x, p.y, 56);
    if (car) { g.promptText = 'E — Take the ' + car.model.name; return; }
  }
  if (g.missions && !g.missions.active && !g.missions.done) {
    const offer = g.missions.offerPoint();
    if (offer && dist(pos.x, pos.y, offer.x, offer.y) < 92) {
      const job = g.missions.list[g.missions.storyIndex];
      g.promptText = 'ENTER — Start job: ' + job.title;
      if (tapped('confirm')) g.missions.start();
      return;
    }
  }
  if (g.races && !g.races.active && p.car) {
    for (const race of g.races.list) {
      const start = race.points[0];
      if (dist(pos.x, pos.y, start.x, start.y) < 92) {
        g.promptText = 'ENTER — Race: ' + race.name + ' (par ' + race.par + 's)';
        if (tapped('confirm')) g.races.start(race, false);
        return;
      }
    }
  }
}

function busted() {
  game.career.busts++;
  const fine = Math.round(game.cash * 0.12);
  game.cash -= fine;
  game.state = 'busted';
  game.endText = `The Bay PD walks you to the wagon. Fine: $${fine.toLocaleString('en-US')}. The crew says nothing.`;
  setSiren(false);
  setEngine(false, 0);
}

function wasted() {
  const fine = Math.round(game.cash * 0.1);
  game.cash -= fine;
  game.state = 'wasted';
  game.endText = `You wake up at the Costa clinic, $${fine.toLocaleString('en-US')} lighter and entirely unrepentant.`;
  setSiren(false);
  setEngine(false, 0);
}

function drawWorld() {
  const cw = canvas.width, ch = canvas.height;
  const zoom = game.zoom || 1;
  const vw = cw / zoom, vh = ch / zoom;
  const cam = game.camera;
  const shX = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;
  const shY = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;
  const camX = clamp(cam.x + cw / 2 - vw / 2 + shX, 0, Math.max(0, WORLD.width - vw));
  const camY = clamp(cam.y + ch / 2 - vh / 2 + shY, 0, Math.max(0, WORLD.height - vh));
  // Ground first, in screen space — it must not ride the world transform.
  drawGround(ctx, camX, camY, vw, vh, cw, ch);
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-camX, -camY);
  ctx.fillStyle = 'rgba(18,16,24,0.5)';
  for (const s of game.skids) ctx.fillRect(s.x - 3, s.y - 3, 7, 7);
  drawSpotlight(ctx, police.heli);
  drawLampPools(ctx, camX, camY, vw, vh);
  drawMarkers();
  for (const cr of game.crates) drawCrate(ctx, cr);
  const drawables = [];
  for (const b of city.buildings) {
    if (b.x + b.w < camX - 80 || b.y + b.h < camY - 120 || b.x > camX + vw + 80 || b.y > camY + vh + 120) continue;
    drawables.push({ y: b.y + b.h, kind: 'building', b });
  }
  for (const palm of city.palms) {
    if (palm.x < camX - 60 || palm.y < camY - 60 || palm.x > camX + vw + 60 || palm.y > camY + vh + 60) continue;
    drawables.push({ y: palm.y + 4, kind: 'palm', b: palm });
  }
  for (const car of game.cars) drawables.push({ y: car.y + 12, kind: 'car', b: car });
  for (const ped of game.peds) drawables.push({ y: ped.y + 6, kind: 'ped', b: ped });
  for (const h of game.hostiles) drawables.push({ y: h.y + 6, kind: 'ped', b: h });
  for (const cop of police.foot) drawables.push({ y: cop.y + 6, kind: 'ped', b: cop });
  if (!game.player.car) drawables.push({ y: game.player.y + 6, kind: 'player', b: game.player });
  drawables.sort((a, b2) => a.y - b2.y);
  for (const d of drawables) {
    if (d.kind === 'building') drawBuilding(ctx, d.b);
    else if (d.kind === 'palm') drawPalm(ctx, d.b);
    else if (d.kind === 'car') drawCarShape(ctx, d.b, game.time);
    else drawPerson(ctx, d.b, game.time);
  }
  for (const ped of [...game.peds, ...game.hostiles]) {
    if (ped.state !== 'down') continue;
    ctx.fillStyle = 'rgba(20,12,30,0.55)';
    ctx.beginPath(); ctx.ellipse(ped.x, ped.y + 4, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const b of game.bullets) {
    ctx.strokeStyle = b.from === 'cop' ? 'rgba(255,120,120,0.9)' : 'rgba(255,230,150,0.95)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const g of game.grenadesInFlight) {
    ctx.fillStyle = '#2c3242';
    ctx.beginPath(); ctx.arc(g.x, g.y, 4.6, 0, Math.PI * 2); ctx.fill();
  }
  for (const pt of game.particles) {
    const k = 1 - pt.life / pt.max;
    if (pt.kind === 'fire') {
      ctx.fillStyle = `rgba(255,${120 + Math.floor(80 * k)},40,${0.75 * k})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (0.5 + k * 0.5), 0, Math.PI * 2); ctx.fill();
    } else if (pt.kind === 'smoke') {
      ctx.fillStyle = `rgba(90,88,100,${0.30 * k})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * 3.4 * (1.6 - k), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = `rgba(255,210,62,${k})`;
      ctx.fillRect(pt.x - 1.6, pt.y - 1.6, 3.2, 3.2);
    }
  }
  for (const f of game.flashes) {
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    g.addColorStop(0, 'rgba(255,240,190,0.8)');
    g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
  }
  drawHeli(ctx, police.heli, game.time);
  ctx.restore();
  applyGrade(ctx, cw, ch);
  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(200,20,40,${0.28 * Math.max(0, game.hurtFlash)})`;
    ctx.fillRect(0, 0, cw, ch);
  }
}

function drawMarkers() {
  const t = game.time;
  const beam = (x, y, color, glyph) => {
    const grad = ctx.createLinearGradient(0, y - 190, 0, y);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.30 + Math.sin(t * 3) * 0.07;
    ctx.fillRect(x - 13, y - 190, 26, 190);
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 15 + Math.sin(t * 3) * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#14100d';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(glyph, x, y + 6);
    ctx.textAlign = 'left';
  };
  if (game.missions) {
    const s = game.missions.stage;
    if (game.missions.active && s) {
      if (s.type === 'steal' && game.missions.markedCar) beam(game.missions.markedCar.x, game.missions.markedCar.y, '#ffd23e', '▼');
      else if (s.at) beam(s.at.x, s.at.y, '#ffd23e', '!');
    } else if (!game.missions.done) {
      const offer = game.missions.offerPoint();
      if (offer) beam(offer.x, offer.y, '#ffd23e', '!');
    }
  }
  if (game.races && game.races.active) {
    const p = game.races.currentPoint();
    if (p) beam(p.x, p.y, '#2fe8d8', '»');
  }
  if (game.tailCar && game.missions && game.missions.stage && game.missions.stage.type === 'tail') {
    beam(game.tailCar.x, game.tailCar.y, '#ff4f9a', '◎');
  }
}

canvas.addEventListener('mousedown', () => {
  initAudio();
  resumeAudio();
  if (game.state === 'play') return;
  const rect = game.clickRects.find((r) => mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h);
  if (rect) handleAction(rect.action);
});

function handleAction(action) {
  if (action === 'title-new') { newRun(); return; }
  if (action.startsWith('title-load-')) { loadSlot(Number(action.slice(11))); return; }
  if (action.startsWith('pause-save-')) {
    const i = Number(action.slice(11));
    writeSlot(i, game);
    game.slots = readAllSlots();
    game.banner('SAVED', 'Slot ' + (i + 1) + ' — the Bay remembers.', '#7be495');
    sfx.cash();
    return;
  }
  if (action.startsWith('garage-')) {
    const service = GARAGE_SERVICES.find((s) => s.id === action.slice(7));
    const car = game.player.car;
    if (!service || !car) return;
    const price = service.price(car);
    if (game.cash < price || !serviceAvailable(service, car).ok) return;
    game.cash -= price;
    game.garageNote = applyService(service, car, game);
    sfx.cash();
  }
}

window.addEventListener('keydown', (e) => {
  initAudio();
  resumeAudio();
  if (e.code === 'KeyR' && game.state === 'play') {
    game.radioIdx = game.radioIdx >= 3 ? -1 : game.radioIdx + 1;
    setRadio(game.radioIdx >= 0 ? stationByIndex(game.radioIdx) : null);
  }
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  const vw = canvas.width, vh = canvas.height;
  if (game.state === 'play') {
    if (SHOT) { game.time += dt * 0.3; updateDialogue(game.dialogue, dt); }
    else update(dt);
  } else {
    game.time += dt;
    if (game.state === 'title' && tapped('confirm')) newRun();
    if ((game.state === 'busted' || game.state === 'wasted') && tapped('confirm')) respawn();
    if (game.state === 'pause' && (tapped('pause') || tapped('confirm'))) game.state = 'play';
    if (game.state === 'map' && (tapped('map') || tapped('pause'))) game.state = 'play';
    if (game.state === 'garage' && (tapped('garage') || tapped('pause'))) game.state = 'play';
  }
  if (game.state === 'title') {
    drawTitleScreen(ctx, game, vw, vh, staticLayerRef());
  } else {
    drawWorld();
    if (game.state === 'play') {
      drawHUD(ctx, game, vw, vh);
      drawDistrictCard(ctx, game, vw, vh);
      drawBanner(ctx, game, vw, vh);
    } else if (game.state === 'map') drawMapScreen(ctx, game, vw, vh, staticLayerRef());
    else if (game.state === 'pause') drawPauseScreen(ctx, game, vw, vh);
    else if (game.state === 'garage') drawGarageScreen(ctx, game, vw, vh);
    else if (game.state === 'busted' || game.state === 'wasted') drawEndScreen(ctx, game, vw, vh);
  }
  clearTaps();
  requestAnimationFrame(frame);
}

let _staticLayer = null;
function staticLayerRef() { return _staticLayer; }

// Boot: a world behind the title, then any staged scene.
setupWorld(SEED);
_staticLayer = buildStaticLayer();
game.slots = readAllSlots();
game.state = 'title';
if (SHOT) stageScene(SHOT);
requestAnimationFrame(frame);

function stageScene(shot) {
  const g = game;
  if (shot === 'title') {
    g.state = 'title';
    const career = (o) => ({ carsStolen: 0, distanceKm: 0, racesWon: 0, racesRun: 0, missionsDone: 0, busts: 0, topStars: 0, shotsFired: 0, ...o });
    g.slots = [
      { cash: 4210, rep: 388, storyIndex: 6, district: 'Centro Coral', career: career({ carsStolen: 14, distanceKm: 38.2, racesWon: 2, racesRun: 3, missionsDone: 6, busts: 1, topStars: 5, shotsFired: 120 }), raceBests: { 'tide-run': 91.4 }, savedAt: Date.now() - 86400000 },
      { cash: 1150, rep: 130, storyIndex: 2, district: 'Paseo del Mar', career: career({ carsStolen: 5, distanceKm: 12.6, racesRun: 1, missionsDone: 2, topStars: 3, shotsFired: 24 }), raceBests: {}, savedAt: Date.now() - 3600000 },
      null,
    ];
    return;
  }
  if (shot === 'map') {
    g.state = 'map';
    g.missions.storyIndex = 4;
    g.career = { carsStolen: 11, distanceKm: 27.4, racesWon: 1, racesRun: 2, missionsDone: 4, busts: 1, topStars: 4, shotsFired: 86 };
    g.cash = 2960;
    g.rep = 342;
    return;
  }
  g.state = 'play';
  if (shot === 'cover') {
    // The chase: four stars, AIR ONE overhead, a wreck at the roadside.
    const roadY = WORLD.sandRim + 4 * WORLD.pitch + WORLD.roadWidth / 2;
    // Clear the avenue first, so the staged formation owns the road.
    g.cars = g.cars.filter(c => Math.abs(c.y - roadY) > 84 || c.x < WORLD.width / 2 - 490 || c.x > WORLD.width / 2 + 440);
    const car = g.addCar(WORLD.width / 2 - 60, roadY, 0, CAR_MODELS[1], { driver: 'player', condition: 76 });
    g.player.car = car;
    car.speed = 235;
    g.player.x = car.x; g.player.y = car.y;
    g.cash = 3420; g.rep = 388;
    g.saidHeat = 5;
    g.currentDistrict = districtAt(car.x, car.y);
    g.heat = 200; g.syncWanted();
    // Pursuit formation: three units close BEHIND, noses east.
    const c1 = g.addCar(car.x - 118, car.y - 33, 0.05, CAR_MODELS[2], { police: true, driver: 'cop', color: '#232833' });
    const c2 = g.addCar(car.x - 178, car.y + 36, -0.04, CAR_MODELS[2], { police: true, driver: 'cop', color: '#232833' });
    const c3 = g.addCar(car.x - 238, car.y - 4, 0.02, CAR_MODELS[2], { police: true, driver: 'cop', color: '#232833' });
    c1.unitName = { label: 'TARPON 11', role: 'RAMMING' };
    c2.unitName = { label: 'MARLIN 4', role: 'PURSUIT' };
    c3.unitName = { label: 'KESTREL 7', role: 'PURSUIT' };
    police.cars.push(c1, c2, c3);
    const block = placeRoadblock(g, { x: car.x - 190, y: car.y }, 0);
    for (const bc of block.cars) bc.unitName = { label: 'BULWARK 2', role: 'ROADBLOCK' };
    police.heli.on = true;
    police.heli.radius = 120;
    police.heli.x = car.x - 70;
    police.heli.y = car.y - 108;
    police.heli.angle = 0.7;
    police.heli.targetX = car.x;
    police.heli.targetY = car.y;
    const wreck = g.addCar(car.x - 300, car.y + 40, 0.9, CAR_MODELS[5], { driver: null, condition: 0 });
    wreck.dead = true;
    wreck.burning = 90;
    for (let i = 0; i < 12; i++) g.skids.push({ x: car.x - 40 - i * 17, y: car.y + 8 + Math.sin(i * 0.7) * 7, a: 0, ttl: 9 });
    spawnParticles(wreck.x, wreck.y, 20, 'fire', '#ff7847');
    spawnParticles(wreck.x, wreck.y, 10, 'smoke', '#55555e');
    for (const pt of g.particles) { pt.life = Math.random() * pt.max * 0.6; pt.x += pt.vx * pt.life; pt.y += pt.vy * pt.life; }
    g.flashes.push({ x: wreck.x, y: wreck.y, r: 58, ttl: 99 });
    g.missions.storyIndex = 3;
    g.missions.active = g.missions.list[3];
    g.missions.stageIndex = 1;
    g.spawnShootout(g.missions.stage);
    for (const h of g.hostiles) { h.x = car.x + 900; h.y = car.y - 500; }
    g.radioIdx = 0;
    g.zoom = 1.25;
    g.camera.x = clamp(car.x - 690, 0, WORLD.width - 1280);
    g.camera.y = clamp(car.y - 255, 0, WORLD.height - 720);
    say(g.dialogue, 'mira', 'BULWARK is set ahead — thread the gap or ram through, Lucia!', 99);
    return;
  }
  if (shot === 'mission') {
    // The Ceniza discussion: on foot, Vesper out, Bay PD rolling in.
    const at = { x: WORLD.sandRim + 3 * WORLD.pitch + WORLD.roadWidth / 2 - 70, y: WORLD.sandRim + 4 * WORLD.pitch + WORLD.roadWidth / 2 + 46 };
    g.player.x = at.x; g.player.y = at.y;
    g.player.angle = 0.15;
    g.player.aiming = true;
    g.cash = 1890; g.rep = 246;
    g.currentDistrict = districtAt(at.x, at.y);
    g.missions.storyIndex = 3;
    g.missions.active = g.missions.list[3];
    g.missions.stageIndex = 1;
    g.spawnShootout(g.missions.stage);
    // The fight tightens around the crates; one torpedo already down.
    g.crates = [
      { x: at.x + 40, y: at.y - 26, s: 30 }, { x: at.x + 46, y: at.y + 34, s: 24 },
      { x: at.x + 128, y: at.y + 4, s: 28 }, { x: at.x + 168, y: at.y - 48, s: 22 },
    ];
    g.hostiles.forEach((h, i) => {
      h.x = at.x + 88 + (i % 2) * 48;
      h.y = at.y - 44 + i * 30;
      h.angle = Math.PI + 0.4;
    });
    if (g.hostiles[1]) { g.hostiles[1].x = at.x + 148; g.hostiles[1].y = at.y + 4; }
    if (g.hostiles[0]) { g.hostiles[0].state = 'down'; g.hostiles[0].x = at.x + 88; g.hostiles[0].y = at.y + 54; }
    g.flashes.push({ x: at.x + 24, y: at.y + 12, r: 13, ttl: 9 });
    g.flashes.push({ x: at.x + 140, y: at.y + 3, r: 11, ttl: 9 });
    g.bullets.push({ x: at.x + 30, y: at.y + 13, vx: 700, vy: 320, life: 0.4, damage: 16, from: 'player' });
    g.bullets.push({ x: at.x + 134, y: at.y + 4, vx: -640, vy: 70, life: 0.4, damage: 6, from: 'cop' });
    g.zoom = 1.7;
    g.saidHeat = 2;
    g.heat = 62; g.syncWanted();
    const c1 = g.addCar(at.x - 230, at.y - 96, 2.6, CAR_MODELS[2], { police: true, driver: 'cop', color: '#232833' });
    c1.unitName = { label: 'VIGIL 9', role: 'MARKSMAN' };
    police.cars.push(c1);
    police.foot.push({ x: at.x - 150, y: at.y - 60, angle: 2.2, moving: false, phase: 1, shirt: '#2b3a55', pants: '#1d2432', skin: '#c98a5e', aiming: true, shootTimer: 2, unitName: { label: 'SIERRA 5', role: 'TACTICAL' } });
    g.camera.x = clamp(at.x - 600, 0, WORLD.width - 1280);
    g.camera.y = clamp(at.y - 330, 0, WORLD.height - 720);
    say(g.dialogue, 'mira', 'Two down the left aisle! Watch the crates, Lucia!', 99);
  }
}
