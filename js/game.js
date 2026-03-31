/**
 * Suika Game - Main Game Logic
 *
 * A fruit-merging puzzle game inspired by SuikaGame.com.
 * Two identical fruits merge into a larger fruit when they collide.
 * The game ends when fruits stack above the danger line.
 */

// ─── Fruit Definitions ─────────────────────────────────────────────────────────
const FRUITS = [
  { name: 'Cherry',      radius: 15,  color: '#e74c3c', highlight: '#ff8a80', points: 1,   emoji: '🍒' },
  { name: 'Strawberry',  radius: 20,  color: '#ff6b81', highlight: '#ff9eb5', points: 3,   emoji: '🍓' },
  { name: 'Grape',       radius: 25,  color: '#8e44ad', highlight: '#bb6bd9', points: 6,   emoji: '🍇' },
  { name: 'Dekopon',     radius: 30,  color: '#f39c12', highlight: '#ffc857', points: 10,  emoji: '🍊' },
  { name: 'Orange',      radius: 38,  color: '#e67e22', highlight: '#f5b041', points: 15,  emoji: '🟠' },
  { name: 'Apple',       radius: 45,  color: '#c0392b', highlight: '#e74c3c', points: 21,  emoji: '🍎' },
  { name: 'Pear',        radius: 52,  color: '#a8d648', highlight: '#c5e87e', points: 28,  emoji: '🍐' },
  { name: 'Peach',       radius: 60,  color: '#fd79a8', highlight: '#fdabca', points: 36,  emoji: '🍑' },
  { name: 'Pineapple',   radius: 68,  color: '#fdcb6e', highlight: '#fde49e', points: 45,  emoji: '🍍' },
  { name: 'Melon',       radius: 78,  color: '#00b894', highlight: '#55efc4', points: 55,  emoji: '🍈' },
  { name: 'Watermelon',  radius: 90,  color: '#27ae60', highlight: '#6dd5a0', points: 66,  emoji: '🍉' },
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
    this.highlight = FRUITS[typeIndex].highlight;
    this.points = FRUITS[typeIndex].points;
    this.name = FRUITS[typeIndex].name;
    this.settled = false;
    this.merging = false;
    this.framesAboveLine = 0;
    this.id = Fruit.nextId++;
    this.spawnTime = Date.now();
    this.rotation = Math.random() * Math.PI * 2;
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

    // Subtle rotation based on horizontal velocity
    this.rotation += this.vx * 0.02;

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
    ctx.arc(this.x + 3, this.y + 3, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    // Draw fruit body with improved gradient
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.05,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, this.highlight);
    gradient.addColorStop(0.6, this.color);
    gradient.addColorStop(1, this.darkenColor(this.color, 30));

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Outer stroke
    ctx.strokeStyle = this.darkenColor(this.color, 40);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner ring for depth
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Primary highlight (top-left)
    ctx.beginPath();
    ctx.arc(
      this.x - this.radius * 0.25,
      this.y - this.radius * 0.25,
      this.radius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();

    // Small secondary highlight
    ctx.beginPath();
    ctx.arc(
      this.x - this.radius * 0.15,
      this.y - this.radius * 0.4,
      this.radius * 0.1,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    // Bottom reflection
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.radius * 0.1,
      this.y + this.radius * 0.5,
      this.radius * 0.35,
      this.radius * 0.15,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
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
    this.highScore = parseInt(localStorage.getItem('suika-high-score') || '0', 10);
    this.gameOver = false;
    this.dropX = CANVAS_WIDTH / 2;
    this.canDrop = true;
    this.lastDropTime = 0;
    this.comboCount = 0;
    this.lastMergeTime = 0;
    this.frameCount = 0;

    this.currentFruitType = this.randomDropFruit();
    this.nextFruitType = this.randomDropFruit();

    // DOM elements
    this.scoreElement = document.getElementById('score-value');
    this.highScoreElement = document.getElementById('high-score-value');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.finalScoreElement = document.getElementById('final-score');
    this.newHighScoreElement = document.getElementById('new-high-score');
    this.dropGuide = document.getElementById('drop-guide');
    this.nextFruitPreview = document.getElementById('next-fruit-preview');
    this.gameContainer = document.querySelector('.game-container');

    this.highScoreElement.textContent = this.highScore;

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

  // ─── Score Animation ───────────────────────────────────────────────────────
  animateScore() {
    this.scoreElement.classList.add('bump');
    setTimeout(() => this.scoreElement.classList.remove('bump'), 150);
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

            // Combo tracking
            const now = Date.now();
            if (now - this.lastMergeTime < 1000) {
              this.comboCount++;
            } else {
              this.comboCount = 1;
            }
            this.lastMergeTime = now;

            // Score with combo bonus
            const comboMultiplier = this.comboCount > 1 ? this.comboCount : 1;
            const points = FRUITS[newType].points * comboMultiplier;
            this.score += points;
            this.scoreElement.textContent = this.score;
            this.animateScore();

            // Update high score in real time
            if (this.score > this.highScore) {
              this.highScore = this.score;
              this.highScoreElement.textContent = this.highScore;
              localStorage.setItem('suika-high-score', String(this.highScore));
            }

            // Visual effects
            this.showMergeEffect(newX, newY, FRUITS[newType]);
            this.showScorePopup(newX, newY, points);
            this.showSparkles(newX, newY, FRUITS[newType].color);

            // Show combo text
            if (this.comboCount > 1) {
              this.showComboText(newX, newY - 30, this.comboCount);
            }
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
    setTimeout(() => effect.remove(), 500);
  }

  showSparkles(x, y, color) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;

    const sparkleCount = 6;
    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'merge-sparkle';
      sparkle.style.left = (x * scaleX) + 'px';
      sparkle.style.top = (y * scaleY) + 'px';
      sparkle.style.background = color;

      const angle = (Math.PI * 2 * i) / sparkleCount;
      const dist = 30 + Math.random() * 20;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      sparkle.style.animation = 'none';
      sparkle.style.transform = `translate(0, 0) scale(1)`;

      this.gameContainer.appendChild(sparkle);

      // Animate via requestAnimationFrame
      requestAnimationFrame(() => {
        sparkle.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
        sparkle.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
        sparkle.style.opacity = '0';
      });

      setTimeout(() => sparkle.remove(), 600);
    }
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
    setTimeout(() => popup.remove(), 1000);
  }

  showComboText(x, y, combo) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;

    const text = document.createElement('div');
    text.className = 'combo-text';
    text.textContent = combo + 'x Combo!';
    text.style.left = (x * scaleX - 30) + 'px';
    text.style.top = (y * scaleY - 20) + 'px';
    this.gameContainer.appendChild(text);
    setTimeout(() => text.remove(), 1200);
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

    // Check for new high score
    if (this.score >= this.highScore && this.score > 0) {
      this.highScore = this.score;
      localStorage.setItem('suika-high-score', String(this.highScore));
      this.highScoreElement.textContent = this.highScore;
      this.newHighScoreElement.style.display = 'block';
    } else {
      this.newHighScoreElement.style.display = 'none';
    }
  }

  restart() {
    this.fruits = [];
    this.score = 0;
    this.gameOver = false;
    this.canDrop = true;
    this.lastDropTime = 0;
    this.comboCount = 0;
    this.lastMergeTime = 0;
    this.dropX = CANVAS_WIDTH / 2;
    this.currentFruitType = this.randomDropFruit();
    this.nextFruitType = this.randomDropFruit();

    this.scoreElement.textContent = '0';
    this.gameOverOverlay.classList.remove('active');
    this.newHighScoreElement.style.display = 'none';
    this._updateDropGuide();
    this.updateNextFruitPreview();

    Fruit.nextId = 0;
  }

  // ─── Draw ───────────────────────────────────────────────────────────────────
  draw() {
    this.frameCount++;

    // Clear
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background with subtle animated gradient
    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, '#0d0d1a');
    bgGradient.addColorStop(0.5, '#1a1a2e');
    bgGradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle grid pattern for depth
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;
    for (let gx = 0; gx < CANVAS_WIDTH; gx += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(gx, 0);
      this.ctx.lineTo(gx, CANVAS_HEIGHT);
      this.ctx.stroke();
    }
    for (let gy = 0; gy < CANVAS_HEIGHT; gy += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, gy);
      this.ctx.lineTo(CANVAS_WIDTH, gy);
      this.ctx.stroke();
    }

    // Danger line with glow
    this.ctx.save();
    this.ctx.setLineDash([10, 10]);
    this.ctx.strokeStyle = 'rgba(255, 50, 50, 0.25)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, DANGER_LINE_Y);
    this.ctx.lineTo(CANVAS_WIDTH, DANGER_LINE_Y);
    this.ctx.stroke();

    // Danger zone glow
    const dangerGradient = this.ctx.createLinearGradient(0, DANGER_LINE_Y - 20, 0, DANGER_LINE_Y + 5);
    dangerGradient.addColorStop(0, 'rgba(255, 50, 50, 0)');
    dangerGradient.addColorStop(0.5, 'rgba(255, 50, 50, 0.05)');
    dangerGradient.addColorStop(1, 'rgba(255, 50, 50, 0)');
    this.ctx.setLineDash([]);
    this.ctx.fillStyle = dangerGradient;
    this.ctx.fillRect(0, DANGER_LINE_Y - 20, CANVAS_WIDTH, 25);
    this.ctx.restore();

    // Draw current fruit preview at drop position
    if (!this.gameOver && this.canDrop) {
      const previewFruit = FRUITS[this.currentFruitType];
      this.ctx.globalAlpha = 0.35;

      // Preview with gradient
      const prevGrad = this.ctx.createRadialGradient(
        this.dropX - previewFruit.radius * 0.2,
        previewFruit.radius - previewFruit.radius * 0.2,
        previewFruit.radius * 0.1,
        this.dropX,
        previewFruit.radius,
        previewFruit.radius
      );
      prevGrad.addColorStop(0, lightenHex(previewFruit.color, 30));
      prevGrad.addColorStop(1, previewFruit.color);

      this.ctx.beginPath();
      this.ctx.arc(this.dropX, previewFruit.radius, previewFruit.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = prevGrad;
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }

    // Draw fruits
    for (const fruit of this.fruits) {
      fruit.draw(this.ctx);
    }

    // Floor glow effect
    const floorGlow = this.ctx.createLinearGradient(0, CANVAS_HEIGHT - 20, 0, CANVAS_HEIGHT);
    floorGlow.addColorStop(0, 'rgba(100, 50, 200, 0)');
    floorGlow.addColorStop(1, 'rgba(100, 50, 200, 0.08)');
    this.ctx.fillStyle = floorGlow;
    this.ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
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
