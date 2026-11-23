// Crimson Tide Bay — the crew: who they are, what they say, what their
// abilities do. Dialogue lines are data; hud.js draws the box.

export const CREW = [
  {
    id: 'mira', name: 'Mira Kesang', role: 'Wheelman',
    color: '#2fe8d8', skin: '#8a5a34',
    ability: { id: 'plates', name: 'Swap Plates', key: '1', cooldown: 75, desc: 'Lose a star in the confusion' },
  },
  {
    id: 'tomas', name: 'Tomás Rey', role: 'Wrench',
    color: '#ffb03a', skin: '#c98a5e',
    ability: { id: 'fix', name: 'Quick Fix', key: '2', cooldown: 60, desc: 'Patch the car up 40%' },
  },
  {
    id: 'ibrahim', name: 'Ibrahim Sow', role: 'Lookout',
    color: '#ff4f9a', skin: '#54371e',
    ability: { id: 'eyes', name: 'Eyes Out', key: '3', cooldown: 90, desc: 'Heat fades twice as fast for 20 s' },
  },
];

export function crewById(id) {
  return CREW.find((c) => c.id === id) || CREW[0];
}

// One box at a time; lines queue.
export function makeDialogue() {
  return { current: null, queue: [], timer: 0 };
}

export function say(dialogue, crewId, text, seconds = 4.2) {
  dialogue.queue.push({ crewId, text, seconds });
}

export function updateDialogue(dialogue, dt) {
  if (!dialogue.current) {
    const next = dialogue.queue.shift();
    if (next) {
      dialogue.current = next;
      dialogue.timer = next.seconds;
    }
    return;
  }
  dialogue.timer -= dt;
  if (dialogue.timer <= 0) dialogue.current = null;
}

// Stock lines for game events.
export const LINES = {
  start: [
    ['mira', 'Bay PD is awake tonight, Lucia. Whatever we do, we do it clean.'],
    ['tomas', 'Engine sounds sweet. Try not to wrap her around a palm tree.'],
  ],
  heat2: [['ibrahim', 'Two stars. BULWARK is setting a block on the coast road — I can see the lights.']],
  heat3: [['mira', 'AIR ONE is up. Stay under the palms when you can, and keep moving.']],
  heat5: [['tomas', 'Five stars?! Hermana, the whole bay is coming. RUN.']],
  escaped: [['ibrahim', 'Clear. They lost you. Breathe.']],
  bustedNear: [['mira', 'They are ON you — break line of sight, now!']],
  carSteal: [['tomas', 'Nice ride. Shame about the owner.']],
  raceWin: [['mira', 'That is how the Bay learns your name.']],
  garage: [['tomas', 'Bring her in, I will make her beautiful again.']],
  missionDone: [['ibrahim', 'Done and dusted. The Bay provides.']],
};
