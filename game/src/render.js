// All drawing: the museum, the crew, the vision cones, the HUD and the screens.
// The canvas is the 1280x800 logical field, scaled to fit the window with letterboxing.
import { FIELD, PALETTE } from './config.js';
import { LASER, LOOT_DEFS, VAN, WALLS, KIND_GEM, KIND_PAINTING, KIND_STAR, KIND_STATUE, rankFor } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(state, screen, best, cosmeticTime) {
    const t = cosmeticTime ?? state.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    drawRoom(state, t);
    drawLoot(state, t);
    drawLasers(state, t);
    drawVan(state);
    drawCones(state);
    drawGuards(state, t);
    drawThief(state, t);
    drawHud(state, screen);
    if (screen === SCREEN_TITLE) drawTitle(state, best, t);
    if (screen === SCREEN_OVER) drawEnd(state, t);
  }

  // ---- the room ------------------------------------------------------------
  function drawRoom(state, t) {
    // Checker marble floor.
    const tile = 64;
    for (let y = 48; y < 770; y += tile) {
      for (let x = 30; x < 1250; x += tile) {
        const even = ((x - 30) / tile + (y - 48) / tile) % 2 === 0;
        ctx.fillStyle = even ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, tile, tile);
      }
    }
    // Soft light pools under the ceiling spots.
    for (const [lx, ly, r] of [
      [200, 210, 190],
      [1080, 210, 190],
      [640, 120, 220],
      [640, 480, 260],
      [200, 600, 200],
      [1080, 600, 200],
    ]) {
      const g = ctx.createRadialGradient(lx, ly, 10, lx, ly, r);
      g.addColorStop(0, 'rgba(255, 196, 110, 0.13)');
      g.addColorStop(1, 'rgba(255, 196, 110, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    // Red carpet runners: entry hall up to the vault door, and both galleries.
    drawCarpet(600, 330, 80, 430); // central runner, hall to vault door
    drawCarpet(120, 200, 340, 60); // left gallery runner
    drawCarpet(820, 200, 340, 60); // right gallery runner
    drawCarpet(120, 500, 340, 60);
    drawCarpet(820, 500, 340, 60);
    // Walls with a gold trim line.
    for (const w of WALLS) {
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(w.x, w.y + 3, w.w, w.h - 3);
    }
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 2;
    for (const w of WALLS) ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    // Vault room: gold trim, heavy door frame, a beam of light over the pedestal.
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(500, 68, 280, 242);
    const beam = ctx.createLinearGradient(640, 82, 640, 240);
    beam.addColorStop(0, 'rgba(255, 217, 122, 0.20)');
    beam.addColorStop(1, 'rgba(255, 217, 122, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(600, 82);
    ctx.lineTo(680, 82);
    ctx.lineTo(720, 240);
    ctx.lineTo(560, 240);
    ctx.closePath();
    ctx.fill();
    // Ceiling spot lamps (small warm discs with a glow).
    for (const [lx, ly] of [[200, 210], [1080, 210], [640, 120], [640, 480], [200, 600], [1080, 600]]) {
      const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 26);
      g.addColorStop(0, 'rgba(255, 220, 150, 0.9)');
      g.addColorStop(1, 'rgba(255, 220, 150, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly, 26, 0, TAU);
      ctx.fill();
    }
    // Room labels, small and quiet.
    ctx.fillStyle = 'rgba(242, 234, 216, 0.5)';
    ctx.font = '600 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('E A S T   G A L L E R Y', 1080, 160);
    ctx.fillText('W E S T   G A L L E R Y', 200, 160);
    ctx.fillText('T H E   V A U L T', 640, 100);
    ctx.fillText('E N T R Y   H A L L', 640, 660);
    void t;
  }

  function drawCarpet(x, y, w, h) {
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PALETTE.carpetTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.fillStyle = 'rgba(201, 162, 75, 0.25)';
    ctx.fillRect(x, y, w, 4);
    ctx.fillRect(x, y + h - 4, w, 4);
  }

  // ---- loot ----------------------------------------------------------------
  function drawLoot(state, t) {
    for (const item of state.lootItems) {
      if (item.taken) continue;
      shadow(item.x, item.y, 34);
      if (item.kind === KIND_GEM || item.kind === KIND_STAR) drawGem(item, t);
      else if (item.kind === KIND_STATUE) drawStatue(item);
      else if (item.kind === KIND_PAINTING) drawPainting(item);
      // Value tag under each piece.
      ctx.fillStyle = 'rgba(242, 234, 216, 0.85)';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`$${item.value.toLocaleString('en-US')}`, item.x, item.y + 52);
    }
  }

  function drawGem(item, t) {
    const big = item.kind === KIND_STAR;
    const r = big ? 30 : 18;
    // Pedestal for the star; a case base for the rest.
    if (big) {
      ctx.fillStyle = '#2c2440';
      ctx.beginPath();
      ctx.ellipse(item.x, item.y + 34, 46, 12, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#4a3f6b';
      ctx.fillRect(item.x - 34, item.y + 22, 68, 16);
      ctx.fillStyle = PALETTE.wallTrim;
      ctx.fillRect(item.x - 34, item.y + 22, 68, 3);
    } else {
      ctx.fillStyle = '#3a2a1c';
      ctx.fillRect(item.x - 26, item.y + 12, 52, 14);
      ctx.fillStyle = '#5a4028';
      ctx.fillRect(item.x - 26, item.y + 12, 52, 3);
    }
    // Faceted gem: light and dark faces, a bright core, sparkles.
    const cx = item.x;
    const cy = item.y - (big ? 6 : 2);
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 2.4);
    glow.addColorStop(0, big ? 'rgba(127, 231, 255, 0.55)' : 'rgba(127, 231, 255, 0.28)');
    glow.addColorStop(1, 'rgba(127, 231, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.25);
    ctx.lineTo(cx + r * 0.6, cy + r * 0.8);
    ctx.lineTo(cx - r * 0.6, cy + r * 0.8);
    ctx.lineTo(cx - r * 0.85, cy - r * 0.25);
    ctx.closePath();
    ctx.fillStyle = big ? '#bfefff' : '#8fd8ff';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.25);
    ctx.lineTo(cx, cy + r * 0.2);
    ctx.closePath();
    ctx.fillStyle = '#5db8ef';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx - r * 0.85, cy - r * 0.25);
    ctx.lineTo(cx, cy + r * 0.2);
    ctx.closePath();
    ctx.fillStyle = '#2b7fd4';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Glass shine streak over the case.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r * 0.7);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.5);
    ctx.stroke();
    // Sparkles: seeded positions twinkling with the cosmetic clock.
    for (let i = 0; i < (big ? 6 : 3); i += 1) {
      const a = (i * 2.399 + 0.7) % TAU;
      const rr = r + 8 + ((i * 13) % 14);
      const sx = cx + Math.cos(a) * rr;
      const sy = cy + Math.sin(a) * rr;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.2 + i * 1.7));
      ctx.fillStyle = `rgba(255, 240, 180, ${tw.toFixed(2)})`;
      drawSparkle(sx, sy, 3 + tw * 3);
    }
    if (big) {
      ctx.fillStyle = PALETTE.goldBright;
      ctx.font = '700 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE MIDNIGHT STAR', cx, cy + 62);
    }
  }

  function drawStatue(item) {
    // Dark wood case base.
    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(item.x - 26, item.y + 12, 52, 14);
    ctx.fillStyle = '#5a4028';
    ctx.fillRect(item.x - 26, item.y + 12, 52, 3);
    // Gold silhouette: a little idol / horse-ish figure.
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(item.x, item.y - 16, 7, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(item.x - 5, item.y - 10);
    ctx.lineTo(item.x + 5, item.y - 10);
    ctx.lineTo(item.x + 9, item.y + 12);
    ctx.lineTo(item.x - 9, item.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillRect(item.x - 12, item.y + 12, 24, 3);
    // Glass shine.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(item.x - 14, item.y - 18);
    ctx.lineTo(item.x - 2, item.y + 10);
    ctx.stroke();
  }

  function drawPainting(item) {
    const onLeft = item.x < 640;
    const fx = onLeft ? item.x - 8 : item.x + 8;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(fx - 26, item.y - 34, 52, 68);
    ctx.fillStyle = '#1c2b4a';
    ctx.fillRect(fx - 21, item.y - 29, 42, 58);
    // Mini canvas art: a moon and hills.
    ctx.fillStyle = '#e8d27a';
    ctx.beginPath();
    ctx.arc(fx + 8, item.y - 14, 8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3f6db3';
    ctx.beginPath();
    ctx.moveTo(fx - 21, item.y + 29);
    ctx.lineTo(fx - 2, item.y + 2);
    ctx.lineTo(fx + 21, item.y + 29);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b4a7a';
    ctx.beginPath();
    ctx.moveTo(fx - 21, item.y + 29);
    ctx.lineTo(fx + 6, item.y + 8);
    ctx.lineTo(fx + 21, item.y + 29);
    ctx.closePath();
    ctx.fill();
  }

  // ---- lasers, van, cones, people ------------------------------------------
  function drawLasers(state, t) {
    const flash = state.laserFlash > 0;
    const alpha = flash ? 0.95 : 0.55 + 0.2 * Math.sin(t * 6);
    for (const ly of [LASER.y - 5, LASER.y + 5]) {
      ctx.strokeStyle = `rgba(255, 60, 80, ${alpha.toFixed(2)})`;
      ctx.lineWidth = flash ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(LASER.x0, ly);
      ctx.lineTo(LASER.x1, ly);
      ctx.stroke();
    }
    // Emitters on the vault door frame.
    ctx.fillStyle = '#8c1f2b';
    ctx.fillRect(LASER.x0 - 8, LASER.y - 10, 8, 20);
    ctx.fillRect(LASER.x1, LASER.y - 10, 8, 20);
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.arc(LASER.x0 - 4, LASER.y, 3, 0, TAU);
    ctx.arc(LASER.x1 + 4, LASER.y, 3, 0, TAU);
    ctx.fill();
  }

  function drawVan(state) {
    const { x, y } = VAN;
    shadow(x, y + 6, 52);
    // The getaway van, parked in the entry hall, nose pointing down.
    ctx.fillStyle = '#20263f';
    ctx.beginPath();
    ctx.roundRect(x - 46, y - 34, 92, 62, 10);
    ctx.fill();
    ctx.fillStyle = '#31406e';
    ctx.beginPath();
    ctx.roundRect(x - 40, y - 28, 80, 50, 8);
    ctx.fill();
    ctx.fillStyle = '#9fb6e8';
    ctx.beginPath();
    ctx.roundRect(x - 34, y + 8, 68, 16, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GETAWAY', x, y - 6);
    ctx.fillStyle = '#0b0f22';
    ctx.beginPath();
    ctx.arc(x - 28, y + 26, 7, 0, TAU);
    ctx.arc(x + 28, y + 26, 7, 0, TAU);
    ctx.fill();
    if (state.loot > 0 && !state.over) {
      const pulse = 0.6 + 0.4 * Math.sin(state.time * 4);
      ctx.fillStyle = `rgba(255, 217, 122, ${pulse.toFixed(2)})`;
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.fillText('▼  GET TO THE VAN  ▼', x, y - 46);
    }
  }

  function drawCone(x, y, facing, length, halfAngle, rgb, seen) {
    const grad = ctx.createRadialGradient(x, y, 8, x, y, length);
    grad.addColorStop(0, `rgba(${rgb}, ${seen ? 0.5 : 0.34})`);
    grad.addColorStop(0.75, `rgba(${rgb}, ${seen ? 0.22 : 0.13})`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, length, facing - halfAngle, facing + halfAngle);
    ctx.closePath();
    ctx.fill();
  }

  function drawCones(state) {
    for (const c of state.cameras) {
      drawCone(c.x, c.y, c.angle, 265, 0.5, PALETTE.coneCam, c.alerted);
    }
    for (const g of state.guards) {
      const range = g.alerted ? 225 : 225;
      drawCone(g.x, g.y, g.facing, range, 0.62, g.alerted ? PALETTE.coneSeen : PALETTE.cone, g.alerted);
    }
  }

  function drawGuards(state, t) {
    for (const g of state.guards) {
      shadow(g.x, g.y + 10, 20);
      const bob = g.moving ? Math.sin(t * 9 + g.seed * 2) * 1.5 : 0;
      // Uniformed body.
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob, 15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3d5f94';
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob, 9, 0, TAU);
      ctx.fill();
      // Cap with a brim pointing where they look.
      ctx.fillStyle = PALETTE.guardCap;
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob, 10, 0, TAU);
      ctx.fill();
      const bx = g.x + Math.cos(g.facing) * 12;
      const by = g.y + bob + Math.sin(g.facing) * 12;
      ctx.fillStyle = '#0e1a33';
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, TAU);
      ctx.fill();
      // Shoulder flashlight dot.
      ctx.fillStyle = g.alerted ? PALETTE.red : '#ffe9a8';
      ctx.beginPath();
      ctx.arc(g.x + Math.cos(g.facing) * 15, g.y + bob + Math.sin(g.facing) * 15, 2.5, 0, TAU);
      ctx.fill();
      if (g.alerted) {
        ctx.fillStyle = PALETTE.red;
        ctx.font = '700 18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - 24 + bob);
      }
    }
    // Cameras: wall mounts with a sweeping head.
    for (const c of state.cameras) {
      ctx.fillStyle = '#39415f';
      ctx.fillRect(c.x - 8, c.y - 8, 16, 16);
      ctx.fillStyle = '#20263f';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = c.alerted ? PALETTE.red : '#bfe3ff';
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(c.angle) * 9, c.y + Math.sin(c.angle) * 9, 3, 0, TAU);
      ctx.fill();
    }
  }

  function drawThief(state, t) {
    const th = state.thief;
    const bob = th.moving ? Math.sin(t * 11) * 1.5 : 0;
    shadow(th.x, th.y + 11, 20);
    // Loot sack, visibly fuller with each piece taken.
    if (state.pieces > 0) {
      const sackR = 7 + Math.min(6, state.pieces * 1.2);
      const sx = th.x - Math.cos(th.facing) * 18;
      const sy = th.y - Math.sin(th.facing) * 18;
      ctx.fillStyle = '#8a6b3a';
      ctx.beginPath();
      ctx.arc(sx, sy + bob, sackR, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#c9a24b';
      ctx.beginPath();
      ctx.arc(sx, sy + bob, sackR * 0.55, 0, TAU);
      ctx.fill();
    }
    // Dark teal body, mask stripe, direction nose.
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(th.x, th.y + bob, 15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.thiefDark;
    ctx.beginPath();
    ctx.arc(th.x, th.y + bob, 15, Math.PI * 0.15, Math.PI * 0.85);
    ctx.fill();
    ctx.fillStyle = '#0b0f22';
    ctx.beginPath();
    ctx.arc(th.x + Math.cos(th.facing) * 6, th.y + bob + Math.sin(th.facing) * 6, 4, 0, TAU);
    ctx.fill();
    // Hold-to-grab progress ring.
    if (state.grabProgress > 0 && state.nearLoot) {
      ctx.strokeStyle = 'rgba(242, 234, 216, 0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(th.x, th.y + bob, 24, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.goldBright;
      ctx.beginPath();
      ctx.arc(th.x, th.y + bob, 24, -Math.PI / 2, -Math.PI / 2 + state.grabProgress * TAU);
      ctx.stroke();
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.nearLoot.kind === KIND_STAR ? 'CRACKING…' : 'GRABBING…', th.x, th.y - 32 + bob);
    }
    // "Press E" hint when standing by loot.
    if (state.nearLoot && state.grabProgress === 0) {
      ctx.fillStyle = 'rgba(11, 15, 34, 0.85)';
      const label = `E — ${state.nearLoot.label}  $${state.nearLoot.value.toLocaleString('en-US')}`;
      ctx.font = '700 12px system-ui, sans-serif';
      const w = ctx.measureText(label).width + 16;
      ctx.beginPath();
      ctx.roundRect(th.x - w / 2, th.y - 52, w, 22, 6);
      ctx.fill();
      ctx.fillStyle = PALETTE.goldBright;
      ctx.textAlign = 'center';
      ctx.fillText(label, th.x, th.y - 37);
    }
  }

  // ---- HUD and screens -----------------------------------------------------
  function drawHud(state, screen) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, 46);
    ctx.fillStyle = PALETTE.wallTrim;
    ctx.fillRect(0, 46, FIELD.width, 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 17px Georgia, serif';
    ctx.fillText('MIDNIGHT VAULT', 18, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`LOOT  $${state.loot.toLocaleString('en-US')}`, 240, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`PIECES  ${state.pieces}/${state.totalPieces}`, 430, 30);
    // Alarm meter.
    const ax = 620;
    const aw = 300;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('🔔 ALARM', ax - 78, 30);
    ctx.fillStyle = '#1a2038';
    ctx.beginPath();
    ctx.roundRect(ax, 14, aw, 18, 9);
    ctx.fill();
    const frac = state.alarm / 100;
    const alarmColor = state.alarm > 60 ? PALETTE.red : state.alarm > 25 ? PALETTE.amber : PALETTE.gold;
    if (frac > 0) {
      ctx.fillStyle = alarmColor;
      ctx.beginPath();
      ctx.roundRect(ax, 14, Math.max(18, aw * frac), 18, 9);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(242, 234, 216, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(ax, 14, aw, 18, 9);
    ctx.stroke();
    // Clock and hint.
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 1262, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('WASD move · SHIFT sneak · E grab · R restart', 1060, 30);
    void screen;
  }

  function vignette() {
    const g = ctx.createRadialGradient(640, 400, 200, 640, 400, 720);
    g.addColorStop(0, 'rgba(5, 7, 15, 0)');
    g.addColorStop(1, 'rgba(5, 7, 15, 0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best, t) {
    ctx.fillStyle = 'rgba(5, 7, 15, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    vignette();
    const shimmer = 0.75 + 0.25 * Math.sin(t * 1.4);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255, 217, 122, ${shimmer.toFixed(2)})`;
    ctx.font = '700 15px Georgia, serif';
    ctx.fillText('A  TOP-DOWN  STEALTH  HEIST', 640, 238);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 84px Georgia, serif';
    ctx.fillText('MIDNIGHT', 640, 330);
    ctx.fillText('VAULT', 640, 414);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(420, 448);
    ctx.lineTo(860, 448);
    ctx.stroke();
    ctx.fillStyle = PALETTE.goldBright;
    ctx.font = 'italic 21px Georgia, serif';
    ctx.fillText('Slip past the guards. Crack the vault. Take the Midnight Star.', 640, 486);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — move      SHIFT — sneak      E — grab loot (hold)', 640, 540);
    ctx.fillText('Dodge the vision cones and the cameras. Reach the van to escape.', 640, 570);
    const pulse = 0.65 + 0.35 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(242, 234, 216, ${pulse.toFixed(2)})`;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('—  CLICK  or  PRESS  ENTER  TO  START  —', 640, 632);
    if (best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillText(`Best haul: $${best.toLocaleString('en-US')}`, 640, 668);
    }
    void state;
  }

  function drawEnd(state, t) {
    ctx.fillStyle = 'rgba(5, 7, 15, 0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    vignette();
    const escaped = state.outcome === 'escaped';
    ctx.textAlign = 'center';
    ctx.fillStyle = escaped ? PALETTE.goldBright : PALETTE.red;
    ctx.font = '700 64px Georgia, serif';
    ctx.fillText(escaped ? 'CLEAN GETAWAY' : 'BUSTED', 640, 300);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText(
      escaped
        ? state.hasStar
          ? 'The Midnight Star is yours. The museum never saw a thing.'
          : 'You slipped out into the night — lighter, but alive.'
        : state.caughtBy === 'guard'
          ? 'A guard got a hand on your shoulder. The night is over.'
          : 'The alarm hit the roof and the doors slammed shut.',
      640,
      350,
    );
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 26px Georgia, serif';
    ctx.fillText(`HAUL  $${state.loot.toLocaleString('en-US')}  ·  ${state.pieces}/${state.totalPieces} pieces`, 640, 420);
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText(`Time ${mins}:${String(secs).padStart(2, '0')}   ·   ${state.seenEver ? 'Spotted' : 'Never seen'}`, 640, 456);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.font = '700 24px Georgia, serif';
    ctx.fillText(`RANK — ${rankFor(state)}`, 640, 506);
    const pulse = 0.65 + 0.35 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(242, 234, 216, ${pulse.toFixed(2)})`;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('Press R or click to run it again', 640, 580);
  }

  function shadow(x, y, r) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.32, 0, 0, TAU);
    ctx.fill();
  }

  function drawSparkle(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.3, y - size * 0.3);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size * 0.3, y + size * 0.3);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.3, y + size * 0.3);
    ctx.lineTo(x - size, y);
    ctx.lineTo(x - size * 0.3, y - size * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  return { draw };
}
