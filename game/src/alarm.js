// Vaultbreak — The Meridian Job: the alarm meter.
// 0 to 100. While any guard or camera sees the thief it climbs — faster
// the closer the watcher is, halved while sneaking or standing in a
// deep-shadow patch — and while hidden it cools. At 100 the vault locks
// down and the job is over.
import {
  ALARM_CAMERA_RATE,
  ALARM_COOL_RATE,
  ALARM_GUARD_RATE,
  ALARM_MAX,
  ALARM_SHADOW_FACTOR,
  ALARM_SNEAK_FACTOR,
  CAMERA_RANGE,
  GUARD_VISION_RANGE,
} from './config.js';
import { inShadow } from './level.js';

/** A cold alarm at the start of the night. */
export function createAlarm() {
  return { value: 0, seen: false, seenBy: 'none' };
}

/**
 * One step of the meter. `seenBy` names what spotted the thief:
 * { guard: distance } or { camera: distance } or null.
 */
export function updateAlarm(alarm, dt, seenBy, player, level) {
  let rate = 0;
  let by = 'none';
  if (seenBy && seenBy.guard !== undefined) {
    const closeness = 0.6 + 0.8 * (1 - seenBy.guard / GUARD_VISION_RANGE);
    rate = ALARM_GUARD_RATE * closeness;
    by = 'guard';
  } else if (seenBy && seenBy.camera !== undefined) {
    const closeness = 0.6 + 0.8 * (1 - seenBy.camera / CAMERA_RANGE);
    rate = ALARM_CAMERA_RATE * closeness;
    by = 'camera';
  }
  if (rate > 0) {
    if (player.sneaking) rate *= ALARM_SNEAK_FACTOR;
    if (inShadow(level, player.x, player.y)) rate *= ALARM_SHADOW_FACTOR;
    alarm.value = Math.min(ALARM_MAX, alarm.value + rate * dt);
    alarm.seen = true;
    alarm.seenBy = by;
  } else {
    alarm.value = Math.max(0, alarm.value - ALARM_COOL_RATE * dt);
    alarm.seen = false;
    alarm.seenBy = 'none';
  }
  return alarm.value >= ALARM_MAX ? 'lockdown' : null;
}

/** The meter's colour: calm green, wary amber, lockdown red. */
export function alarmColor(value) {
  if (value < 40) return '#58c96b';
  if (value < 70) return '#f2c14e';
  return '#e5484d';
}
