// Vaultbreak — The Meridian Job: the wall cameras.
// Three cameras sweep their red cones across the floor on fixed pivots. A
// camera that sees the thief feeds the alarm; an EMP burst knocks every
// camera dark for a few seconds, cones grey and blind.
import { CAMERA_EMP_SECONDS, CAMERA_HALF_ANGLE, CAMERA_RANGE } from './config.js';
import { inVisionCone } from './level.js';

/** One camera: a wall mount, a sweeping angle, and an EMP countdown. */
export function createCameras(level) {
  return level.cameras.map((def) => ({
    x: def.x,
    y: def.y,
    base: def.base,
    amp: def.amp,
    speed: def.speed,
    angle: def.base,
    darkFor: 0,
  }));
}

/** Sweep every camera; `time` is the room clock in seconds. */
export function updateCameras(cameras, dt, time) {
  for (const camera of cameras) {
    camera.angle = camera.base + camera.amp * Math.sin(time * camera.speed);
    camera.darkFor = Math.max(0, camera.darkFor - dt);
  }
}

/** True while the camera is blind from an EMP burst. */
export function cameraIsDark(camera) {
  return camera.darkFor > 0;
}

/**
 * Check every live camera against the thief. Returns the closest distance
 * at which one sees him, or null when no camera does.
 */
export function cameraSeesPlayer(cameras, level, player) {
  let closest = null;
  for (const camera of cameras) {
    if (cameraIsDark(camera)) continue;
    const sight = inVisionCone(
      level,
      camera.x,
      camera.y,
      camera.angle,
      CAMERA_RANGE,
      CAMERA_HALF_ANGLE,
      player.x,
      player.y,
    );
    if (sight.seen && (closest === null || sight.dist < closest)) closest = sight.dist;
  }
  return closest;
}

/** An EMP burst: every camera goes dark for CAMERA_EMP_SECONDS. */
export function empBurst(cameras) {
  for (const camera of cameras) camera.darkFor = CAMERA_EMP_SECONDS;
}

/** True when at least one camera is dark right now. */
export function anyCameraDark(cameras) {
  return cameras.some((camera) => camera.darkFor > 0);
}
