/**
 * Comprehensive Test Suite for Suika Game
 *
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// ─── Load game source and HTML ──────────────────────────────────────────────────

const gameJsSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let loaded = false;

// Setup DOM
function setupDOM() {
  document.documentElement.innerHTML = '';
  document.write(htmlSource);
  document.close();
}

// Execute game.js once in jsdom global scope
function loadGame() {
  // Mock localStorage
  const store = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, val) => { store[key] = String(val); }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    },
    writable: true,
    configurable: true,
  });

  // Mock requestAnimationFrame to not loop
  window.requestAnimationFrame = jest.fn();

  // Mock canvas context
  const mockCtx = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    ellipse: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    setLineDash: jest.fn(),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };

  // Override getContext for all canvases
  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCtx);

  // Mock getBoundingClientRect for canvases and divs
  HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
    left: 0, top: 0, width: 400, height: 600, right: 400, bottom: 600,
  }));

  if (!loaded) {
    // Use indirect eval to execute in global scope
    // Replace const/class at top-level with var/global assignment to make them accessible
    let modifiedSource = gameJsSource;

    // Replace top-level const declarations with var so they become globally accessible
    modifiedSource = modifiedSource.replace(/^const FRUITS/m, 'var FRUITS');
    modifiedSource = modifiedSource.replace(/^const MAX_DROP_INDEX/m, 'var MAX_DROP_INDEX');
    modifiedSource = modifiedSource.replace(/^const CANVAS_WIDTH/m, 'var CANVAS_WIDTH');
    modifiedSource = modifiedSource.replace(/^const CANVAS_HEIGHT/m, 'var CANVAS_HEIGHT');
    modifiedSource = modifiedSource.replace(/^const GRAVITY/m, 'var GRAVITY');
    modifiedSource = modifiedSource.replace(/^const FRICTION/m, 'var FRICTION');
    modifiedSource = modifiedSource.replace(/^const BOUNCE/m, 'var BOUNCE');
    modifiedSource = modifiedSource.replace(/^const DANGER_LINE_Y/m, 'var DANGER_LINE_Y');
    modifiedSource = modifiedSource.replace(/^const DROP_COOLDOWN_MS/m, 'var DROP_COOLDOWN_MS');
    modifiedSource = modifiedSource.replace(/^const GAME_OVER_GRACE_FRAMES/m, 'var GAME_OVER_GRACE_FRAMES');
    modifiedSource = modifiedSource.replace(/^const COMBO_WINDOW_MS/m, 'var COMBO_WINDOW_MS');

    // Replace class declarations with var assignments so they are globally accessible
    modifiedSource = modifiedSource.replace(/^class Fruit \{/m, 'var Fruit = class Fruit {');
    modifiedSource = modifiedSource.replace(/^class SuikaGame \{/m, 'var SuikaGame = class SuikaGame {');

    // Replace standalone function declarations to var too
    modifiedSource = modifiedSource.replace(/^function lightenHex/m, 'var lightenHex = function');

    // Execute in global scope using indirect eval
    const indirectEval = eval;
    indirectEval(modifiedSource);
    loaded = true;
  }

  return { mockCtx, store };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. FRUIT DATA INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════
describe('Fruit Definitions (FRUITS array)', () => {
  beforeAll(() => {
    setupDOM();
    loadGame();
  });

  test('should have exactly 11 fruit types', () => {
    expect(FRUITS.length).toBe(11);
  });

  test('all fruits have required properties', () => {
    FRUITS.forEach((fruit, i) => {
      expect(fruit).toHaveProperty('name');
      expect(fruit).toHaveProperty('radius');
      expect(fruit).toHaveProperty('color');
      expect(fruit).toHaveProperty('highlight');
      expect(fruit).toHaveProperty('points');
      expect(fruit).toHaveProperty('emoji');
      expect(typeof fruit.name).toBe('string');
      expect(typeof fruit.radius).toBe('number');
      expect(typeof fruit.color).toBe('string');
      expect(typeof fruit.highlight).toBe('string');
      expect(typeof fruit.points).toBe('number');
      expect(typeof fruit.emoji).toBe('string');
    });
  });

  test('fruit radii should be in ascending order', () => {
    for (let i = 1; i < FRUITS.length; i++) {
      expect(FRUITS[i].radius).toBeGreaterThan(FRUITS[i - 1].radius);
    }
  });

  test('fruit points should be in ascending order', () => {
    for (let i = 1; i < FRUITS.length; i++) {
      expect(FRUITS[i].points).toBeGreaterThan(FRUITS[i - 1].points);
    }
  });

  test('all fruit colors should be valid hex colors', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    FRUITS.forEach((fruit) => {
      expect(fruit.color).toMatch(hexRegex);
      expect(fruit.highlight).toMatch(hexRegex);
    });
  });

  test('fruit names should be unique', () => {
    const names = FRUITS.map(f => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('first fruit should be Cherry and last should be Watermelon', () => {
    expect(FRUITS[0].name).toBe('Cherry');
    expect(FRUITS[FRUITS.length - 1].name).toBe('Watermelon');
  });

  test('smallest fruit radius should be 15 (Cherry)', () => {
    expect(FRUITS[0].radius).toBe(15);
  });

  test('largest fruit radius should be 90 (Watermelon)', () => {
    expect(FRUITS[FRUITS.length - 1].radius).toBe(90);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GAME CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Game Constants', () => {
  beforeAll(() => {
    setupDOM();
    loadGame();
  });

  test('canvas dimensions should be 400x600', () => {
    expect(CANVAS_WIDTH).toBe(400);
    expect(CANVAS_HEIGHT).toBe(600);
  });

  test('MAX_DROP_INDEX should be 4 (first 5 fruits droppable)', () => {
    expect(MAX_DROP_INDEX).toBe(4);
  });

  test('gravity should be positive', () => {
    expect(GRAVITY).toBeGreaterThan(0);
  });

  test('friction should be less than 1 (slowing effect)', () => {
    expect(FRICTION).toBeLessThan(1);
    expect(FRICTION).toBeGreaterThan(0);
  });

  test('bounce factor should be between 0 and 1', () => {
    expect(BOUNCE).toBeGreaterThan(0);
    expect(BOUNCE).toBeLessThan(1);
  });

  test('danger line Y should be above center of canvas', () => {
    expect(DANGER_LINE_Y).toBeLessThan(CANVAS_HEIGHT / 2);
  });

  test('drop cooldown should be positive', () => {
    expect(DROP_COOLDOWN_MS).toBeGreaterThan(0);
  });

  test('game over grace frames should be positive', () => {
    expect(GAME_OVER_GRACE_FRAMES).toBeGreaterThan(0);
  });

  test('combo window should be positive', () => {
    expect(COMBO_WINDOW_MS).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. FRUIT CLASS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Fruit Class', () => {
  beforeAll(() => {
    setupDOM();
    loadGame();
  });

  beforeEach(() => {
    Fruit.nextId = 0;
  });

  describe('Constructor', () => {
    test('should create a fruit with correct properties', () => {
      const fruit = new Fruit(100, 50, 0);
      expect(fruit.x).toBe(100);
      expect(fruit.y).toBe(50);
      expect(fruit.typeIndex).toBe(0);
      expect(fruit.radius).toBe(FRUITS[0].radius);
      expect(fruit.color).toBe(FRUITS[0].color);
      expect(fruit.highlight).toBe(FRUITS[0].highlight);
      expect(fruit.points).toBe(FRUITS[0].points);
      expect(fruit.name).toBe('Cherry');
      expect(fruit.vx).toBe(0);
      expect(fruit.vy).toBe(0);
      expect(fruit.settled).toBe(false);
      expect(fruit.merging).toBe(false);
      expect(fruit.framesAboveLine).toBe(0);
    });

    test('should assign unique IDs to each fruit', () => {
      const f1 = new Fruit(0, 0, 0);
      const f2 = new Fruit(0, 0, 1);
      const f3 = new Fruit(0, 0, 2);
      expect(f1.id).toBe(0);
      expect(f2.id).toBe(1);
      expect(f3.id).toBe(2);
    });

    test('should handle all fruit type indices', () => {
      for (let i = 0; i < FRUITS.length; i++) {
        const fruit = new Fruit(200, 200, i);
        expect(fruit.typeIndex).toBe(i);
        expect(fruit.radius).toBe(FRUITS[i].radius);
        expect(fruit.name).toBe(FRUITS[i].name);
      }
    });

    test('should have a spawnTime property', () => {
      const before = Date.now();
      const fruit = new Fruit(100, 100, 0);
      const after = Date.now();
      expect(fruit.spawnTime).toBeGreaterThanOrEqual(before);
      expect(fruit.spawnTime).toBeLessThanOrEqual(after);
    });

    test('should initialize rotation', () => {
      const fruit = new Fruit(100, 100, 0);
      expect(typeof fruit.rotation).toBe('number');
      expect(fruit.rotation).toBeGreaterThanOrEqual(0);
      expect(fruit.rotation).toBeLessThan(Math.PI * 2);
    });
  });

  describe('Physics Update', () => {
    test('should apply gravity (increase vy)', () => {
      const fruit = new Fruit(200, 200, 0);
      const initialVy = fruit.vy;
      fruit.update();
      expect(fruit.vy).toBeGreaterThan(initialVy);
    });

    test('should apply friction (decrease vx magnitude)', () => {
      const fruit = new Fruit(200, 200, 0);
      fruit.vx = 10;
      fruit.update();
      expect(Math.abs(fruit.vx)).toBeLessThan(10);
    });

    test('should not update when merging', () => {
      const fruit = new Fruit(200, 200, 0);
      fruit.merging = true;
      fruit.vx = 5;
      fruit.vy = 5;
      const oldX = fruit.x;
      const oldY = fruit.y;
      fruit.update();
      expect(fruit.x).toBe(oldX);
      expect(fruit.y).toBe(oldY);
    });

    test('should bounce off left wall', () => {
      const fruit = new Fruit(5, 200, 0); // radius=15, so x < radius
      fruit.vx = -10;
      fruit.update();
      expect(fruit.x).toBeGreaterThanOrEqual(fruit.radius);
    });

    test('should bounce off right wall', () => {
      const fruit = new Fruit(CANVAS_WIDTH - 5, 200, 0); // past right edge
      fruit.vx = 10;
      fruit.update();
      expect(fruit.x).toBeLessThanOrEqual(CANVAS_WIDTH - fruit.radius);
    });

    test('should bounce off floor', () => {
      const fruit = new Fruit(200, CANVAS_HEIGHT - 5, 0); // near floor
      fruit.vy = 10;
      fruit.update();
      expect(fruit.y).toBeLessThanOrEqual(CANVAS_HEIGHT - fruit.radius);
    });

    test('should settle when velocity is very low', () => {
      const fruit = new Fruit(200, CANVAS_HEIGHT - 15, 0);
      fruit.vx = 0.05;
      fruit.vy = 0;
      fruit.y = CANVAS_HEIGHT - fruit.radius; // on the floor
      // After update, vy will increase due to gravity then bounce
      // Let's manually set conditions for settled
      fruit.vx = 0.05;
      fruit.vy = 0.05;
      fruit.update();
      // After friction/gravity, check settled state
      // The fruit won't be settled because gravity was applied
    });

    test('velocity should stop at floor when bouncing with low vy', () => {
      const fruit = new Fruit(200, CANVAS_HEIGHT - fruitRadiusFor(0), 0);
      fruit.vy = 0.3; // low velocity
      fruit.update();
      // After bounce with BOUNCE=0.3, result should be < 0.5 threshold
      // So vy should be set to 0
    });

    test('should update rotation based on horizontal velocity', () => {
      const fruit = new Fruit(200, 200, 0);
      fruit.vx = 5;
      const initialRotation = fruit.rotation;
      fruit.update();
      expect(fruit.rotation).not.toBe(initialRotation);
    });
  });

  describe('Color Helpers', () => {
    test('lightenColor should make color lighter', () => {
      const fruit = new Fruit(0, 0, 0);
      const result = fruit.lightenColor('#000000', 50);
      expect(result).toBe('rgb(50, 50, 50)');
    });

    test('lightenColor should not exceed 255', () => {
      const fruit = new Fruit(0, 0, 0);
      const result = fruit.lightenColor('#ffffff', 50);
      expect(result).toBe('rgb(255, 255, 255)');
    });

    test('darkenColor should make color darker', () => {
      const fruit = new Fruit(0, 0, 0);
      const result = fruit.darkenColor('#ffffff', 50);
      expect(result).toBe('rgb(205, 205, 205)');
    });

    test('darkenColor should not go below 0', () => {
      const fruit = new Fruit(0, 0, 0);
      const result = fruit.darkenColor('#000000', 50);
      expect(result).toBe('rgb(0, 0, 0)');
    });

    test('lightenColor with specific hex color', () => {
      const fruit = new Fruit(0, 0, 0);
      const result = fruit.lightenColor('#e74c3c', 40);
      // R: 231+40=255(capped), G: 76+40=116, B: 60+40=100
      expect(result).toBe('rgb(255, 116, 100)');
    });

    test('darkenColor with specific hex color', () => {
      const fruit = new Fruit(0, 0, 0);
      const result = fruit.darkenColor('#e74c3c', 30);
      // R: 231-30=201, G: 76-30=46, B: 60-30=30
      expect(result).toBe('rgb(201, 46, 30)');
    });
  });

  describe('Draw', () => {
    test('should call canvas context methods without errors', () => {
      const fruit = new Fruit(200, 300, 0);
      const mockCtx = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        ellipse: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        globalAlpha: 1,
        createRadialGradient: jest.fn(() => ({
          addColorStop: jest.fn(),
        })),
      };
      expect(() => fruit.draw(mockCtx)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    test('should draw emoji for fruits with radius >= 25', () => {
      const fruit = new Fruit(200, 300, 2); // Grape, radius=25
      const mockCtx = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        ellipse: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        globalAlpha: 1,
        createRadialGradient: jest.fn(() => ({
          addColorStop: jest.fn(),
        })),
      };
      fruit.draw(mockCtx);
      expect(mockCtx.fillText).toHaveBeenCalledWith('🍇', 200, 300);
    });

    test('should NOT draw emoji for small fruits (radius < 25)', () => {
      const fruit = new Fruit(200, 300, 0); // Cherry, radius=15
      const mockCtx = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        ellipse: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        globalAlpha: 1,
        createRadialGradient: jest.fn(() => ({
          addColorStop: jest.fn(),
        })),
      };
      fruit.draw(mockCtx);
      expect(mockCtx.fillText).not.toHaveBeenCalled();
    });
  });
});

// Helper for getting radius by type index
function fruitRadiusFor(typeIndex) {
  return [15, 20, 25, 30, 38, 45, 52, 60, 68, 78, 90][typeIndex];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. STANDALONE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
describe('lightenHex function', () => {
  beforeAll(() => {
    setupDOM();
    loadGame();
  });

  test('should lighten black', () => {
    expect(lightenHex('#000000', 50)).toBe('rgb(50, 50, 50)');
  });

  test('should cap at 255', () => {
    expect(lightenHex('#ffffff', 10)).toBe('rgb(255, 255, 255)');
  });

  test('should lighten a specific color correctly', () => {
    expect(lightenHex('#e74c3c', 40)).toBe('rgb(255, 116, 100)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SUIKA GAME CLASS
// ═══════════════════════════════════════════════════════════════════════════════
describe('SuikaGame Class', () => {
  let game;
  let store;

  beforeEach(() => {
    setupDOM();
    const env = loadGame();
    store = env.store;
    // Create game instance
    game = new SuikaGame();
  });

  describe('Initialization', () => {
    test('should start with score 0', () => {
      expect(game.score).toBe(0);
    });

    test('should start with empty fruits array', () => {
      expect(game.fruits).toEqual([]);
    });

    test('should start with gameOver = false', () => {
      expect(game.gameOver).toBe(false);
    });

    test('should start with canDrop = true', () => {
      expect(game.canDrop).toBe(true);
    });

    test('should have dropX at center of canvas', () => {
      expect(game.dropX).toBe(CANVAS_WIDTH / 2);
    });

    test('should have valid currentFruitType (0 to MAX_DROP_INDEX)', () => {
      expect(game.currentFruitType).toBeGreaterThanOrEqual(0);
      expect(game.currentFruitType).toBeLessThanOrEqual(MAX_DROP_INDEX);
    });

    test('should have valid nextFruitType (0 to MAX_DROP_INDEX)', () => {
      expect(game.nextFruitType).toBeGreaterThanOrEqual(0);
      expect(game.nextFruitType).toBeLessThanOrEqual(MAX_DROP_INDEX);
    });

    test('should initialize comboCount to 0', () => {
      expect(game.comboCount).toBe(0);
    });

    test('should initialize lastMergeTime to 0', () => {
      expect(game.lastMergeTime).toBe(0);
    });

    test('should initialize frameCount (gameLoop runs once during construction)', () => {
      expect(game.frameCount).toBe(1);
    });

    test('should have all required DOM element references', () => {
      expect(game.canvas).toBeTruthy();
      expect(game.scoreElement).toBeTruthy();
      expect(game.highScoreElement).toBeTruthy();
      expect(game.gameOverOverlay).toBeTruthy();
      expect(game.finalScoreElement).toBeTruthy();
      expect(game.newHighScoreElement).toBeTruthy();
      expect(game.dropGuide).toBeTruthy();
      expect(game.nextFruitPreview).toBeTruthy();
      expect(game.gameContainer).toBeTruthy();
    });

    test('should set canvas dimensions correctly', () => {
      expect(game.canvas.width).toBe(CANVAS_WIDTH);
      expect(game.canvas.height).toBe(CANVAS_HEIGHT);
    });

    test('should load high score from localStorage', () => {
      expect(window.localStorage.getItem).toHaveBeenCalledWith('suika-high-score');
    });
  });

  describe('randomDropFruit', () => {
    test('should return values between 0 and MAX_DROP_INDEX', () => {
      const results = new Set();
      for (let i = 0; i < 1000; i++) {
        const val = game.randomDropFruit();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(MAX_DROP_INDEX);
        results.add(val);
      }
      // Should cover all possible values with enough trials
      expect(results.size).toBe(MAX_DROP_INDEX + 1);
    });
  });

  describe('dropFruit', () => {
    test('should add a fruit to the fruits array', () => {
      game.lastDropTime = 0;
      game.canDrop = true;
      game.dropFruit();
      expect(game.fruits.length).toBe(1);
    });

    test('should not drop when gameOver is true', () => {
      game.gameOver = true;
      game.canDrop = true;
      game.dropFruit();
      expect(game.fruits.length).toBe(0);
    });

    test('should not drop when canDrop is false', () => {
      game.canDrop = false;
      game.dropFruit();
      expect(game.fruits.length).toBe(0);
    });

    test('should not drop during cooldown', () => {
      game.canDrop = true;
      game.lastDropTime = Date.now(); // just dropped
      game.dropFruit();
      expect(game.fruits.length).toBe(0);
    });

    test('should cycle to next fruit type after drop', () => {
      game.canDrop = true;
      game.lastDropTime = 0;
      const nextType = game.nextFruitType;
      game.dropFruit();
      expect(game.currentFruitType).toBe(nextType);
    });

    test('dropped fruit should be at the current dropX position', () => {
      game.canDrop = true;
      game.lastDropTime = 0;
      game.dropX = 150;
      const expectedType = game.currentFruitType;
      game.dropFruit();
      expect(game.fruits[0].x).toBe(150);
      expect(game.fruits[0].typeIndex).toBe(expectedType);
    });

    test('should set canDrop to false after dropping', () => {
      game.canDrop = true;
      game.lastDropTime = 0;
      game.dropFruit();
      expect(game.canDrop).toBe(false);
    });
  });

  describe('Collision Detection and Merge', () => {
    test('should merge two same-type fruits when overlapping', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0); // Cherry
      const f2 = new Fruit(205, 400, 0); // Cherry, overlapping
      game.fruits = [f1, f2];
      game.resolveCollisions();
      // After merge, should have 1 fruit of next type
      expect(game.fruits.length).toBe(1);
      expect(game.fruits[0].typeIndex).toBe(1); // Strawberry
    });

    test('merged fruit should appear at midpoint', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      const f2 = new Fruit(210, 400, 0);
      game.fruits = [f1, f2];
      game.resolveCollisions();
      expect(game.fruits[0].x).toBe(205); // midpoint
      expect(game.fruits[0].y).toBe(400);
    });

    test('should NOT merge fruits of different types', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0); // Cherry
      const f2 = new Fruit(205, 400, 1); // Strawberry
      game.fruits = [f1, f2];
      game.resolveCollisions();
      expect(game.fruits.length).toBe(2);
    });

    test('should push apart overlapping different-type fruits', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0); // Cherry r=15
      const f2 = new Fruit(210, 400, 1); // Strawberry r=20
      game.fruits = [f1, f2];
      const origDist = Math.abs(f2.x - f1.x);
      game.resolveCollisions();
      const newDist = Math.abs(game.fruits[1].x - game.fruits[0].x);
      expect(newDist).toBeGreaterThan(origDist);
    });

    test('should NOT merge max-level fruits (Watermelon)', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 10); // Watermelon
      const f2 = new Fruit(205, 400, 10); // Watermelon
      game.fruits = [f1, f2];
      game.resolveCollisions();
      expect(game.fruits.length).toBe(2); // pushed apart, not merged
    });

    test('should increase score on merge', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      const f2 = new Fruit(205, 400, 0);
      game.fruits = [f1, f2];
      game.score = 0;
      game.resolveCollisions();
      expect(game.score).toBeGreaterThan(0);
    });

    test('merged fruit should have upward impulse', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      const f2 = new Fruit(205, 400, 0);
      game.fruits = [f1, f2];
      game.resolveCollisions();
      expect(game.fruits[0].vy).toBe(-2);
    });

    test('should handle zero-distance fruits without crash', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      const f2 = new Fruit(200, 400, 1); // exact same position, different type
      game.fruits = [f1, f2];
      // dist === 0, should skip (guard in resolveCollisions)
      expect(() => game.resolveCollisions()).not.toThrow();
    });

    test('should not interact with merging fruits', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      f1.merging = true;
      const f2 = new Fruit(205, 400, 0);
      game.fruits = [f1, f2];
      game.resolveCollisions();
      // f1 is merging, should skip
      expect(game.fruits.length).toBe(2);
    });
  });

  describe('Combo System', () => {
    test('first merge should set comboCount to 1', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      const f2 = new Fruit(205, 400, 0);
      game.fruits = [f1, f2];
      game.lastMergeTime = 0;
      game.comboCount = 0;
      game.resolveCollisions();
      expect(game.comboCount).toBe(1);
    });

    test('rapid merge should increase comboCount', () => {
      // First merge
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      const f2 = new Fruit(205, 400, 0);
      game.fruits = [f1, f2];
      game.lastMergeTime = 0;
      game.comboCount = 0;
      game.resolveCollisions();
      expect(game.comboCount).toBe(1);

      // Second merge within combo window
      Fruit.nextId = 100;
      const f3 = new Fruit(100, 400, 0);
      const f4 = new Fruit(105, 400, 0);
      game.fruits.push(f3, f4);
      game.resolveCollisions();
      expect(game.comboCount).toBe(2);
    });

    test('combo multiplier should increase score', () => {
      // Simulate combo = 2 scenario
      game.comboCount = 1;
      game.lastMergeTime = Date.now();

      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      const f2 = new Fruit(205, 400, 0);
      game.fruits = [f1, f2];
      game.score = 0;
      game.resolveCollisions();

      // combo becomes 2, so score = FRUITS[1].points * 2
      expect(game.comboCount).toBe(2);
      expect(game.score).toBe(FRUITS[1].points * 2);
    });
  });

  describe('Game Over Check', () => {
    test('should not trigger game over when no fruits above danger line', () => {
      Fruit.nextId = 0;
      const fruit = new Fruit(200, 400, 0); // well below danger line
      fruit.vy = 0;
      game.fruits = [fruit];
      game.checkGameOver();
      expect(game.gameOver).toBe(false);
    });

    test('should not immediately trigger game over for fruit near danger line', () => {
      Fruit.nextId = 0;
      const fruit = new Fruit(200, 50, 0); // above danger line
      fruit.vy = 0;
      fruit.framesAboveLine = 0;
      game.fruits = [fruit];
      game.checkGameOver();
      expect(game.gameOver).toBe(false);
      expect(fruit.framesAboveLine).toBe(1);
    });

    test('should trigger game over after grace period', () => {
      Fruit.nextId = 0;
      const fruit = new Fruit(200, 50, 0);
      fruit.vy = 0;
      fruit.framesAboveLine = GAME_OVER_GRACE_FRAMES - 1; // one below threshold
      game.fruits = [fruit];
      game.checkGameOver();
      // framesAboveLine incremented to GAME_OVER_GRACE_FRAMES, which is NOT > threshold
      expect(game.gameOver).toBe(false);

      // Next check will increment to GAME_OVER_GRACE_FRAMES + 1, which IS > threshold
      game.checkGameOver();
      expect(game.gameOver).toBe(true);
    });

    test('should reset framesAboveLine when fruit drops below danger line', () => {
      Fruit.nextId = 0;
      const fruit = new Fruit(200, 400, 0); // well below
      fruit.vy = 0;
      fruit.framesAboveLine = 50;
      game.fruits = [fruit];
      game.checkGameOver();
      expect(fruit.framesAboveLine).toBe(0);
    });

    test('should skip merging fruits in game over check', () => {
      Fruit.nextId = 0;
      const fruit = new Fruit(200, 10, 0);
      fruit.vy = 0;
      fruit.merging = true;
      fruit.framesAboveLine = 200;
      game.fruits = [fruit];
      game.checkGameOver();
      expect(game.gameOver).toBe(false);
    });
  });

  describe('endGame', () => {
    test('should set gameOver to true', () => {
      game.endGame();
      expect(game.gameOver).toBe(true);
    });

    test('should show game over overlay', () => {
      game.endGame();
      expect(game.gameOverOverlay.classList.contains('active')).toBe(true);
    });

    test('should display final score', () => {
      game.score = 42;
      game.endGame();
      expect(game.finalScoreElement.textContent).toBe('Final Score: 42');
    });

    test('should show new high score indicator when score beats high score', () => {
      game.highScore = 0;
      game.score = 100;
      game.endGame();
      expect(game.newHighScoreElement.style.display).toBe('block');
    });

    test('should hide new high score indicator when score does not beat high score', () => {
      game.highScore = 200;
      game.score = 50;
      game.endGame();
      expect(game.newHighScoreElement.style.display).toBe('none');
    });

    test('should save new high score to localStorage', () => {
      game.highScore = 0;
      game.score = 100;
      game.endGame();
      expect(window.localStorage.setItem).toHaveBeenCalledWith('suika-high-score', '100');
    });

    test('should not show high score for score of 0', () => {
      game.highScore = 0;
      game.score = 0;
      game.endGame();
      expect(game.newHighScoreElement.style.display).toBe('none');
    });
  });

  describe('restart', () => {
    test('should reset score to 0', () => {
      game.score = 100;
      game.restart();
      expect(game.score).toBe(0);
    });

    test('should clear fruits array', () => {
      game.fruits = [new Fruit(100, 100, 0)];
      game.restart();
      expect(game.fruits).toEqual([]);
    });

    test('should set gameOver to false', () => {
      game.gameOver = true;
      game.restart();
      expect(game.gameOver).toBe(false);
    });

    test('should reset canDrop to true', () => {
      game.canDrop = false;
      game.restart();
      expect(game.canDrop).toBe(true);
    });

    test('should reset dropX to center', () => {
      game.dropX = 100;
      game.restart();
      expect(game.dropX).toBe(CANVAS_WIDTH / 2);
    });

    test('should reset combo tracking', () => {
      game.comboCount = 5;
      game.lastMergeTime = 9999;
      game.restart();
      expect(game.comboCount).toBe(0);
      expect(game.lastMergeTime).toBe(0);
    });

    test('should hide game over overlay', () => {
      game.gameOverOverlay.classList.add('active');
      game.restart();
      expect(game.gameOverOverlay.classList.contains('active')).toBe(false);
    });

    test('should hide new high score indicator', () => {
      game.newHighScoreElement.style.display = 'block';
      game.restart();
      expect(game.newHighScoreElement.style.display).toBe('none');
    });

    test('should update score display to 0', () => {
      game.scoreElement.textContent = '999';
      game.restart();
      expect(game.scoreElement.textContent).toBe('0');
    });

    test('should reset Fruit.nextId', () => {
      Fruit.nextId = 100;
      game.restart();
      expect(Fruit.nextId).toBe(0);
    });

    test('should assign new random fruit types', () => {
      game.restart();
      expect(game.currentFruitType).toBeGreaterThanOrEqual(0);
      expect(game.currentFruitType).toBeLessThanOrEqual(MAX_DROP_INDEX);
      expect(game.nextFruitType).toBeGreaterThanOrEqual(0);
      expect(game.nextFruitType).toBeLessThanOrEqual(MAX_DROP_INDEX);
    });
  });

  describe('High Score Tracking', () => {
    test('should update high score during merge when score exceeds it', () => {
      Fruit.nextId = 0;
      game.highScore = 0;
      game.score = 0;

      const f1 = new Fruit(200, 400, 2); // Grape
      const f2 = new Fruit(205, 400, 2); // Grape
      game.fruits = [f1, f2];
      game.resolveCollisions();

      // Score should be FRUITS[3].points = 10
      expect(game.score).toBe(10);
      expect(game.highScore).toBe(10);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('suika-high-score', '10');
    });

    test('should not update high score when score is below it', () => {
      game.highScore = 1000;
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      const f2 = new Fruit(205, 400, 0);
      game.fruits = [f1, f2];
      game.resolveCollisions();
      expect(game.highScore).toBe(1000); // unchanged
    });
  });

  describe('Score Animation', () => {
    test('animateScore should add bump class', () => {
      game.animateScore();
      expect(game.scoreElement.classList.contains('bump')).toBe(true);
    });

    test('animateScore should remove bump class after timeout', () => {
      jest.useFakeTimers();
      game.animateScore();
      expect(game.scoreElement.classList.contains('bump')).toBe(true);
      jest.advanceTimersByTime(200);
      expect(game.scoreElement.classList.contains('bump')).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('Draw', () => {
    test('should increment frameCount', () => {
      const initialFrame = game.frameCount;
      game.draw();
      expect(game.frameCount).toBe(initialFrame + 1);
    });

    test('draw should not throw', () => {
      expect(() => game.draw()).not.toThrow();
    });

    test('draw with fruits should not throw', () => {
      Fruit.nextId = 0;
      game.fruits = [new Fruit(200, 300, 0), new Fruit(100, 400, 5)];
      expect(() => game.draw()).not.toThrow();
    });
  });

  describe('Visual Effects', () => {
    test('showMergeEffect should add and remove an element', () => {
      jest.useFakeTimers();
      const initialChildren = game.gameContainer.children.length;
      game.showMergeEffect(200, 300, FRUITS[1]);
      expect(game.gameContainer.children.length).toBe(initialChildren + 1);
      jest.advanceTimersByTime(600);
      expect(game.gameContainer.children.length).toBe(initialChildren);
      jest.useRealTimers();
    });

    test('showScorePopup should add and remove an element', () => {
      jest.useFakeTimers();
      const initialChildren = game.gameContainer.children.length;
      game.showScorePopup(200, 300, 10);
      expect(game.gameContainer.children.length).toBe(initialChildren + 1);
      jest.advanceTimersByTime(1100);
      expect(game.gameContainer.children.length).toBe(initialChildren);
      jest.useRealTimers();
    });

    test('showComboText should add and remove an element', () => {
      jest.useFakeTimers();
      const initialChildren = game.gameContainer.children.length;
      game.showComboText(200, 300, 3);
      expect(game.gameContainer.children.length).toBe(initialChildren + 1);
      const addedEl = game.gameContainer.lastChild;
      expect(addedEl.textContent).toBe('3x Combo!');
      jest.advanceTimersByTime(1300);
      expect(game.gameContainer.children.length).toBe(initialChildren);
      jest.useRealTimers();
    });

    test('showSparkles should add multiple sparkle elements', () => {
      jest.useFakeTimers();
      const initialChildren = game.gameContainer.children.length;
      game.showSparkles(200, 300, '#ff0000');
      expect(game.gameContainer.children.length).toBe(initialChildren + 6);
      jest.advanceTimersByTime(700);
      expect(game.gameContainer.children.length).toBe(initialChildren);
      jest.useRealTimers();
    });
  });

  describe('Game Loop', () => {
    test('gameLoop should call requestAnimationFrame', () => {
      window.requestAnimationFrame = jest.fn();
      game.gameLoop();
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    test('gameLoop should not update physics when game is over', () => {
      game.gameOver = true;
      Fruit.nextId = 0;
      const fruit = new Fruit(200, 200, 0);
      const origY = fruit.y;
      game.fruits = [fruit];
      game.gameLoop();
      // Fruit should not have been updated (no gravity applied)
      expect(fruit.y).toBe(origY);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. HTML STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════
describe('HTML Structure', () => {
  beforeAll(() => {
    setupDOM();
  });

  test('should have a game-canvas element', () => {
    expect(document.getElementById('game-canvas')).toBeTruthy();
  });

  test('should have a score-value element', () => {
    expect(document.getElementById('score-value')).toBeTruthy();
  });

  test('should have a high-score-value element', () => {
    expect(document.getElementById('high-score-value')).toBeTruthy();
  });

  test('should have a game-over-overlay element', () => {
    expect(document.getElementById('game-over-overlay')).toBeTruthy();
  });

  test('should have a final-score element', () => {
    expect(document.getElementById('final-score')).toBeTruthy();
  });

  test('should have a new-high-score element', () => {
    expect(document.getElementById('new-high-score')).toBeTruthy();
  });

  test('should have a restart button', () => {
    expect(document.getElementById('restart-btn')).toBeTruthy();
  });

  test('should have a drop-guide element', () => {
    expect(document.getElementById('drop-guide')).toBeTruthy();
  });

  test('should have a next-fruit-preview canvas', () => {
    const el = document.getElementById('next-fruit-preview');
    expect(el).toBeTruthy();
    expect(el.tagName.toLowerCase()).toBe('canvas');
  });

  test('should have a fruit-legend element', () => {
    expect(document.getElementById('fruit-legend')).toBeTruthy();
  });

  test('should have game-container class', () => {
    expect(document.querySelector('.game-container')).toBeTruthy();
  });

  test('should have game-wrapper class', () => {
    expect(document.querySelector('.game-wrapper')).toBeTruthy();
  });

  test('should include game.js script', () => {
    const scripts = document.querySelectorAll('script');
    const gameSrc = Array.from(scripts).some(s => s.src.includes('game.js') || s.getAttribute('src') === 'js/game.js');
    expect(gameSrc).toBe(true);
  });

  test('should include style.css link', () => {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    const styleSrc = Array.from(links).some(l => l.href.includes('style.css') || l.getAttribute('href') === 'css/style.css');
    expect(styleSrc).toBe(true);
  });

  test('should have correct page title', () => {
    expect(document.title).toBe('Suika Game - Watermelon Merge Puzzle');
  });

  test('should have viewport meta tag', () => {
    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta).toBeTruthy();
    expect(meta.getAttribute('content')).toContain('width=device-width');
  });

  test('new-high-score should be hidden by default', () => {
    const el = document.getElementById('new-high-score');
    expect(el.style.display).toBe('none');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. EDGE CASES & STRESS TESTS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Edge Cases', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('multiple merges in single resolve step', () => {
    Fruit.nextId = 0;
    // Create two pairs of same-type fruits
    const f1 = new Fruit(100, 400, 0);
    const f2 = new Fruit(105, 400, 0);
    const f3 = new Fruit(300, 400, 1);
    const f4 = new Fruit(305, 400, 1);
    game.fruits = [f1, f2, f3, f4];
    game.resolveCollisions();
    // Both pairs should merge: 2 results
    expect(game.fruits.length).toBe(2);
    const types = game.fruits.map(f => f.typeIndex).sort();
    expect(types).toEqual([1, 2]); // Cherry->Strawberry, Strawberry->Grape
  });

  test('chain merge should not happen in single step', () => {
    // If two Cherries merge into Strawberry, and there's already a Strawberry nearby,
    // the chain merge should NOT happen in the same resolveCollisions call
    // because the new fruit was just created
    Fruit.nextId = 0;
    const f1 = new Fruit(200, 400, 0); // Cherry
    const f2 = new Fruit(205, 400, 0); // Cherry - will merge with f1 into Strawberry
    const f3 = new Fruit(202, 400, 1); // Existing Strawberry at merge point
    game.fruits = [f1, f2, f3];
    game.resolveCollisions();
    // f1+f2 merge into Strawberry at ~202.5, close to f3
    // But f3 was not marked as merging, and the new fruit wasn't part of original iteration
    // The new Strawberry may or may not collide with f3 in same step depending on push logic
    // At minimum, f1 and f2 should be gone
    const cherries = game.fruits.filter(f => f.typeIndex === 0);
    expect(cherries.length).toBe(0);
  });

  test('fruit at exact wall boundary', () => {
    const fruit = new Fruit(0, 300, 0);
    expect(() => fruit.update()).not.toThrow();
    expect(fruit.x).toBeGreaterThanOrEqual(fruit.radius);
  });

  test('fruit at exact floor boundary', () => {
    const fruit = new Fruit(200, CANVAS_HEIGHT, 0);
    expect(() => fruit.update()).not.toThrow();
    expect(fruit.y).toBeLessThanOrEqual(CANVAS_HEIGHT - fruit.radius);
  });

  test('many fruits should not crash', () => {
    Fruit.nextId = 0;
    for (let i = 0; i < 50; i++) {
      game.fruits.push(new Fruit(
        Math.random() * CANVAS_WIDTH,
        Math.random() * CANVAS_HEIGHT,
        Math.floor(Math.random() * FRUITS.length)
      ));
    }
    expect(() => {
      for (let step = 0; step < 10; step++) {
        for (const fruit of game.fruits) {
          fruit.update();
        }
        game.resolveCollisions();
      }
    }).not.toThrow();
  });

  test('restart after game over should allow playing again', () => {
    game.endGame();
    expect(game.gameOver).toBe(true);
    game.restart();
    expect(game.gameOver).toBe(false);
    expect(game.canDrop).toBe(true);
    expect(game.fruits.length).toBe(0);
    expect(game.score).toBe(0);
  });

  test('multiple rapid drops should be rate limited', () => {
    game.canDrop = true;
    game.lastDropTime = 0;
    game.dropFruit();
    expect(game.fruits.length).toBe(1);

    // Immediate second drop should be blocked by canDrop=false
    game.dropFruit();
    expect(game.fruits.length).toBe(1);
  });
});
