/**
 * Pure merge-logic helpers — no Phaser dependency.
 * These functions can be unit-tested in isolation.
 */
import { BALL_DEFS, MAX_LEVEL, COIN_THRESHOLD_LEVEL, COINS_PER_MERGE } from '../config.js';

/**
 * Determine whether two balls of the given levels can merge.
 * Same level AND below max → merge; otherwise no.
 */
export function canMerge(levelA, levelB) {
  return levelA === levelB && levelA > 0 && levelA < MAX_LEVEL;
}

/**
 * Return the properties of the ball that results from a merge.
 */
export function getMergeResult(level, posA, posB) {
  const newLevel = level + 1;
  const def = BALL_DEFS[newLevel - 1];
  return {
    level: newLevel,
    value: def.value,
    radius: def.radius,
    color: def.color,
    x: (posA.x + posB.x) / 2,
    y: (posA.y + posB.y) / 2,
  };
}

/**
 * Score gained from producing a ball of `newLevel`.
 */
export function calculateMergeScore(newLevel) {
  return BALL_DEFS[newLevel - 1].value;
}

/**
 * Coins gained from producing a ball of `newLevel`.
 */
export function calculateMergeCoins(newLevel) {
  return newLevel >= COIN_THRESHOLD_LEVEL ? COINS_PER_MERGE : 0;
}
