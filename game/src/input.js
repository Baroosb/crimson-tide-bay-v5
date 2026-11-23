// Crimson Tide Bay — keyboard and mouse input: what is held, what was
// tapped this frame, where the mouse is. The loop asks; never listens.

const held = new Set();
const taps = new Set();
export const mouse = { x: 0, y: 0, down: false, clicked: false };

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyE: 'enter',
  KeyF: 'fire',
  Space: 'fire',
  KeyQ: 'grenade',
  KeyG: 'garage',
  KeyM: 'map',
  KeyP: 'pause', Escape: 'pause',
  KeyR: 'radio',
  Enter: 'confirm',
  Digit1: 'ability1', Digit2: 'ability2', Digit3: 'ability3',
  Tab: 'weapons',
};

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (!name) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (!held.has(name)) taps.add(name);
    held.add(name);
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) held.delete(name);
  });
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  canvas.addEventListener('mousedown', (e) => {
    mouse.down = true;
    mouse.clicked = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });
}

export function pressed(name) { return held.has(name); }
export function tapped(name) { return taps.has(name); }

// Taps and clicks last one frame.
export function clearTaps() {
  taps.clear();
  mouse.clicked = false;
}
