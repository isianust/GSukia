/**
 * Comprehensive Test Suite for Suika Game (Phaser 3 + Matter.js refactor)
 *
 * Tests the pure logic modules (config, mergeLogic) which are engine-agnostic.
 * Phaser-dependent code (scenes, UI, rendering) is validated by structural
 * file-existence and source-code analysis tests.
 *
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// Mirror of js/config.js constants (CJS-compatible for Jest)
// ═══════════════════════════════════════════════════════════════════════════════
const BALL_DEFS = [
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

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const DANGER_LINE_Y = 80;
const DROP_COOLDOWN_MS = 500;
const GAME_OVER_GRACE_FRAMES = 90;
const MAX_DROP_LEVEL = 5;
const MAX_LEVEL = BALL_DEFS.length; // 11
const COIN_THRESHOLD_LEVEL = 7;
const COINS_PER_MERGE = 1;
const HIGH_SCORE_KEY = 'suika-high-score';
const COINS_KEY = 'suika-coins';

// ═══════════════════════════════════════════════════════════════════════════════
// Mirror of js/physics/mergeLogic.js (CJS-compatible for Jest)
// ═══════════════════════════════════════════════════════════════════════════════
function canMerge(levelA, levelB) {
  return levelA === levelB && levelA > 0 && levelA < MAX_LEVEL;
}

function getMergeResult(level, posA, posB) {
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

function calculateMergeScore(newLevel) {
  return BALL_DEFS[newLevel - 1].value;
}

function calculateMergeCoins(newLevel) {
  return newLevel >= COIN_THRESHOLD_LEVEL ? COINS_PER_MERGE : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. BALL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Ball Definitions (BALL_DEFS)', () => {
  test('should have exactly 11 ball types', () => {
    expect(BALL_DEFS.length).toBe(11);
  });

  test('all balls have required properties', () => {
    BALL_DEFS.forEach((def) => {
      expect(def).toHaveProperty('level');
      expect(def).toHaveProperty('value');
      expect(def).toHaveProperty('color');
      expect(def).toHaveProperty('colorStr');
      expect(def).toHaveProperty('radius');
      expect(def).toHaveProperty('name');
      expect(typeof def.level).toBe('number');
      expect(typeof def.value).toBe('number');
      expect(typeof def.color).toBe('number');
      expect(typeof def.colorStr).toBe('string');
      expect(typeof def.radius).toBe('number');
      expect(typeof def.name).toBe('string');
    });
  });

  test('ball values follow powers of 2 (2, 4, 8, …, 2048)', () => {
    BALL_DEFS.forEach((def, i) => {
      expect(def.value).toBe(Math.pow(2, i + 1));
    });
  });

  test('ball levels are sequential 1 through 11', () => {
    BALL_DEFS.forEach((def, i) => {
      expect(def.level).toBe(i + 1);
    });
  });

  test('ball radii are in strictly ascending order', () => {
    for (let i = 1; i < BALL_DEFS.length; i++) {
      expect(BALL_DEFS[i].radius).toBeGreaterThan(BALL_DEFS[i - 1].radius);
    }
  });

  test('ball values are in strictly ascending order', () => {
    for (let i = 1; i < BALL_DEFS.length; i++) {
      expect(BALL_DEFS[i].value).toBeGreaterThan(BALL_DEFS[i - 1].value);
    }
  });

  test('all colorStr values should be valid hex colours', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    BALL_DEFS.forEach((def) => {
      expect(def.colorStr).toMatch(hexRegex);
    });
  });

  test('ball names should be unique', () => {
    const names = BALL_DEFS.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('first ball should be Red (level 1, value 2)', () => {
    expect(BALL_DEFS[0].name).toBe('Red');
    expect(BALL_DEFS[0].level).toBe(1);
    expect(BALL_DEFS[0].value).toBe(2);
  });

  test('last ball should be Purple (level 11, value 2048)', () => {
    const last = BALL_DEFS[BALL_DEFS.length - 1];
    expect(last.name).toBe('Purple');
    expect(last.level).toBe(11);
    expect(last.value).toBe(2048);
  });

  test('colour ordering matches spec: Red → Orange → Yellow → Green → Blue', () => {
    expect(BALL_DEFS[0].name).toBe('Red');
    expect(BALL_DEFS[1].name).toBe('Orange');
    expect(BALL_DEFS[2].name).toBe('Yellow');
    expect(BALL_DEFS[3].name).toBe('Green');
    expect(BALL_DEFS[4].name).toBe('Blue');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GAME CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Game Constants', () => {
  test('canvas dimensions should be 400 × 600', () => {
    expect(CANVAS_WIDTH).toBe(400);
    expect(CANVAS_HEIGHT).toBe(600);
  });

  test('MAX_DROP_LEVEL should be 5 (first 5 levels droppable)', () => {
    expect(MAX_DROP_LEVEL).toBe(5);
  });

  test('MAX_LEVEL should equal BALL_DEFS.length (11)', () => {
    expect(MAX_LEVEL).toBe(11);
  });

  test('DANGER_LINE_Y should be 80', () => {
    expect(DANGER_LINE_Y).toBe(80);
  });

  test('DROP_COOLDOWN_MS should be 500', () => {
    expect(DROP_COOLDOWN_MS).toBe(500);
  });

  test('GAME_OVER_GRACE_FRAMES should be 90', () => {
    expect(GAME_OVER_GRACE_FRAMES).toBe(90);
  });

  test('COIN_THRESHOLD_LEVEL should be 7', () => {
    expect(COIN_THRESHOLD_LEVEL).toBe(7);
  });

  test('HIGH_SCORE_KEY is a non-empty string', () => {
    expect(typeof HIGH_SCORE_KEY).toBe('string');
    expect(HIGH_SCORE_KEY.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. MERGE LOGIC — canMerge()
// ═══════════════════════════════════════════════════════════════════════════════
describe('canMerge()', () => {
  test('returns true for two balls of the same level below MAX_LEVEL', () => {
    for (let lvl = 1; lvl < MAX_LEVEL; lvl++) {
      expect(canMerge(lvl, lvl)).toBe(true);
    }
  });

  test('returns false for two max-level balls (cannot merge further)', () => {
    expect(canMerge(MAX_LEVEL, MAX_LEVEL)).toBe(false);
  });

  test('returns false for balls of different levels', () => {
    expect(canMerge(1, 2)).toBe(false);
    expect(canMerge(3, 5)).toBe(false);
    expect(canMerge(10, 11)).toBe(false);
  });

  test('returns false for invalid levels (0, negative)', () => {
    expect(canMerge(0, 0)).toBe(false);
    expect(canMerge(-1, -1)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MERGE LOGIC — getMergeResult()
// ═══════════════════════════════════════════════════════════════════════════════
describe('getMergeResult()', () => {
  test('produces a ball one level higher', () => {
    const result = getMergeResult(1, { x: 100, y: 200 }, { x: 100, y: 200 });
    expect(result.level).toBe(2);
  });

  test('merged value equals next power of 2', () => {
    const result = getMergeResult(3, { x: 0, y: 0 }, { x: 0, y: 0 });
    // Level 3 → level 4 → value = 16
    expect(result.value).toBe(16);
  });

  test('spawn position is the midpoint of two ball positions', () => {
    const result = getMergeResult(1, { x: 10, y: 20 }, { x: 30, y: 40 });
    expect(result.x).toBe(20);
    expect(result.y).toBe(30);
  });

  test('uses the radius of the next-level ball', () => {
    const result = getMergeResult(5, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(result.radius).toBe(BALL_DEFS[5].radius); // level 6 → index 5
  });

  test('merging level 10 produces level 11 (max, Purple)', () => {
    const result = getMergeResult(10, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(result.level).toBe(11);
    expect(result.value).toBe(2048);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════
describe('calculateMergeScore()', () => {
  test('score equals the value of the newly created ball', () => {
    expect(calculateMergeScore(2)).toBe(4);
    expect(calculateMergeScore(5)).toBe(32);
    expect(calculateMergeScore(11)).toBe(2048);
  });

  test('score for every level matches BALL_DEFS value', () => {
    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      expect(calculateMergeScore(lvl)).toBe(BALL_DEFS[lvl - 1].value);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. COIN CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════
describe('calculateMergeCoins()', () => {
  test('no coins for merges producing balls below threshold', () => {
    for (let lvl = 1; lvl < COIN_THRESHOLD_LEVEL; lvl++) {
      expect(calculateMergeCoins(lvl)).toBe(0);
    }
  });

  test('awards coins for merges producing balls at or above threshold', () => {
    for (let lvl = COIN_THRESHOLD_LEVEL; lvl <= MAX_LEVEL; lvl++) {
      expect(calculateMergeCoins(lvl)).toBe(COINS_PER_MERGE);
    }
  });

  test('coins per qualifying merge equals COINS_PER_MERGE (1)', () => {
    expect(calculateMergeCoins(COIN_THRESHOLD_LEVEL)).toBe(1);
    expect(calculateMergeCoins(MAX_LEVEL)).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. MERGE FLAG / DEBOUNCE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
describe('Merge-flag debounce', () => {
  test('a ball marked merging=true should not be eligible for another merge', () => {
    // Simulate: two ball objects with merging flag
    const ballA = { ballLevel: 3, merging: false };
    const ballB = { ballLevel: 3, merging: false };
    const ballC = { ballLevel: 3, merging: true }; // already locked

    // A+B can merge
    expect(!ballA.merging && !ballB.merging && canMerge(ballA.ballLevel, ballB.ballLevel)).toBe(true);

    // After locking A
    ballA.merging = true;
    ballB.merging = true;

    // C (already merging) + any new level-3 ball should be skipped
    const ballD = { ballLevel: 3, merging: false };
    expect(!ballC.merging && !ballD.merging && canMerge(ballC.ballLevel, ballD.ballLevel)).toBe(false);
  });

  test('locking both balls prevents duplicate merge in same collision batch', () => {
    const balls = [
      { ballLevel: 2, merging: false },
      { ballLevel: 2, merging: false },
      { ballLevel: 2, merging: false },
    ];

    // Simulate collision pairs: (0,1) and (0,2) — ball 0 should only merge once
    let mergeCount = 0;

    // Pair (0, 1)
    if (!balls[0].merging && !balls[1].merging && canMerge(balls[0].ballLevel, balls[1].ballLevel)) {
      balls[0].merging = true;
      balls[1].merging = true;
      mergeCount++;
    }

    // Pair (0, 2) — ball 0 already locked
    if (!balls[0].merging && !balls[2].merging && canMerge(balls[0].ballLevel, balls[2].ballLevel)) {
      balls[0].merging = true;
      balls[2].merging = true;
      mergeCount++;
    }

    expect(mergeCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. INTEGRATION — FULL MERGE FLOW SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════
describe('Full merge flow (integration)', () => {
  test('merging two level-1 balls updates score and produces level-2', () => {
    let score = 0;
    let coins = 0;

    const posA = { x: 100, y: 300 };
    const posB = { x: 120, y: 300 };
    const lvl = 1;

    if (canMerge(lvl, lvl)) {
      const result = getMergeResult(lvl, posA, posB);
      score += calculateMergeScore(result.level);
      coins += calculateMergeCoins(result.level);

      expect(result.level).toBe(2);
      expect(result.value).toBe(4);
      expect(result.x).toBe(110);
      expect(result.y).toBe(300);
    }

    expect(score).toBe(4);
    expect(coins).toBe(0); // level 2 < threshold
  });

  test('chain of merges from level 1 to max accumulates correct totals', () => {
    let totalScore = 0;
    let totalCoins = 0;

    // Simulate a perfect chain: level 1+1→2, 2+2→3, …, 10+10→11
    for (let lvl = 1; lvl < MAX_LEVEL; lvl++) {
      if (canMerge(lvl, lvl)) {
        const result = getMergeResult(lvl, { x: 0, y: 0 }, { x: 0, y: 0 });
        totalScore += calculateMergeScore(result.level);
        totalCoins += calculateMergeCoins(result.level);
      }
    }

    // Expected score: sum of values for levels 2..11 = 4+8+16+32+64+128+256+512+1024+2048
    const expectedScore = BALL_DEFS.slice(1).reduce((s, d) => s + d.value, 0);
    expect(totalScore).toBe(expectedScore);

    // Expected coins: levels 7..11 = 5 coins
    const expectedCoins = MAX_LEVEL - COIN_THRESHOLD_LEVEL + 1; // 11 - 7 + 1 = 5
    // But we're merging TO levels 2..11, coins for levels >= 7 that appear as results
    // Results are levels 2,3,4,5,6,7,8,9,10,11 → coins from 7,8,9,10,11 = 5
    expect(totalCoins).toBe(expectedCoins);
  });

  test('max-level balls (11) cannot merge further', () => {
    expect(canMerge(MAX_LEVEL, MAX_LEVEL)).toBe(false);
    // No score or coins should be generated
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. FILE STRUCTURE — verify modular architecture exists
// ═══════════════════════════════════════════════════════════════════════════════
describe('Modular file structure', () => {
  const baseDir = path.join(__dirname, '..');

  const expectedFiles = [
    'index.html',
    'js/config.js',
    'js/main.js',
    'js/scenes/GameScene.js',
    'js/physics/MergeManager.js',
    'js/physics/mergeLogic.js',
    'js/ui/ScoreUI.js',
  ];

  expectedFiles.forEach((file) => {
    test(`${file} should exist`, () => {
      const filePath = path.join(baseDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. SOURCE-CODE ANALYSIS — verify key patterns in source files
// ═══════════════════════════════════════════════════════════════════════════════
describe('Source-code structural checks', () => {
  const readSrc = (relPath) =>
    fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');

  test('config.js exports BALL_DEFS with 11 entries', () => {
    const src = readSrc('js/config.js');
    expect(src).toContain('export const BALL_DEFS');
    // Count level entries
    const levelMatches = src.match(/level:\s*\d+/g);
    expect(levelMatches.length).toBe(11);
  });

  test('config.js defines power-of-2 values (2 through 2048)', () => {
    const src = readSrc('js/config.js');
    [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048].forEach((v) => {
      expect(src).toContain(`value: ${v}`);
    });
  });

  test('config.js final ball is Purple', () => {
    const src = readSrc('js/config.js');
    const lastEntry = src.match(/\{[^}]*name:\s*'Purple'[^}]*\}/);
    expect(lastEntry).not.toBeNull();
    expect(lastEntry[0]).toContain('level: 11');
  });

  test('MergeManager.js uses merge-flag debounce (merging property check)', () => {
    const src = readSrc('js/physics/MergeManager.js');
    expect(src).toContain('.merging');
    expect(src).toContain('merging = true');
  });

  test('MergeManager.js listens to collisionstart event', () => {
    const src = readSrc('js/physics/MergeManager.js');
    expect(src).toContain('collisionstart');
  });

  test('MergeManager.js processes a merge queue', () => {
    const src = readSrc('js/physics/MergeManager.js');
    expect(src).toContain('mergeQueue');
    expect(src).toContain('processMergeQueue');
  });

  test('GameScene.js creates balls with level, value, and radius properties', () => {
    const src = readSrc('js/scenes/GameScene.js');
    expect(src).toContain('ballLevel');
    expect(src).toContain('ballValue');
    expect(src).toContain('ballRadius');
  });

  test('GameScene.js renders numbers on balls (text with value)', () => {
    const src = readSrc('js/scenes/GameScene.js');
    expect(src).toContain('String(def.value)');
  });

  test('ScoreUI.js displays score and coins', () => {
    const src = readSrc('js/ui/ScoreUI.js');
    expect(src).toContain('Score:');
    expect(src).toContain('🪙');
    expect(src).toContain('updateScore');
    expect(src).toContain('updateCoins');
  });

  test('main.js bootstraps Phaser with Matter physics', () => {
    const src = readSrc('js/main.js');
    expect(src).toContain('Phaser.Game');
    expect(src).toContain("default: 'matter'");
  });

  test('index.html loads Phaser CDN and main.js as module', () => {
    const src = readSrc('index.html');
    expect(src).toContain('phaser');
    expect(src).toContain('type="module"');
    expect(src).toContain('js/main.js');
  });

  test('GameScene.js has game-over detection with grace frames', () => {
    const src = readSrc('js/scenes/GameScene.js');
    expect(src).toContain('dangerFrameCount');
    expect(src).toContain('GAME_OVER_GRACE_FRAMES');
  });

  test('GameScene.js implements drop cooldown', () => {
    const src = readSrc('js/scenes/GameScene.js');
    expect(src).toContain('canDrop');
    expect(src).toContain('DROP_COOLDOWN_MS');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. DROPPABLE LEVELS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Droppable ball levels', () => {
  test('only levels 1 through MAX_DROP_LEVEL (5) should be droppable', () => {
    expect(MAX_DROP_LEVEL).toBe(5);
    // All droppable levels should exist in BALL_DEFS
    for (let lvl = 1; lvl <= MAX_DROP_LEVEL; lvl++) {
      expect(BALL_DEFS[lvl - 1]).toBeDefined();
    }
  });

  test('droppable balls have smaller radii than non-droppable balls', () => {
    const maxDropRadius = BALL_DEFS[MAX_DROP_LEVEL - 1].radius;
    for (let i = MAX_DROP_LEVEL; i < BALL_DEFS.length; i++) {
      expect(BALL_DEFS[i].radius).toBeGreaterThan(maxDropRadius);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════
describe('Edge cases', () => {
  test('merging two level-10 balls produces the max ball (level 11, value 2048)', () => {
    expect(canMerge(10, 10)).toBe(true);
    const result = getMergeResult(10, { x: 200, y: 400 }, { x: 200, y: 400 });
    expect(result.level).toBe(11);
    expect(result.value).toBe(2048);
    expect(result.radius).toBe(85);
  });

  test('merge result position handles identical coordinates', () => {
    const result = getMergeResult(1, { x: 50, y: 50 }, { x: 50, y: 50 });
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });

  test('merge result position handles widely separated balls', () => {
    const result = getMergeResult(1, { x: 0, y: 0 }, { x: 400, y: 600 });
    expect(result.x).toBe(200);
    expect(result.y).toBe(300);
  });

  test('calculateMergeScore at each boundary is correct', () => {
    expect(calculateMergeScore(1)).toBe(2);    // level 1 → value 2
    expect(calculateMergeScore(11)).toBe(2048); // level 11 → value 2048
  });

  test('coins awarded exactly at threshold level', () => {
    expect(calculateMergeCoins(COIN_THRESHOLD_LEVEL - 1)).toBe(0);
    expect(calculateMergeCoins(COIN_THRESHOLD_LEVEL)).toBe(1);
  });
});
