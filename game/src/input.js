// Vaultbreak — The Meridian Job: keyboard and mouse.
// WASD or arrows move, Shift sneaks, Space starts, P or Escape pauses,
// M mutes, R retries, Q fires an EMP, E is held to crack the case, and a
// click on the floor throws a coin there. Actions are edge-triggered and
// consumed once, so a held key never double-fires.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RETRY = 8;
export const ACTION_EMP = 16;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;

  const MOVE_KEYS = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
  };

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'KeyR') actions |= ACTION_RETRY;
    if (event.code === 'KeyQ') actions |= ACTION_EMP;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    /** Current movement vector from held keys, each axis in -1..1. */
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return { x, y };
    },
    get sneaking() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    get cracking() {
      return keys.has('KeyE');
    },
    /** Actions pressed since the last call, then cleared. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** A floor click since the last call, then cleared. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
