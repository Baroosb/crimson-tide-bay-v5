// Crimson Tide Bay — the screens around the game: poster title, full
// map, pause, garage, endings. Composed like posters for the contact sheet.

import { WORLD, repTier } from './config.js';
import { DISTRICTS } from './districts.js';
import { city } from './city.js';
import { drawSunsetSky } from './grading.js';
import { roundRect } from './render.js';
import { panel, wrapText, trimText, duskClock } from './hud.js';
import { slotSummary, completionPercent } from './save.js';
import { hash2 } from './random.js';
import { CREW } from './crew.js';
import { GARAGE_SERVICES, serviceAvailable } from './garage.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// The title panorama: a drawn skyline against the sunset — two
// silhouette layers, the sun low over water, palm silhouettes.
function drawPanorama(ctx, w, y0, bh) {
  const horizon = y0 + bh * 0.78;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y0, w, bh); ctx.clip();
  const sky = ctx.createLinearGradient(0, y0, 0, horizon);
  sky.addColorStop(0, '#4a2064');
  sky.addColorStop(0.45, '#b83a5e');
  sky.addColorStop(0.8, '#ff8a3d');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, y0, w, horizon - y0);
  const sunX = w * 0.30, sunY = y0 + bh * 0.70, sunR = bh * 0.30;
  const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2);
  sg.addColorStop(0, 'rgba(255,214,120,0.9)');
  sg.addColorStop(1, 'rgba(255,140,50,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, y0, w, bh);
  ctx.fillStyle = '#ffd678';
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 0.52, 0, Math.PI * 2); ctx.fill();
  const layer = (seed, maxH, color, windows) => {
    let x = -10;
    for (let i = 0; x < w + 10; i++) {
      const bw = 26 + hash2(i, seed) * 58;
      const bh2 = 22 + hash2(i, seed + 9) * maxH;
      ctx.fillStyle = color;
      ctx.fillRect(x, horizon - bh2, bw, bh2);
      if (windows) {
        ctx.fillStyle = 'rgba(255,217,138,0.9)';
        for (let k = 0; k < 3; k++) {
          if (hash2(i * 7 + k, seed + 31) < 0.55) continue;
          ctx.fillRect(x + 4 + hash2(i + k, seed + 47) * (bw - 9), horizon - bh2 + 5 + hash2(k, i + seed) * (bh2 - 12), 2.6, 3.6);
        }
      }
      x += bw + 2 + hash2(i, seed + 63) * 14;
    }
  };
  layer(11, 52, 'rgba(58,22,84,0.72)', false);
  layer(23, 96, '#241040', true);
  const sea = ctx.createLinearGradient(0, horizon, 0, y0 + bh);
  sea.addColorStop(0, '#a83a5e');
  sea.addColorStop(1, '#341338');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, y0 + bh - horizon);
  ctx.fillStyle = '#ffc46b';
  for (let i = 0; i < 30; i++) {
    const yy = horizon + 3 + hash2(i, 77) * (bh * 0.20);
    const spread = 26 + (yy - horizon) * 2.6;
    ctx.globalAlpha = 0.18 + hash2(i, 55) * 0.34;
    ctx.fillRect(sunX + (hash2(i, 91) - 0.5) * spread, yy, 10 + hash2(i, 39) * 30, 1.8);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#1c0a30';
  for (let i = 0; i < 5; i++) {
    const px = w * (0.07 + i * 0.21) + hash2(i, 5) * 30;
    const ph = 40 + hash2(i, 8) * 26;
    const tx = px + 7, ty = horizon + 4 - ph;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px, horizon + 5);
    ctx.quadraticCurveTo(px + 2, horizon + 4 - ph * 0.6, tx, ty); ctx.stroke();
    ctx.lineWidth = 2.6;
    for (let f = 0; f < 5; f++) {
      const a = Math.PI * (0.08 + f * 0.21) + hash2(i, f) * 0.2;
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a) * 13, ty - Math.sin(a) * 9 - 3, tx + Math.cos(a) * 21, ty - Math.sin(a) * 13 + 6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawTitleScreen(ctx, game, w, h, staticLayer) {
  game.clickRects.length = 0;
  drawSunsetSky(ctx, 0, 0, w, h);
  const bandY = h * 0.42, bandH = h * 0.27;
  drawPanorama(ctx, w, bandY, bandH);
  const fg = ctx.createLinearGradient(0, bandY + bandH * 0.4, 0, h);
  fg.addColorStop(0, 'rgba(16,8,30,0)');
  fg.addColorStop(1, 'rgba(16,8,30,0.92)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, bandY + bandH * 0.4, w, h - bandY - bandH * 0.4);

  ctx.textAlign = 'center';
  const titleY = h * 0.20;
  ctx.font = '900 74px ' + FONT;
  const grad = ctx.createLinearGradient(0, titleY - 62, 0, titleY + 8);
  grad.addColorStop(0, '#fff6d8');
  grad.addColorStop(0.45, '#ffd23e');
  grad.addColorStop(0.55, '#ff7847');
  grad.addColorStop(1, '#ff4f9a');
  ctx.shadowColor = 'rgba(30,4,50,0.9)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = grad;
  ctx.fillText('CRIMSON TIDE BAY', w / 2, titleY);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 16.5px ' + FONT;
  ctx.fillStyle = '#ffe9c9';
  ctx.fillText('1 0   S T O R Y   J O B S  ·  5 - S T A R   B A Y   P D  ·  A I R   O N E  ·  G A R A G E  ·  R A C E S  ·  S A V E S', w / 2, titleY + 34);
  ctx.font = '14px ' + FONT;
  ctx.fillStyle = 'rgba(255,240,220,0.85)';
  ctx.fillText('Lucia Ferrer came home to the Bay with nothing. The Bay intends to return the favour.', w / 2, titleY + 58);

  const btnW = 240, btnH = 46, btnX = w / 2 - btnW / 2;
  const newY = bandY + bandH + 12;
  button(ctx, game, btnX, newY, btnW, btnH, '▶  NEW RUN', 'title-new', '#ff7847');
  ctx.font = '13px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('WASD drive · E enter car · F fire · M map · G garage · 1/2/3 crew', w / 2, newY + btnH + 22);

  const cardW = Math.min(300, (w - 120) / 3), cardH = 64, gap = 18;
  const totalW = cardW * 3 + gap * 2;
  let sx = (w - totalW) / 2;
  const sy = h - cardH - 16;
  game.slots.forEach((slot, i) => {
    const sum = slotSummary(slot);
    ctx.fillStyle = 'rgba(14,10,24,0.85)';
    roundRect(ctx, sx, sy, cardW, cardH, 10);
    ctx.fill();
    ctx.strokeStyle = slot ? '#ffd23e' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.4;
    roundRect(ctx, sx, sy, cardW, cardH, 10);
    ctx.stroke();
    ctx.fillStyle = '#ffb03a';
    ctx.font = 'bold 11.5px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('SAVE SLOT ' + (i + 1) + (slot ? ` · ${completionPercent(slot)}% COMPLETE` : ''), sx + 14, sy + 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15.5px ' + FONT;
    ctx.fillText(trimText(ctx, sum.title, cardW - 28), sx + 14, sy + 41);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px ' + FONT;
    ctx.fillText(trimText(ctx, sum.sub, cardW - 28), sx + 14, sy + 57);
    if (slot) game.clickRects.push({ x: sx, y: sy, w: cardW, h: cardH, action: 'title-load-' + i });
    sx += cardW + gap;
  });
  ctx.textAlign = 'left';
}

function button(ctx, game, x, y, w, h, label, action, color) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = '#1c0f08';
  ctx.font = 'bold 18px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 6.5);
  ctx.textAlign = 'left';
  game.clickRects.push({ x, y, w, h, action });
}

export function drawMapScreen(ctx, game, w, h, staticLayer) {
  game.clickRects.length = 0;
  ctx.fillStyle = '#120d20';
  ctx.fillRect(0, 0, w, h);
  drawSunsetSky(ctx, 0, 0, w, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText('CRIMSON TIDE BAY', 26, 41);
  ctx.font = '13.5px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Nine districts · one island · nowhere to hide', 330, 41);

  const mapX = 26, mapY = 84, mapW = w * 0.64, mapH = h - 110;
  const scale = Math.min(mapW / WORLD.width, mapH / WORLD.height);
  const iw = WORLD.width * scale, ih = WORLD.height * scale;
  const ix = mapX + (mapW - iw) / 2, iy = mapY + (mapH - ih) / 2;
  if (staticLayer) {
    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, 14);
    ctx.clip();
    ctx.drawImage(staticLayer, ix, iy, iw, ih);
    ctx.fillStyle = 'rgba(50,16,80,0.10)';
    ctx.fillRect(ix, iy, iw, ih);
    ctx.restore();
  }
  const toMap = (x, y) => ({ x: ix + x * scale, y: iy + y * scale });
  // Per-block variation and a real coastline, so the island reads as a
  // place: tinted blocks, deepened water, a foam line on the shore.
  ctx.save();
  roundRect(ctx, ix, iy, iw, ih, 14);
  ctx.clip();
  const tints = ['#c96a4a', '#7fae56', '#d9a441', '#4d7fa8', '#c65b7c', '#5a8a7d', '#e8c268', '#e07f4f'];
  for (let bx = 0; bx < WORLD.blocksX; bx++) {
    for (let by = 0; by < WORLD.blocksY; by++) {
      const bp = toMap(WORLD.sandRim + WORLD.roadWidth + bx * WORLD.pitch, WORLD.sandRim + WORLD.roadWidth + by * WORLD.pitch);
      const bs = WORLD.blockSize * scale;
      ctx.fillStyle = tints[Math.floor(hash2(bx * 3 + 1, by * 7 + 2) * tints.length) % tints.length];
      ctx.globalAlpha = 0.10 + hash2(bx, by) * 0.07;
      ctx.fillRect(bp.x, bp.y, bs, bs);
      ctx.fillStyle = '#180c24';
      ctx.globalAlpha = 0.08;
      ctx.fillRect(bp.x + bs * 0.22, bp.y + bs * 0.22, bs * 0.56, bs * 0.56);
    }
  }
  ctx.globalAlpha = 1;
  const isl = toMap(WORLD.sandRim - 52, WORLD.sandRim - 52);
  const islW = (WORLD.gridW + 104) * scale, islH = (WORLD.gridH + 104) * scale;
  ctx.fillStyle = 'rgba(10,44,74,0.32)';
  ctx.fillRect(ix, iy, iw, Math.max(0, isl.y - iy));
  ctx.fillRect(ix, isl.y + islH, iw, Math.max(0, iy + ih - isl.y - islH));
  ctx.fillRect(ix, isl.y, Math.max(0, isl.x - ix), islH);
  ctx.fillRect(isl.x + islW, isl.y, Math.max(0, ix + iw - isl.x - islW), islH);
  ctx.strokeStyle = 'rgba(205,238,226,0.85)';
  ctx.lineWidth = 2;
  roundRect(ctx, isl.x, isl.y, islW, islH, 78 * scale);
  ctx.stroke();
  ctx.restore();
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    const p = toMap(d.x + d.w / 2, d.y + d.h / 2);
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillStyle = 'rgba(16,10,24,0.55)';
    const tw = ctx.measureText(d.name.toUpperCase()).width + 14;
    roundRect(ctx, p.x - tw / 2, p.y - 13, tw, 21, 10);
    ctx.fill();
    ctx.fillStyle = '#ffe9c9';
    ctx.fillText(d.name.toUpperCase(), p.x, p.y + 2.5);
  }
  if (city.garage) pin(ctx, toMap(city.garage.x + city.garage.w / 2, city.garage.y + city.garage.h / 2), '#f2f4f6', 'G');
  if (game.missions) {
    const s = game.missions.stage;
    const target = s && s.at ? s.at : game.missions.offerPoint();
    if (target) pin(ctx, toMap(target.x, target.y), '#ffd23e', '!');
  }
  if (game.races && game.races.active) {
    const p0 = game.races.currentPoint();
    if (p0) pin(ctx, toMap(p0.x, p0.y), '#2fe8d8', '»');
  }
  const pos = game.playerPos();
  const pp = toMap(pos.x, pos.y);
  const pulse = 6 + Math.sin(game.time * 5) * 1.6;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(pp.x, pp.y, pulse, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#14100d';
  ctx.lineWidth = 2;
  ctx.stroke();

  const rx = mapX + mapW + 22, rw = w - rx - 26;
  panel(ctx, rx, mapY, rw, 118, '#ffd23e');
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText('LEGEND', rx + 16, mapY + 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13.5px ' + FONT;
  ctx.fillText('●  You — Lucia Ferrer', rx + 16, mapY + 48);
  ctx.fillText('!   Story job marker', rx + 16, mapY + 70);
  ctx.fillText('G  Tideworks Garage — repairs, resprays, tunes', rx + 16, mapY + 92);
  ctx.fillText('»   Race gate', rx + 16, mapY + 112);

  const story = game.missions;
  const doneCount = story ? story.storyIndex : 0;
  panel(ctx, rx, mapY + 132, rw, 128, '#ff7847');
  ctx.fillStyle = '#ff7847';
  ctx.font = 'bold 13px ' + FONT;
  ctx.fillText(`STORY — ${doneCount}/10 JOBS DONE`, rx + 16, mapY + 156);
  ctx.font = '13px ' + FONT;
  if (story) {
    story.list.slice(0, 5).forEach((job, i) => {
      const state = i < story.storyIndex ? '✓' : i === story.storyIndex ? '▶' : '·';
      ctx.fillStyle = i < story.storyIndex ? '#7be495' : i === story.storyIndex ? '#ffffff' : 'rgba(255,255,255,0.45)';
      ctx.fillText(`${state} ${job.title}`, rx + 16, mapY + 180 + i * 17);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`…and ${Math.max(0, story.list.length - 5)} more jobs in the pause screen`, rx + 16, mapY + 180 + 5 * 17);
  }

  panel(ctx, rx, mapY + 274, rw, 118, '#2fe8d8');
  ctx.fillStyle = '#2fe8d8';
  ctx.font = 'bold 13px ' + FONT;
  ctx.fillText('CAREER', rx + 16, mapY + 298);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13.5px ' + FONT;
  const c = game.career;
  const rows = [
    `Cash $${Math.round(game.cash).toLocaleString('en-US')} · REP ${Math.round(game.rep)} (${repTier(game.rep).name})`,
    `Cars stolen ${c.carsStolen} · Distance ${c.distanceKm.toFixed(1)} km`,
    `Races won ${c.racesWon}/${c.racesRun} · Busted ${c.busts}×`,
    `Completion ${completionPercent({ storyIndex: doneCount, career: c })}% · ☀ ${duskClock(game.time)}`,
  ];
  rows.forEach((r, i) => ctx.fillText(r, rx + 16, mapY + 322 + i * 19));
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '12.5px ' + FONT;
  ctx.fillText('M / Esc — back to the street', rx + 16, h - 14);
  ctx.textAlign = 'left';
}

function pin(ctx, p, color, glyph) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(16,10,24,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#14100d';
  ctx.font = 'bold 12px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(glyph, p.x, p.y + 4.4);
  ctx.textAlign = 'left';
}

export function drawPauseScreen(ctx, game, w, h) {
  game.clickRects.length = 0;
  ctx.fillStyle = 'rgba(12,8,22,0.88)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = '900 40px ' + FONT;
  ctx.fillText('PAUSED', w / 2, 74);
  ctx.font = '14px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('The Bay waits. It is good at waiting.', w / 2, 100);
  ctx.textAlign = 'left';

  const colW = Math.min(380, (w - 90) / 3), colX = [30, 45 + colW, 60 + colW * 2];
  panel(ctx, colX[0], 124, colW, 300, '#ff7847');
  ctx.fillStyle = '#ff7847';
  ctx.font = 'bold 13.5px ' + FONT;
  ctx.fillText('STORY JOBS', colX[0] + 16, 150);
  ctx.font = '13.5px ' + FONT;
  if (game.missions) {
    game.missions.list.forEach((job, i) => {
      const y = 176 + i * 24;
      const state = i < game.missions.storyIndex ? '✓' : i === game.missions.storyIndex ? '▶' : '·';
      ctx.fillStyle = i < game.missions.storyIndex ? '#7be495' : i === game.missions.storyIndex ? '#ffffff' : 'rgba(255,255,255,0.42)';
      ctx.fillText(`${state} ${i + 1}. ${job.title}`, colX[0] + 16, y);
      ctx.fillStyle = 'rgba(255,217,138,0.8)';
      ctx.textAlign = 'right';
      ctx.fillText('$' + job.pay, colX[0] + colW - 14, y);
      ctx.textAlign = 'left';
    });
  }
  panel(ctx, colX[1], 124, colW, 300, '#2fe8d8');
  ctx.fillStyle = '#2fe8d8';
  ctx.font = 'bold 13.5px ' + FONT;
  ctx.fillText('THE CREW', colX[1] + 16, 150);
  CREW.forEach((member, i) => {
    const y = 172 + i * 62;
    ctx.fillStyle = member.color;
    ctx.beginPath(); ctx.arc(colX[1] + 34, y + 8, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = member.skin;
    ctx.beginPath(); ctx.arc(colX[1] + 34, y + 4, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14.5px ' + FONT;
    ctx.fillText(member.name, colX[1] + 58, y + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12.5px ' + FONT;
    ctx.fillText(`${member.role} — ${member.ability.name}: ${member.ability.desc}`, colX[1] + 58, y + 19);
    ctx.font = '13.5px ' + FONT;
  });
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12.5px ' + FONT;
  wrapText(ctx, 'Abilities fire on keys 1 / 2 / 3 in the street. Cooldowns are the price of loyalty.', colX[1] + 16, 380, colW - 32, 17, 3);
  panel(ctx, colX[2], 124, colW, 300, '#ffd23e');
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 13.5px ' + FONT;
  ctx.fillText('SAVE THE RUN', colX[2] + 16, 150);
  game.slots.forEach((slot, i) => {
    const y = 168 + i * 62;
    const sum = slotSummary(slot);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, colX[2] + 14, y - 16, colW - 28, 52, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13.5px ' + FONT;
    ctx.fillText('SLOT ' + (i + 1) + ' — ' + trimText(ctx, sum.title, colW - 130), colX[2] + 26, y + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '12px ' + FONT;
    ctx.fillText(trimText(ctx, sum.sub, colW - 52), colX[2] + 26, y + 22);
    game.clickRects.push({ x: colX[2] + 14, y: y - 16, w: colW - 28, h: 52, action: 'pause-save-' + i });
  });
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '12.5px ' + FONT;
  ctx.fillText('Click a slot to save. Esc — back to the street.', colX[2] + 16, 380);
  ctx.fillText('M — full map.', colX[2] + 16, 400);
}

export function drawGarageScreen(ctx, game, w, h) {
  game.clickRects.length = 0;
  ctx.fillStyle = 'rgba(10,14,18,0.93)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2fe8d8';
  ctx.font = '900 34px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText('TIDEWORKS GARAGE', 34, 56);
  ctx.font = '14.5px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Paseo del Mar — "We fix what the Bay breaks." · Your cash: $' + Math.round(game.cash).toLocaleString('en-US'), 34, 82);

  const car = game.player.car;
  const listX = 34, listW = Math.min(620, w * 0.55);
  if (!car) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '17px ' + FONT;
    ctx.fillText('Bring a car in, Lucia. Tomás is not fixing your shoes.', listX, 140);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText('ON THE LIFT: ' + car.model.name.toUpperCase(), listX, 122);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '13.5px ' + FONT;
    ctx.fillText(`Condition ${Math.round(car.condition)}% · Engine tier ${car.engineTier || 0}/3 · Tyres tier ${car.tireTier || 0}/3 · Armour ${car.armored ? 'fitted' : 'none'}`, listX, 146);
    GARAGE_SERVICES.forEach((service, i) => {
      const y = 172 + i * 62;
      const price = service.price(car);
      const avail = serviceAvailable(service, car);
      const afford = game.cash >= price;
      const ok = avail.ok && afford;
      ctx.fillStyle = ok ? 'rgba(47,232,216,0.10)' : 'rgba(255,255,255,0.05)';
      roundRect(ctx, listX, y, listW, 52, 9);
      ctx.fill();
      ctx.fillStyle = ok ? '#ffffff' : 'rgba(255,255,255,0.45)';
      ctx.font = 'bold 16.5px ' + FONT;
      ctx.fillText(service.name, listX + 16, y + 22);
      ctx.font = '12.5px ' + FONT;
      ctx.fillStyle = ok ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.4)';
      ctx.fillText(avail.ok ? service.desc : avail.why, listX + 16, y + 41);
      ctx.fillStyle = afford ? '#7be495' : '#ff5f7a';
      ctx.font = 'bold 16.5px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText('$' + price.toLocaleString('en-US'), listX + listW - 16, y + 31);
      ctx.textAlign = 'left';
      if (ok) game.clickRects.push({ x: listX, y, w: listW, h: 52, action: 'garage-' + service.id });
    });
  }
  if (game.garageNote) {
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'italic 14.5px ' + FONT;
    ctx.fillText('Tomás: "' + game.garageNote + '"', listX, 172 + GARAGE_SERVICES.length * 62 + 16);
  }
  const rx = listX + listW + 26, rw = w - rx - 34;
  if (car && rw > 200) {
    panel(ctx, rx, 108, rw, 220, '#ffb03a');
    ctx.fillStyle = '#ffb03a';
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText('SPEC SHEET', rx + 16, 134);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px ' + FONT;
    const rows = [
      'Model: ' + car.model.name,
      'Top speed: ' + Math.round(car.model.top * (0.55 + 0.45 * car.condition / 100)) + ' (at condition)',
      'Condition: ' + Math.round(car.condition) + '%',
      'Colour: harbour special',
      'History: borrowed, permanently',
      'PD interest: ' + (game.wanted > 0 ? game.wanted + ' stars — respray advised' : 'none'),
    ];
    rows.forEach((r, i) => ctx.fillText(r, rx + 16, 160 + i * 24));
  }
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '13px ' + FONT;
  ctx.fillText('Click a service to buy · G / Esc — back to the street', 34, h - 20);
}

export function drawEndScreen(ctx, game, w, h) {
  ctx.fillStyle = game.state === 'busted' ? 'rgba(20,16,60,0.82)' : 'rgba(60,8,16,0.82)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = game.state === 'busted' ? '#9db9ff' : '#ff8a9a';
  ctx.font = '900 64px ' + FONT;
  ctx.fillText(game.state === 'busted' ? 'BUSTED' : 'WASTED', w / 2, h * 0.38);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16.5px ' + FONT;
  ctx.fillText(game.endText || '', w / 2, h * 0.38 + 40);
  const c = game.career;
  ctx.font = '14.5px ' + FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`Cash kept $${Math.round(game.cash).toLocaleString('en-US')} · REP ${Math.round(game.rep)} · Jobs done ${c.missionsDone}/10 · Cars stolen ${c.carsStolen}`, w / 2, h * 0.38 + 72);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 16px ' + FONT;
  ctx.fillText('ENTER — back to the Bay', w / 2, h * 0.38 + 112);
  ctx.textAlign = 'left';
}
