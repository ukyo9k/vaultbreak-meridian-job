// Vaultbreak — The Meridian Job: the room itself.
// The Meridian Bank vault floor at night: outer walls, the vault enclosure
// with its glass case at the heart, crates and desks for cover, deep-shadow
// patches that halve how fast the alarm climbs, side loot, and the green
// getaway door on the north-east wall. Also the geometry helpers every
// other module leans on: circle-vs-rect collision and line of sight.
import { VIEW_H, VIEW_W } from './config.js';

/** A solid rectangle: { x, y, w, h }. */
function rect(x, y, w, h) {
  return { x, y, w, h };
}

/** The whole floor plan, built fresh so a reset is a rebuild. */
export function buildLevel() {
  const walls = [
    rect(0, 0, VIEW_W, 24),
    rect(0, VIEW_H - 24, VIEW_W, 24),
    rect(0, 0, 24, VIEW_H),
    rect(VIEW_W - 24, 0, 24, VIEW_H),
    // Vault enclosure: north, west and east walls, south wall split so a
    // 60 px doorway opens at its foot.
    rect(520, 280, 240, 20),
    rect(520, 280, 20, 200),
    rect(740, 280, 20, 200),
    rect(520, 460, 90, 20),
    rect(670, 460, 90, 20),
  ];
  const obstacles = [
    // Crates and desks: cover that blocks movement and sight alike.
    { ...rect(170, 170, 96, 64), kind: 'crate' },
    { ...rect(300, 540, 116, 72), kind: 'crate' },
    { ...rect(900, 150, 104, 64), kind: 'crate' },
    { ...rect(980, 560, 124, 72), kind: 'crate' },
    { ...rect(140, 420, 124, 54), kind: 'desk' },
    { ...rect(950, 350, 124, 54), kind: 'desk' },
    { ...rect(430, 110, 46, 46), kind: 'pillar' },
    { ...rect(820, 620, 46, 46), kind: 'pillar' },
  ];
  const shadows = [
    rect(240, 300, 150, 110),
    rect(850, 500, 170, 110),
    rect(590, 620, 150, 90),
  ];
  const loot = [
    { id: 'gold', label: 'Gold bars', x: 205, y: 640, taken: false },
    { id: 'cash', label: 'Cash stack', x: 1090, y: 235, taken: false },
    { id: 'ledger', label: 'Black ledger', x: 1060, y: 655, taken: false },
  ];
  return {
    walls,
    obstacles,
    shadows,
    loot,
    case: { x: 640, y: 372, r: 26 },
    door: rect(1145, 62, 90, 40),
    start: { x: 95, y: 705 },
    waypoints: {
      Mara: [
        { x: 210, y: 300 },
        { x: 210, y: 600 },
        { x: 430, y: 600 },
        { x: 430, y: 300 },
      ],
      Drex: [
        { x: 350, y: 655 },
        { x: 700, y: 655 },
        { x: 950, y: 655 },
      ],
      Vex: [
        { x: 1010, y: 180 },
        { x: 1010, y: 480 },
        { x: 1160, y: 480 },
        { x: 1160, y: 180 },
      ],
    },
    cameras: [
      { x: 640, y: 34, base: Math.PI / 2, amp: 0.85, speed: 0.5 },
      { x: 34, y: 400, base: 0, amp: 0.8, speed: 0.65 },
      { x: 1246, y: 400, base: Math.PI, amp: 0.8, speed: 0.55 },
    ],
  };
}

/** Every solid rectangle in the room, walls and furniture together. */
export function solids(level) {
  return level.walls.concat(level.obstacles);
}

/** True when the point lies inside the rectangle (edges count). */
export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** True when the point lies in any deep-shadow patch. */
export function inShadow(level, x, y) {
  for (const s of level.shadows) if (pointInRect(x, y, s)) return true;
  return false;
}

/** Push a circle out of a rectangle it overlaps; returns the corrected centre. */
export function resolveCircleRect(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return { x, y };
  if (d2 === 0) return { x: rect.x - r, y };
  const d = Math.sqrt(d2);
  return { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
}

/** Liang-Barsky: true when the segment crosses the rectangle. */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const edges = [
    [-dx, x1 - r.x],
    [dx, r.x + r.w - x1],
    [-dy, y1 - r.y],
    [dy, r.y + r.h - y1],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

/** True when nothing solid stands between the two points. */
export function hasLineOfSight(level, x1, y1, x2, y2) {
  for (const s of solids(level)) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return false;
  }
  return true;
}

/** Smallest signed turn from angle a to angle b, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when the target sits inside the watcher's cone and sight is clear. */
export function inVisionCone(level, ox, oy, facing, range, halfAngle, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return { seen: false, dist };
  if (dist < 1) return { seen: true, dist };
  if (Math.abs(angleDiff(facing, Math.atan2(dy, dx))) > halfAngle) return { seen: false, dist };
  if (!hasLineOfSight(level, ox, oy, tx, ty)) return { seen: false, dist };
  return { seen: true, dist };
}
