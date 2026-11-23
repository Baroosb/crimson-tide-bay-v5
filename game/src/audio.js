// Crimson Tide Bay — sound from oscillators, synthesised live with
// WebAudio. No files, silence until the first user gesture.

let ac = null;
let engineNodes = null;
let sirenNodes = null;
let radioNodes = null;

export function initAudio() {
  if (ac) return;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    ac = null;
  }
}

export function resumeAudio() {
  if (ac && ac.state === 'suspended') ac.resume();
}

function env(gain, t0, a, peak, d) {
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + a);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

// --- One-shots ---

export const sfx = {
  shot(kind = 'vesper') {
    if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(kind === 'kestrel' ? 220 : kind === 'breaker' ? 130 : 320, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
    env(g, t, 0.004, kind === 'breaker' ? 0.22 : 0.13, 0.1);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + 0.14);
    noiseBurst(0.05, kind === 'breaker' ? 0.16 : 0.08);
  },
  explosion() {
    if (!ac) return;
    noiseBurst(0.7, 0.5);
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    env(g, t, 0.01, 0.5, 0.65);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + 0.75);
  },
  crash() { noiseBurst(0.16, 0.2); },
  cash() {
    if (!ac) return;
    const t = ac.currentTime;
    for (const [i, f] of [880, 1318].entries()) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      env(g, t + i * 0.07, 0.005, 0.12, 0.12);
      o.connect(g).connect(ac.destination);
      o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.16);
    }
  },
  blip() {
    if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = 660;
    env(g, t, 0.005, 0.07, 0.07);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + 0.1);
  },
};

function noiseBurst(seconds, peak) {
  if (!ac) return;
  const t = ac.currentTime;
  const len = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const g = ac.createGain();
  g.gain.value = peak;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t);
}

// --- Loops ---

export function setEngine(on, speedRatio = 0) {
  if (!ac) return;
  if (on && !engineNodes) {
    const o = ac.createOscillator();
    const o2 = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sawtooth';
    o2.type = 'square';
    const f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    g.gain.value = 0.0;
    o.connect(f); o2.connect(f); f.connect(g).connect(ac.destination);
    o.start(); o2.start();
    engineNodes = { o, o2, g };
  }
  if (engineNodes) {
    const base = 55 + speedRatio * 130;
    engineNodes.o.frequency.value = base;
    engineNodes.o2.frequency.value = base * 0.5 + 2;
    engineNodes.g.gain.setTargetAtTime(on ? 0.05 + speedRatio * 0.05 : 0, ac.currentTime, 0.08);
    if (!on) {
      const nodes = engineNodes;
      engineNodes = null;
      setTimeout(() => { try { nodes.o.stop(); nodes.o2.stop(); } catch { /* already gone */ } }, 350);
    }
  }
}

export function setSiren(on) {
  if (!ac) return;
  if (on && !sirenNodes) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    o.type = 'triangle';
    o.frequency.value = 760;
    lfo.frequency.value = 0.7;
    lfoGain.gain.value = 190;
    lfo.connect(lfoGain).connect(o.frequency);
    g.gain.value = 0.016;
    o.connect(g).connect(ac.destination);
    o.start(); lfo.start();
    sirenNodes = { o, lfo, g };
  }
  if (!on && sirenNodes) {
    const nodes = sirenNodes;
    sirenNodes = null;
    try { nodes.o.stop(); nodes.lfo.stop(); } catch { /* already gone */ }
  }
}

export function setRadio(station) {
  radioOff();
  if (!ac || !station) return;
  const g = ac.createGain();
  g.gain.value = 0.05;
  g.connect(ac.destination);
  const stepMs = 60000 / station.bpm / 2;
  const scale = [0, 3, 5, 7, 10, 12, 10, 7];
  let step = 0;
  const timer = setInterval(() => {
    if (!ac) return;
    const t = ac.currentTime;
    const note = scale[step % scale.length];
    const f = station.root * Math.pow(2, note / 12);
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.type = step % 2 === 0 ? 'triangle' : 'sine';
    o.frequency.value = step % 4 === 0 ? station.root / 2 : f;
    env(og, t, 0.01, step % 4 === 0 ? 0.5 : 0.22, stepMs / 1000 * 0.9);
    o.connect(og).connect(g);
    o.start(t); o.stop(t + stepMs / 1000);
    step++;
  }, stepMs);
  radioNodes = { g, timer };
}

export function radioOff() {
  if (radioNodes) {
    clearInterval(radioNodes.timer);
    try { radioNodes.g.disconnect(); } catch { /* already gone */ }
    radioNodes = null;
  }
}
