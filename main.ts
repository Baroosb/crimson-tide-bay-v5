// Crimson Tide Bay — a gta6-01 entry (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library and
// no network request), and this program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// The game: an open-world crime game on one dusk-lit island — nine named
// districts, ten story jobs, a five-star Bay PD with a named dispatch panel
// and AIR ONE, a working garage, street races, a crew with abilities, radio,
// and three save slots. Build notes live in game/src/ (one module per job).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const GAME_TITLE = 'Crimson Tide Bay';
const EXPECTED_SHOTS = ['1-cover-chase.jpg', '2-map.jpg', '3-mission.jpg', '4-title.jpg'];

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The cover is the first screenshot by name; say plainly if the set the
// judge will see is not the set this entry means to show.
const shotDir = join(here, 'screenshots');
const shotsPresent = existsSync(shotDir) ? readdirSync(shotDir).sort() : [];
for (const name of EXPECTED_SHOTS) {
  if (!shotsPresent.includes(name)) console.error(`warning: expected screenshot ${name} is missing`);
}
console.log(`${GAME_TITLE}: handing in game/ with ${shotsPresent.length} screenshots (${shotsPresent.join(', ')})`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
