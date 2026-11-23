// Crimson Tide Bay — Tideworks Garage: services and prices — repairs,
// resprays that cool the law's interest, three upgrade ladders.

export const GARAGE_SERVICES = [
  { id: 'repair', name: 'Full Repair', desc: 'Condition back to 100%', price: (car) => Math.ceil((100 - car.condition) * 6) },
  { id: 'respray', name: 'Respray & Plates', desc: 'New colour, cold plates: lose 2 stars', price: () => 450 },
  { id: 'engine', name: 'Engine Tune', desc: '+9% top speed per tier (max 3)', price: (car) => 700 + (car.engineTier || 0) * 550 },
  { id: 'tires', name: 'Harbour Tyres', desc: '+8% grip per tier (max 3)', price: (car) => 500 + (car.tireTier || 0) * 400 },
  { id: 'armor', name: 'Panel Armour', desc: 'Body takes half damage (one-off)', price: () => 1100 },
];

export const RESPRAY_COLORS = ['#e0483e', '#2fe8d8', '#ffb03a', '#ff4f9a', '#7fae56', '#efe3cc', '#8a6bb8', '#f2f4f6'];

export function serviceAvailable(service, car) {
  if (!car) return { ok: false, why: 'Bring a car in first' };
  switch (service.id) {
    case 'repair': return car.condition >= 99.5 ? { ok: false, why: 'Already perfect' } : { ok: true };
    case 'respray': return { ok: true };
    case 'engine': return (car.engineTier || 0) >= 3 ? { ok: false, why: 'Max tier' } : { ok: true };
    case 'tires': return (car.tireTier || 0) >= 3 ? { ok: false, why: 'Max tier' } : { ok: true };
    case 'armor': return car.armored ? { ok: false, why: 'Already fitted' } : { ok: true };
    default: return { ok: true };
  }
}

// Returns a short result line for the garage screen.
export function applyService(service, car, game) {
  switch (service.id) {
    case 'repair':
      car.condition = 100;
      car.dead = false;
      car.burning = 0;
      return 'Good as new. Try to keep her that way.';
    case 'respray': {
      const others = RESPRAY_COLORS.filter((c) => c !== car.color);
      car.color = others[Math.floor(Math.random() * others.length)];
      game.addHeat(-70);
      return 'New colour, cold plates. The PD just lost the description.';
    }
    case 'engine':
      car.engineTier = (car.engineTier || 0) + 1;
      return `Engine tuned to tier ${car.engineTier}. She pulls harder now.`;
    case 'tires':
      car.tireTier = (car.tireTier || 0) + 1;
      return `Harbour tyres, tier ${car.tireTier}. Corners are a promise now.`;
    case 'armor':
      car.armored = true;
      return 'Panels lined. She can take a beating.';
    default:
      return 'Done.';
  }
}
