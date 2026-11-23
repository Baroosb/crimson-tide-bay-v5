// Crimson Tide Bay — the fake-depth renderer: pre-rendered ground,
// buildings lifted with long SE shadows, palms, cars, people, AIR ONE.

import { WORLD, PALETTE } from './config.js';
import { hash2 } from './random.js';
import { city, roofColor } from './city.js';
import { DISTRICTS } from './districts.js';
import { lightPool } from './grading.js';

let staticLayer = null;

export function buildStaticLayer() {
  staticLayer = document.createElement('canvas');
  staticLayer.width = WORLD.width;
  staticLayer.height = WORLD.height;
  const c = staticLayer.getContext('2d');
  const W = WORLD.width, H = WORLD.height;

  const sea = c.createLinearGradient(0, 0, W, H);
  sea.addColorStop(0, PALETTE.water);
  sea.addColorStop(1, PALETTE.waterDeep);
  c.fillStyle = sea;
  c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(127,212,201,0.5)';
  for (let i = 0; i < 700; i++) {
    const x = hash2(i, 7) * W, y = hash2(3, i) * H;
    const inCity = x > WORLD.sandRim - 30 && x < W - WORLD.sandRim + 30 && y > WORLD.sandRim - 30 && y < H - WORLD.sandRim + 30;
    if (inCity) continue;
    if (hash2(i, 21) > 0.6) c.fillRect(x, y, 7, 1.6);
  }
  c.fillStyle = PALETTE.sand;
  roundRect(c, WORLD.sandRim - 64, WORLD.sandRim - 64, WORLD.gridW + 128, WORLD.gridH + 128, 90);
  c.fill();
  c.fillStyle = PALETTE.sandWet;
  roundRect(c, WORLD.sandRim - 34, WORLD.sandRim - 34, WORLD.gridW + 68, WORLD.gridH + 68, 64);
  c.fill();
  c.strokeStyle = PALETTE.waterFoam;
  c.lineWidth = 5;
  c.globalAlpha = 0.75;
  roundRect(c, WORLD.sandRim - 52, WORLD.sandRim - 52, WORLD.gridW + 104, WORLD.gridH + 104, 78);
  c.stroke();
  c.globalAlpha = 1;
  for (let i = 0; i < 60; i++) {
    const x = WORLD.sandRim + hash2(i, 31) * WORLD.gridW;
    const y = H - WORLD.sandRim + 26 + hash2(i, 47) * 60;
    c.fillStyle = ['#ff5f7a', '#ffd23e', '#2fe8d8', '#ff8a3d'][i % 4];
    c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = '#9a6b42';
  c.fillRect(WORLD.sandRim - 8, H - WORLD.sandRim - 6, WORLD.gridW + 16, 14);
  c.fillStyle = 'rgba(0,0,0,0.16)';
  for (let x = WORLD.sandRim; x < WORLD.sandRim + WORLD.gridW; x += 18) c.fillRect(x, H - WORLD.sandRim - 6, 2, 14);
  c.fillStyle = PALETTE.sidewalk;
  c.fillRect(WORLD.sandRim, WORLD.sandRim, WORLD.gridW, WORLD.gridH);
  for (const d of DISTRICTS) {
    c.fillStyle = d.tint;
    c.globalAlpha = 0.10;
    c.fillRect(d.x, d.y, d.w, d.h);
  }
  c.globalAlpha = 1;
  for (const p of city.parks) {
    c.fillStyle = PALETTE.park;
    c.fillRect(p.x, p.y, p.w, p.h);
    c.strokeStyle = '#c9b083';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(p.x, p.y + p.h / 2); c.lineTo(p.x + p.w, p.y + p.h / 2);
    c.moveTo(p.x + p.w / 2, p.y); c.lineTo(p.x + p.w / 2, p.y + p.h);
    c.stroke();
    c.fillStyle = '#8fd0dd';
    c.beginPath(); c.arc(p.x + p.w / 2, p.y + p.h / 2, 17, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8f6f2';
    c.beginPath(); c.arc(p.x + p.w / 2, p.y + p.h / 2, 7, 0, Math.PI * 2); c.fill();
  }
  // Asphalt avenues, kerbs, centre dashes, zebra crossings.
  const rw = WORLD.roadWidth, pitch = WORLD.pitch, rim = WORLD.sandRim;
  c.fillStyle = PALETTE.road;
  for (let i = 0; i <= WORLD.blocksX; i++) c.fillRect(rim + i * pitch, rim, rw, WORLD.gridH);
  for (let i = 0; i <= WORLD.blocksY; i++) c.fillRect(rim, rim + i * pitch, WORLD.gridW, rw);
  c.fillStyle = PALETTE.roadEdge;
  for (let i = 0; i <= WORLD.blocksX; i++) { c.fillRect(rim + i * pitch, rim, 3, WORLD.gridH); c.fillRect(rim + i * pitch + rw - 3, rim, 3, WORLD.gridH); }
  for (let i = 0; i <= WORLD.blocksY; i++) { c.fillRect(rim, rim + i * pitch, WORLD.gridW, 3); c.fillRect(rim, rim + i * pitch + rw - 3, WORLD.gridW, 3); }
  c.fillStyle = PALETTE.roadLine;
  for (let i = 0; i <= WORLD.blocksX; i++) {
    const x = rim + i * pitch + rw / 2 - 2;
    for (let y = rim + 8; y < rim + WORLD.gridH - 8; y += 34) c.fillRect(x, y, 4, 18);
  }
  for (let i = 0; i <= WORLD.blocksY; i++) {
    const y = rim + i * pitch + rw / 2 - 2;
    for (let x = rim + 8; x < rim + WORLD.gridW - 8; x += 34) c.fillRect(x, y, 18, 4);
  }
  c.fillStyle = PALETTE.crosswalk;
  c.globalAlpha = 0.8;
  for (let i = 0; i <= WORLD.blocksX; i++) {
    for (let j = 0; j <= WORLD.blocksY; j++) {
      const ix = rim + i * pitch, iy = rim + j * pitch;
      for (let s = 0; s < 5; s++) {
        c.fillRect(ix + 10 + s * 16, iy - 12, 9, 10);
        c.fillRect(ix + 10 + s * 16, iy + rw + 2, 9, 10);
        c.fillRect(ix - 12, iy + 10 + s * 16, 10, 9);
        c.fillRect(ix + rw + 2, iy + 10 + s * 16, 10, 9);
      }
    }
  }
  c.globalAlpha = 1;
  return staticLayer;
}

export function drawGround(ctx, camX, camY, vw, vh, dw = vw, dh = vh) {
  if (!staticLayer) buildStaticLayer();
  ctx.drawImage(staticLayer, camX, camY, vw, vh, 0, 0, dw, dh);
}

// A dockside crate: timber, iron bands, dusk shadow. Street cover.
export function drawCrate(ctx, cr) {
  const s = cr.s || 30;
  ctx.fillStyle = 'rgba(30,14,58,0.35)';
  ctx.fillRect(cr.x - s / 2 + 5, cr.y - s / 2 + 7, s, s);
  ctx.fillStyle = '#b8814a';
  ctx.fillRect(cr.x - s / 2, cr.y - s / 2, s, s);
  ctx.fillStyle = '#96683a';
  ctx.fillRect(cr.x - s / 2, cr.y - 3, s, 6);
  ctx.fillRect(cr.x - 3, cr.y - s / 2, 6, s);
  ctx.strokeStyle = '#6e4c26';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(cr.x - s / 2 + 1, cr.y - s / 2 + 1, s - 2, s - 2);
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) * f));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) * f));
  const b = Math.min(255, Math.max(0, (n & 255) * f));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// SE shadow, shaded walls with lit windows, lifted roof, props, neon.
export function drawBuilding(ctx, b) {
  const lift = b.height;
  const rx = b.x - lift * 0.16, ry = b.y - lift * 0.34;
  ctx.fillStyle = PALETTE.shadow;
  const sx = lift * 0.55, sy = lift * 0.45;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x + b.w, b.y);
  ctx.lineTo(b.x + b.w + sx, b.y + sy);
  ctx.lineTo(b.x + b.w + sx, b.y + b.h + sy);
  ctx.lineTo(b.x + sx, b.y + b.h + sy);
  ctx.lineTo(b.x, b.y + b.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(b.x + sx, b.y + sy, b.w, b.h);
  const base = roofColor(b);
  ctx.fillStyle = shade(base, 0.52);
  ctx.beginPath();
  ctx.moveTo(b.x + b.w, b.y);
  ctx.lineTo(rx + b.w, ry);
  ctx.lineTo(rx + b.w, ry + b.h);
  ctx.lineTo(b.x + b.w, b.y + b.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(base, 0.68);
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + b.h);
  ctx.lineTo(b.x + b.w, b.y + b.h);
  ctx.lineTo(rx + b.w, ry + b.h);
  ctx.lineTo(rx, ry + b.h);
  ctx.closePath();
  ctx.fill();
  const cols = Math.max(2, Math.floor(b.w / 17));
  const rows = Math.max(1, Math.floor(lift / 15));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (hash2(b.x + i * 13, b.y + j * 29) < 0.46) continue;
      const t = (i + 0.5) / cols;
      const wx = b.x + t * b.w + (rx - b.x) * (j + 0.6) / (rows + 0.6);
      const wy = b.y + b.h - 4 - j * 5 + (ry - b.y) * 0.4;
      ctx.fillStyle = PALETTE.windowLit;
      ctx.globalAlpha = 0.5 + hash2(i * 3, j + b.x) * 0.5;
      ctx.fillRect(wx, wy, 5, 3.4);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = shade(base, 1.12);
  ctx.fillRect(rx, ry, b.w, b.h);
  ctx.fillStyle = base;
  ctx.fillRect(rx + 4, ry + 4, b.w - 8, b.h - 8);
  for (const p of b.props) {
    if (p === 'ac') {
      ctx.fillStyle = '#9aa3ad';
      ctx.fillRect(rx + b.w * 0.18, ry + b.h * 0.2, 15, 11);
      ctx.fillStyle = '#6d757f';
      ctx.fillRect(rx + b.w * 0.62, ry + b.h * 0.55, 12, 9);
    } else if (p === 'skylight') {
      ctx.fillStyle = '#bfe6ef';
      ctx.fillRect(rx + b.w * 0.3, ry + b.h * 0.3, 20, 13);
    } else if (p === 'pool') {
      ctx.fillStyle = '#39b8c9';
      roundRect(ctx, rx + b.w * 0.24, ry + b.h * 0.22, b.w * 0.5, b.h * 0.4, 8);
      ctx.fill();
    } else if (p === 'watertower') {
      ctx.fillStyle = '#7a4a30';
      ctx.beginPath(); ctx.arc(rx + b.w * 0.7, ry + b.h * 0.3, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5d3823';
      ctx.beginPath(); ctx.arc(rx + b.w * 0.7, ry + b.h * 0.3, 5, 0, Math.PI * 2); ctx.fill();
    } else if (p === 'crates') {
      ctx.fillStyle = '#b8814a';
      ctx.fillRect(rx + 8, ry + b.h - 20, 14, 12);
      ctx.fillStyle = '#96683a';
      ctx.fillRect(rx + 26, ry + b.h - 16, 11, 9);
    } else if (p === 'sign-garage') {
      ctx.fillStyle = PALETTE.neonTeal;
      ctx.fillRect(rx + 10, ry + 8, b.w - 20, 6);
    }
  }
  if (b.neon) {
    ctx.save();
    ctx.shadowColor = b.neon;
    ctx.shadowBlur = 13;
    ctx.fillStyle = b.neon;
    ctx.fillRect(rx + 6, ry + b.h - 3, Math.min(b.w - 12, 64), 5);
    ctx.restore();
  }
  if (b.garage) {
    ctx.fillStyle = '#12222b';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TIDEWORKS GARAGE', rx + b.w / 2, ry + b.h / 2 + 6);
    ctx.textAlign = 'left';
  }
}

export function drawPalm(ctx, p) {
  ctx.strokeStyle = 'rgba(43,20,78,0.30)';
  ctx.lineWidth = 3;
  const sx = p.x + 16, sy = p.y + 13;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + p.lean;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + Math.cos(a) * p.size * 0.7, sy + Math.sin(a) * p.size * 0.7 - 3, sx + Math.cos(a) * p.size, sy + Math.sin(a) * p.size);
    ctx.stroke();
  }
  ctx.strokeStyle = '#8a6238';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo(p.x + p.lean * 8, p.y - 6, p.x + p.lean * 15, p.y - 11);
  ctx.stroke();
  ctx.strokeStyle = '#3f7d33';
  ctx.lineWidth = 3;
  const tx = p.x + p.lean * 15, ty = p.y - 11;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + p.lean * 0.5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * p.size * 0.66, ty + Math.sin(a) * p.size * 0.5 - 6, tx + Math.cos(a) * p.size, ty + Math.sin(a) * p.size * 0.8 + 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#6d4a26';
  ctx.beginPath(); ctx.arc(tx, ty, 3.4, 0, Math.PI * 2); ctx.fill();
}

export function drawCarShape(ctx, car, time) {
  const { x, y, angle } = car;
  const L = car.length || 48, Wd = car.width || 23;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,14,58,0.35)';
  roundRect(ctx, -L / 2 + 5, -Wd / 2 + 6, L, Wd, 7);
  ctx.fill();
  ctx.rotate(angle);
  if (car.lights !== false) {
    const hg = ctx.createRadialGradient(L / 2, 0, 0, L / 2, 0, 44);
    hg.addColorStop(0, 'rgba(255,230,160,0.30)');
    hg.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(L / 2 - 4, -24, 52, 48);
  }
  ctx.fillStyle = car.color;
  roundRect(ctx, -L / 2, -Wd / 2, L, Wd, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  roundRect(ctx, -L / 2, -Wd / 2, L, Wd / 2.6, 7);
  ctx.fill();
  ctx.fillStyle = '#1d2733';
  roundRect(ctx, -L * 0.06, -Wd / 2 + 3.4, L * 0.20, Wd - 6.8, 3);
  ctx.fill();
  ctx.fillStyle = shade(car.color, 0.82);
  roundRect(ctx, -L * 0.30, -Wd / 2 + 3, L * 0.22, Wd - 6, 3);
  ctx.fill();
  ctx.fillStyle = '#141c26';
  roundRect(ctx, -L * 0.44, -Wd / 2 + 3.4, L * 0.11, Wd - 6.8, 3);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(L / 2 - 2.6, -Wd / 2 + 2.6, 2.6, 5);
  ctx.fillRect(L / 2 - 2.6, Wd / 2 - 7.6, 2.6, 5);
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(-L / 2, -Wd / 2 + 2.6, 2.4, 5);
  ctx.fillRect(-L / 2, Wd / 2 - 7.6, 2.4, 5);
  if (car.police) {
    const phase = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2a3c' : '#2745ff';
    ctx.fillRect(-8, -Wd / 2 + 3, 15, 6);
    ctx.fillStyle = phase ? '#2745ff' : '#ff2a3c';
    ctx.fillRect(-8, Wd / 2 - 9, 15, 6);
    ctx.fillStyle = '#f2f4f6';
    ctx.fillRect(-4, -4.5, 9, 9);
  }
  if (car.condition !== undefined && car.condition < 45) {
    ctx.fillStyle = 'rgba(120,120,128,0.35)';
    ctx.beginPath(); ctx.arc(L / 2 - 4, 0, 6 + (time % 1) * 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawPerson(ctx, p, time) {
  const bob = p.moving ? Math.sin(time * 11 + p.phase) * 1.3 : 0;
  ctx.fillStyle = 'rgba(30,14,58,0.32)';
  ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + 6, 10, 5.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = p.pants || '#2c3242';
  ctx.lineWidth = 4;
  const la = p.angle + Math.PI / 2;
  const s = p.moving ? Math.sin(time * 11 + p.phase) * 5 : 0;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + bob * 0.3);
  ctx.lineTo(p.x + Math.cos(la) * 4 + Math.cos(p.angle) * s, p.y + Math.sin(la) * 4 + Math.sin(p.angle) * s);
  ctx.moveTo(p.x, p.y + bob * 0.3);
  ctx.lineTo(p.x - Math.cos(la) * 4 - Math.cos(p.angle) * s, p.y - Math.sin(la) * 4 - Math.sin(p.angle) * s);
  ctx.stroke();
  ctx.fillStyle = p.shirt || '#c65b7c';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob * 0.3, 8.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.skin || '#c98a5e';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob * 0.3, 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(20,16,26,0.65)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + bob * 0.3);
  ctx.lineTo(p.x + Math.cos(p.angle) * 9, p.y + Math.sin(p.angle) * 9 + bob * 0.3);
  ctx.stroke();
  if (p.aiming) {
    ctx.strokeStyle = '#20242e';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 19, p.y + Math.sin(p.angle) * 19);
    ctx.stroke();
  }
}

export function drawSpotlight(ctx, heli) {
  if (!heli || !heli.on) return;
  const tx = heli.targetX, ty = heli.targetY;
  const grad = ctx.createRadialGradient(tx, ty, 4, tx, ty, heli.radius);
  grad.addColorStop(0, 'rgba(255,244,190,0.46)');
  grad.addColorStop(1, 'rgba(255,244,190,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(tx, ty, heli.radius, 0, Math.PI * 2); ctx.fill();
  const cg = ctx.createLinearGradient(heli.x, heli.y, tx, ty);
  cg.addColorStop(0, 'rgba(255,244,190,0.32)');
  cg.addColorStop(1, 'rgba(255,244,190,0.10)');
  ctx.fillStyle = cg;
  const px = -(ty - heli.y), py = (tx - heli.x);
  const pl = Math.sqrt(px * px + py * py) || 1;
  const w0 = 13, w1 = heli.radius * 0.85;
  ctx.beginPath();
  ctx.moveTo(heli.x + (px / pl) * w0, heli.y + (py / pl) * w0);
  ctx.lineTo(heli.x - (px / pl) * w0, heli.y - (py / pl) * w0);
  ctx.lineTo(tx - (px / pl) * w1, ty - (py / pl) * w1);
  ctx.lineTo(tx + (px / pl) * w1, ty + (py / pl) * w1);
  ctx.closePath();
  ctx.fill();
}

export function drawHeli(ctx, heli, time) {
  if (!heli || !heli.on) return;
  ctx.fillStyle = 'rgba(30,14,58,0.25)';
  ctx.beginPath(); ctx.ellipse(heli.x + 120, heli.y + 95, 34, 13, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(heli.x, heli.y);
  ctx.rotate(heli.angle);
  ctx.fillStyle = 'rgba(230,238,244,0.13)';
  ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(230,238,244,0.35)';
  ctx.lineWidth = 4;
  const ra = time * 31;
  ctx.beginPath();
  ctx.moveTo(Math.cos(ra) * 45, Math.sin(ra) * 45);
  ctx.lineTo(-Math.cos(ra) * 45, -Math.sin(ra) * 45);
  ctx.stroke();
  ctx.fillStyle = '#232a36';
  roundRect(ctx, -52, -3.4, 40, 6.8, 3);
  ctx.fill();
  ctx.fillStyle = '#2f3947';
  roundRect(ctx, -20, -11, 40, 22, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.fillRect(-20, -11, 7, 22);
  ctx.fillStyle = '#bfe6ef';
  roundRect(ctx, 6, -7.4, 11, 14.8, 4);
  ctx.fill();
  ctx.fillStyle = '#f6f2da';
  ctx.beginPath(); ctx.arc(17, 0, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ff4040';
    ctx.beginPath(); ctx.arc(heli.x - Math.cos(heli.angle) * 52, heli.y - Math.sin(heli.angle) * 52, 2.6, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawLampPools(ctx, camX, camY, vw, vh) {
  for (const l of city.lamps) {
    if (l.x < camX - 60 || l.y < camY - 60 || l.x > camX + vw + 60 || l.y > camY + vh + 60) continue;
    lightPool(ctx, l.x, l.y, 40, 0.13);
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
