// Crimson Tide Bay — the minimap: the whole bay in a brass-rimmed
// circle, pinned with you, the law, the job, the garage.

import { WORLD } from './config.js';
import { DISTRICTS } from './districts.js';
import { city } from './city.js';
import { police } from './police.js';

export function drawMinimap(ctx, game, cx, cy, r) {
  const scale = (r * 2) / Math.max(WORLD.width, WORLD.height);
  const ox = cx - (WORLD.width * scale) / 2;
  const oy = cy - (WORLD.height * scale) / 2;
  const toMap = (x, y) => ({ x: ox + x * scale, y: oy + y * scale });

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = '#14100d';
  ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#12486a';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const tl = toMap(0, 0), br = toMap(WORLD.width, WORLD.height);
  ctx.fillStyle = '#e8c98d';
  ctx.fillRect(tl.x + WORLD.sandRim * scale * 0.4, tl.y + WORLD.sandRim * scale * 0.4,
    (br.x - tl.x) - WORLD.sandRim * scale * 0.8, (br.y - tl.y) - WORLD.sandRim * scale * 0.8);
  for (const d of DISTRICTS) {
    const p = toMap(d.x, d.y);
    ctx.fillStyle = d.tint;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(p.x, p.y, d.w * scale, d.h * scale);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(30,30,40,0.55)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i <= WORLD.blocksX; i++) {
    const p = toMap(WORLD.sandRim + i * WORLD.pitch + WORLD.roadWidth / 2, 0);
    ctx.beginPath(); ctx.moveTo(p.x, tl.y + WORLD.sandRim * scale); ctx.lineTo(p.x, br.y - WORLD.sandRim * scale); ctx.stroke();
  }
  for (let i = 0; i <= WORLD.blocksY; i++) {
    const p = toMap(0, WORLD.sandRim + i * WORLD.pitch + WORLD.roadWidth / 2);
    ctx.beginPath(); ctx.moveTo(tl.x + WORLD.sandRim * scale, p.y); ctx.lineTo(br.x - WORLD.sandRim * scale, p.y); ctx.stroke();
  }
  if (city.garage) {
    const p = toMap(city.garage.x + city.garage.w / 2, city.garage.y + city.garage.h / 2);
    ctx.fillStyle = '#f2f4f6';
    ctx.fillRect(p.x - 3.4, p.y - 3.4, 6.8, 6.8);
  }
  if (game.missions) {
    for (const hst of game.missions.hostiles) {
      if (hst.state === 'down') continue;
      const p = toMap(hst.x, hst.y);
      ctx.fillStyle = '#ff4040';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    const s = game.missions.stage;
    const target = s && s.at ? s.at : game.missions.offerPoint();
    if (target) {
      const p = toMap(target.x, target.y);
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,16,8,0.8)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
  if (game.races && game.races.active) {
    const p0 = game.races.currentPoint();
    if (p0) {
      const p = toMap(p0.x, p0.y);
      ctx.fillStyle = '#2fe8d8';
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  const flash = Math.floor(game.time * 2.4) % 2 === 0;
  for (const c of police.cars) {
    if (c.dead) continue;
    const p = toMap(c.x, c.y);
    ctx.fillStyle = flash ? '#4d7dff' : '#ff4040';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2); ctx.fill();
  }
  for (const f of police.foot) {
    const p = toMap(f.x, f.y);
    ctx.fillStyle = '#4d7dff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  const pos = game.playerPos();
  const pp = toMap(pos.x, pos.y);
  const a = game.playerAngle();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(pp.x + Math.cos(a) * 7, pp.y + Math.sin(a) * 7);
  ctx.lineTo(pp.x + Math.cos(a + 2.5) * 5.4, pp.y + Math.sin(a + 2.5) * 5.4);
  ctx.lineTo(pp.x + Math.cos(a - 2.5) * 5.4, pp.y + Math.sin(a - 2.5) * 5.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#f2e8d5';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - r - 9);
}
