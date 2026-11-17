// Every tuning number and colour for Pump Tapper in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends on
// the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const COIN = {
  x: 440,
  y: 380,
  radius: 150,
  /** Pixels the coin squashes on a tap, before it springs back. */
  squash: 14,
};

/** The market-cap milestones: each one is a level, with its own name and flavour. */
export const MILESTONES = [
  { cap: 1_000, name: 'Pocket Change', tag: 'First $1K. The trenches notice.' },
  { cap: 10_000, name: 'Degen Darling', tag: '$10K. Group chats are waking up.' },
  { cap: 100_000, name: 'Micro Cap', tag: '$100K. Influencers start shilling.' },
  { cap: 1_000_000, name: 'Small Cap', tag: '$1M. Listings are calling.' },
  { cap: 10_000_000, name: 'Mid Cap', tag: '$10M. The charts look vertical.' },
  { cap: 100_000_000, name: 'Blue Chip', tag: '$100M. Exchanges are listing.' },
  { cap: 1_000_000_000, name: 'TO THE MOON', tag: '$1B. Pumpy is on the moon.' },
];

/** Hype is the game's clock: it drains, taps restore it, and zero ends the run. */
export const HYPE = {
  start: 72,
  max: 100,
  /** Base drain per second, plus a little more at each level. */
  drain: 0.32,
  drainPerLevel: 0.05,
  /** Hype a single tap restores. */
  perTap: 0.55,
  /** Below this the meter flashes a warning. */
  warning: 30,
};

/** Combo: taps inside the window build it; it multiplies tap earnings. */
export const COMBO = {
  window: 1.4,
  /** Multiplier gain per combo step, before the Combo Boost upgrade. */
  perStep: 0.02,
  maxSteps: 60,
};

/** The four upgrades, in shop order (keys 1-4). */
export const UPGRADES = [
  {
    id: 'power',
    key: '1',
    name: 'Stronger Tap',
    blurb: '+1 $PUMP per tap, every level.',
    baseCost: 50,
    growth: 1.6,
    effect: (level) => level,
  },
  {
    id: 'auto',
    key: '2',
    name: 'Auto-Tapper',
    blurb: '+1 $PUMP per second, every level.',
    baseCost: 120,
    growth: 1.7,
    effect: (level) => level,
  },
  {
    id: 'combo',
    key: '3',
    name: 'Combo Boost',
    blurb: 'Each combo step pays +0.01x more.',
    baseCost: 180,
    growth: 1.65,
    effect: (level) => level * 0.01,
  },
  {
    id: 'golden',
    key: '4',
    name: 'Golden Tap',
    blurb: '+2% chance a tap pays 10x.',
    baseCost: 350,
    growth: 1.8,
    effect: (level) => level * 0.02,
  },
];

/** Random events: how often one fires, and what each one does. */
export const EVENTS = {
  minGap: 13,
  maxGap: 26,
  pumpDuration: 10,
  fudDuration: 8,
  goldenDuration: 6,
  whaleHypeLoss: 12,
};

export const COLOURS = {
  bg: '#070d0a',
  bgGlow: '#0d1f14',
  panel: '#0f1f16',
  panelLine: '#1e3a28',
  text: '#e8fff0',
  dim: '#8fb89c',
  green: '#39ff6a',
  gold: '#ffd23f',
  goldDark: '#c9930a',
  red: '#ff4d5e',
  orange: '#ff9f2e',
  blue: '#4dc3ff',
  purple: '#c07bff',
};

export const BEST_KEY = 'pump-tapper-best-cap';
