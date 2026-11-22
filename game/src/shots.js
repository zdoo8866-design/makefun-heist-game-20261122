// The screenshot scenes behind ?shot=start|play|end. Each one poses the real world in a
// fixed, seeded state and returns the screen to draw over it, so the frame is what the game
// really looks like and the same seed always gives the same frame. AI movement is paused in
// shot mode: only cosmetic sparkles shimmer, from a fixed clock.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { KIND_STAR } from './world.js';

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best haul to show.
 */
export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  if (name !== 'play' && name !== 'end') {
    // Title screen: the room posed with the thief at the entrance and the guards mid-patrol.
    s.thief.x = 640;
    s.thief.y = 690;
    s.thief.facing = -Math.PI / 2;
    poseGuards(s, 0.3);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Mid-game: three pieces already taken, the thief beside an open case near the vault
    // with the grab ring half full, one guard's cone sweeping close (thief just outside
    // it), alarm at ~35%, the vault door in view.
    const taken = ['gem-a', 'paint-a', 'gem-b'];
    for (const item of s.lootItems) {
      if (taken.includes(item.id)) item.taken = true;
    }
    s.pieces = 3;
    s.loot = 4500 + 3200 + 5500;
    s.thief.x = 560;
    s.thief.y = 440;
    s.thief.facing = -Math.PI / 2;
    s.nearLoot = s.lootItems.find((item) => item.id === 'gem-c');
    s.grabProgress = 0.55;
    s.alarm = 35;
    s.seenEver = true;
    s.time = 74;
    poseGuards(s, 0.62);
    // The nearest guard turns toward the thief, cone just short of catching them.
    const g = s.guards[0];
    g.x = 700;
    g.y = 420;
    g.facing = Math.atan2(s.thief.y - g.y, s.thief.x - g.x) + 0.5;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // End: escaped with the Midnight Star, the full haul, never spotted — the best ending.
  for (const item of s.lootItems) item.taken = true;
  s.pieces = s.totalPieces;
  s.loot = s.totalValue;
  s.hasStar = true;
  s.alarm = 12;
  s.seenEver = false;
  s.time = 214;
  s.over = true;
  s.outcome = 'escaped';
  s.thief.x = 640;
  s.thief.y = 712;
  s.thief.facing = Math.PI / 2;
  poseGuards(s, 0.85);
  return { screen: SCREEN_OVER, best: s.loot };
}

/** Place each guard part-way along its patrol loop (fraction f of the loop). */
function poseGuards(s, f) {
  for (const g of s.guards) {
    const loop = g.patrol;
    const total = loop.length;
    const pos = f * total;
    const i = Math.floor(pos) % total;
    const j = (i + 1) % total;
    const k = pos - Math.floor(pos);
    g.x = loop[i].x + (loop[j].x - loop[i].x) * k;
    g.y = loop[i].y + (loop[j].y - loop[i].y) * k;
    g.wp = j;
    g.facing = Math.atan2(loop[j].y - loop[i].y, loop[j].x - loop[i].x);
    g.moving = true;
  }
  // Cameras mid-sweep.
  for (const c of s.cameras) c.angle = c.base + 0.45;
}

export { KIND_STAR };
