// Input: the pointer and the keyboard, translated into game actions. The canvas fills the
// window while the game draws in the fixed 1280x720 logical area, so pointer positions are
// converted back through the same letterbox transform the renderer uses.
import { COIN, FIELD } from './config.js';
import { RESTART_BUTTON, SHOP_PANEL } from './render.js';

/**
 * Wire the canvas and the keyboard to the game. `actions` is what the main loop passes in:
 * tap(x, y), start(), restart(), buy(index), pause(), resume(), mute(), and gesture()
 * (called on any real input, so audio can unlock).
 */
export function createInput(canvas, actions) {
  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const ox = (rect.width - FIELD.width * scale) / 2;
    const oy = (rect.height - FIELD.height * scale) / 2;
    return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
  }

  function inside(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  function shopIndexAt(point) {
    if (point.x < SHOP_PANEL.x || point.x > SHOP_PANEL.x + SHOP_PANEL.width) return -1;
    for (let i = 0; i < 4; i += 1) {
      const y = SHOP_PANEL.y + 48 + i * (SHOP_PANEL.cardHeight + SHOP_PANEL.gap);
      if (point.y >= y && point.y <= y + SHOP_PANEL.cardHeight) return i;
    }
    return -1;
  }

  function onPointer(clientX, clientY) {
    actions.gesture();
    const point = toLogical(clientX, clientY);
    const screen = actions.screen();
    if (screen === 'title') {
      // Any click on the title screen starts the run.
      actions.start();
      return;
    }
    if (screen === 'win' || screen === 'lose') {
      if (inside(point, RESTART_BUTTON)) actions.restart();
      return;
    }
    if (screen === 'paused') {
      actions.resume();
      return;
    }
    const shop = shopIndexAt(point);
    if (shop >= 0) {
      actions.buy(shop);
      return;
    }
    actions.tap(point.x, point.y);
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    onPointer(event.clientX, event.clientY);
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const screen = actions.screen();
    if (event.code === 'Space') {
      event.preventDefault();
      actions.gesture();
      if (screen === 'title') actions.start();
      else if (screen === 'win' || screen === 'lose') actions.restart();
      else if (screen === 'play') actions.tap(COIN.x, COIN.y);
    } else if (event.code === 'Enter') {
      actions.gesture();
      if (screen === 'title') actions.start();
      else if (screen === 'win' || screen === 'lose') actions.restart();
    } else if (event.code === 'KeyR') {
      if (screen === 'win' || screen === 'lose') actions.restart();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      if (screen === 'play' || screen === 'paused') actions.pause();
    } else if (event.code === 'KeyM') {
      actions.mute();
    } else if (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Digit3' || event.code === 'Digit4') {
      if (screen === 'play') actions.buy(Number(event.code.slice(-1)) - 1);
    }
  });

  return { toLogical };
}
