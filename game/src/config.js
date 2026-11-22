// Vaultbreak — The Meridian Job: every number the game balances on.
// One place for sizes, speeds, senses and scores, so tuning never means
// hunting literals through the simulation.
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const STEP = 1 / 60;

// The thief: a quick walk, a slow sneak that is harder to spot.
export const PLAYER_RADIUS = 14;
export const PLAYER_WALK = 185;
export const PLAYER_SNEAK = 92;

// Guards: patrol slow, chase fast, investigate in between. A walking thief
// outruns a chasing guard; a sneaking one does not.
export const GUARD_RADIUS = 15;
export const GUARD_PATROL_SPEED = 72;
export const GUARD_CHASE_SPEED = 152;
export const GUARD_INVESTIGATE_SPEED = 112;
export const GUARD_VISION_RANGE = 230;
export const GUARD_VISION_HALF_ANGLE = 0.56;
export const GUARD_SUSPICION_RATE = 60;
export const GUARD_SUSPICION_DECAY = 25;
export const GUARD_LOSE_SIGHT_SECONDS = 2.5;
export const GUARD_CATCH_DISTANCE = 28;

// Wall cameras: a sweeping red cone. EMP knocks every camera out at once.
export const CAMERA_RANGE = 270;
export const CAMERA_HALF_ANGLE = 0.44;
export const CAMERA_EMP_SECONDS = 6;

// The alarm: 0 to 100. Seen, it climbs; hidden, it cools. At 100 the vault
// locks down and the job is over.
export const ALARM_MAX = 100;
export const ALARM_GUARD_RATE = 26;
export const ALARM_CAMERA_RATE = 16;
export const ALARM_COOL_RATE = 8;
export const ALARM_SNEAK_FACTOR = 0.5;
export const ALARM_SHADOW_FACTOR = 0.5;
export const ALARM_DIAMOND_NOISE = 8;

// Tools: coins lure guards, EMP blinds cameras, E cracks the glass case.
export const COIN_COUNT = 3;
export const COIN_HEAR_RADIUS = 280;
export const EMP_COUNT = 2;
export const CRACK_SECONDS = 1.8;
export const CRACK_RADIUS = 78;

// Scoring: the diamond is the job, side loot is the bonus, speed pays.
export const SCORE_DIAMOND = 500;
export const SCORE_LOOT = 100;
export const SCORE_TIME_BASE = 400;
export const SCORE_TIME_PER_SECOND = 2;

// Look: night floor, brass loot, danger red, getaway green.
export const COLORS = {
  floorA: '#20242e',
  floorB: '#1b1f28',
  wall: '#3a4152',
  wallTop: '#4d566e',
  vaultWall: '#565064',
  crate: '#6b5433',
  crateTop: '#8a6f45',
  desk: '#4a3a2c',
  shadow: 'rgba(6, 8, 16, 0.55)',
  caseGlass: 'rgba(150, 210, 255, 0.28)',
  caseFrame: '#9fb4d8',
  diamond: '#bfe9ff',
  gold: '#f2c14e',
  cash: '#7fce6e',
  ledger: '#2c2c34',
  door: '#2fbf5a',
  doorGlow: 'rgba(47, 191, 90, 0.35)',
  guard: '#d84a4a',
  guardCone: 'rgba(255, 214, 90, 0.16)',
  guardConeHot: 'rgba(255, 90, 60, 0.28)',
  cameraCone: 'rgba(255, 60, 60, 0.15)',
  cameraBody: '#c94f4f',
  player: '#e8e4d8',
  playerHood: '#2e3440',
  coin: '#e8c85a',
  hud: '#e8e4d8',
  alarmLow: '#58c96b',
  alarmMid: '#f2c14e',
  alarmHigh: '#e5484d',
};
