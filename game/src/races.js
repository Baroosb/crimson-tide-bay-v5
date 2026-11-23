// Crimson Tide Bay — street races: checkpoint runs against the clock.

import { dist } from './random.js';
import { districtCenter, districtById } from './districts.js';
import { say } from './crew.js';

export function buildRaces() {
  const at = (id) => districtCenter(districtById(id));
  return [
    {
      id: 'tide-run', name: 'The Tide Run', laps: 1, par: 95, pay: 600, rep: 70,
      points: [at('costa'), at('paseo'), at('centro'), at('paseo'), at('costa')],
      blurb: 'Coast road and back, against the setting sun.',
    },
    {
      id: 'harbour-loop', name: 'Harbour Loop', laps: 1, par: 110, pay: 800, rep: 90,
      points: [at('puerto'), at('muelles'), at('faro'), at('muelles'), at('puerto')],
      blurb: 'Around the docks, between the cranes and the law.',
    },
    {
      id: 'nine-districts', name: 'Nine Districts', laps: 1, par: 210, pay: 1500, rep: 160,
      points: [at('palmera'), at('mercado'), at('puerto'), at('muelles'), at('centro'), at('ceniza'), at('costa'), at('paseo'), at('faro')],
      blurb: 'Every district in the Bay, one breath, no brakes.',
    },
  ];
}

export class RaceRunner {
  constructor(game) {
    this.game = game;
    this.list = buildRaces();
    this.active = null;
    this.pointIndex = 0;
    this.time = 0;
    this.fromMission = false;
  }

  get race() { return this.active; }

  byId(id) { return this.list.find((r) => r.id === id) || null; }

  start(race, fromMission = false) {
    this.active = race;
    this.fromMission = fromMission;
    this.pointIndex = 0;
    this.time = 0;
    this.game.career.racesRun++;
    say(this.game.dialogue, 'mira', `${race.name}. ${race.blurb} Beat ${race.par} seconds. GO when ready — the clock is already rude.`, 5);
    this.game.banner('RACE', `${race.name} — beat ${race.par}s`, '#2fe8d8');
  }

  currentPoint() {
    if (!this.active) return null;
    return this.active.points[this.pointIndex] || null;
  }

  update(dt) {
    if (!this.active) return;
    this.time += dt;
    const p = this.currentPoint();
    if (!p) return;
    const pos = this.game.playerPos();
    if (dist(pos.x, pos.y, p.x, p.y) < 78) {
      this.pointIndex++;
      this.game.sfxBlip();
      if (this.pointIndex >= this.active.points.length) this.finish();
    }
  }

  finish() {
    const g = this.game;
    const race = this.active;
    const won = this.time <= race.par;
    const t = this.time.toFixed(1);
    if (won) {
      g.cash += race.pay;
      g.rep += race.rep;
      g.career.racesWon++;
      g.banner('RACE WON', `${race.name} — ${t}s · $${race.pay.toLocaleString('en-US')} · +${race.rep} REP`, '#2fe8d8');
      say(g.dialogue, 'mira', 'That is how the Bay learns your name.', 4);
      g.sfxCash();
      const best = g.raceBests[race.id];
      if (!best || this.time < best) g.raceBests[race.id] = Math.round(this.time * 10) / 10;
    } else {
      g.banner('RACE LOST', `${race.name} — ${t}s against a ${race.par}s par. The Bay shrugs.`, '#ff5f7a');
    }
    this.active = null;
    if (this.fromMission && g.missions && g.missions.stage && g.missions.stage.type === 'race') {
      if (won) g.missions.advance();
      else g.missions.fail('The race is the job, and the race is lost.');
    }
    this.fromMission = false;
  }

  cancel() {
    this.active = null;
    this.fromMission = false;
  }
}
