// Crimson Tide Bay — the HUD: mission card, dispatch panel, stars, cash
// and REP, vitals, readouts, crew chips, dialogue. Legible at thumbnail.

import { LAW, repTier } from './config.js';
import { dispatchRows, dispatchLine } from './dispatch.js';
import { drawMinimap } from './minimap.js';
import { CREW } from './crew.js';
import { weaponById, nextLockedWeapon, GRENADE } from './weapons.js';
import { stationByIndex, tickerText } from './radio.js';
import { roundRect } from './render.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function panel(ctx, x, y, w, h, accent = '#ffb03a') {
  ctx.fillStyle = 'rgba(16,12,26,0.78)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(x, y + 8, 4, h - 16);
}

function stars(ctx, x, y, wanted, time) {
  ctx.font = '27px ' + FONT;
  ctx.textAlign = 'right';
  for (let i = 0; i < LAW.maxStars; i++) {
    const sx = x - (LAW.maxStars - 1 - i) * 30;
    if (i < wanted) {
      const pulse = wanted >= 4 && Math.floor(time * 3) % 2 === 0;
      ctx.fillStyle = pulse ? '#ff4040' : '#ffd23e';
      ctx.fillText('★', sx, y);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillText('★', sx, y);
    }
  }
}

// The evening runs 17:52 → 19:36 on a slow loop.
export function duskClock(time) {
  const minutes = 17 * 60 + 52 + (time * 0.9) % 104;
  const hh = Math.floor(minutes / 60), mm = Math.floor(minutes % 60);
  return `${hh}:${String(mm).padStart(2, '0')}`;
}

export function drawHUD(ctx, game, w, h) {
  const t = game.time;
  let leftY = 16;
  const m = game.missions;
  if (m && m.active) {
    const s = m.stage;
    panel(ctx, 16, leftY, 348, 86, '#ffd23e');
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('STORY JOB', 30, leftY + 21);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillText(m.active.title.toUpperCase(), 30, leftY + 45);
    ctx.fillStyle = '#f2e8d5';
    ctx.font = '14.5px ' + FONT;
    ctx.fillText(trimText(ctx, `Stage ${m.stageIndex + 1}/${m.active.stages.length} — ${s ? s.label : ''}`, 322), 30, leftY + 68);
    if (m.stageTimer > 0) {
      ctx.fillStyle = '#ff5f7a';
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(Math.ceil(m.stageTimer) + 's', 352, leftY + 21);
      ctx.textAlign = 'left';
    }
    leftY += 96;
  } else if (m && !m.done) {
    panel(ctx, 16, leftY, 348, 58, '#2fe8d8');
    ctx.fillStyle = '#2fe8d8';
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('NEXT JOB', 30, leftY + 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16.5px ' + FONT;
    const next = m.list[m.storyIndex];
    ctx.fillText(next ? next.title.toUpperCase() : '—', 30, leftY + 43);
    leftY += 68;
  }

  if (game.wanted > 0) {
    const rows = dispatchRows(game);
    const ph = 44 + rows.length * 21 + 20;
    panel(ctx, 16, leftY, 348, ph, '#4d7dff');
    ctx.fillStyle = '#9db9ff';
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('BAY PD — DISPATCH', 30, leftY + 21);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(game.wanted + ' ★ ACTIVE', 352, leftY + 21);
    ctx.textAlign = 'left';
    rows.forEach((r, i) => {
      const ry = leftY + 44 + i * 21;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14.5px ' + FONT;
      ctx.fillText(r.label, 30, ry);
      ctx.fillStyle = '#c8b8e8';
      ctx.font = '12.5px ' + FONT;
      ctx.fillText(r.role, 128, ry);
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 14.5px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(r.dist + ' m', 352, ry);
      ctx.textAlign = 'left';
    });
    ctx.fillStyle = 'rgba(240,236,255,0.75)';
    ctx.font = 'italic 12px ' + FONT;
    ctx.fillText(trimText(ctx, dispatchLine(game, game.shotMode), 322), 30, leftY + ph - 8);
  }

  stars(ctx, w - 22, 42, game.wanted, t);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7be495';
  ctx.font = 'bold 25px ' + FONT;
  ctx.fillText('$' + Math.round(game.cash).toLocaleString('en-US'), w - 22, 76);
  const tier = repTier(game.rep);
  ctx.fillStyle = '#ffb03a';
  ctx.font = 'bold 14.5px ' + FONT;
  ctx.fillText(`REP ${Math.round(game.rep)} — ${tier.name.toUpperCase()}`, w - 22, 99);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '13px ' + FONT;
  ctx.fillText('☀ ' + duskClock(t) + ' · GOLDEN HOUR', w - 22, 119);

  if (game.radioIdx >= 0) {
    const st = stationByIndex(game.radioIdx);
    const label = `♪ ${st.name} — ${tickerText(t, game.shotMode)}`;
    ctx.font = '12.5px ' + FONT;
    const tw = Math.min(430, ctx.measureText(label).width + 24);
    ctx.fillStyle = 'rgba(16,12,26,0.6)';
    roundRect(ctx, (w - tw) / 2, 14, tw, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#ffd9ec';
    ctx.textAlign = 'center';
    ctx.fillText(trimText(ctx, label, tw - 18), w / 2, 30);
    ctx.textAlign = 'left';
  }

  drawMinimap(ctx, game, 92, h - 96, 74);
  const bx = 182, bw = 168;
  bar(ctx, bx, h - 128, bw, 13, game.player.health / 100, '#ff5f7a', 'HP');
  bar(ctx, bx, h - 108, bw, 10, game.player.armor / 100, '#4d7dff', 'AR');
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '11.5px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText(game.currentDistrict ? game.currentDistrict.name : 'Open Water', bx, h - 82);

  ctx.textAlign = 'right';
  if (game.player.car) {
    const car = game.player.car;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillText(car.model.name.toUpperCase(), w - 22, h - 88);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 30px ' + FONT;
    ctx.fillText(Math.round(Math.abs(car.speed) * 0.36) + '', w - 66, h - 52);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px ' + FONT;
    ctx.fillText('km/h', w - 22, h - 52);
    bar(ctx, w - 22 - 168, h - 40, 168, 9, car.condition / 100, car.condition > 40 ? '#7be495' : '#ff5f7a', 'COND ' + Math.round(car.condition) + '%', true);
  } else {
    const wp = weaponById(game.weaponId);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillText(wp.name.toUpperCase(), w - 22, h - 84);
    ctx.fillStyle = '#c8b8e8';
    ctx.font = '12.5px ' + FONT;
    const locked = nextLockedWeapon(game.rep);
    ctx.fillText('TIER ' + wp.tier + (locked ? ` · NEXT: ${locked.name.toUpperCase()} — LOCKED (${locked.unlockRep} REP)` : ' · ALL TIERS OPEN'), w - 22, h - 62);
    ctx.fillStyle = '#ffb03a';
    ctx.font = 'bold 14px ' + FONT;
    ctx.fillText(`◉ ${GRENADE.name} grenades × ${game.grenades}`, w - 22, h - 40);
  }
  ctx.textAlign = 'left';

  drawCrewChips(ctx, game, w, h);
  drawDialogue(ctx, game, w, h);

  if (game.races && game.races.active) {
    const r = game.races;
    ctx.fillStyle = 'rgba(16,12,26,0.78)';
    roundRect(ctx, w / 2 - 150, h - 168, 300, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#2fe8d8';
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(`${r.active.name} — ${r.time.toFixed(1)}s · GATE ${Math.min(r.pointIndex + 1, r.active.points.length)}/${r.active.points.length} · PAR ${r.active.par}s`, w / 2, h - 143);
    ctx.textAlign = 'left';
  }

  if (game.bust > 0.02) {
    const bw2 = 300;
    ctx.fillStyle = 'rgba(10,8,18,0.8)';
    roundRect(ctx, w / 2 - bw2 / 2 - 12, h * 0.36, bw2 + 24, 56, 12);
    ctx.fill();
    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 17px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('— BUSTED —', w / 2, h * 0.36 + 24);
    ctx.fillStyle = '#3a3f52';
    roundRect(ctx, w / 2 - bw2 / 2, h * 0.36 + 34, bw2, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#ff4040';
    roundRect(ctx, w / 2 - bw2 / 2, h * 0.36 + 34, bw2 * Math.min(1, game.bust), 10, 5);
    ctx.fill();
    ctx.textAlign = 'left';
  }

  if (game.promptText) {
    ctx.font = 'bold 15.5px ' + FONT;
    const tw = ctx.measureText(game.promptText).width + 34;
    ctx.fillStyle = 'rgba(16,12,26,0.82)';
    roundRect(ctx, (w - tw) / 2, h - 42, tw, 30, 15);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.textAlign = 'center';
    ctx.fillText(game.promptText, w / 2, h - 21);
    ctx.textAlign = 'left';
  }
}

function bar(ctx, x, y, w, h, frac, color, label, rightAlign = false) {
  ctx.fillStyle = 'rgba(10,8,18,0.66)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0.01) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
  if (label) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 10px ' + FONT;
    ctx.textAlign = rightAlign ? 'right' : 'left';
    ctx.fillText(label, rightAlign ? x + w : x + 2, y - 3.5);
    ctx.textAlign = 'left';
  }
}

function drawCrewChips(ctx, game, w, h) {
  const chipW = 148, gap = 10;
  const total = CREW.length * chipW + (CREW.length - 1) * gap;
  let x = (w - total) / 2;
  const y = h - 86;
  for (const member of CREW) {
    const cd = game.abilityCooldowns[member.id] || 0;
    const ready = cd <= 0;
    ctx.fillStyle = ready ? 'rgba(16,12,26,0.82)' : 'rgba(16,12,26,0.55)';
    roundRect(ctx, x, y, chipW, 36, 9);
    ctx.fill();
    ctx.fillStyle = member.color;
    ctx.beginPath(); ctx.arc(x + 19, y + 18, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#14100d';
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(member.name.split(' ').map((s) => s[0]).join(''), x + 19, y + 22.5);
    ctx.textAlign = 'left';
    ctx.fillStyle = ready ? '#ffffff' : 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 12.5px ' + FONT;
    ctx.fillText(member.ability.name, x + 37, y + 16);
    ctx.fillStyle = ready ? '#7be495' : '#ffb03a';
    ctx.font = '11px ' + FONT;
    ctx.fillText(ready ? `[${member.ability.key}] READY` : `${Math.ceil(cd)}s`, x + 37, y + 30);
    x += chipW + gap;
  }
}

function drawDialogue(ctx, game, w, h) {
  const d = game.dialogue && game.dialogue.current;
  if (!d) return;
  const member = CREW.find((c) => c.id === d.crewId) || CREW[0];
  const bw = Math.min(620, w - 360), bx = (w - bw) / 2, by = h - 148;
  ctx.fillStyle = 'rgba(12,9,20,0.88)';
  roundRect(ctx, bx, by, bw, 56, 11);
  ctx.fill();
  ctx.fillStyle = member.color;
  ctx.beginPath(); ctx.arc(bx + 30, by + 28, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = member.skin;
  ctx.beginPath(); ctx.arc(bx + 30, by + 24, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#14100d';
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(member.name.split(' ').map((s) => s[0]).join(''), bx + 30, by + 42);
  ctx.textAlign = 'left';
  ctx.fillStyle = member.color;
  ctx.font = 'bold 13px ' + FONT;
  ctx.fillText(member.name.toUpperCase() + ' — ' + member.role.toUpperCase(), bx + 58, by + 21);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px ' + FONT;
  wrapText(ctx, d.text, bx + 58, by + 41, bw - 74, 17, 2);
}

export function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = text.split(' ');
  let line = '', lines = 0;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      line = word;
      lines++;
      if (lines >= maxLines) return;
    } else line = test;
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineH);
}

export function trimText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 4 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

export function drawDistrictCard(ctx, game, w, h) {
  const card = game.districtCard;
  if (!card) return;
  const a = Math.min(1, card.ttl / 0.7, (2.6 - card.ttl) / 0.7 + 0.3);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px ' + FONT;
  ctx.shadowColor = 'rgba(20,8,40,0.8)';
  ctx.shadowBlur = 16;
  ctx.fillText(card.name.toUpperCase(), w / 2, h * 0.30);
  ctx.font = '16px ' + FONT;
  ctx.fillStyle = '#ffd9a8';
  ctx.fillText(card.tag + ' — CRIMSON TIDE BAY', w / 2, h * 0.30 + 30);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function drawBanner(ctx, game, w, h) {
  const b = game.bannerData;
  if (!b) return;
  const a = Math.min(1, b.ttl / 0.5, (3.4 - b.ttl) / 0.8 + 0.25);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = 'center';
  ctx.fillStyle = b.color;
  ctx.font = 'bold 40px ' + FONT;
  ctx.shadowColor = 'rgba(20,8,40,0.85)';
  ctx.shadowBlur = 14;
  ctx.fillText(b.title, w / 2, h * 0.42);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px ' + FONT;
  ctx.fillText(b.sub, w / 2, h * 0.42 + 32);
  ctx.restore();
  ctx.textAlign = 'left';
}
