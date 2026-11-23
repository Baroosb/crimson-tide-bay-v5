// Crimson Tide Bay — weapons: four named tiers and a pocket of grenades.
// The shooting is resolved in game.js; definitions live here.

export const WEAPONS = [
  { id: 'fists',   name: 'Puños',   tier: 0, unlockRep: 0,   damage: 8,  rate: 0.34, speed: 0,    spread: 0,    range: 30,  ammo: Infinity, auto: false },
  { id: 'vesper',  name: 'Vesper',  tier: 1, unlockRep: 0,   damage: 16, rate: 0.26, speed: 720,   spread: 0.03, range: 330, ammo: Infinity, auto: false },
  { id: 'mako',    name: 'Mako',    tier: 2, unlockRep: 120, damage: 12, rate: 0.09, speed: 760,   spread: 0.07, range: 320, ammo: Infinity, auto: true },
  { id: 'breaker', name: 'Breaker', tier: 3, unlockRep: 320, damage: 11, rate: 0.72, speed: 640,   spread: 0.16, range: 210, ammo: Infinity, auto: false, pellets: 6 },
  { id: 'kestrel', name: 'Kestrel', tier: 4, unlockRep: 650, damage: 34, rate: 0.5,  speed: 980,   spread: 0.008, range: 520, ammo: Infinity, auto: false },
];

export const GRENADE = { name: 'Solano', damage: 85, radius: 92, fuse: 0.9 };

export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

export function unlockedWeapons(rep) {
  return WEAPONS.filter((w) => rep >= w.unlockRep);
}

// For the HUD strip's LOCKED slot.
export function nextLockedWeapon(rep) {
  return WEAPONS.find((w) => rep < w.unlockRep) || null;
}

// Cycle to the next unlocked weapon.
export function cycleWeapon(currentId, rep) {
  const open = unlockedWeapons(rep);
  const i = open.findIndex((w) => w.id === currentId);
  return open[(i + 1) % open.length];
}
