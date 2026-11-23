// Crimson Tide Bay — saves: three localStorage slots and the career
// ledger — cash, REP, story progress, race bests, career counters.

const PREFIX = 'crimson-tide-bay-slot-';
export const SLOT_COUNT = 3;

export function emptyCareer() {
  return {
    carsStolen: 0,
    distanceKm: 0,
    racesWon: 0,
    racesRun: 0,
    missionsDone: 0,
    busts: 0,
    topStars: 0,
    shotsFired: 0,
  };
}

export function completionPercent(save) {
  if (!save) return 0;
  const story = (save.storyIndex || 0) / 10;
  const races = Math.min(1, (save.career.racesWon || 0) / 3);
  return Math.round((story * 0.75 + races * 0.25) * 100);
}

export function readSlot(i) {
  try {
    const raw = localStorage.getItem(PREFIX + i);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.cash !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function readAllSlots() {
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) slots.push(readSlot(i));
  return slots;
}

export function writeSlot(i, game) {
  const data = {
    cash: Math.round(game.cash),
    rep: Math.round(game.rep),
    storyIndex: game.missions ? game.missions.storyIndex : 0,
    district: game.currentDistrict ? game.currentDistrict.name : 'Costa Dorada',
    career: { ...game.career },
    raceBests: { ...game.raceBests },
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(PREFIX + i, JSON.stringify(data));
  } catch {
    // Storage blocked: the run continues unsaved.
  }
  return data;
}

export function slotSummary(slot) {
  if (!slot) return { title: 'EMPTY SLOT', sub: 'No run saved here yet' };
  const when = new Date(slot.savedAt);
  const hh = String(when.getHours()).padStart(2, '0');
  const mm = String(when.getMinutes()).padStart(2, '0');
  return {
    title: `$${slot.cash.toLocaleString('en-US')} · REP ${slot.rep}`,
    sub: `${slot.district} · Story ${slot.storyIndex}/10 · Saved ${hh}:${mm}`,
  };
}
