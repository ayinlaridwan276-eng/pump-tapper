// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, win and lose.
//
// ?seed=N fixes the random events. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { FX_BUY, FX_DENY, FX_EVENT, FX_GOLDEN, FX_LEVEL, FX_LOSE, FX_TAP, FX_WIN, createWorld } from './state.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { isMuted, playEffect, setMuted, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
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
    return Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function announce(text) {
  if (status) status.textContent = text;
}

/** Play the sounds for a world's effects, and keep the best market cap saved. */
function handleFx(fx, state) {
  for (const effect of fx) {
    if (effect === FX_TAP) playEffect('tap', state.combo);
    else if (effect === FX_GOLDEN) playEffect('golden', state.combo);
    else if (effect === FX_BUY) playEffect('buy', 0);
    else if (effect === FX_DENY) playEffect('deny', 0);
    else if (effect === FX_LEVEL) playEffect('level', 0);
    else if (effect === FX_EVENT) playEffect('event', 0);
    else if (effect === FX_WIN) playEffect('win', 0);
    else if (effect === FX_LOSE) playEffect('lose', 0);
  }
  if (state.coins > state.best) {
    state.best = state.coins;
    saveBest(state.best);
  }
}

function runShot(name) {
  world.state.best = readBest();
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  void scene;
}

function runGame() {
  world.state.best = readBest();
  let screen = world.state.screen;
  let accumulator = 0;
  let last = performance.now();

  const input = createInput(canvas, {
    screen: () => world.state.screen,
    gesture: () => unlockAudio(),
    tap: (x, y) => handleFx(world.tap(x, y), world.state),
    start: () => {
      const fx = world.start();
      handleFx(fx, world.state);
      announce('Playing Pump Tapper. Tap the coin to earn $PUMP.');
    },
    restart: () => {
      world.reset();
      world.state.best = readBest();
      const fx = world.start();
      handleFx(fx, world.state);
      announce('New run. Tap the coin to earn $PUMP.');
    },
    buy: (index) => handleFx(world.buy(index), world.state),
    pause: () => {
      world.togglePause();
      announce(world.state.screen === 'paused' ? 'Paused.' : 'Playing.');
    },
    resume: () => {
      world.togglePause();
      announce('Playing.');
    },
    mute: () => {
      setMuted(!isMuted());
      announce(isMuted() ? 'Sound muted.' : 'Sound on.');
    },
  });
  void input;

  function frame(now) {
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const fx = world.step(STEP);
      handleFx(fx, world.state);
      screen = world.state.screen;
    }
    renderer.draw(world.state);
    void screen;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
