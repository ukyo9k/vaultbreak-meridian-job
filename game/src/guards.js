// Vaultbreak — The Meridian Job: the three guards.
// Mara, Drex and Vex walk named waypoint loops with a vision cone. A guard
// who sees the thief grows suspicious; at full suspicion he chases, and a
// touch while chasing ends the job. A thrown coin pulls every guard in
// earshot over to investigate it. Lose sight long enough and the guard
// gives up and walks back to his route.
import {
  GUARD_CATCH_DISTANCE,
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_LOSE_SIGHT_SECONDS,
  GUARD_PATROL_SPEED,
  GUARD_RADIUS,
  GUARD_SUSPICION_DECAY,
  GUARD_SUSPICION_RATE,
  GUARD_VISION_HALF_ANGLE,
  GUARD_VISION_RANGE,
} from './config.js';
import { angleDiff, inVisionCone, resolveCircleRect, solids } from './level.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_CHASE = 'chase';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_RETURN = 'return';

/** One guard on his route: name, waypoints, and a suspicion meter. */
export function createGuard(name, waypoints) {
  const start = waypoints[0];
  const next = waypoints[1] ?? waypoints[0];
  return {
    name,
    x: start.x,
    y: start.y,
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    waypoint: 1,
    waypoints,
    state: GUARD_PATROL,
    suspicion: 0,
    unseenFor: 0,
    investigate: null,
    investigateFor: 0,
  };
}

export function createGuards(level) {
  return Object.entries(level.waypoints).map(([name, points]) => createGuard(name, points));
}

/** Walk toward a point at a speed, sliding along solid rectangles. */
function walkToward(guard, tx, ty, speed, dt, level) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) return;
  const step = Math.min(dist, speed * dt);
  let nx = guard.x + (dx / dist) * step;
  let ny = guard.y + (dy / dist) * step;
  for (const s of solids(level)) {
    const fixed = resolveCircleRect(nx, ny, GUARD_RADIUS, s);
    nx = fixed.x;
    ny = fixed.y;
  }
  guard.x = nx;
  guard.y = ny;
}

/** Turn the guard's facing toward a target angle, at most `rate` radians. */
function turnToward(guard, target, rate, dt) {
  const d = angleDiff(guard.angle, target);
  const step = Math.max(-rate * dt, Math.min(rate * dt, d));
  guard.angle += step;
}

/**
 * Advance one guard one step. Returns 'caught' when a chasing guard lays a
 * hand on the thief, else null. `seenBy` is filled with how the thief was
 * spotted, for the alarm: { guard: distance } when in a cone.
 */
export function updateGuard(guard, dt, player, level, seenBy) {
  const sight = inVisionCone(
    level,
    guard.x,
    guard.y,
    guard.angle,
    GUARD_VISION_RANGE,
    GUARD_VISION_HALF_ANGLE,
    player.x,
    player.y,
  );
  const spotted = sight.seen;
  if (spotted) {
    seenBy.guard = sight.dist;
    const gain = GUARD_SUSPICION_RATE * dt * (player.sneaking ? 0.5 : 1);
    guard.suspicion = Math.min(100, guard.suspicion + gain);
    guard.unseenFor = 0;
    if (guard.suspicion >= 100 && guard.state !== GUARD_CHASE) {
      guard.state = GUARD_CHASE;
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD_SUSPICION_DECAY * dt);
    guard.unseenFor += dt;
  }

  if (guard.state === GUARD_CHASE) {
    const targetAngle = Math.atan2(player.y - guard.y, player.x - guard.x);
    turnToward(guard, targetAngle, 6, dt);
    walkToward(guard, player.x, player.y, GUARD_CHASE_SPEED, dt, level);
    if (guard.unseenFor > GUARD_LOSE_SIGHT_SECONDS) {
      guard.state = GUARD_RETURN;
      guard.suspicion = 40;
    }
    if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD_CATCH_DISTANCE) {
      return 'caught';
    }
    return null;
  }

  if (guard.state === GUARD_INVESTIGATE && guard.investigate) {
    const target = guard.investigate;
    const arrived = Math.hypot(target.x - guard.x, target.y - guard.y) < 12;
    if (arrived) {
      guard.investigateFor += dt;
      turnToward(guard, guard.angle + 1.4 * dt, 1.4, dt);
      if (guard.investigateFor > 2) {
        guard.state = GUARD_RETURN;
        guard.investigate = null;
      }
    } else {
      const targetAngle = Math.atan2(target.y - guard.y, target.x - guard.x);
      turnToward(guard, targetAngle, 5, dt);
      walkToward(guard, target.x, target.y, GUARD_INVESTIGATE_SPEED, dt, level);
    }
    return null;
  }

  if (guard.state === GUARD_RETURN) {
    const home = guard.waypoints[guard.waypoint];
    const arrived = Math.hypot(home.x - guard.x, home.y - guard.y) < 8;
    if (arrived) {
      guard.state = GUARD_PATROL;
    } else {
      const targetAngle = Math.atan2(home.y - guard.y, home.x - guard.x);
      turnToward(guard, targetAngle, 5, dt);
      walkToward(guard, home.x, home.y, GUARD_PATROL_SPEED, dt, level);
    }
    return null;
  }

  // Patrol: walk the waypoint loop, facing where he walks.
  const point = guard.waypoints[guard.waypoint];
  const arrived = Math.hypot(point.x - guard.x, point.y - guard.y) < 6;
  if (arrived) {
    guard.waypoint = (guard.waypoint + 1) % guard.waypoints.length;
  } else {
    const targetAngle = Math.atan2(point.y - guard.y, point.x - guard.x);
    turnToward(guard, targetAngle, 5, dt);
    walkToward(guard, point.x, point.y, GUARD_PATROL_SPEED, dt, level);
  }
  return null;
}

/** A coin landing pulls every guard in earshot over to look at it. */
export function lureGuards(guards, x, y, hearRadius) {
  for (const guard of guards) {
    if (guard.state === GUARD_CHASE) continue;
    if (Math.hypot(guard.x - x, guard.y - y) > hearRadius) continue;
    guard.state = GUARD_INVESTIGATE;
    guard.investigate = { x, y };
    guard.investigateFor = 0;
    guard.suspicion = Math.max(guard.suspicion, 25);
  }
}
