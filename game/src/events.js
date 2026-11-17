// Random events: the surprises that keep a run alive or kill it. The scheduler picks the
// next event from the seeded random stream; each event is a timed effect on the world, with
// a name and a colour for the banner.
import { EVENTS } from './config.js';

export const EVENT_NONE = 'none';
export const EVENT_PUMP = 'pump';
export const EVENT_FUD = 'fud';
export const EVENT_GOLDEN_COIN = 'golden';
export const EVENT_WHALE = 'whale';

export const EVENT_INFO = {
  [EVENT_PUMP]: { name: 'PUMP EVENT', blurb: 'Earnings x2!', colour: '#39ff6a' },
  [EVENT_FUD]: { name: 'FUD STORM', blurb: 'Hype drains fast — keep tapping!', colour: '#ff4d5e' },
  [EVENT_GOLDEN_COIN]: { name: 'GOLDEN COIN!', blurb: 'Tap it for a 50x bonus!', colour: '#ffd23f' },
  [EVENT_WHALE]: { name: 'WHALE DUMP', blurb: 'A whale sold. Hype took a hit.', colour: '#ff9f2e' },
};

/** Seconds until the next event, drawn from the world's random stream. */
export function nextEventDelay(random) {
  return random.range(EVENTS.minGap, EVENTS.maxGap);
}

/** Which event fires next: pump and FUD are common, the golden coin and the whale rarer. */
export function pickEvent(random) {
  const roll = random.next();
  if (roll < 0.3) return EVENT_PUMP;
  if (roll < 0.58) return EVENT_FUD;
  if (roll < 0.8) return EVENT_GOLDEN_COIN;
  return EVENT_WHALE;
}

/** How long a timed event lasts, in seconds (0 for the instant whale dump). */
export function eventDuration(kind) {
  if (kind === EVENT_PUMP) return EVENTS.pumpDuration;
  if (kind === EVENT_FUD) return EVENTS.fudDuration;
  if (kind === EVENT_GOLDEN_COIN) return EVENTS.goldenDuration;
  return 0;
}
