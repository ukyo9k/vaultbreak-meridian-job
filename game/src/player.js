// Vaultbreak — The Meridian Job: the thief.
// WASD or arrows to move, Shift to sneak, click the floor to throw a coin,
// Q for an EMP burst, hold E beside the glass case to crack it. The thief
// slides along walls, pockets side loot by walking over it, and wins the
// moment he reaches the getaway door with the diamond in hand.
import {
  COIN_COUNT,
  CRACK_RADIUS,
  CRACK_SECONDS,
  EMP_COUNT,
  PLAYER_RADIUS,
  PLAYER_SNEAK,
  PLAYER_WALK,
  SCORE_LOOT,
} from './config.js';
import { pointInRect, resolveCircleRect, solids } from './level.js';

/** The thief at the service door, pockets empty, tools full. */
export function createPlayer(level) {
  return {
    x: level.start.x,
    y: level.start.y,
    angle: -Math.PI / 2,
    sneaking: false,
    moving: false,
    coins: COIN_COUNT,
    emps: EMP_COUNT,
    crack: 0,
    hasDiamond: false,
    lootTaken: 0,
    coinFlight: null,
    coinLanded: null,
  };
}

/**
 * Move the thief one step. `move` is { x, y } in -1..1, `sneak` halves the
 * pace. Returns the list of loot labels picked up this step.
 */
export function updatePlayer(player, dt, move, sneak, level) {
  player.sneaking = sneak;
  const speed = sneak ? PLAYER_SNEAK : PLAYER_WALK;
  const len = Math.hypot(move.x, move.y);
  player.moving = len > 0.1;
  if (player.moving) {
    const nx = move.x / len;
    const ny = move.y / len;
    player.angle = Math.atan2(ny, nx);
    let x = player.x + nx * speed * dt;
    let y = player.y + ny * speed * dt;
    for (const s of solids(level)) {
      const fixed = resolveCircleRect(x, y, PLAYER_RADIUS, s);
      x = fixed.x;
      y = fixed.y;
    }
    player.x = x;
    player.y = y;
  }

  const picked = [];
  for (const item of level.loot) {
    if (item.taken) continue;
    if (Math.hypot(item.x - player.x, item.y - player.y) < 34) {
      item.taken = true;
      player.lootTaken += 1;
      picked.push(item.label);
    }
  }
  return picked;
}

/** True when the thief stands close enough to the glass case to crack it. */
export function nearCase(player, level) {
  return Math.hypot(level.case.x - player.x, level.case.y - player.y) < CRACK_RADIUS + level.case.r;
}

/**
 * Hold E: the crack meter fills over CRACK_SECONDS; let go and it slowly
 * slips back. Returns 'cracked' the step the glass gives way.
 */
export function updateCrack(player, dt, holding, level) {
  if (player.hasDiamond) return null;
  if (!nearCase(player, level)) {
    player.crack = Math.max(0, player.crack - dt * 0.4);
    return null;
  }
  if (holding) {
    player.crack += dt / CRACK_SECONDS;
    if (player.crack >= 1) {
      player.crack = 1;
      player.hasDiamond = true;
      return 'cracked';
    }
  } else {
    player.crack = Math.max(0, player.crack - dt * 0.25);
  }
  return null;
}

/** True when the thief stands in the getaway doorway. */
export function atDoor(player, level) {
  return pointInRect(player.x, player.y, level.door);
}

/** Throw a coin toward a floor point; it lands after a short flight. */
export function throwCoin(player, x, y) {
  if (player.coins <= 0 || player.coinFlight) return false;
  player.coins -= 1;
  player.coinFlight = { fromX: player.x, fromY: player.y, x, y, t: 0 };
  return true;
}

/** Advance a thrown coin; returns the landing point the step it lands. */
export function updateCoin(player, dt) {
  const flight = player.coinFlight;
  if (!flight) return null;
  flight.t = Math.min(1, flight.t + dt / 0.25);
  if (flight.t < 1) return null;
  player.coinFlight = null;
  player.coinLanded = { x: flight.x, y: flight.y, t: 0 };
  return { x: flight.x, y: flight.y };
}

/** Where the coin is right now, mid-flight or resting on the floor. */
export function coinPosition(player) {
  if (player.coinFlight) {
    const f = player.coinFlight;
    const e = f.t * (2 - f.t);
    return { x: f.fromX + (f.x - f.fromX) * e, y: f.fromY + (f.y - f.fromY) * e, flying: true };
  }
  if (player.coinLanded) return { x: player.coinLanded.x, y: player.coinLanded.y, flying: false };
  return null;
}

/** Loot score so far: SCORE_LOOT per pocketed piece. */
export function lootScore(player) {
  return player.lootTaken * SCORE_LOOT;
}
