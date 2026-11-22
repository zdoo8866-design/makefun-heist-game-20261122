// Every tuning number and colour in one place. The playfield is a fixed 1280x800 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 800 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** localStorage key for the best haul. */
export const BEST_KEY = 'midnight-vault-best-haul';

export const THIEF = {
  radius: 15,
  speed: 195,
  sneakSpeed: 112,
};

export const GUARD = {
  radius: 15,
  speed: 72,
  alertSpeed: 98,
  /** Vision cone length (sneak shortens it) and half-angle, in radians. */
  coneLength: 225,
  sneakConeLength: 150,
  coneHalfAngle: 0.62,
  touchDistance: 30,
};

export const CAMERA = {
  coneLength: 265,
  coneHalfAngle: 0.5,
  sweep: 0.65,
  sweepSpeed: 0.55,
};

export const ALARM = {
  riseGuard: 34,
  riseGuardSneak: 17,
  riseCamera: 30,
  riseCrack: 9,
  laserSpike: 25,
  decay: 13,
};

export const GRAB = { caseSeconds: 0.6, vaultSeconds: 2.5, range: 62 };

export const PALETTE = {
  floorA: '#1e2547',
  floorB: '#232c52',
  floorLine: '#2c3766',
  wall: '#3a4266',
  wallTop: '#4d5788',
  wallTrim: '#c9a24b',
  carpet: '#7a1f2b',
  carpetTrim: '#c9a24b',
  gold: '#e8b64c',
  goldBright: '#ffd97a',
  gem: '#7fe7ff',
  gemDeep: '#2b7fd4',
  red: '#ff4d5e',
  amber: '#ffb347',
  hud: '#0b0f22',
  text: '#f2ead8',
  muted: '#9aa3c7',
  thief: '#1f8f7a',
  thiefDark: '#0f5b4c',
  guard: '#2e4a7a',
  guardCap: '#1c2f52',
  cone: '255, 190, 90',
  coneSeen: '255, 77, 94',
  coneCam: '140, 200, 255',
};
