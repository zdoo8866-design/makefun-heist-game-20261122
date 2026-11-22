// The museum: floor plan, loot, guards, cameras, lasers, and the rules that move them.
// All coordinates are in the 1280x800 logical field. Walls are axis-aligned rectangles;
// the thief and guards are circles that slide along them.
import { ALARM, CAMERA, FIELD, GRAB, GUARD, STEP, THIEF } from './config.js';

export const EVENT_CAUGHT = 1;
export const EVENT_ESCAPED = 2;
export const EVENT_GRAB = 4;

export const KIND_GEM = 'gem';
export const KIND_STATUE = 'statue';
export const KIND_PAINTING = 'painting';
export const KIND_STAR = 'star';

/** Walls: { x, y, w, h }. The vault door gap and gallery doorways are the holes. */
export const WALLS = [
  // Outer shell.
  { x: 30, y: 48, w: 1220, h: 14 },
  { x: 30, y: 756, w: 1220, h: 14 },
  { x: 30, y: 48, w: 14, h: 722 },
  { x: 1236, y: 48, w: 14, h: 722 },
  // Vault room (top centre): door gap x 600..680 at its bottom wall.
  { x: 500, y: 68, w: 14, h: 242 },
  { x: 766, y: 68, w: 14, h: 242 },
  { x: 500, y: 68, w: 280, h: 14 },
  { x: 500, y: 296, w: 100, h: 14 },
  { x: 680, y: 296, w: 100, h: 14 },
  // Gallery dividers (doorway gaps y 440..520).
  { x: 430, y: 310, w: 14, h: 130 },
  { x: 430, y: 520, w: 14, h: 100 },
  { x: 850, y: 310, w: 14, h: 130 },
  { x: 850, y: 520, w: 14, h: 100 },
  // Upper walls of the side galleries.
  { x: 30, y: 130, w: 470, h: 14 },
  { x: 780, y: 130, w: 470, h: 14 },
];

/** Loot: id, kind, x, y (interaction point), value, label, grab seconds. */
export const LOOT_DEFS = [
  { id: 'gem-a', kind: KIND_GEM, x: 200, y: 262, value: 4500, label: 'Sapphire', seconds: GRAB.caseSeconds },
  { id: 'statue-a', kind: KIND_STATUE, x: 300, y: 492, value: 8000, label: 'Gold Idol', seconds: GRAB.caseSeconds },
  { id: 'paint-a', kind: KIND_PAINTING, x: 82, y: 330, value: 3200, label: 'Portrait', seconds: GRAB.caseSeconds },
  { id: 'gem-b', kind: KIND_GEM, x: 1080, y: 262, value: 5500, label: 'Emerald', seconds: GRAB.caseSeconds },
  { id: 'statue-b', kind: KIND_STATUE, x: 980, y: 492, value: 7500, label: 'Bronze Horse', seconds: GRAB.caseSeconds },
  { id: 'paint-b', kind: KIND_PAINTING, x: 1198, y: 330, value: 3800, label: 'Landscape', seconds: GRAB.caseSeconds },
  { id: 'gem-c', kind: KIND_GEM, x: 560, y: 402, value: 6000, label: 'Ruby', seconds: GRAB.caseSeconds },
  { id: 'star', kind: KIND_STAR, x: 640, y: 172, value: 50000, label: 'The Midnight Star', seconds: GRAB.vaultSeconds },
];

export const VAN = { x: 640, y: 712, radius: 48 };
export const THIEF_START = { x: 640, y: 690 };
export const LASER = { y: 330, x0: 585, x1: 695 };

const GUARD_PATROLS = [
  [
    { x: 500, y: 420 },
    { x: 780, y: 420 },
    { x: 780, y: 560 },
    { x: 500, y: 560 },
  ],
  [
    { x: 150, y: 210 },
    { x: 350, y: 210 },
    { x: 350, y: 560 },
    { x: 150, y: 560 },
  ],
  [
    { x: 930, y: 210 },
    { x: 1130, y: 210 },
    { x: 1130, y: 560 },
    { x: 930, y: 560 },
  ],
];

const CAMERA_DEFS = [
  { x: 640, y: 84, base: Math.PI / 2, phase: 0 },
  { x: 1220, y: 420, base: Math.PI, phase: 1.7 },
];

function circleHitsWalls(x, y, r) {
  for (const w of WALLS) {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/** Move a circle, sliding along walls (axis-separated, so it never tunnels a corner). */
function moveCircle(body, dx, dy) {
  const nx = body.x + dx;
  if (!circleHitsWalls(nx, body.y, body.radius)) body.x = nx;
  const ny = body.y + dy;
  if (!circleHitsWalls(body.x, ny, body.radius)) body.y = ny;
  body.x = Math.max(30 + body.radius, Math.min(1250 - body.radius, body.x));
  body.y = Math.max(48 + body.radius, Math.min(770 - body.radius, body.y));
}

/** True when the segment a->b is blocked by any wall (vision line-of-sight). */
export function blockedByWall(ax, ay, bx, by) {
  for (const w of WALLS) {
    // Slab test: does the segment enter the rectangle?
    const dx = bx - ax;
    const dy = by - ay;
    let t0 = 0;
    let t1 = 1;
    let ok = true;
    for (const [p, q, lo, hi] of [
      [-dx, ax - w.x, w.x, w.x + w.w],
      [dx, w.x + w.w - ax, w.x, w.x + w.w],
      [-dy, ay - w.y, w.y, w.y + w.h],
      [dy, w.y + w.h - ay, w.y, w.y + w.h],
    ]) {
      void lo;
      void hi;
      if (p === 0) {
        if (q < 0) {
          ok = false;
          break;
        }
      } else {
        const t = q / p;
        if (p < 0) {
          if (t > t1) {
            ok = false;
            break;
          }
          if (t > t0) t0 = t;
        } else {
          if (t < t0) {
            ok = false;
            break;
          }
          if (t < t1) t1 = t;
        }
      }
    }
    if (ok && t0 <= t1) return true;
  }
  return false;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Is the thief inside this watcher's cone (range, angle, line of sight)? */
function inCone(watcher, range, halfAngle, thief, facing) {
  const dx = thief.x - watcher.x;
  const dy = thief.y - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 1 && Math.abs(angleDiff(Math.atan2(dy, dx), facing)) > halfAngle) return false;
  return !blockedByWall(watcher.x, watcher.y, thief.x, thief.y);
}

export function createWorld(random) {
  const state = freshState(random);
  return {
    state,
    reset() {
      const next = freshState(random);
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, next);
    },
    /**
     * Advance the world one fixed step. `move` is the player's push vector, `sneak` and
     * `interact` are held keys. Returns a bitmask of EVENT_* that fired this step.
     */
    step(dt, move, sneak, interact) {
      let events = 0;
      const s = state;
      if (s.over) return events;
      s.time += dt;

      // --- Thief movement.
      const speed = sneak ? THIEF.sneakSpeed : THIEF.speed;
      if (move.x !== 0 || move.y !== 0) {
        moveCircle(s.thief, move.x * speed * dt, move.y * speed * dt);
        s.thief.facing = Math.atan2(move.y, move.x);
        s.thief.moving = true;
      } else {
        s.thief.moving = false;
      }

      // --- Guards patrol their loops; they hurry when the alarm is high.
      const guardSpeed = s.alarm > 60 ? GUARD.alertSpeed : GUARD.speed;
      for (const g of s.guards) {
        const target = g.patrol[g.wp];
        const dx = target.x - g.x;
        const dy = target.y - g.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) {
          g.wp = (g.wp + 1) % g.patrol.length;
          continue;
        }
        const stepLen = Math.min(dist, guardSpeed * dt);
        g.x += (dx / dist) * stepLen;
        g.y += (dy / dist) * stepLen;
        g.facing = Math.atan2(dy, dx);
        g.moving = true;
      }

      // --- Cameras sweep.
      for (const c of s.cameras) {
        c.angle = c.base + Math.sin(s.time * CAMERA.sweepSpeed + c.phase) * CAMERA.sweep;
      }

      // --- Detection: guards and cameras raise the alarm; sneaking helps.
      let seen = false;
      for (const g of s.guards) {
        const range = sneak ? GUARD.sneakConeLength : GUARD.coneLength;
        g.alerted = inCone(g, range, GUARD.coneHalfAngle, s.thief, g.facing);
        if (g.alerted) {
          seen = true;
          s.alarm += (sneak ? ALARM.riseGuardSneak : ALARM.riseGuard) * dt;
        }
      }
      for (const c of s.cameras) {
        c.alerted = inCone(c, CAMERA.coneLength, CAMERA.coneHalfAngle, s.thief, c.angle);
        if (c.alerted) {
          seen = true;
          s.alarm += ALARM.riseCamera * dt;
        }
      }
      s.seen = seen;
      if (seen) s.seenEver = true;

      // --- Lasers across the vault doorway: crossing one spikes the alarm.
      const prevY = s.thiefPrevY;
      s.thiefPrevY = s.thief.y;
      if (s.laserCooldown > 0) s.laserCooldown -= dt;
      if (
        s.laserCooldown <= 0 &&
        s.thief.x > LASER.x0 &&
        s.thief.x < LASER.x1 &&
        ((prevY < LASER.y && s.thief.y >= LASER.y) || (prevY > LASER.y && s.thief.y <= LASER.y))
      ) {
        s.alarm += ALARM.laserSpike;
        s.laserCooldown = 2;
        s.laserFlash = 0.6;
      }
      if (s.laserFlash > 0) s.laserFlash -= dt;

      // --- Grabbing: hold E near loot; the vault takes longer and hums the alarm.
      const near = nearestLoot(s);
      s.nearLoot = near;
      if (interact && near) {
        s.grabProgress += dt / near.seconds;
        if (near.kind === KIND_STAR) s.alarm += ALARM.riseCrack * dt;
        if (s.grabProgress >= 1) {
          near.taken = true;
          s.loot += near.value;
          s.pieces += 1;
          if (near.kind === KIND_STAR) s.hasStar = true;
          s.grabProgress = 0;
          events |= EVENT_GRAB;
        }
      } else {
        s.grabProgress = 0;
      }

      // --- Alarm decay and the caught condition.
      if (!seen) s.alarm = Math.max(0, s.alarm - ALARM.decay * dt);
      s.alarm = Math.min(100, s.alarm);
      if (s.alarm >= 100) {
        s.over = true;
        s.outcome = 'caught';
        s.caughtBy = 'alarm';
        return events | EVENT_CAUGHT;
      }

      // --- A guard touching the thief catches them.
      for (const g of s.guards) {
        if (Math.hypot(g.x - s.thief.x, g.y - s.thief.y) < GUARD.touchDistance) {
          s.over = true;
          s.outcome = 'caught';
          s.caughtBy = 'guard';
          return events | EVENT_CAUGHT;
        }
      }

      // --- Escape: reach the van with loot.
      if (s.loot > 0 && Math.hypot(s.thief.x - VAN.x, s.thief.y - VAN.y) < VAN.radius) {
        s.over = true;
        s.outcome = 'escaped';
        return events | EVENT_ESCAPED;
      }
      return events;
    },
  };
}

function nearestLoot(s) {
  let best = null;
  let bestDist = GRAB.range;
  for (const item of s.lootItems) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - s.thief.x, item.y - s.thief.y);
    if (d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}

function freshState(random) {
  const lootItems = LOOT_DEFS.map((d) => ({ ...d, taken: false }));
  const guards = GUARD_PATROLS.map((patrol, i) => {
    // Stagger each guard along its loop so they are spread out at the start.
    const start = patrol[Math.floor(random() * patrol.length)];
    return {
      x: start.x,
      y: start.y,
      radius: GUARD.radius,
      patrol,
      wp: (patrol.indexOf(start) + 1) % patrol.length,
      facing: 0,
      alerted: false,
      moving: false,
      seed: i,
    };
  });
  const cameras = CAMERA_DEFS.map((c) => ({ ...c, angle: c.base, alerted: false }));
  return {
    time: 0,
    thief: { x: THIEF_START.x, y: THIEF_START.y, radius: THIEF.radius, facing: -Math.PI / 2, moving: false },
    thiefPrevY: THIEF_START.y,
    guards,
    cameras,
    lootItems,
    loot: 0,
    pieces: 0,
    totalPieces: LOOT_DEFS.length,
    totalValue: LOOT_DEFS.reduce((sum, d) => sum + d.value, 0),
    hasStar: false,
    alarm: 0,
    seen: false,
    seenEver: false,
    grabProgress: 0,
    nearLoot: null,
    laserCooldown: 0,
    laserFlash: 0,
    over: false,
    outcome: null,
    caughtBy: null,
  };
}

/** Rank line for the end screen, by haul and whether the crew was ever spotted. */
export function rankFor(state) {
  if (state.outcome !== 'escaped') return 'Busted';
  if (state.hasStar && !state.seenEver) return 'Ghost — unseen, star in hand';
  if (state.hasStar) return 'Legend of the Night';
  if (state.loot >= 30000) return 'Professional';
  if (state.loot >= 15000) return 'Smooth Operator';
  return 'Opportunist';
}

export { FIELD, STEP };
