// Every pixel Pump Tapper shows: the coin with its face, the HUD, the shop, the hype and
// market-cap meters, the particles and floating gains, and the title, pause, win and lose
// screens. All art is drawn on the canvas here — no images, no fonts fetched, nothing
// loaded over the network. The playfield is the fixed 1280x720 logical area from config.js,
// scaled to the window with letterboxing.
import { COIN, COLOURS, COMBO, FIELD, HYPE, MILESTONES } from './config.js';
import { EVENT_INFO } from './events.js';
import { shopEntries } from './upgrades.js';
import { SCREEN_LOSE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, formatGain } from './state.js';
import { createRandom } from './random.js';


/** Short money label: 1234567 becomes "$1.23M", small amounts stay whole. */
export function formatCoins(value) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${Math.floor(value)}`;
}

function formatRate(value) {
  if (value >= 100) return formatCoins(value);
  if (value >= 10) return `$${value.toFixed(1)}`;
  return `$${value.toFixed(2)}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  // Fixed stars, so every run paints the same sky.
  const stars = [];
  const starRandom = createRandom(20261117);
  for (let i = 0; i < 90; i += 1) {
    stars.push({
      x: starRandom.range(0, FIELD.width),
      y: starRandom.range(0, FIELD.height),
      r: starRandom.range(0.6, 2.2),
      twinkle: starRandom.range(0, Math.PI * 2),
    });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  function frame(state) {
    resize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    const scale = Math.min(w / FIELD.width, h / FIELD.height);
    const ox = (w - FIELD.width * scale) / 2;
    const oy = (h - FIELD.height * scale) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLOURS.bg;
    ctx.fillRect(0, 0, w, h);
    const shakeX = state.shake > 0 ? Math.sin(state.time * 71) * state.shake * 9 : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.time * 89) * state.shake * 9 : 0;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + shakeX * scale), dpr * (oy + shakeY * scale));
    drawScene(state);
  }

  function drawScene(state) {
    drawBackground(state);
    if (state.screen === SCREEN_TITLE) {
      drawCoin(state, true);
      drawTitle(state);
    } else {
      drawCoin(state, false);
      drawGoldenCoin(state);
      drawHud(state);
      drawShop(state);
      drawMeters(state);
      drawCombo(state);
      drawEventBanner(state);
      drawParticles(state);
      drawFloats(state);
      if (state.screen === SCREEN_PAUSED) drawPaused();
      if (state.screen === SCREEN_WIN) drawEnd(state, true);
      if (state.screen === SCREEN_LOSE) drawEnd(state, false);
    }
    if (state.screen === SCREEN_TITLE) {
      drawParticles(state);
      drawFloats(state);
    }
  }

  function drawBackground(state) {
    const glow = ctx.createRadialGradient(640, 300, 60, 640, 360, 760);
    glow.addColorStop(0, COLOURS.bgGlow);
    glow.addColorStop(1, COLOURS.bg);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      const alpha = 0.35 + 0.3 * Math.sin(state.time * 1.5 + star.twinkle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#cfe8d4';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Faint chart candles along the bottom, the market's own wallpaper.
    ctx.strokeStyle = 'rgba(57, 255, 106, 0.07)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let x = 0;
    let y = 690;
    ctx.moveTo(x, y);
    while (x < FIELD.width) {
      x += 46;
      y = 690 - ((x * 37) % 90);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawCoin(state, titleMode) {
    const bob = titleMode ? Math.sin(state.time * 1.6) * 12 : 0;
    const cx = COIN.x;
    const cy = COIN.y + bob;
    const squash = state.squash / COIN.radius;
    const r = COIN.radius;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1 + squash * 0.35, 1 - squash * 0.35);
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffe98a');
    grad.addColorStop(0.55, COLOURS.gold);
    grad.addColorStop(1, COLOURS.goldDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#8a5f00';
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, r - 16, 0, Math.PI * 2);
    ctx.stroke();
    // The face: eyes that widen with the combo, a grin, and the $ in the middle.
    const excited = Math.min(state.combo, 30) / 30;
    const eyeH = 26 - excited * 12;
    ctx.fillStyle = '#241a00';
    ctx.beginPath();
    ctx.ellipse(-48, -58, 15, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(48, -58, 15, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-44, -64, 5, 0, Math.PI * 2);
    ctx.arc(52, -64, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#241a00';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 42, 52 - excited * 10, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = '#241a00';
    ctx.font = '900 96px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 6);
    ctx.restore();
  }

  function drawTitle(state) {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOURS.gold;
    ctx.font = '900 84px "Arial Black", Arial, sans-serif';
    ctx.fillText('PUMP TAPPER', FIELD.width / 2, 92);
    ctx.fillStyle = COLOURS.text;
    ctx.font = '700 30px Arial, sans-serif';
    ctx.fillText('Tap the $PUMP coin. Ride the hype. Reach $1B.', FIELD.width / 2, 140);
    ctx.fillStyle = COLOURS.dim;
    ctx.font = '400 22px Arial, sans-serif';
    ctx.fillText('Click the coin or press SPACE to tap  ·  Keys 1-4 buy upgrades', FIELD.width / 2, 620);
    ctx.fillText('If the hype hits zero, the run is rugged. Press ENTER to start.', FIELD.width / 2, 652);
    if (state.best > 0) {
      ctx.fillStyle = COLOURS.gold;
      ctx.font = '700 24px Arial, sans-serif';
      ctx.fillText(`Best market cap: ${formatCoins(state.best)}`, FIELD.width / 2, 180);
    }
    drawStartButton();
  }

  function drawStartButton() {
    ctx.fillStyle = COLOURS.green;
    roundRect(490, 540, 300, 58, 12);
    ctx.fill();
    ctx.fillStyle = '#04120a';
    ctx.font = '900 30px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', 640, 570);
  }

  function drawHud(state) {
    ctx.fillStyle = COLOURS.panel;
    ctx.fillRect(0, 0, FIELD.width, 64);
    ctx.strokeStyle = COLOURS.panelLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 64);
    ctx.lineTo(FIELD.width, 64);
    ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOURS.gold;
    ctx.font = '900 40px "Arial Black", Arial, sans-serif';
    ctx.fillText(formatCoins(state.coins), 24, 34);
    ctx.fillStyle = COLOURS.dim;
    ctx.font = '400 20px Arial, sans-serif';
    ctx.fillText('$PUMP market cap', 24, 56);
    const perTap = (1 + state.upgrades[0]) * (1 + Math.min(state.combo, COMBO.maxSteps) * (COMBO.perStep + state.upgrades[2] * 0.01));
    ctx.fillStyle = COLOURS.text;
    ctx.font = '700 22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`per tap ${formatRate(perTap)}   ·   per sec ${formatRate(state.upgrades[1])}`, 640, 34);
    const levelName = state.level >= MILESTONES.length ? 'TO THE MOON' : MILESTONES[state.level].name;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLOURS.green;
    ctx.font = '900 24px "Arial Black", Arial, sans-serif';
    ctx.fillText(`LVL ${state.level} · ${levelName}`, FIELD.width - 24, 34);
  }

  function drawMeters(state) {
    // Market-cap progress to the next milestone.
    const next = state.level < MILESTONES.length ? MILESTONES[state.level] : null;
    const prevCap = state.level === 0 ? 0 : MILESTONES[state.level - 1].cap;
    const progress = next ? Math.min(1, (state.coins - prevCap) / (next.cap - prevCap)) : 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLOURS.dim;
    ctx.font = '700 18px Arial, sans-serif';
    ctx.fillText(next ? `Next: ${next.name} at ${formatCoins(next.cap)}` : 'Moon reached!', 24, 600);
    ctx.fillStyle = '#12261a';
    roundRect(24, 616, 740, 18, 9);
    ctx.fill();
    ctx.fillStyle = COLOURS.gold;
    if (progress > 0) {
      roundRect(24, 616, Math.max(18, 740 * progress), 18, 9);
      ctx.fill();
    }
    // Hype meter.
    const hypeColour = state.hype < HYPE.warning ? COLOURS.red : state.hype < 55 ? COLOURS.orange : COLOURS.green;
    ctx.fillStyle = COLOURS.dim;
    ctx.font = '700 18px Arial, sans-serif';
    ctx.fillText('HYPE', 24, 662);
    ctx.fillStyle = '#12261a';
    roundRect(96, 650, 668, 22, 11);
    ctx.fill();
    ctx.fillStyle = hypeColour;
    if (state.hype > 0) {
      roundRect(96, 650, Math.max(22, 668 * (state.hype / HYPE.max)), 22, 11);
      ctx.fill();
    }
    ctx.fillStyle = COLOURS.text;
    ctx.font = '900 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(state.hype)}%`, 96 + 668 / 2, 662);
    if (state.hype < HYPE.warning && state.screen === SCREEN_PLAY) {
      ctx.fillStyle = Math.sin(state.time * 8) > 0 ? COLOURS.red : COLOURS.orange;
      ctx.font = '900 22px "Arial Black", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HYPE DYING — TAP!', 24, 702);
    }
  }

  function drawShop(state) {
    const entries = shopEntries(state.upgrades, state.coins);
    const panelH = 48 + 4 * (SHOP_PANEL.cardHeight + SHOP_PANEL.gap) + 32;
    ctx.fillStyle = COLOURS.panel;
    roundRect(SHOP_PANEL.x, SHOP_PANEL.y, SHOP_PANEL.width, panelH, 14);
    ctx.fill();
    ctx.strokeStyle = COLOURS.panelLine;
    ctx.lineWidth = 2;
    roundRect(SHOP_PANEL.x, SHOP_PANEL.y, SHOP_PANEL.width, panelH, 14);
    ctx.stroke();
    ctx.fillStyle = COLOURS.text;
    ctx.font = '900 24px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('UPGRADES', SHOP_PANEL.x + 20, SHOP_PANEL.y + 26);
    entries.forEach((entry, i) => {
      const y = SHOP_PANEL.y + 48 + i * (SHOP_PANEL.cardHeight + SHOP_PANEL.gap);
      ctx.fillStyle = entry.affordable ? '#14291b' : '#0c1710';
      roundRect(SHOP_PANEL.x + 12, y, SHOP_PANEL.width - 24, SHOP_PANEL.cardHeight, 10);
      ctx.fill();
      ctx.strokeStyle = entry.affordable ? COLOURS.green : COLOURS.panelLine;
      ctx.lineWidth = entry.affordable ? 2 : 1;
      roundRect(SHOP_PANEL.x + 12, y, SHOP_PANEL.width - 24, SHOP_PANEL.cardHeight, 10);
      ctx.stroke();
      ctx.fillStyle = COLOURS.gold;
      ctx.font = '900 22px "Arial Black", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`[${entry.upgrade.key}]`, SHOP_PANEL.x + 28, y + 26);
      ctx.fillStyle = COLOURS.text;
      ctx.font = '900 22px Arial, sans-serif';
      ctx.fillText(entry.upgrade.name, SHOP_PANEL.x + 78, y + 26);
      ctx.fillStyle = COLOURS.dim;
      ctx.font = '400 17px Arial, sans-serif';
      ctx.fillText(entry.upgrade.blurb, SHOP_PANEL.x + 28, y + 54);
      ctx.fillStyle = entry.affordable ? COLOURS.green : COLOURS.dim;
      ctx.font = '900 20px Arial, sans-serif';
      ctx.fillText(`Cost ${formatCoins(entry.cost)}`, SHOP_PANEL.x + 28, y + 84);
      ctx.textAlign = 'right';
      ctx.fillStyle = COLOURS.blue;
      ctx.font = '900 22px Arial, sans-serif';
      ctx.fillText(`LVL ${entry.level}`, SHOP_PANEL.x + SHOP_PANEL.width - 28, y + 26);
    });
    ctx.fillStyle = COLOURS.dim;
    ctx.font = '400 17px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Click a card or press 1-4 to buy.  P pauses, M mutes.', SHOP_PANEL.x + 20, SHOP_PANEL.y + panelH - 14);
  }

  function drawCombo(state) {
    if (state.combo < 3 || state.screen !== SCREEN_PLAY) return;
    const mult = 1 + Math.min(state.combo, COMBO.maxSteps) * (COMBO.perStep + state.upgrades[2] * 0.01);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOURS.orange;
    ctx.font = '900 34px "Arial Black", Arial, sans-serif';
    ctx.fillText(`COMBO x${state.combo}  ·  ${mult.toFixed(2)}x`, COIN.x, 148);
    ctx.fillStyle = '#12261a';
    roundRect(COIN.x - 110, 164, 220, 10, 5);
    ctx.fill();
    ctx.fillStyle = COLOURS.orange;
    roundRect(COIN.x - 110, 164, 220 * (state.comboTimer / COMBO.window), 10, 5);
    ctx.fill();
  }

  /** The golden coin event target: a smaller pulsing coin, worth 50x a tap. */
  function drawGoldenCoin(state) {
    const g = state.golden;
    if (!g) return;
    const pulse = 1 + Math.sin(state.time * 6) * 0.08;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = COLOURS.gold;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(state.time * 6);
    ctx.beginPath();
    ctx.arc(0, 0, g.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const grad = ctx.createRadialGradient(-14, -16, 4, 0, 0, g.radius);
    grad.addColorStop(0, '#fff3b0');
    grad.addColorStop(0.6, COLOURS.gold);
    grad.addColorStop(1, COLOURS.goldDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#8a5f00';
    ctx.stroke();
    ctx.fillStyle = '#241a00';
    ctx.font = '900 44px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 2);
    ctx.restore();
  }

  function drawEventBanner(state) {
    if (state.eventKind === 'none' || state.screen !== SCREEN_PLAY) return;
    const info = EVENT_INFO[state.eventKind];
    const seconds = Math.ceil(state.eventTimeLeft);
    const text = `${info.name} — ${info.blurb} (${seconds}s)`;
    ctx.font = '900 20px "Arial Black", Arial, sans-serif';
    const textWidth = ctx.measureText(text).width;
    // Centred over the coin, clear of the shop panel on the right.
    const pillWidth = Math.min(740, textWidth + 44);
    const pillX = COIN.x - pillWidth / 2;
    ctx.fillStyle = info.colour;
    roundRect(pillX, 74, pillWidth, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#0a0f0a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, COIN.x, 97);
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats(state) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of state.floats) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.colour;
      ctx.font = `900 ${f.size}px "Arial Black", Arial, sans-serif`;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(4, 10, 6, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = COLOURS.text;
    ctx.font = '900 56px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 20);
    ctx.fillStyle = COLOURS.dim;
    ctx.font = '400 22px Arial, sans-serif';
    ctx.fillText('Press P or click to resume', FIELD.width / 2, FIELD.height / 2 + 30);
  }

  function drawEnd(state, won) {
    ctx.fillStyle = 'rgba(4, 10, 6, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = won ? COLOURS.gold : COLOURS.red;
    ctx.font = '900 72px "Arial Black", Arial, sans-serif';
    ctx.fillText(won ? 'TO THE MOON!' : 'RUG PULLED', FIELD.width / 2, 250);
    ctx.fillStyle = COLOURS.text;
    ctx.font = '700 28px Arial, sans-serif';
    ctx.fillText(
      won
        ? 'You took $PUMP to a $1B market cap. Pumpy is on the moon.'
        : `The hype died at ${formatCoins(state.coins)}. The trenches move on.`,
      FIELD.width / 2,
      320,
    );
    ctx.fillStyle = COLOURS.dim;
    ctx.font = '400 22px Arial, sans-serif';
    ctx.fillText(
      `Taps: ${state.taps}   ·   Earned: ${formatCoins(state.earned)}   ·   Time: ${Math.floor(state.time)}s   ·   Best: ${formatCoins(state.best)}`,
      FIELD.width / 2,
      368,
    );
    ctx.fillStyle = COLOURS.green;
    roundRect(490, 420, 300, 58, 12);
    ctx.fill();
    ctx.fillStyle = '#04120a';
    ctx.font = '900 30px "Arial Black", Arial, sans-serif';
    ctx.fillText('PLAY AGAIN (R)', 640, 450);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { draw: frame };
}

/** Click targets the input layer uses, in logical coordinates. */
export const START_BUTTON = { x: 490, y: 540, width: 300, height: 58 };
export const RESTART_BUTTON = { x: 490, y: 420, width: 300, height: 58 };
export const SHOP_PANEL = { x: 800, y: 96, width: 448, cardHeight: 108, gap: 12 };
