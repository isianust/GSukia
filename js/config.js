/**
 * Suika Game - Configuration & Ball Definitions
 *
 * Ball values follow powers of 2 (2, 4, 8, …, 2048).
 * Colors progress: Red → Orange → Yellow → Green → Blue → … → Purple (max).
 */

// ─── Ball Definitions ───────────────────────────────────────────────────────────
export const BALL_DEFS = [
  { level: 1,  value: 2,    color: 0xe74c3c, colorStr: '#e74c3c', radius: 18, name: 'Red' },
  { level: 2,  value: 4,    color: 0xe67e22, colorStr: '#e67e22', radius: 22, name: 'Orange' },
  { level: 3,  value: 8,    color: 0xf1c40f, colorStr: '#f1c40f', radius: 27, name: 'Yellow' },
  { level: 4,  value: 16,   color: 0x2ecc71, colorStr: '#2ecc71', radius: 32, name: 'Green' },
  { level: 5,  value: 32,   color: 0x3498db, colorStr: '#3498db', radius: 38, name: 'Blue' },
  { level: 6,  value: 64,   color: 0x1abc9c, colorStr: '#1abc9c', radius: 44, name: 'Cyan' },
  { level: 7,  value: 128,  color: 0xe84393, colorStr: '#e84393', radius: 50, name: 'Pink' },
  { level: 8,  value: 256,  color: 0xfd79a8, colorStr: '#fd79a8', radius: 57, name: 'Salmon' },
  { level: 9,  value: 512,  color: 0x0984e3, colorStr: '#0984e3', radius: 65, name: 'DeepBlue' },
  { level: 10, value: 1024, color: 0x6c5ce7, colorStr: '#6c5ce7', radius: 74, name: 'Indigo' },
  { level: 11, value: 2048, color: 0x9b59b6, colorStr: '#9b59b6', radius: 85, name: 'Purple' },
];

// ─── Game Constants ─────────────────────────────────────────────────────────────
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;
export const DANGER_LINE_Y = 80;
export const DROP_COOLDOWN_MS = 500;
export const GAME_OVER_GRACE_FRAMES = 90;
export const MAX_DROP_LEVEL = 5;          // Only levels 1-5 can be randomly dropped
export const MAX_LEVEL = BALL_DEFS.length; // 11

// ─── Economy ────────────────────────────────────────────────────────────────────
export const COIN_THRESHOLD_LEVEL = 7;    // Merges producing level >= 7 award coins
export const COINS_PER_MERGE = 1;

// ─── Persistence ────────────────────────────────────────────────────────────────
export const HIGH_SCORE_KEY = 'suika-high-score';
export const COINS_KEY = 'suika-coins';
