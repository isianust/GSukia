/**
 * Suika Game - Main Game Logic
 *
 * A fruit-merging puzzle game inspired by SuikaGame.com.
 * Two identical fruits merge into a larger fruit when they collide.
 * The game ends when fruits stack above the danger line.
 */

// ─── Fruit Definitions ─────────────────────────────────────────────────────────
const FRUITS = [
  { name: 'Cherry',      radius: 15,  color: '#e74c3c', points: 1,   emoji: '🍒' },
  { name: 'Strawberry',  radius: 20,  color: '#ff6b81', points: 3,   emoji: '🍓' },
  { name: 'Grape',       radius: 25,  color: '#8e44ad', points: 6,   emoji: '🍇' },
  { name: 'Dekopon',     radius: 30,  color: '#f39c12', points: 10,  emoji: '🍊' },
  { name: 'Orange',      radius: 38,  color: '#e67e22', points: 15,  emoji: '🟠' },
  { name: 'Apple',       radius: 45,  color: '#c0392b', points: 21,  emoji: '🍎' },
  { name: 'Pear',        radius: 52,  color: '#a8d648', points: 28,  emoji: '🍐' },
  { name: 'Peach',       radius: 60,  color: '#fd79a8', points: 36,  emoji: '🍑' },
  { name: 'Pineapple',   radius: 68,  color: '#fdcb6e', points: 45,  emoji: '🍍' },
  { name: 'Melon',       radius: 78,  color: '#00b894', points: 55,  emoji: '🍈' },
  { name: 'Watermelon',  radius: 90,  color: '#27ae60', points: 66,  emoji: '🍉' },
];

// Only the first 5 fruit types can be randomly dropped
const MAX_DROP_INDEX = 4;

// ─── Game Constants ─────────────────────────────────────────────────────────────
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.4;
const FRICTION = 0.99;
const BOUNCE = 0.3;
const DANGER_LINE_Y = 80;
const DROP_COOLDOWN_MS = 500;
const GAME_OVER_GRACE_FRAMES = 90; // frames a fruit must be above line before game over

// ─── Physics Body Class ─────────────────────────────────────────────────────────
class Fruit {
  constructor(x, y, typeIndex) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.typeIndex = typeIndex;
    this.radius = FRUITS[typeIndex].radius;
    this.color = FRUITS[typeIndex].color;
    this.points = FRUITS[typeIndex].points;
    this.name = FRUITS[typeIndex].name;
    this.settled = false;
    this.merging = false;
    this.framesAboveLine = 0;
    this.id = Fruit.nextId++;
  }

  update() {
    if (this.merging) return;

    // Apply gravity
    this.vy += GRAVITY;

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Apply friction
    this.vx *= FRICTION;

    // Wall collisions
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx *= -BOUNCE;
    }
    if (this.x + this.radius > CANVAS_WIDTH) {
      this.x = CANVAS_WIDTH - this.radius;
      this.vx *= -BOUNCE;
    }

    // Floor collision
    if (this.y + this.radius > CANVAS_HEIGHT) {
      this.y = CANVAS_HEIGHT - this.radius;
      this.vy *= -BOUNCE;
      if (Math.abs(this.vy) < 0.5) {
        this.vy = 0;
      }
    }

    // Check if settled (low velocity)
    this.settled = Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1;
  }

  draw(ctx) {
    ctx.save();

    // Draw shadow
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + 2, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();

    // Draw fruit body
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.1,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, this.lightenColor(this.color, 40));
    gradient.addColorStop(1, this.color);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = this.darkenColor(this.color, 20);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw highlight
    ctx.beginPath();
    ctx.arc(
      this.x - this.radius * 0.25,
      this.y - this.radius * 0.25,
      this.radius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    // Draw emoji/label for larger fruits
    if (this.radius >= 25) {
      ctx.font = `${Math.floor(this.radius * 0.7)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(FRUITS[this.typeIndex].emoji, this.x, this.y);
    }

    ctx.restore();
  }

  lightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  darkenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

Fruit.nextId = 0;

/**
 * Lighten a hex color by the given amount.
 */
function lightenHex(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

// ─── Game Class ─────────────────────────────────────────────────────────────────
class SuikaGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.fruits = [];
    this.score = 0;
    this.gameOver = false;
    this.dropX = CANVAS_WIDTH / 2;
    this.canDrop = true;
    this.lastDropTime = 0;

    this.currentFruitType = this.randomDropFruit();
    this.nextFruitType = this.randomDropFruit();

    // DOM elements
    this.scoreElement = document.getElementById('score-value');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.finalScoreElement = document.getElementById('final-score');
    this.dropGuide = document.getElementById('drop-guide');
    this.nextFruitPreview = document.getElementById('next-fruit-preview');
    this.gameContainer = document.querySelector('.game-container');

    this.setupEventListeners();
    this.updateNextFruitPreview();
    this.buildFruitLegend();
    // Set initial drop guide position (scaled for current viewport)
    this._updateDropGuide();
    this.gameLoop();
  }

  randomDropFruit() {
    return Math.floor(Math.random() * (MAX_DROP_INDEX + 1));
  }

  setupEventListeners() {
    // Helper: convert client coordinates to internal canvas coordinates
    const clientToCanvas = (clientX) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      return (clientX - rect.left) * scaleX;
    };

    // Helper: update drop guide position (accounts for CSS scaling)
    const updateDropGuide = () => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      this.dropGuide.style.left = (this.dropX / scaleX) + 'px';
    };

    // Mouse movement for drop guide
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.gameOver) return;
      this.dropX = clientToCanvas(e.clientX);
      this.dropX = Math.max(FRUITS[this.currentFruitType].radius,
        Math.min(CANVAS_WIDTH - FRUITS[this.currentFruitType].radius, this.dropX));
      updateDropGuide();
    });

    // Touch movement for mobile
    this.canvas.addEventListener('touchmove', (e) => {
      if (this.gameOver) return;
      e.preventDefault();
      const touch = e.touches[0];
      this.dropX = clientToCanvas(touch.clientX);
      this.dropX = Math.max(FRUITS[this.currentFruitType].radius,
        Math.min(CANVAS_WIDTH - FRUITS[this.currentFruitType].radius, this.dropX));
      updateDropGuide();
    }, { passive: false });

    // Click/tap to drop fruit
    this.canvas.addEventListener('click', (e) => {
      if (this.gameOver) return;
      this.dropX = clientToCanvas(e.clientX);
      this.dropX = Math.max(FRUITS[this.currentFruitType].radius,
        Math.min(CANVAS_WIDTH - FRUITS[this.currentFruitType].radius, this.dropX));
      updateDropGuide();
      this.dropFruit();
    });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.dropFruit();
    });

    // Restart button
    document.getElementById('restart-btn').addEventListener('click', () => this.restart());

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (this.gameOver) {
        if (e.key === 'Enter' || e.key === ' ') {
          this.restart();
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        this.dropX = Math.max(FRUITS[this.currentFruitType].radius, this.dropX - 10);
        updateDropGuide();
      } else if (e.key === 'ArrowRight') {
        this.dropX = Math.min(CANVAS_WIDTH - FRUITS[this.currentFruitType].radius, this.dropX + 10);
        updateDropGuide();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.dropFruit();
      }
    });

    // Store updateDropGuide for use in restart
    this._updateDropGuide = updateDropGuide;
  }

  dropFruit() {
    if (this.gameOver || !this.canDrop) return;

    const now = Date.now();
    if (now - this.lastDropTime < DROP_COOLDOWN_MS) return;

    const fruit = new Fruit(this.dropX, FRUITS[this.currentFruitType].radius, this.currentFruitType);
    this.fruits.push(fruit);

    this.currentFruitType = this.nextFruitType;
    this.nextFruitType = this.randomDropFruit();
    this.updateNextFruitPreview();

    this.lastDropTime = now;
    this.canDrop = false;
    setTimeout(() => { this.canDrop = true; }, DROP_COOLDOWN_MS);
  }

  updateNextFruitPreview() {
    const fruit = FRUITS[this.nextFruitType];
    const previewCanvas = this.nextFruitPreview;
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, 30, 30);

    const gradient = ctx.createRadialGradient(12, 12, 2, 15, 15, 12);
    gradient.addColorStop(0, lightenHex(fruit.color, 40));
    gradient.addColorStop(1, fruit.color);

    ctx.beginPath();
    ctx.arc(15, 15, 12, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  buildFruitLegend() {
    const legend = document.getElementById('fruit-legend');
    FRUITS.forEach((fruit) => {
      const item = document.createElement('div');
      item.className = 'legend-item';

      const circle = document.createElement('div');
      circle.className = 'legend-circle';
      circle.style.backgroundColor = fruit.color;

      const label = document.createElement('span');
      label.textContent = fruit.emoji;

      item.appendChild(circle);
      item.appendChild(label);
      legend.appendChild(item);
    });
  }

  // ─── Physics: Collision Detection & Resolution ──────────────────────────────
  resolveCollisions() {
    const toRemove = new Set();
    const toAdd = [];

    for (let i = 0; i < this.fruits.length; i++) {
      for (let j = i + 1; j < this.fruits.length; j++) {
        const a = this.fruits[i];
        const b = this.fruits[j];

        if (a.merging || b.merging) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) continue; // avoid division by zero

        const minDist = a.radius + b.radius;

        if (dist < minDist) {
          // Same type: merge!
          if (a.typeIndex === b.typeIndex && a.typeIndex < FRUITS.length - 1) {
            a.merging = true;
            b.merging = true;
            toRemove.add(a.id);
            toRemove.add(b.id);

            const newType = a.typeIndex + 1;
            const newX = (a.x + b.x) / 2;
            const newY = (a.y + b.y) / 2;
            const newFruit = new Fruit(newX, newY, newType);

            // Give merged fruit a small upward impulse
            newFruit.vy = -2;

            toAdd.push(newFruit);

            // Score
            this.score += FRUITS[newType].points;
            this.scoreElement.textContent = this.score;

            // Visual effects
            this.showMergeEffect(newX, newY, FRUITS[newType]);
            this.showScorePopup(newX, newY, FRUITS[newType].points);
          } else {
            // Different type or max type: push apart
            const overlap = minDist - dist;

            const nx = dx / dist;
            const ny = dy / dist;

            const pushX = nx * overlap * 0.5;
            const pushY = ny * overlap * 0.5;

            a.x -= pushX;
            a.y -= pushY;
            b.x += pushX;
            b.y += pushY;

            // Transfer momentum
            const relVelX = a.vx - b.vx;
            const relVelY = a.vy - b.vy;
            const relVelDotN = relVelX * nx + relVelY * ny;

            if (relVelDotN > 0) {
              const massA = a.radius * a.radius;
              const massB = b.radius * b.radius;
              const totalMass = massA + massB;

              const impulse = relVelDotN * BOUNCE;

              a.vx -= (impulse * massB / totalMass) * nx;
              a.vy -= (impulse * massB / totalMass) * ny;
              b.vx += (impulse * massA / totalMass) * nx;
              b.vy += (impulse * massA / totalMass) * ny;
            }
          }
        }
      }
    }

    // Remove merged fruits and add new ones
    if (toRemove.size > 0) {
      this.fruits = this.fruits.filter(f => !toRemove.has(f.id));
      this.fruits.push(...toAdd);
    }
  }

  showMergeEffect(x, y, fruitDef) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;

    const effect = document.createElement('div');
    effect.className = 'merge-effect';
    effect.style.left = (x * scaleX - 20) + 'px';
    effect.style.top = (y * scaleY - 20) + 'px';
    effect.style.width = '40px';
    effect.style.height = '40px';
    effect.style.background = fruitDef.color;
    effect.style.opacity = '0.6';
    this.gameContainer.appendChild(effect);
    setTimeout(() => effect.remove(), 400);
  }

  showScorePopup(x, y, points) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;

    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+' + points;
    popup.style.left = (x * scaleX) + 'px';
    popup.style.top = (y * scaleY) + 'px';
    this.gameContainer.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
  }

  // ─── Game Over Check ────────────────────────────────────────────────────────
  checkGameOver() {
    for (const fruit of this.fruits) {
      if (fruit.merging) continue;

      // Only check fruits that have had time to fall
      if (fruit.y - fruit.radius < DANGER_LINE_Y && fruit.vy <= 0.5) {
        fruit.framesAboveLine++;
        if (fruit.framesAboveLine > GAME_OVER_GRACE_FRAMES) {
          this.endGame();
          return;
        }
      } else {
        fruit.framesAboveLine = 0;
      }
    }
  }

  endGame() {
    this.gameOver = true;
    this.gameOverOverlay.classList.add('active');
    this.finalScoreElement.textContent = 'Final Score: ' + this.score;
  }

  restart() {
    this.fruits = [];
    this.score = 0;
    this.gameOver = false;
    this.canDrop = true;
    this.lastDropTime = 0;
    this.dropX = CANVAS_WIDTH / 2;
    this.currentFruitType = this.randomDropFruit();
    this.nextFruitType = this.randomDropFruit();

    this.scoreElement.textContent = '0';
    this.gameOverOverlay.classList.remove('active');
    this._updateDropGuide();
    this.updateNextFruitPreview();

    Fruit.nextId = 0;
  }

  // ─── Draw ───────────────────────────────────────────────────────────────────
  draw() {
    // Clear
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Danger line
    this.ctx.setLineDash([10, 10]);
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, DANGER_LINE_Y);
    this.ctx.lineTo(CANVAS_WIDTH, DANGER_LINE_Y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw current fruit preview at drop position
    if (!this.gameOver && this.canDrop) {
      const previewFruit = FRUITS[this.currentFruitType];
      this.ctx.globalAlpha = 0.4;
      this.ctx.beginPath();
      this.ctx.arc(this.dropX, previewFruit.radius, previewFruit.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = previewFruit.color;
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }

    // Draw fruits
    for (const fruit of this.fruits) {
      fruit.draw(this.ctx);
    }
  }

  // ─── Game Loop ──────────────────────────────────────────────────────────────
  gameLoop() {
    if (!this.gameOver) {
      // Update physics
      for (const fruit of this.fruits) {
        fruit.update();
      }

      // Resolve collisions (multiple iterations for stability)
      for (let i = 0; i < 5; i++) {
        this.resolveCollisions();
      }

      // Check game over
      this.checkGameOver();
    }

    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// ─── Start Game ─────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  new SuikaGame();
});
