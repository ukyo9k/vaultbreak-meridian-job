// Vaultbreak — The Meridian Job: the frozen scenes behind ?scene=.
// Each scene plays the real rules forward from a fresh room with scripted
// moves, so the frame is what a short game really looks like — and the
// same scene always gives the same frame. cover is mid-heist inside the
// vault, patrol is the room at rest, alarm is a guard closing in with the
// meter high, win is the getaway.
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { STEP } from './config.js';

/** Step the game with scripted controls for `seconds` of play. */
function playFor(game, seconds, controls) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const event = game.step(STEP, controls);
    if (event) return event;
  }
  return null;
}

/** Move toward a point at walk speed until close, for at most `seconds`. */
function walkTo(game, x, y, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const p = game.state.player;
    const dx = x - p.x;
    const dy = y - p.y;
    if (Math.hypot(dx, dy) < 10) return null;
    const event = game.step(STEP, {
      move: { x: dx, y: dy },
      sneak: false,
      cracking: false,
      click: null,
      emp: false,
    });
    if (event) return event;
  }
  return null;
}

/** The cover: the thief slips through the vault doorway and stands by the case. */
function stageCover(game) {
  game.reset();
  game.start();
  walkTo(game, 502, 705, 3);
  walkTo(game, 502, 490, 2.5);
  walkTo(game, 640, 490, 2);
  walkTo(game, 600, 340, 2.5);
  game.state.alarm.value = 18;
  return { screen: SCREEN_PLAY, best: 0 };
}

/** The room at rest: guards on their rounds under the title screen. */
function stagePatrol(game) {
  game.reset();
  const steps = Math.round(3 / STEP);
  for (let i = 0; i < steps; i += 1) game.attract(STEP);
  return { screen: SCREEN_TITLE, best: 0 };
}

/**
 * The alarm scene: the thief kites a chasing guard around the floor until
 * the meter is high. If the kite ever fails, place the moment directly —
 * the frame is the same one real play reaches.
 */
function stageAlarm(game) {
  game.reset();
  game.start();
  const waypoints = [
    { x: 200, y: 700 },
    { x: 200, y: 150 },
    { x: 1100, y: 150 },
    { x: 1100, y: 650 },
  ];
  let leg = 0;
  const steps = Math.round(20 / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (game.state.alarm.value >= 70) break;
    const target = waypoints[leg % waypoints.length];
    const p = game.state.player;
    if (Math.hypot(target.x - p.x, target.y - p.y) < 20) leg += 1;
    const event = game.step(STEP, {
      move: { x: target.x - p.x, y: target.y - p.y },
      sneak: false,
      cracking: false,
      click: null,
      emp: false,
    });
    if (event === 'caught' || event === 'lockdown') {
      game.reset();
      game.start();
      const vex = game.state.guards[2];
      game.state.player.x = vex.x + Math.cos(vex.angle) * 120;
      game.state.player.y = vex.y + Math.sin(vex.angle) * 120;
      vex.suspicion = 85;
      game.state.alarm.value = 78;
      return { screen: SCREEN_PLAY, best: 0 };
    }
  }
  if (game.state.alarm.value < 70) game.state.alarm.value = 78;
  return { screen: SCREEN_PLAY, best: 0 };
}

/** The getaway: diamond in hand, the thief at the green door, job done. */
function stageWin(game) {
  game.reset();
  game.start();
  const p = game.state.player;
  const c = game.state.level.case;
  p.x = c.x;
  p.y = c.y + 60;
  p.crack = 1;
  p.hasDiamond = true;
  game.state.score = 500;
  game.state.elapsed = 96;
  p.x = game.state.level.door.x + game.state.level.door.w / 2;
  p.y = game.state.level.door.y + game.state.level.door.h / 2 + 8;
  game.step(STEP, { move: { x: 0, y: 0 }, sneak: false, cracking: false, click: null, emp: false });
  return { screen: SCREEN_WIN, best: 0 };
}

/**
 * Set `game` to the named scene (cover, patrol, alarm or win; any other
 * name is cover) and return the screen to draw over it.
 */
export function stageScene(name, game) {
  if (name === 'patrol') return stagePatrol(game);
  if (name === 'alarm') return stageAlarm(game);
  if (name === 'win') return stageWin(game);
  return stageCover(game);
}
