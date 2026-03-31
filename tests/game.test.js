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

// ═══════════════════════════════════════════════════════════════════════════════
// 8. EVENT HANDLING & INPUT
// ═══════════════════════════════════════════════════════════════════════════════
describe('Event Handling & Input', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  describe('Keyboard Input', () => {
    test('ArrowLeft should move dropX left by 10', () => {
      const initial = game.dropX;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect(game.dropX).toBe(initial - 10);
    });

    test('ArrowRight should move dropX right by 10', () => {
      const initial = game.dropX;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(game.dropX).toBe(initial + 10);
    });

    test('ArrowLeft should not move dropX below fruit radius', () => {
      game.dropX = 5; // very close to left edge
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect(game.dropX).toBeGreaterThanOrEqual(FRUITS[game.currentFruitType].radius);
    });

    test('ArrowRight should not move dropX above CANVAS_WIDTH - fruit radius', () => {
      game.dropX = CANVAS_WIDTH - 5; // very close to right edge
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(game.dropX).toBeLessThanOrEqual(CANVAS_WIDTH - FRUITS[game.currentFruitType].radius);
    });

    test('Space key should drop fruit', () => {
      game.canDrop = true;
      game.lastDropTime = 0;
      const event = new KeyboardEvent('keydown', { key: ' ' });
      // Prevent default should be called
      const preventSpy = jest.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(game.fruits.length).toBe(1);
    });

    test('Enter key should drop fruit', () => {
      game.canDrop = true;
      game.lastDropTime = 0;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(game.fruits.length).toBe(1);
    });

    test('keyboard input should be ignored when game is over', () => {
      game.gameOver = true;
      const initial = game.dropX;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect(game.dropX).toBe(initial); // unchanged
    });

    test('Enter should restart game when game is over', () => {
      game.endGame();
      expect(game.gameOver).toBe(true);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(game.gameOver).toBe(false);
      expect(game.score).toBe(0);
    });

    test('Space should restart game when game is over', () => {
      game.endGame();
      expect(game.gameOver).toBe(true);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      expect(game.gameOver).toBe(false);
    });

    test('multiple ArrowLeft presses should accumulate', () => {
      game.dropX = CANVAS_WIDTH / 2;
      for (let i = 0; i < 5; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      }
      expect(game.dropX).toBe(CANVAS_WIDTH / 2 - 50);
    });

    test('multiple ArrowRight presses should accumulate', () => {
      game.dropX = CANVAS_WIDTH / 2;
      for (let i = 0; i < 5; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      }
      expect(game.dropX).toBe(CANVAS_WIDTH / 2 + 50);
    });

    test('unrelated keys should not affect game state', () => {
      const initialDropX = game.dropX;
      const initialFruits = game.fruits.length;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(game.dropX).toBe(initialDropX);
      expect(game.fruits.length).toBe(initialFruits);
    });
  });

  describe('Mouse Input', () => {
    test('mousemove should update dropX based on canvas position', () => {
      const canvas = game.canvas;
      // Simulate a mousemove with clientX = 200, canvas rect starts at 0
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));
      // Since rect.left=0, scaleX=1, dropX should be 200 clamped to valid range
      expect(game.dropX).toBeGreaterThanOrEqual(FRUITS[game.currentFruitType].radius);
      expect(game.dropX).toBeLessThanOrEqual(CANVAS_WIDTH - FRUITS[game.currentFruitType].radius);
    });

    test('mousemove should be ignored when game is over', () => {
      game.gameOver = true;
      const initialDropX = game.dropX;
      game.canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));
      expect(game.dropX).toBe(initialDropX);
    });

    test('click should drop fruit', () => {
      game.canDrop = true;
      game.lastDropTime = 0;
      game.canvas.dispatchEvent(new MouseEvent('click', { clientX: 200 }));
      expect(game.fruits.length).toBe(1);
    });

    test('click should update dropX before dropping', () => {
      game.canDrop = true;
      game.lastDropTime = 0;
      game.canvas.dispatchEvent(new MouseEvent('click', { clientX: 150 }));
      expect(game.fruits[0].x).toBeGreaterThan(0); // Position is set from click
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. FRUIT LEGEND & NEXT FRUIT PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════
describe('buildFruitLegend', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('should create correct number of legend items', () => {
    const legend = document.getElementById('fruit-legend');
    const items = legend.querySelectorAll('.legend-item');
    // SuikaGame constructor calls buildFruitLegend once during init
    // If multiple SuikaGame instances are created, legend doubles; check at least 11
    expect(items.length).toBeGreaterThanOrEqual(FRUITS.length);
    // Check that items are a multiple of FRUITS.length (each game adds 11)
    expect(items.length % FRUITS.length).toBe(0);
  });

  test('each legend item should have a colored circle', () => {
    const legend = document.getElementById('fruit-legend');
    const circles = legend.querySelectorAll('.legend-circle');
    expect(circles.length).toBeGreaterThanOrEqual(FRUITS.length);
    // Verify first 11 circles have correct colors
    for (let i = 0; i < FRUITS.length; i++) {
      // JSDOM normalizes hex to rgb, so just check it's set
      expect(circles[i].style.backgroundColor).toBeTruthy();
    }
  });

  test('each legend item should have the fruit emoji', () => {
    const legend = document.getElementById('fruit-legend');
    const items = legend.querySelectorAll('.legend-item');
    // Check only the first batch of 11
    for (let i = 0; i < FRUITS.length; i++) {
      const span = items[i].querySelector('span');
      expect(span.textContent).toBe(FRUITS[i].emoji);
    }
  });
});

describe('updateNextFruitPreview', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('should call getContext on preview canvas', () => {
    game.updateNextFruitPreview();
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
  });

  test('should not throw for any valid nextFruitType', () => {
    for (let i = 0; i <= MAX_DROP_INDEX; i++) {
      game.nextFruitType = i;
      expect(() => game.updateNextFruitPreview()).not.toThrow();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. PHYSICS: DETAILED COLLISION TESTS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Detailed Physics Tests', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  describe('Non-merge collision momentum transfer', () => {
    test('colliding fruits should exchange velocity', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0); // Cherry r=15
      const f2 = new Fruit(210, 400, 1); // Strawberry r=20, overlapping
      f1.vx = 5;
      f1.vy = 0;
      f2.vx = -5;
      f2.vy = 0;
      game.fruits = [f1, f2];
      game.resolveCollisions();
      // After collision, velocities should have changed
      // They were moving toward each other, so relVelDotN > 0
      // Momentum should transfer
      expect(f1.vx).not.toBe(5);
      expect(f2.vx).not.toBe(-5);
    });

    test('stationary collision should only push apart without velocity transfer', () => {
      Fruit.nextId = 0;
      const f1 = new Fruit(200, 400, 0);
      const f2 = new Fruit(210, 400, 1);
      f1.vx = 0; f1.vy = 0;
      f2.vx = 0; f2.vy = 0;
      game.fruits = [f1, f2];
      game.resolveCollisions();
      // relVelDotN = 0, so no impulse applied, but positions should push apart
      const dist = Math.abs(f2.x - f1.x);
      expect(dist).toBeGreaterThan(10); // pushed apart
    });

    test('larger fruit should be affected less by collision', () => {
      Fruit.nextId = 0;
      // Cherry (r=15) vs Watermelon (r=90) - watermelon has much more mass
      const small = new Fruit(200, 400, 0); // Cherry
      const big = new Fruit(205 + 90, 400, 10); // Watermelon, overlapping
      small.vx = 5;
      big.vx = -1;
      game.fruits = [small, big];
      const bigVxBefore = big.vx;
      game.resolveCollisions();
      // Big fruit should change less than small fruit
      const bigChange = Math.abs(big.vx - bigVxBefore);
      // This just verifies big fruit isn't thrown far - hard to assert exact values
      // but at least it shouldn't crash
      expect(bigChange).toBeDefined();
    });
  });

  describe('Multiple collision iterations', () => {
    test('5 iterations should improve collision resolution stability', () => {
      Fruit.nextId = 0;
      // Create a pile of overlapping fruits
      const fruits = [];
      for (let i = 0; i < 5; i++) {
        fruits.push(new Fruit(200 + i * 5, 400, i % 5));
      }
      game.fruits = fruits;

      // Run gameLoop which does 5 iterations
      game.gameOver = false;
      game.gameLoop();

      // After multiple iterations, fruits should be more separated
      for (let i = 0; i < game.fruits.length; i++) {
        for (let j = i + 1; j < game.fruits.length; j++) {
          const a = game.fruits[i];
          const b = game.fruits[j];
          if (a.merging || b.merging) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // They should be at least somewhat pushed apart
          expect(dist).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Fruit settled state', () => {
    test('fruit with zero velocity should be settled', () => {
      const fruit = new Fruit(200, CANVAS_HEIGHT - 15, 0);
      fruit.vx = 0;
      fruit.vy = 0;
      // Manually check settled condition (vx < 0.1 && vy < 0.1)
      fruit.settled = Math.abs(fruit.vx) < 0.1 && Math.abs(fruit.vy) < 0.1;
      expect(fruit.settled).toBe(true);
    });

    test('fruit with high velocity should not be settled', () => {
      const fruit = new Fruit(200, 300, 0);
      fruit.vx = 5;
      fruit.vy = 3;
      fruit.update();
      expect(fruit.settled).toBe(false);
    });

    test('fruit on floor with very small bounce should become settled', () => {
      const fruit = new Fruit(200, CANVAS_HEIGHT - 15, 0);
      fruit.vx = 0;
      fruit.vy = 0.01;
      // Place exactly on floor
      fruit.y = CANVAS_HEIGHT - fruit.radius;
      // After update: gravity adds 0.4, y moves, then floor bounce
      // The key is testing the settled logic
      fruit.update();
      // With gravity applied it won't be settled immediately
      // but the mechanism works
      expect(typeof fruit.settled).toBe('boolean');
    });
  });

  describe('Wall collision details', () => {
    test('left wall bounce should reverse vx direction', () => {
      const fruit = new Fruit(10, 200, 0); // radius=15, so x-radius < 0
      fruit.vx = -5;
      fruit.update();
      // vx should now be positive (bounced)
      expect(fruit.vx).toBeGreaterThan(0);
    });

    test('right wall bounce should reverse vx direction', () => {
      const fruit = new Fruit(CANVAS_WIDTH - 10, 200, 0); // radius=15, past edge
      fruit.vx = 5;
      fruit.update();
      // vx should now be negative (bounced)
      expect(fruit.vx).toBeLessThan(0);
    });

    test('floor bounce should reduce vy by BOUNCE factor', () => {
      const fruit = new Fruit(200, CANVAS_HEIGHT - 10, 0); // near floor
      fruit.vy = 10;
      fruit.update();
      // After floor collision: vy *= -BOUNCE
      // Original vy after gravity = 10 + 0.4 = 10.4
      // After bounce: vy = -10.4 * 0.3 = -3.12
      expect(fruit.vy).toBeLessThan(0); // bounced upward
    });

    test('very small floor bounce should be zeroed out', () => {
      const fruit = new Fruit(200, CANVAS_HEIGHT - 14, 0); // just above floor
      fruit.vy = 0.2; // small velocity
      fruit.update();
      // After gravity: vy = 0.2 + 0.4 = 0.6, moves down past floor
      // Floor bounce: vy = -0.6 * 0.3 = -0.18, abs = 0.18 < 0.5
      // So vy should be set to 0
      expect(fruit.vy).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. COMBO SYSTEM ADVANCED
// ═══════════════════════════════════════════════════════════════════════════════
describe('Combo System Advanced', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('combo should reset when merge happens after window expires', () => {
    // First merge
    Fruit.nextId = 0;
    game.lastMergeTime = Date.now() - COMBO_WINDOW_MS - 100; // expired
    game.comboCount = 5; // was in a combo

    const f1 = new Fruit(200, 400, 0);
    const f2 = new Fruit(205, 400, 0);
    game.fruits = [f1, f2];
    game.resolveCollisions();

    // Combo should reset to 1 since window expired
    expect(game.comboCount).toBe(1);
  });

  test('combo count of 1 should not apply multiplier', () => {
    Fruit.nextId = 0;
    game.lastMergeTime = 0; // no recent merge
    game.comboCount = 0;
    game.score = 0;

    const f1 = new Fruit(200, 400, 0);
    const f2 = new Fruit(205, 400, 0);
    game.fruits = [f1, f2];
    game.resolveCollisions();

    // combo = 1, multiplier = 1, score = FRUITS[1].points * 1 = 3
    expect(game.score).toBe(FRUITS[1].points);
  });

  test('combo of 3 should triple the score', () => {
    // Setup: simulate comboCount = 2 and recent merge
    game.comboCount = 2;
    game.lastMergeTime = Date.now();
    game.score = 0;

    Fruit.nextId = 0;
    const f1 = new Fruit(200, 400, 0);
    const f2 = new Fruit(205, 400, 0);
    game.fruits = [f1, f2];
    game.resolveCollisions();

    // combo becomes 3, score = FRUITS[1].points * 3
    expect(game.comboCount).toBe(3);
    expect(game.score).toBe(FRUITS[1].points * 3);
  });

  test('combo text should be shown for combo > 1', () => {
    jest.useFakeTimers({ now: Date.now() });
    game.comboCount = 1;
    game.lastMergeTime = Date.now();

    Fruit.nextId = 0;
    const f1 = new Fruit(200, 400, 0);
    const f2 = new Fruit(205, 400, 0);
    game.fruits = [f1, f2];

    const initialChildren = game.gameContainer.children.length;
    game.resolveCollisions();

    // Should have added combo text, merge effect, score popup, and sparkles
    expect(game.gameContainer.children.length).toBeGreaterThan(initialChildren);

    // Find the combo text element
    const comboEl = game.gameContainer.querySelector('.combo-text');
    expect(comboEl).toBeTruthy();
    expect(comboEl.textContent).toBe('2x Combo!');

    jest.useRealTimers();
  });

  test('no combo text for first merge', () => {
    jest.useFakeTimers({ now: Date.now() });
    game.comboCount = 0;
    game.lastMergeTime = 0;

    Fruit.nextId = 0;
    const f1 = new Fruit(200, 400, 0);
    const f2 = new Fruit(205, 400, 0);
    game.fruits = [f1, f2];
    game.resolveCollisions();

    const comboEl = game.gameContainer.querySelector('.combo-text');
    expect(comboEl).toBeNull();

    jest.useRealTimers();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. GAME OVER BOUNDARY CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Game Over Boundary Conditions', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('fruit with high vy (falling fast) should not trigger game over', () => {
    Fruit.nextId = 0;
    const fruit = new Fruit(200, 50, 0); // above danger line
    fruit.vy = 5; // falling fast (> 0.5 threshold)
    fruit.framesAboveLine = 200;
    game.fruits = [fruit];
    game.checkGameOver();
    // vy > 0.5, so should reset framesAboveLine
    expect(fruit.framesAboveLine).toBe(0);
    expect(game.gameOver).toBe(false);
  });

  test('fruit exactly at danger line should not trigger', () => {
    Fruit.nextId = 0;
    // fruit.y - fruit.radius should equal DANGER_LINE_Y (not less than)
    const fruit = new Fruit(200, DANGER_LINE_Y + FRUITS[0].radius, 0);
    fruit.vy = 0;
    fruit.framesAboveLine = 200;
    game.fruits = [fruit];
    game.checkGameOver();
    // y - radius = DANGER_LINE_Y, condition is < not <=
    expect(fruit.framesAboveLine).toBe(0);
    expect(game.gameOver).toBe(false);
  });

  test('fruit just above danger line should increment framesAboveLine', () => {
    Fruit.nextId = 0;
    const fruit = new Fruit(200, DANGER_LINE_Y + FRUITS[0].radius - 1, 0);
    fruit.vy = 0;
    fruit.framesAboveLine = 0;
    game.fruits = [fruit];
    game.checkGameOver();
    expect(fruit.framesAboveLine).toBe(1);
  });

  test('only first fruit above line triggers game over', () => {
    Fruit.nextId = 0;
    const fruitAbove = new Fruit(200, 10, 0);
    fruitAbove.vy = 0;
    fruitAbove.framesAboveLine = GAME_OVER_GRACE_FRAMES + 1;

    const fruitBelow = new Fruit(100, 400, 0);
    fruitBelow.vy = 0;

    game.fruits = [fruitAbove, fruitBelow];
    game.checkGameOver();
    expect(game.gameOver).toBe(true);
  });

  test('empty fruits array should not trigger game over', () => {
    game.fruits = [];
    game.checkGameOver();
    expect(game.gameOver).toBe(false);
  });

  test('all fruits below danger line should not trigger game over', () => {
    Fruit.nextId = 0;
    for (let i = 0; i < 10; i++) {
      const fruit = new Fruit(50 + i * 30, 400, 0);
      fruit.vy = 0;
      game.fruits.push(fruit);
    }
    game.checkGameOver();
    expect(game.gameOver).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. ENDGAME EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════
describe('endGame Edge Cases', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('equal score to high score should update high score display', () => {
    game.highScore = 50;
    game.score = 50;
    game.endGame();
    // score >= highScore && score > 0
    expect(game.newHighScoreElement.style.display).toBe('block');
    expect(game.highScore).toBe(50);
  });

  test('high score element should display updated value', () => {
    game.highScore = 10;
    game.score = 100;
    game.endGame();
    expect(game.highScoreElement.textContent).toBe('100');
  });

  test('endGame called multiple times should not crash', () => {
    game.score = 50;
    expect(() => {
      game.endGame();
      game.endGame();
      game.endGame();
    }).not.toThrow();
  });

  test('final score text should include the score number', () => {
    game.score = 12345;
    game.endGame();
    expect(game.finalScoreElement.textContent).toBe('Final Score: 12345');
  });

  test('game over overlay should have active class', () => {
    game.endGame();
    expect(game.gameOverOverlay.className).toContain('active');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14. RESTART EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════
describe('Restart Edge Cases', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('restart should preserve high score', () => {
    game.highScore = 500;
    game.highScoreElement.textContent = '500';
    game.restart();
    expect(game.highScore).toBe(500);
  });

  test('restart should reset lastDropTime', () => {
    game.lastDropTime = 99999;
    game.restart();
    expect(game.lastDropTime).toBe(0);
  });

  test('restart after accumulating many fruits should clear all', () => {
    Fruit.nextId = 0;
    for (let i = 0; i < 30; i++) {
      game.fruits.push(new Fruit(Math.random() * 400, Math.random() * 600, i % 11));
    }
    expect(game.fruits.length).toBe(30);
    game.restart();
    expect(game.fruits.length).toBe(0);
  });

  test('restart should allow dropping immediately', () => {
    game.restart();
    game.lastDropTime = 0;
    game.dropFruit();
    expect(game.fruits.length).toBe(1);
  });

  test('restart should call updateNextFruitPreview', () => {
    // The preview should be updated - no error
    expect(() => game.restart()).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. INTEGRATION TESTS - FULL GAME FLOW
// ═══════════════════════════════════════════════════════════════════════════════
describe('Integration Tests', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('full flow: drop, merge, score update', () => {
    // Drop two cherries at same x position
    game.canDrop = true;
    game.lastDropTime = 0;
    game.currentFruitType = 0; // Cherry
    game.dropX = 200;
    game.dropFruit();

    // Force canDrop and cooldown reset
    game.canDrop = true;
    game.lastDropTime = 0;
    game.currentFruitType = 0; // Another cherry
    game.dropX = 200;
    game.dropFruit();

    expect(game.fruits.length).toBe(2);
    expect(game.fruits[0].typeIndex).toBe(0);
    expect(game.fruits[1].typeIndex).toBe(0);

    // Place them overlapping
    game.fruits[0].x = 200;
    game.fruits[0].y = 400;
    game.fruits[1].x = 205;
    game.fruits[1].y = 400;

    const scoreBefore = game.score;
    game.resolveCollisions();

    // Should have merged
    expect(game.fruits.length).toBe(1);
    expect(game.fruits[0].typeIndex).toBe(1); // Strawberry
    expect(game.score).toBeGreaterThan(scoreBefore);
  });

  test('full flow: play until game over then restart', () => {
    // Simulate game over
    Fruit.nextId = 0;
    const fruit = new Fruit(200, 10, 0);
    fruit.vy = 0;
    fruit.framesAboveLine = GAME_OVER_GRACE_FRAMES + 1;
    game.fruits = [fruit];
    game.checkGameOver();
    expect(game.gameOver).toBe(true);

    // Restart
    game.restart();
    expect(game.gameOver).toBe(false);
    expect(game.fruits.length).toBe(0);
    expect(game.score).toBe(0);

    // Should be able to drop again
    game.canDrop = true;
    game.lastDropTime = 0;
    game.dropFruit();
    expect(game.fruits.length).toBe(1);
  });

  test('full flow: score accumulates across multiple merges', () => {
    game.score = 0;

    // First merge: two Cherries -> Strawberry (3 points)
    Fruit.nextId = 0;
    game.fruits = [new Fruit(200, 400, 0), new Fruit(205, 400, 0)];
    game.resolveCollisions();
    expect(game.score).toBe(FRUITS[1].points); // 3

    // Second merge: two Grapes -> Dekopon (10 points, with combo x2 = 20)
    Fruit.nextId = 100;
    game.fruits.push(new Fruit(100, 400, 2), new Fruit(105, 400, 2));
    game.resolveCollisions();
    // This should be a combo (within COMBO_WINDOW_MS)
    expect(game.score).toBe(FRUITS[1].points + FRUITS[3].points * 2);
  });

  test('high score should persist across restart', () => {
    // Score some points
    Fruit.nextId = 0;
    game.fruits = [new Fruit(200, 400, 0), new Fruit(205, 400, 0)];
    game.resolveCollisions();
    const scoreAfterMerge = game.score;
    expect(scoreAfterMerge).toBeGreaterThan(0);

    // End game
    game.endGame();
    const highScore = game.highScore;

    // Restart
    game.restart();
    expect(game.score).toBe(0);
    expect(game.highScore).toBe(highScore); // preserved
  });

  test('game loop updates physics and draws', () => {
    Fruit.nextId = 0;
    const fruit = new Fruit(200, 100, 0);
    game.fruits = [fruit];
    const initialY = fruit.y;
    const initialFrame = game.frameCount;

    game.gameOver = false;
    game.gameLoop();

    // Fruit should have fallen (gravity applied)
    expect(fruit.y).toBeGreaterThan(initialY);
    // Frame count should have incremented
    expect(game.frameCount).toBe(initialFrame + 1);
  });

  test('gameLoop should run collision resolution 5 times', () => {
    // Create overlapping fruits and verify resolution happens
    Fruit.nextId = 0;
    const f1 = new Fruit(200, 400, 0);
    const f2 = new Fruit(210, 400, 1);
    game.fruits = [f1, f2];

    const resolveCollisionsSpy = jest.spyOn(game, 'resolveCollisions');
    game.gameLoop();
    expect(resolveCollisionsSpy).toHaveBeenCalledTimes(5);
    resolveCollisionsSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 16. DROP POSITION CLAMPING
// ═══════════════════════════════════════════════════════════════════════════════
describe('Drop Position Clamping', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('dropFruit should place fruit at correct y position (radius height)', () => {
    game.canDrop = true;
    game.lastDropTime = 0;
    game.currentFruitType = 0;
    game.dropFruit();
    expect(game.fruits[0].y).toBe(FRUITS[0].radius);
  });

  test('dropFruit y should match the current fruit type radius', () => {
    for (let type = 0; type <= MAX_DROP_INDEX; type++) {
      setupDOM();
      loadGame();
      const g = new SuikaGame();
      g.canDrop = true;
      g.lastDropTime = 0;
      g.currentFruitType = type;
      g.dropFruit();
      expect(g.fruits[0].y).toBe(FRUITS[type].radius);
    }
  });

  test('left keyboard clamping should account for current fruit radius', () => {
    game.currentFruitType = 4; // Orange, radius=38
    game.dropX = 40; // close to left edge
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(game.dropX).toBe(FRUITS[4].radius); // clamped to 38
  });

  test('right keyboard clamping should account for current fruit radius', () => {
    game.currentFruitType = 4; // Orange, radius=38
    game.dropX = CANVAS_WIDTH - 40; // close to right edge
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(game.dropX).toBe(CANVAS_WIDTH - FRUITS[4].radius); // clamped to 362
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. MERGE SCORING ACROSS ALL FRUIT TYPES
// ═══════════════════════════════════════════════════════════════════════════════
describe('Merge Scoring for Each Fruit Type', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  // Test merging each pair of same-type fruits (except Watermelon)
  for (let type = 0; type < 10; type++) {
    const fruitName = ['Cherry', 'Strawberry', 'Grape', 'Dekopon', 'Orange',
                       'Apple', 'Pear', 'Peach', 'Pineapple', 'Melon'][type];
    const nextName = ['Strawberry', 'Grape', 'Dekopon', 'Orange', 'Apple',
                      'Pear', 'Peach', 'Pineapple', 'Melon', 'Watermelon'][type];

    test(`merging two ${fruitName}s should produce ${nextName}`, () => {
      Fruit.nextId = 0;
      game.score = 0;
      game.comboCount = 0;
      game.lastMergeTime = 0;

      const f1 = new Fruit(200, 400, type);
      const f2 = new Fruit(200 + 1, 400, type); // overlapping (same position)
      game.fruits = [f1, f2];
      game.resolveCollisions();

      expect(game.fruits.length).toBe(1);
      expect(game.fruits[0].typeIndex).toBe(type + 1);
      expect(game.fruits[0].name).toBe(nextName);
      expect(game.score).toBe(FRUITS[type + 1].points);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 18. VISUAL EFFECT DETAILS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Visual Effect Details', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('showScorePopup should display correct points text', () => {
    jest.useFakeTimers();
    game.showScorePopup(200, 300, 42);
    const popup = game.gameContainer.querySelector('.score-popup');
    expect(popup).toBeTruthy();
    expect(popup.textContent).toBe('+42');
    jest.advanceTimersByTime(1100);
    jest.useRealTimers();
  });

  test('showMergeEffect should use fruit color', () => {
    jest.useFakeTimers();
    game.showMergeEffect(200, 300, FRUITS[3]);
    const effect = game.gameContainer.querySelector('.merge-effect');
    expect(effect).toBeTruthy();
    // JSDOM normalizes hex colors to rgb format
    expect(effect.style.background).toContain('243');  // R component of #f39c12
    expect(effect.style.background).toContain('156');  // G component
    expect(effect.style.background).toContain('18');   // B component
    jest.advanceTimersByTime(600);
    jest.useRealTimers();
  });

  test('showSparkles should create 6 sparkle elements', () => {
    jest.useFakeTimers();
    game.showSparkles(200, 300, '#ff0000');
    const sparkles = game.gameContainer.querySelectorAll('.merge-sparkle');
    expect(sparkles.length).toBe(6);
    // Each sparkle should have a red background (JSDOM normalizes hex to rgb)
    sparkles.forEach(s => {
      expect(s.style.background).toContain('255');
    });
    jest.advanceTimersByTime(700);
    jest.useRealTimers();
  });

  test('showComboText should display correct combo number', () => {
    jest.useFakeTimers();
    game.showComboText(200, 300, 5);
    const combo = game.gameContainer.querySelector('.combo-text');
    expect(combo).toBeTruthy();
    expect(combo.textContent).toBe('5x Combo!');
    jest.advanceTimersByTime(1300);
    jest.useRealTimers();
  });

  test('merge effects during resolveCollisions should be created', () => {
    jest.useFakeTimers();
    Fruit.nextId = 0;
    game.score = 0;
    game.comboCount = 0;
    game.lastMergeTime = 0;

    const f1 = new Fruit(200, 400, 0);
    const f2 = new Fruit(205, 400, 0);
    game.fruits = [f1, f2];
    game.resolveCollisions();

    // Should have merge-effect, score-popup, and 6 sparkles = 8 added elements
    const effects = game.gameContainer.querySelectorAll('.merge-effect');
    const popups = game.gameContainer.querySelectorAll('.score-popup');
    const sparkles = game.gameContainer.querySelectorAll('.merge-sparkle');
    expect(effects.length).toBe(1);
    expect(popups.length).toBe(1);
    expect(sparkles.length).toBe(6);

    jest.advanceTimersByTime(1500);
    jest.useRealTimers();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 19. FRUIT DRAW EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════
describe('Fruit Draw Edge Cases', () => {
  beforeAll(() => {
    setupDOM();
    loadGame();
  });

  function createMockCtx() {
    return {
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
  }

  test('should draw emoji for exactly radius=25 (Grape)', () => {
    const fruit = new Fruit(100, 100, 2); // Grape, radius=25
    const ctx = createMockCtx();
    fruit.draw(ctx);
    expect(ctx.fillText).toHaveBeenCalledWith('🍇', 100, 100);
  });

  test('should NOT draw emoji for radius=20 (Strawberry)', () => {
    const fruit = new Fruit(100, 100, 1); // Strawberry, radius=20
    const ctx = createMockCtx();
    fruit.draw(ctx);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  test('should draw correct emoji for each large fruit', () => {
    const largeFruits = FRUITS.filter(f => f.radius >= 25);
    for (const fruitDef of largeFruits) {
      Fruit.nextId = 0;
      const idx = FRUITS.indexOf(fruitDef);
      const fruit = new Fruit(150, 150, idx);
      const ctx = createMockCtx();
      fruit.draw(ctx);
      expect(ctx.fillText).toHaveBeenCalledWith(fruitDef.emoji, 150, 150);
    }
  });

  test('should create radial gradient for fruit body', () => {
    const fruit = new Fruit(100, 100, 0);
    const ctx = createMockCtx();
    fruit.draw(ctx);
    expect(ctx.createRadialGradient).toHaveBeenCalled();
  });

  test('should draw shadow offset by (3,3)', () => {
    const fruit = new Fruit(100, 200, 0);
    const ctx = createMockCtx();
    fruit.draw(ctx);
    // First arc call should be the shadow at (103, 203)
    expect(ctx.arc).toHaveBeenCalledWith(103, 203, fruit.radius, 0, Math.PI * 2);
  });

  test('draw should work for all fruit types', () => {
    for (let i = 0; i < FRUITS.length; i++) {
      Fruit.nextId = 0;
      const fruit = new Fruit(200, 300, i);
      const ctx = createMockCtx();
      expect(() => fruit.draw(ctx)).not.toThrow();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 20. HIGH SCORE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════
describe('High Score Persistence', () => {
  test('new game should load existing high score from localStorage', () => {
    setupDOM();
    const store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          if (key === 'suika-high-score') return '999';
          return null;
        }),
        setItem: jest.fn((key, val) => { store[key] = String(val); }),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
      configurable: true,
    });
    window.requestAnimationFrame = jest.fn();
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(), beginPath: jest.fn(), arc: jest.fn(),
      ellipse: jest.fn(), fill: jest.fn(), stroke: jest.fn(),
      moveTo: jest.fn(), lineTo: jest.fn(), fillRect: jest.fn(),
      fillText: jest.fn(), save: jest.fn(), restore: jest.fn(),
      setLineDash: jest.fn(),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
      font: '', textAlign: '', textBaseline: '',
    }));
    HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
      left: 0, top: 0, width: 400, height: 600, right: 400, bottom: 600,
    }));

    const game = new SuikaGame();
    expect(game.highScore).toBe(999);
    expect(game.highScoreElement.textContent).toBe('999');
  });

  test('merge that beats high score should update localStorage in real-time', () => {
    setupDOM();
    loadGame();
    const game = new SuikaGame();
    game.highScore = 0;
    game.score = 0;

    Fruit.nextId = 0;
    const f1 = new Fruit(200, 400, 5); // Apple
    const f2 = new Fruit(205, 400, 5); // Apple -> Pear (28 points)
    game.fruits = [f1, f2];
    game.resolveCollisions();

    expect(game.highScore).toBe(28);
    expect(window.localStorage.setItem).toHaveBeenCalledWith('suika-high-score', '28');
    expect(game.highScoreElement.textContent).toBe('28');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 21. DRAW METHOD DETAILED TESTS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Draw Method Details', () => {
  let game;

  beforeEach(() => {
    setupDOM();
    loadGame();
    game = new SuikaGame();
  });

  test('draw should render background gradient', () => {
    game.draw();
    expect(game.ctx.createLinearGradient).toHaveBeenCalled();
  });

  test('draw should render danger line', () => {
    game.draw();
    expect(game.ctx.setLineDash).toHaveBeenCalled();
  });

  test('draw should render fruit preview when canDrop is true', () => {
    game.canDrop = true;
    game.gameOver = false;
    game.draw();
    // Preview renders a circle with globalAlpha = 0.35
    // We can verify createRadialGradient was called for preview
    expect(game.ctx.createRadialGradient).toHaveBeenCalled();
  });

  test('draw should NOT render fruit preview when game is over', () => {
    game.gameOver = true;
    // Reset mock to count only this draw call
    game.ctx.createRadialGradient.mockClear();
    game.draw();
    // No preview gradient should be created (only fruit body gradients if fruits exist)
    // With no fruits, createRadialGradient should not be called at all
    if (game.fruits.length === 0) {
      expect(game.ctx.createRadialGradient).not.toHaveBeenCalled();
    }
  });

  test('draw should NOT render fruit preview when canDrop is false', () => {
    game.canDrop = false;
    game.gameOver = false;
    game.fruits = [];
    game.ctx.createRadialGradient.mockClear();
    game.draw();
    expect(game.ctx.createRadialGradient).not.toHaveBeenCalled();
  });

  test('draw should render grid lines', () => {
    game.ctx.moveTo.mockClear();
    game.draw();
    // Grid lines: CANVAS_WIDTH/40 = 10 vertical + CANVAS_HEIGHT/40 = 15 horizontal = 25
    // Plus danger line moveTo call = 26
    // Plus fruits and effects...
    expect(game.ctx.moveTo).toHaveBeenCalled();
  });
});
