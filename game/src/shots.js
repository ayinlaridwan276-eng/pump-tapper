// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot, so the frame
// is what a short game really looks like and the same seed always gives the same frame.
// The start scene shows the title over a gently sparkling coin; the play scene taps steadily
// and buys whatever it can afford; the end scene never taps, so the hype drains and the run
// ends on the lose screen.
import { STEP } from './config.js';
import { COIN } from './config.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './state.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 40;
const END_LIMIT_SECONDS = 600;

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return
 * the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP);
    return { screen: SCREEN_TITLE };
  }
  world.start();
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let tapClock = 0;
  // The end scene plays first, then stops tapping: the hype drains and the run ends
  // on the lose screen with real stats, as a run that was actually played.
  const playSeconds = name === 'end' ? 25 : limit;
  for (let i = 0; i < limit / STEP; i += 1) {
    const state = world.state;
    if (state.screen !== SCREEN_PLAY) break;
    if (name === 'play' || i < playSeconds / STEP) {
      // Tap about five times a second, buy the cheapest affordable upgrade, and chase
      // the golden coin when one shows up.
      tapClock += STEP;
      if (state.golden) {
        world.tap(state.golden.x, state.golden.y);
        tapClock = 0;
      } else if (tapClock >= 0.2) {
        tapClock = 0;
        world.tap(COIN.x, COIN.y);
      }
      for (let u = 0; u < 4; u += 1) {
        const before = state.coins;
        world.buy(u);
        if (state.coins !== before) break;
      }
    }
    world.step(STEP);
  }
  const state = world.state;
  if (state.screen === SCREEN_WIN) return { screen: SCREEN_WIN };
  if (state.screen === SCREEN_LOSE) return { screen: SCREEN_LOSE };
  return { screen: SCREEN_PLAY };
}
