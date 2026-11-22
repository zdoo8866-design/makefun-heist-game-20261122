// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between three screens: title, play and over (caught or escaped).
//
// ?seed=N fixes the guard spread. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_ESCAPED } from './world.js';
import { ACTION_CONFIRM, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best haul then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Fixed cosmetic clock, so the posed frame is identical every render.
  const fixedTime = 1.6;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, fixedTime);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (screen === SCREEN_TITLE) {
      if (input.consume(ACTION_CONFIRM)) {
        world.reset();
        screen = SCREEN_PLAY;
        input.clearPressed();
        status.textContent = 'Playing. Grab the loot and reach the van.';
      }
    } else if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, input.move(), input.sneak(), input.interact());
        if (events & (EVENT_CAUGHT | EVENT_ESCAPED)) {
          screen = SCREEN_OVER;
          if (world.state.loot > best) {
            best = world.state.loot;
            saveBest(best);
          }
          status.textContent =
            world.state.outcome === 'escaped'
              ? `Escaped with $${world.state.loot.toLocaleString('en-US')}.`
              : 'Caught. The heist is over.';
          break;
        }
      }
      if (input.consume(ACTION_RESTART)) {
        world.reset();
        input.clearPressed();
      }
    } else {
      if (input.consume(ACTION_RESTART) || input.consume(ACTION_CONFIRM)) {
        world.reset();
        screen = SCREEN_TITLE;
        input.clearPressed();
      }
    }
    renderer.draw(world.state, screen, best);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
