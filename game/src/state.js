// The world: the whole simulation of Pump Tapper, with no DOM and no drawing in it. The
// renderer paints `world.state`, the input layer calls `tap`, `buy`, `start` and `pause`,
// and `step` advances everything in fixed 1/60 s slices. All randomness comes from the
// seeded stream the world was created with, so a seed replays the same run.
import { COIN, COMBO, EVENTS, HYPE, MILESTONES, UPGRADES } from './config.js';
import { baseTapPower, goldenChance, perSecond, upgradeCost } from './upgrades.js';
import { EVENT_FUD, EVENT_GOLDEN_COIN, EVENT_PUMP, EVENT_WHALE, eventDuration, nextEventDelay, pickEvent } from './events.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

export const FX_TAP = 'tap';
export const FX_GOLDEN = 'golden';
export const FX_BUY = 'buy';
export const FX_DENY = 'deny';
export const FX_LEVEL = 'level';
export const FX_EVENT = 'event';
export const FX_WIN = 'win';
export const FX_LOSE = 'lose';

function freshState() {
  return {
    screen: SCREEN_TITLE,
    time: 0,
    coins: 0,
    hype: HYPE.start,
    level: 0,
    combo: 0,
    comboTimer: 0,
    upgrades: [0, 0, 0, 0],
    eventKind: 'none',
    eventTimeLeft: 0,
    eventTimer: 8,
    golden: null,
    particles: [],
    floats: [],
    shake: 0,
    squash: 0,
    taps: 0,
    earned: 0,
    best: 0,
  };
}

export function createWorld(random) {
  const state = freshState();

  function spawnParticles(x, y, count, colour, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.next() * Math.PI * 2;
      const v = speed * (0.4 + random.next() * 0.8);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 60,
        life: 0.6 + random.next() * 0.4,
        maxLife: 1,
        size: 3 + random.next() * 5,
        colour,
      });
    }
  }

  function addFloat(x, y, text, colour, size) {
    state.floats.push({ x, y, text, colour, size: size ?? 26, life: 1, maxLife: 1 });
  }

  /** The best market cap is the run's own peak balance, tracked where coins change. */
  function noteBest() {
    if (state.coins > state.best) state.best = state.coins;
  }

  function fireEvent() {
    const kind = pickEvent(random);
    if (kind === EVENT_WHALE) {
      state.hype = Math.max(0, state.hype - EVENTS.whaleHypeLoss);
      state.shake = 1;
      state.eventKind = 'none';
      state.eventTimeLeft = 0;
      return [FX_EVENT];
    }
    state.eventKind = kind;
    state.eventTimeLeft = eventDuration(kind);
    if (kind === EVENT_GOLDEN_COIN) {
      let x = random.range(120, 720);
      let y = random.range(140, 620);
      const dx = x - COIN.x;
      const dy = y - COIN.y;
      if (Math.hypot(dx, dy) < COIN.radius + 90) {
        x = 1000 + random.range(0, 180);
        y = 140 + random.range(0, 180);
      }
      state.golden = { x, y, radius: 46, timeLeft: EVENTS.goldenDuration };
    }
    return [FX_EVENT];
  }

  function checkMilestone() {
    const fx = [];
    while (state.level < MILESTONES.length && state.coins >= MILESTONES[state.level].cap) {
      state.level += 1;
      spawnParticles(COIN.x, COIN.y, 40, '#ffd23f', 320);
      if (state.level >= MILESTONES.length) {
        state.screen = SCREEN_WIN;
        fx.push(FX_WIN);
        break;
      }
      fx.push(FX_LEVEL);
    }
    return fx;
  }

  return {
    state,

    reset() {
      // The best market cap survives a restart: it is the player's record, not the run.
      const best = state.best;
      const fresh = freshState();
      for (const key of Object.keys(fresh)) state[key] = fresh[key];
      state.best = best;
    },

    start() {
      if (state.screen === SCREEN_TITLE || state.screen === SCREEN_WIN || state.screen === SCREEN_LOSE) {
        if (state.screen !== SCREEN_TITLE) this.reset();
        state.screen = SCREEN_PLAY;
        return [FX_TAP];
      }
      return [];
    },

    togglePause() {
      if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSED;
      else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
      return [];
    },

    /** A tap at canvas coordinates (x, y). Returns the sound effects to play. */
    tap(x, y) {
      if (state.screen !== SCREEN_PLAY) return [];
      const fx = [];
      // The golden coin pays first when it is hit.
      if (state.golden) {
        const dx = x - state.golden.x;
        const dy = y - state.golden.y;
        if (Math.hypot(dx, dy) <= state.golden.radius + 14) {
          const bonus = 50 * baseTapPower(state.upgrades);
          state.coins += bonus;
          state.earned += bonus;
          noteBest();
          state.hype = Math.min(HYPE.max, state.hype + 8);
          state.golden = null;
          spawnParticles(x, y, 26, '#ffd23f', 360);
          addFloat(x, y - 20, `+${Math.floor(bonus)} GOLDEN!`, '#ffd23f', 34);
          state.shake = Math.max(state.shake, 0.5);
          fx.push(FX_GOLDEN);
          fx.push(...checkMilestone());
          return fx;
        }
      }
      const dx = x - COIN.x;
      const dy = y - COIN.y;
      if (Math.hypot(dx, dy) > COIN.radius + 18) return [];
      state.taps += 1;
      state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
      state.comboTimer = COMBO.window;
      const steps = Math.min(state.combo, COMBO.maxSteps);
      const comboMult = 1 + steps * (COMBO.perStep + state.upgrades[2] * 0.01);
      const golden = random.next() < goldenChance(state.upgrades);
      let earned = baseTapPower(state.upgrades) * comboMult;
      if (state.eventKind === EVENT_PUMP) earned *= 2;
      if (golden) earned *= 10;
      state.coins += earned;
      state.earned += earned;
      noteBest();
      state.hype = Math.min(HYPE.max, state.hype + HYPE.perTap);
      state.squash = COIN.squash;
      spawnParticles(x, y, 10, golden ? '#ffd23f' : '#39ff6a', 260);
      addFloat(
        x + random.range(-30, 30),
        y - COIN.radius - 10,
        `+${formatGain(earned)}`,
        golden ? '#ffd23f' : '#e8fff0',
        golden ? 34 : 26,
      );
      fx.push(golden ? FX_GOLDEN : FX_TAP);
      fx.push(...checkMilestone());
      return fx;
    },

    /** Buy the next level of upgrade `index`. Returns the sound effects to play. */
    buy(index) {
      if (state.screen !== SCREEN_PLAY) return [FX_DENY];
      const cost = upgradeCost(UPGRADES[index], state.upgrades[index]);
      if (state.coins < cost) return [FX_DENY];
      state.coins -= cost;
      state.upgrades[index] += 1;
      spawnParticles(1080, 240 + index * 96, 16, '#4dc3ff', 200);
      return [FX_BUY];
    },

    /** Advance the world by `dt` seconds. Returns the sound effects to play. */
    step(dt) {
      const fx = [];
      state.time += dt;
      state.shake = Math.max(0, state.shake - dt * 1.6);
      state.squash = Math.max(0, state.squash - dt * 90);
      for (let i = state.particles.length - 1; i >= 0; i -= 1) {
        const p = state.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 260 * dt;
        if (p.life <= 0) state.particles.splice(i, 1);
      }
      for (let i = state.floats.length - 1; i >= 0; i -= 1) {
        const f = state.floats[i];
        f.life -= dt * 0.9;
        f.y -= 46 * dt;
        if (f.life <= 0) state.floats.splice(i, 1);
      }
      if (state.screen === SCREEN_TITLE) {
        if (random.next() < dt * 2) {
          spawnParticles(
            COIN.x + random.range(-140, 140),
            COIN.y + random.range(-140, 140),
            1,
            '#ffd23f',
            40,
          );
        }
        return fx;
      }
      if (state.screen !== SCREEN_PLAY) return fx;
      // Passive income from the Auto-Tapper.
      const passive = perSecond(state.upgrades);
      if (passive > 0) {
        state.coins += passive * dt;
        state.earned += passive * dt;
        noteBest();
        fx.push(...checkMilestone());
        if (state.screen !== SCREEN_PLAY) return fx;
      }
      // Hype drains, faster at higher levels and three times as fast in a FUD storm.
      const drain = (HYPE.drain + HYPE.drainPerLevel * state.level) * (state.eventKind === EVENT_FUD ? 3 : 1);
      state.hype -= drain * dt;
      if (state.hype <= 0) {
        state.hype = 0;
        state.screen = SCREEN_LOSE;
        fx.push(FX_LOSE);
        return fx;
      }
      // Combo fades when the player stops tapping.
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) state.combo = 0;
      }
      // Events tick down, then the next one is scheduled.
      if (state.eventKind !== 'none') {
        state.eventTimeLeft -= dt;
        if (state.golden) {
          state.golden.timeLeft -= dt;
          if (state.golden.timeLeft <= 0) state.golden = null;
        }
        if (state.eventTimeLeft <= 0) {
          state.eventKind = 'none';
          if (state.golden) state.golden = null;
        }
      } else {
        state.eventTimer -= dt;
        if (state.eventTimer <= 0) {
          fx.push(...fireEvent());
          state.eventTimer = nextEventDelay(random);
        }
      }
      return fx;
    },
  };
}

/** A short gain label: 1234 becomes "1.23K" in the float, whole numbers stay whole. */
export function formatGain(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return String(Math.floor(value));
}
