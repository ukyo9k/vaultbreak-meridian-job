// Vaultbreak — The Meridian Job: boot and the one loop.
// Input is read every frame, the room advances in fixed 1/60 s steps, and
// the renderer paints what is there. The game moves between five screens:
// title, play, paused, win and caught.
//
// ?scene=cover|patrol|alarm|win stages that scene instead of running the
// loop, paints it twice and sets window.__shotReady for a screenshot.
// window.__vaultbreak is the debug handle the playtest drives: state,
// teleport, setAlarm, start, reset and score.
import { STEP } from './config.js';
import { buildLevel } from './level.js';
import { createGuards, lureGuards, updateGuard } from './guards.js';
import {
  cameraSeesPlayer,
  createCameras,
  empBurst,
  updateCameras,
} from './cameras.js';
import {
  atDoor,
  createPlayer,
  throwCoin,
  updateCoin,
  updateCrack,
  updatePlayer,
} from './player.js';
import { createAlarm, updateAlarm } from './alarm.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM,
  ACTION_EMP,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RETRY,
  createInput,
} from './input.js';
import {
  SCREEN_CAUGHT,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageScene } from './shots.js';
import {
  COIN_HEAR_RADIUS,
  SCORE_DIAMOND,
  SCORE_LOOT,
  SCORE_TIME_BASE,
  SCORE_TIME_PER_SECOND,
} from './config.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;
const BEST_KEY = 'vaultbreak-best';

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

/** A fresh room: new thief, new guards, cold alarm, empty pockets. */
function freshState(level) {
  return {
    level,
    player: createPlayer(level),
    guards: createGuards(level),
    cameras: createCameras(level),
    alarm: createAlarm(),
    score: 0,
    elapsed: 0,
    time: 0,
    toast: null,
    toastFor: 0,
    caughtReason: null,
    _wasSeen: false,
    _doorWarned: false,
  };
}

/** The game: its state plus the one step every screen and scene shares. */
export function createGame() {
  const level = buildLevel();
  const audio = createAudio();
  let state = freshState(level);

  function setToast(text) {
    state.toast = text;
    state.toastFor = 2.5;
  }

  /**
   * Advance the room one step. `controls` is { move, sneak, cracking,
   * click, emp }. Returns 'caught', 'lockdown' or 'win' when the job ends,
   * else null.
   */
  function step(dt, controls) {
    state.time += dt;
    state.elapsed += dt;
    if (state.toastFor > 0) state.toastFor -= dt;

    if (controls.click) {
      if (throwCoin(state.player, controls.click.x, controls.click.y)) {
        setToast('Coin thrown — listen for it');
        audio.coin();
      }
    }
    if (controls.emp) {
      if (state.player.emps > 0) {
        state.player.emps -= 1;
        empBurst(state.cameras);
        setToast('EMP burst — cameras dark');
        audio.emp();
      }
    }

    const picked = updatePlayer(state.player, dt, controls.move, controls.sneak, state.level);
    for (const label of picked) {
      state.score += SCORE_LOOT;
      setToast(`${label} pocketed (+${SCORE_LOOT})`);
      audio.loot();
    }

    const landed = updateCoin(state.player, dt);
    if (landed) {
      lureGuards(state.guards, landed.x, landed.y, COIN_HEAR_RADIUS);
      audio.coinLand();
    }

    const cracked = updateCrack(state.player, dt, controls.cracking, state.level);
    if (cracked === 'cracked') {
      state.score += SCORE_DIAMOND;
      state.alarm.value = Math.min(100, state.alarm.value + 8);
      setToast('The Meridian Diamond is yours!');
      audio.crack();
    }

    updateCameras(state.cameras, dt, state.time);

    const seenBy = {};
    for (const guard of state.guards) {
      const result = updateGuard(guard, dt, state.player, state.level, seenBy);
      if (result === 'caught') {
        state.caughtReason = 'caught';
        audio.caught();
        return 'caught';
      }
    }
    const cameraDistance = cameraSeesPlayer(state.cameras, state.level, state.player);
    if (cameraDistance !== null) seenBy.camera = cameraDistance;

    const alarmEvent = updateAlarm(
      state.alarm,
      dt,
      Object.keys(seenBy).length > 0 ? seenBy : null,
      state.player,
      state.level,
    );
    if (alarmEvent === 'lockdown') {
      state.caughtReason = 'lockdown';
      audio.caught();
      return 'lockdown';
    }
    if (state.alarm.seen && !state._wasSeen) audio.spotted();
    state._wasSeen = state.alarm.seen;

    if (state.player.hasDiamond && atDoor(state.player, state.level)) {
      const bonus = Math.max(0, SCORE_TIME_BASE - Math.floor(state.elapsed) * SCORE_TIME_PER_SECOND);
      state.score += bonus;
      audio.win();
      return 'win';
    }
    if (!state.player.hasDiamond && atDoor(state.player, state.level) && !state._doorWarned) {
      setToast('You need the diamond first');
      state._doorWarned = true;
    }
    if (!atDoor(state.player, state.level)) state._doorWarned = false;
    return null;
  }

  /** Title-screen ambience: guards walk their rounds, cameras sweep, no alarm. */
  function attract(dt) {
    state.time += dt;
    updateCameras(state.cameras, dt, state.time);
    const ghost = { x: -1000, y: -1000, sneaking: false };
    const seenBy = {};
    for (const guard of state.guards) updateGuard(guard, dt, ghost, state.level, seenBy);
  }

  function reset() {
    state = freshState(level);
  }

  return {
    get state() {
      return state;
    },
    audio,
    step,
    attract,
    reset,
    start() {
      reset();
    },
  };
}

const params = new URLSearchParams(window.location.search);
const scene = params.get('scene');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame();
const renderer = createRenderer(canvas);

/** The debug handle: state, teleport, setAlarm, start, reset, score. */
window.__vaultbreak = {
  get state() {
    return game.state;
  },
  teleport(x, y) {
    game.state.player.x = x;
    game.state.player.y = y;
  },
  setAlarm(value) {
    game.state.alarm.value = value;
  },
  start() {
    game.start();
    screen = SCREEN_PLAY;
  },
  reset() {
    game.reset();
    screen = SCREEN_TITLE;
  },
  score() {
    return game.state.score;
  },
};

let screen = SCREEN_TITLE;
let best = readBest();

function runScene(name) {
  const staged = stageScene(name, game);
  screen = staged.screen;
  let painted = 0;
  function paint() {
    renderer.draw(game.state, screen, staged.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  let stepSoundAt = 0;
  let alarmTickAt = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    game.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Crack the case, take the diamond, reach the green door.');
  }

  function endGame(event) {
    screen = event === 'win' ? SCREEN_WIN : SCREEN_CAUGHT;
    if (game.state.score > best) {
      best = game.state.score;
      saveBest(best);
    }
    announce(
      event === 'win'
        ? `Clean getaway. Score ${game.state.score}.`
        : game.state.caughtReason === 'lockdown'
          ? `LOCKDOWN. The alarm hit 100. Score ${game.state.score}. Press R to try again.`
          : `Caught. Score ${game.state.score}. Press R to try again.`,
    );
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = game.audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_RETRY && (screen === SCREEN_WIN || screen === SCREEN_CAUGHT)) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_CAUGHT)) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_EMP) {
        const event = game.step(0, {
          move: { x: 0, y: 0 },
          sneak: false,
          cracking: false,
          click: null,
          emp: true,
        });
        if (event) endGame(event);
      }
    }
  }

  function playStep(dt) {
    const controls = {
      move: input.moveVector(),
      sneak: input.sneaking,
      cracking: input.cracking,
      click: input.takeClick(),
      emp: false,
    };
    const event = game.step(dt, controls);
    if (event) endGame(event);
    const now = game.state.time;
    if (game.state.player.moving && now - stepSoundAt > 0.34) {
      stepSoundAt = now;
      game.audio.step();
    }
    if (game.state.alarm.value > 70 && now - alarmTickAt > 0.5) {
      alarmTickAt = now;
      game.audio.alarmTick();
    }
    if (game.state.player.moving || game.state.alarm.seen) {
      // Keep the status line honest for screen readers without spamming it.
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        game.attract(STEP);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        playStep(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(game.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  canvas.addEventListener('mousedown', () => game.audio.unlock());
  window.addEventListener('keydown', () => game.audio.unlock(), { once: true });

  announce('Vaultbreak, the Meridian Job. Press Space to begin.');
  requestAnimationFrame(frame);
}

if (scene) runScene(scene);
else runGame();
