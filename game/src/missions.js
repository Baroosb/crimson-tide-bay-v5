// Crimson Tide Bay — the story: ten jobs, and the runner that walks a
// mission's stages, paying cash and REP.

import { dist } from './random.js';
import { districtCenter, districtById } from './districts.js';
import { say } from './crew.js';

// Stage types: goto | steal | deliver | escape | shootout | race | tail.
export function buildMissions() {
  const at = (id) => districtCenter(districtById(id));
  return [
    {
      id: 'homecoming', title: 'Homecoming', giver: 'mira', pay: 300, rep: 40,
      intro: [['mira', 'Lucia. You actually came back. The Bay kept your room — and your debts. Drive us home.']],
      stages: [
        { type: 'goto', at: at('costa'), label: 'Drive to the Costa Dorada boardwalk', radius: 70 },
        { type: 'goto', at: at('paseo'), label: 'Drop Mira at the Paseo del Mar hotels', radius: 70 },
      ],
    },
    {
      id: 'first-wheels', title: 'First Wheels', giver: 'tomas', pay: 420, rep: 55,
      intro: [['tomas', 'You need wheels that are not on a bus pass. There is a Vireo in Palmera with your name on it.']],
      stages: [
        { type: 'steal', at: at('palmera'), model: 'Vireo GT', label: 'Steal the Vireo GT in Villa Palmera' },
        { type: 'deliver', at: at('paseo'), label: 'Deliver it to Tideworks Garage', radius: 90 },
      ],
    },
    {
      id: 'market-run', title: 'Market Run', giver: 'ibrahim', pay: 520, rep: 65,
      intro: [['ibrahim', 'Crates at the harbour, buyers at the market. Simple. It is never simple.']],
      stages: [
        { type: 'goto', at: at('puerto'), label: 'Pick up the crates at Puerto Alba', radius: 75, timer: 150 },
        { type: 'deliver', at: at('mercado'), label: 'Get the crates to Mercado Alto', radius: 75, timer: 120 },
        { type: 'escape', label: 'Lose the Bay PD' },
      ],
    },
    {
      id: 'ash-and-ember', title: 'Ash and Ember', giver: 'mira', pay: 680, rep: 85,
      intro: [['mira', 'The Ceniza crew burned our stash house. Go and discuss it with them.']],
      stages: [
        { type: 'goto', at: at('ceniza'), label: 'Go to Barrio Ceniza', radius: 80 },
        { type: 'shootout', at: at('ceniza'), count: 4, label: 'Drop 4 Ceniza torpedoes' },
        { type: 'escape', label: 'Lose the Bay PD' },
      ],
    },
    {
      id: 'harbour-lights', title: 'Harbour Lights', giver: 'tomas', pay: 760, rep: 95,
      intro: [['tomas', 'A Comet RS is leaving on the midnight ferry. It should leave with you instead.']],
      stages: [
        { type: 'steal', at: at('muelles'), model: 'Veloz Comet RS', label: 'Steal the Comet RS at the East Docks' },
        { type: 'deliver', at: at('paseo'), label: 'Deliver it to Tideworks Garage', radius: 90, timer: 140 },
      ],
    },
    {
      id: 'tide-runner', title: 'Tide Runner', giver: 'ibrahim', pay: 880, rep: 110,
      intro: [['ibrahim', 'The coast road, three lights, one name to make. Win the Tide Run and the Bay listens.']],
      stages: [
        { type: 'race', race: 'tide-run', label: 'Win the Tide Run street race' },
        { type: 'escape', label: 'Lose the Bay PD' },
      ],
    },
    {
      id: 'shadow-freight', title: 'Shadow Freight', giver: 'mira', pay: 1020, rep: 130,
      intro: [['mira', 'Follow the Ceniza money car. Close enough to learn, far enough to live.']],
      stages: [
        { type: 'goto', at: at('centro'), label: 'Pick up the tail in Centro Coral', radius: 85 },
        { type: 'tail', seconds: 45, label: 'Tail the money car — stay close, stay unseen' },
        { type: 'goto', at: at('faro'), label: 'Follow the trail to Faro Quemado', radius: 85 },
      ],
    },
    {
      id: 'coral-crown', title: 'The Coral Crown', giver: 'tomas', pay: 1250, rep: 160,
      intro: [['tomas', 'The Crown casino keeps its take in a Faro Roadster. Tonight it changes owners.']],
      stages: [
        { type: 'steal', at: at('centro'), model: 'Faro Roadster', label: 'Steal the Faro Roadster in Centro Coral' },
        { type: 'shootout', at: at('centro'), count: 3, label: 'Hold off the Crown guards' },
        { type: 'deliver', at: at('costa'), label: 'Get the Roadster to Costa Dorada', radius: 90 },
        { type: 'escape', label: 'Lose the Bay PD' },
      ],
    },
    {
      id: 'burnt-light', title: 'Burnt Light', giver: 'ibrahim', pay: 1500, rep: 200,
      intro: [['ibrahim', 'The lighthouse keeper saw everything. Everyone is coming for him tonight. Get there first.']],
      stages: [
        { type: 'goto', at: at('faro'), label: 'Reach Faro Quemado', radius: 85, timer: 130 },
        { type: 'shootout', at: at('faro'), count: 6, label: 'Protect the keeper — drop 6 torpedoes' },
        { type: 'deliver', at: at('palmera'), label: 'Get the keeper to Villa Palmera', radius: 85 },
      ],
    },
    {
      id: 'crimson-tide', title: 'Crimson Tide', giver: 'mira', pay: 2400, rep: 320,
      intro: [['mira', 'One last run, Lucia. Every crew, every debt, settled by sunrise. The whole Bay is watching.']],
      stages: [
        { type: 'goto', at: at('puerto'), label: 'Start the run at Puerto Alba', radius: 80 },
        { type: 'shootout', at: at('puerto'), count: 5, label: 'Break the harbour ambush' },
        { type: 'deliver', at: at('centro'), label: 'Hit the Centro Coral vault drop', radius: 85, timer: 150 },
        { type: 'escape', label: 'Lose the Bay PD — all of them' },
        { type: 'goto', at: at('costa'), label: 'Watch the sun finish setting on Costa Dorada', radius: 90 },
      ],
    },
  ];
}

export class MissionRunner {
  constructor(game) {
    this.game = game;
    this.list = buildMissions();
    this.storyIndex = 0;      // next mission to offer
    this.active = null;       // the mission being run
    this.stageIndex = 0;
    this.stageTimer = -1;     // seconds left, when the stage is timed
    this.tailTime = 0;
    this.hostiles = [];       // live shootout targets (peds)
    this.markedCar = null;    // the car a steal stage points at
  }

  get stage() {
    return this.active ? this.active.stages[this.stageIndex] : null;
  }

  get done() {
    return this.storyIndex >= this.list.length && !this.active;
  }

  // The gold marker floats at the next mission's first stage.
  offerPoint() {
    if (this.active || this.done) return null;
    const m = this.list[this.storyIndex];
    const s = m.stages[0];
    return s.at || null;
  }

  start() {
    if (this.active || this.done) return;
    this.active = this.list[this.storyIndex];
    this.stageIndex = 0;
    for (const [who, text] of this.active.intro) say(this.game.dialogue, who, text, 5);
    this.beginStage();
  }

  beginStage() {
    const s = this.stage;
    this.stageTimer = s && s.timer ? s.timer : -1;
    this.tailTime = 0;
    this.hostiles = [];
    this.markedCar = null;
    if (!s) return;
    if (s.type === 'shootout') this.game.spawnShootout(s);
    if (s.type === 'steal') this.markedCar = this.game.markStealCar(s);
    if (s.type === 'race') this.game.startRace(s.race, true);
    if (s.type === 'tail') this.game.spawnTailCar();
  }

  update(dt) {
    const s = this.stage;
    if (!s) return;
    const g = this.game;
    const pos = g.playerPos();
    if (this.stageTimer > 0) {
      this.stageTimer -= dt;
      if (this.stageTimer <= 0) return this.fail('Out of time. The Bay forgets quickly — try again.');
    }
    switch (s.type) {
      case 'goto':
      case 'deliver':
        if (s.at && dist(pos.x, pos.y, s.at.x, s.at.y) < (s.radius || 70)) {
          if (s.type === 'deliver' && !g.player.car && s.needsCar) return;
          return this.advance();
        }
        break;
      case 'steal': {
        if (this.markedCar && g.player.car === this.markedCar) return this.advance();
        if (this.markedCar && this.markedCar.dead) return this.fail('The car is wrecked. That was the whole point of it.');
        break;
      }
      case 'escape':
        if (g.wanted === 0) return this.advance();
        break;
      case 'shootout':
        if (this.hostiles.length > 0 && this.hostiles.every((h) => h.state === 'down')) return this.advance();
        break;
      case 'race':
        // (RaceRunner reports via game.raceResult.)
        break;
      case 'tail': {
        const target = g.tailCar;
        if (!target || target.dead) return this.fail('The money car is gone.');
        const d = dist(pos.x, pos.y, target.x, target.y);
        if (d < 190) this.tailTime += dt;
        if (this.tailTime >= (s.seconds || 40)) return this.advance();
        break;
      }
    }
  }

  advance() {
    const g = this.game;
    this.stageIndex++;
    if (this.stageIndex >= this.active.stages.length) return this.complete();
    say(g.dialogue, this.active.giver, 'Good. Next: ' + this.stage.label + '.', 3.6);
    this.beginStage();
  }

  complete() {
    const g = this.game;
    const m = this.active;
    const pay = Math.round(m.pay * (1 + g.repBonus()));
    g.cash += pay;
    g.rep += m.rep;
    g.career.missionsDone++;
    g.banner('JOB DONE', `${m.title} — $${pay.toLocaleString('en-US')} · +${m.rep} REP`, '#ffd23e');
    say(g.dialogue, m.giver, 'Done and dusted. The Bay provides.', 4);
    g.sfxCash();
    this.active = null;
    this.storyIndex++;
    if (this.done) {
      g.storyDone = true;
      g.banner('CRIMSON TIDE BAY', 'Story complete — Leyenda de la Bahía. The bay is yours.', '#ff7847');
    }
  }

  fail(why) {
    const g = this.game;
    g.banner('JOB FAILED', why, '#ff5f7a');
    say(g.dialogue, this.active ? this.active.giver : 'mira', 'It went sideways. Shake it off — the job is still there.', 4.4);
    this.active = null;
    this.hostiles = [];
    this.markedCar = null;
  }
}
