// The upgrade shop: what each upgrade costs at a level, and what it gives. Costs grow
// geometrically so every level feels earned; the world keeps the levels, this file only
// prices and describes them.
import { UPGRADES } from './config.js';

/** The $PUMP price of the next level of `upgrade` when `level` are already owned. */
export function upgradeCost(upgrade, level) {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));
}

/** True when the player can afford the next level of the upgrade at `index`. */
export function canBuy(upgrade, level, coins) {
  return coins >= upgradeCost(upgrade, level);
}

/** The four shop entries with their live price and level, for the renderer and input. */
export function shopEntries(levels, coins) {
  return UPGRADES.map((upgrade, index) => ({
    index,
    upgrade,
    level: levels[index],
    cost: upgradeCost(upgrade, levels[index]),
    affordable: canBuy(upgrade, levels[index], coins),
  }));
}

/** Tap earnings before the combo multiplier: base 1 plus Stronger Tap levels. */
export function baseTapPower(levels) {
  return 1 + levels[0];
}

/** Passive earnings per second: Auto-Tapper levels. */
export function perSecond(levels) {
  return levels[1];
}

/** Extra combo gain per step from Combo Boost levels. */
export function comboGain(levels) {
  return levels[2] * 0.01;
}

/** Chance (0..1) that a tap pays 10x, from Golden Tap levels. */
export function goldenChance(levels) {
  return levels[3] * 0.02;
}
