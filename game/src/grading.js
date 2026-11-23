// Crimson Tide Bay — the golden-hour grade: amber sun-glow west, violet
// dusk east, a vignette to hold the eye.

import { PALETTE } from './config.js';

let vignetteCache = null;
let glowCache = null;

function buildOverlays(w, h) {
  vignetteCache = document.createElement('canvas');
  vignetteCache.width = w; vignetteCache.height = h;
  const v = vignetteCache.getContext('2d');
  const vg = v.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.40, w / 2, h / 2, Math.max(w, h) * 0.76);
  vg.addColorStop(0, 'rgba(26,8,48,0)');
  vg.addColorStop(1, 'rgba(26,8,48,0.38)');
  v.fillStyle = vg;
  v.fillRect(0, 0, w, h);

  glowCache = document.createElement('canvas');
  glowCache.width = w; glowCache.height = h;
  const g = glowCache.getContext('2d');
  const sun = g.createLinearGradient(0, 0, w, h * 0.35);
  sun.addColorStop(0, PALETTE.sunGlow);
  sun.addColorStop(0.5, 'rgba(255,138,54,0.10)');
  sun.addColorStop(1, PALETTE.dusk);
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,120,36,0.08)';
  g.fillRect(0, 0, w, h);
  const spot = g.createRadialGradient(w * 0.06, h * 0.02, 0, w * 0.06, h * 0.02, Math.max(w, h) * 0.55);
  spot.addColorStop(0, 'rgba(255,176,84,0.20)');
  spot.addColorStop(1, 'rgba(255,176,84,0)');
  g.fillStyle = spot;
  g.fillRect(0, 0, w, h);
}

export function applyGrade(ctx, w, h) {
  if (!vignetteCache || vignetteCache.width !== w || vignetteCache.height !== h) {
    buildOverlays(w, h);
  }
  ctx.drawImage(glowCache, 0, 0);
  ctx.drawImage(vignetteCache, 0, 0);
}

// A soft warm light pool: street lamps, lit windows.
export function lightPool(ctx, x, y, r, strength = 0.16) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,196,96,${strength})`);
  g.addColorStop(1, 'rgba(255,196,96,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function drawSunsetSky(ctx, x, y, w, h) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#2c1a56');
  sky.addColorStop(0.34, '#7a2a6e');
  sky.addColorStop(0.58, '#d94f5c');
  sky.addColorStop(0.78, '#ff8a3d');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const sunX = x + w * 0.30, sunY = y + h * 0.80, sunR = h * 0.30;
  const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.1);
  sg.addColorStop(0, 'rgba(255,214,120,0.95)');
  sg.addColorStop(0.25, 'rgba(255,166,66,0.55)');
  sg.addColorStop(1, 'rgba(255,140,50,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffd678';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 0.52, 0, Math.PI * 2);
  ctx.fill();
}
