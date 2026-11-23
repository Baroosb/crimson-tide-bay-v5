// Crimson Tide Bay — shared tuning constants: every number and colour
// the city, the law and the camera agree on lives here.

export const WORLD = {
  // A grid of blocks and two-lane roads, sand rim, open water.
  blocksX: 10,
  blocksY: 8,
  blockSize: 196,     // buildable square inside one block
  roadWidth: 96,      // asphalt band between blocks
  sandRim: 150,       // beach between the grid and the water
  get pitch() { return this.blockSize + this.roadWidth; },
  get gridW() { return this.blocksX * this.pitch + this.roadWidth; },
  get gridH() { return this.blocksY * this.pitch + this.roadWidth; },
  get width() { return this.gridW + this.sandRim * 2; },
  get height() { return this.gridH + this.sandRim * 2; },
};

export const PLAYER = {
  walkSpeed: 126,
  sprintSpeed: 212,
  radius: 11,
  health: 100,
  armor: 0,
};

export const CAR = {
  length: 48,
  width: 23,
  accel: 285,
  brake: 370,
  reverseMax: 100,
  drag: 0.6,
  turnRate: 2.7,      // rad/s at full lock, scaled by speed
  trafficCount: 16,
  parkedCount: 13,
};

export const LAW = {
  maxStars: 5,
  decayPerSecond: 0.055, // heat lost while no cop sees you
  sightRange: 350,
  bustFillSeconds: 2.1,  // this long in a cop's grip: busted
  copShootStars: 4,      // stars where the law starts shooting
};

// Golden-hour grade: low amber sun west, long SE shadows, violet tints.
export const PALETTE = {
  water: '#1f6f8f',
  waterDeep: '#12486a',
  waterFoam: '#cdeee2',
  sand: '#f2d096',
  sandWet: '#e0b878',
  grass: '#5f9c46',
  park: '#4f8a3c',
  sidewalk: '#dcC69e',
  curb: '#a68a62',
  road: '#3b3d4a',
  roadEdge: '#2c2e39',
  roadLine: '#f6cf4a',
  crosswalk: '#eee7d4',
  shadow: 'rgba(43,20,78,0.38)',   // violet-tinted building shadows
  sunGlow: 'rgba(255,150,50,0.22)',
  dusk: 'rgba(58,22,96,0.22)',
  neonPink: '#ff4f9a',
  neonTeal: '#2fe8d8',
  neonAmber: '#ffb03a',
  windowLit: '#ffd98a',
};

export const REP_TIERS = [
  { name: 'Nadie',               min: 0,   payBonus: 0 },
  { name: 'Conocido',            min: 120, payBonus: 0.10 },
  { name: 'Respetado',           min: 320, payBonus: 0.18 },
  { name: 'Leyenda de la Bahía', min: 650, payBonus: 0.25 },
];

export function repTier(rep) {
  let tier = REP_TIERS[0];
  for (const t of REP_TIERS) if (rep >= t.min) tier = t;
  return tier;
}

// What each act is worth to the Bay PD.
export const HEAT = {
  stealCar: 16,
  hitCar: 7,
  hitPed: 22,
  shotFired: 9,
  killPed: 30,
  hitCop: 26,
  explosion: 20,
  raceWin: 4,
};
