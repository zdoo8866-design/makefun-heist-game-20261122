// Keyboard input: movement keys, sneak, interact, confirm and restart. The world reads the
// held-key set each fixed step; edge-triggered actions are consumed by the caller.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_RESTART = 'restart';

const KEYMAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
  KeyE: 'interact',
  Enter: 'confirm',
  Space: 'confirm',
  KeyR: 'restart',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  function onDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    event.preventDefault();
    if (!held.has(action)) pressed.add(action);
    held.add(action);
  }
  function onUp(event) {
    const action = KEYMAP[event.code];
    if (action) held.delete(action);
  }
  function onBlur() {
    held.clear();
  }
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', () => pressed.add(ACTION_CONFIRM));
  return {
    /** The direction the player is pushing, as a unit-ish vector (may be zero). */
    move() {
      let x = 0;
      let y = 0;
      if (held.has('left')) x -= 1;
      if (held.has('right')) x += 1;
      if (held.has('up')) y -= 1;
      if (held.has('down')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    sneak() {
      return held.has('sneak');
    },
    interact() {
      return held.has('interact');
    },
    /** True once per key press; callers consume it by reading. */
    consume(action) {
      if (!pressed.has(action)) return false;
      pressed.delete(action);
      return true;
    },
    /** Drop queued presses (used when changing screens). */
    clearPressed() {
      pressed.clear();
    },
  };
}
