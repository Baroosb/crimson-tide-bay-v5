# crimson-tide-bay-v5

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Baroosb/crimson-tide-bay-v5/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Baroosb/crimson-tide-bay-v5/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Crimson Tide Bay** — an original open-world crime game in vanilla JavaScript and Canvas (zero libraries, zero assets, zero network), set on a golden-hour island city of nine districts. Play Lucia Ferrer, a driver clawing her way up from harbour courier to the bay's most wanted wheelman: run jobs, build REP, and stay one turn ahead of the law.

**By the numbers**
- **10 story jobs** across all nine districts — courier runs, staged thefts, timed drops, harbour pickups and an armoured finale — then endless contract work with distance-based fares.
- **5-star BAY PD wanted system** — a dispatch-panel HUD tracks every unit live by name, role and distance (AIR ONE / TARPON 11 / BULWARK 2, live distances), with **AIR ONE** overhead from 3 stars: its spotlight pins you, roadblocks seal the street ahead, and rifles come out at 4 stars.
- **Garage with upgrades** — repairs, resprays that shed heat, and performance tiers bought with job money.
- **Street races** against rival drivers, with checkpoints, live positions and best times saved.
- **Radio stations** sequenced live on WebAudio while you drive; engine, sirens, gunfire and explosions are synthesized too — there is not one audio file in the game.
- **Save slots** — 3 slots on the title screen, autosave to localStorage, and a full island map with named districts, markers and story completion %.

## What's new in V5

- **Rebuilt rendering** — the roads/ground layer is fixed and redrawn clean, under a deeper golden-hour grade: violet south-east shadows, warm fog and a vignette over the whole bay.
- **Denser dispatch HUD** — the named-unit panel, radio chatter, bust meter, mission card and minimap all read at a glance, even mid-chase.
- **Skyline-panorama title screen** — the bay at dusk behind the poster title, with the 3 save slots up front.
- **Detailed island map** — all nine districts named and legended, with mission markers, race starts and your live position.

Controls: WASD drive · E enter car · F fire · M map · G garage · 1/2/3 crew abilities.

## Screenshots

- `screenshots/1-cover-chase.jpg` — the cover: a dusk chase downtown, AIR ONE's spotlight down and the dispatch panel live.
- `screenshots/2-map.jpg` — the island map: nine named districts, markers and story completion.
- `screenshots/3-mission.jpg` — mid-job: mission card, crew dialogue and the bay at golden hour.
- `screenshots/4-title.jpg` — the title screen over the skyline panorama, save slots ready.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

License: MIT — see the LICENSE file in this repo.

---

<sub>Entered on [make.fun](https://make.fun/?ref=5hnf181h&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
