/**
 * GSukia - Ball Merge Puzzle Game
 *
 * Rainbow-colored numbered balls merge when same-level balls collide.
 * Features: calculator challenges, multiplication rounds, currency system.
 */

// ─── Ball Definitions (15 levels, rainbow colors) ───────────────────────────────
const TOTAL_LEVELS = 15;
const MAX_DROP_LEVEL = 5; // only levels 1-5 can be randomly dropped

function getBallColor(level) {
  // Rainbow gradient: Red (level 1) → Purple (level 15)
  const hue = ((level - 1) / (TOTAL_LEVELS - 1)) * 270;
  return `hsl(${hue}, 78%, 55%)`;
}

function getBallColorLight(level) {
  const hue = ((level - 1) / (TOTAL_LEVELS - 1)) * 270;
  return `hsl(${hue}, 80%, 72%)`;
}

function getBallColorDark(level) {
  const hue = ((level - 1) / (TOTAL_LEVELS - 1)) * 270;
  return `hsl(${hue}, 75%, 38%)`;
}

function getBallRadius(level) {
  return 14 + level * 5;
}

// ─── Game Constants ─────────────────────────────────────────────────────────────
const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 620;
const GRAVITY = 0.4;
const FRICTION = 0.99;
const BOUNCE = 0.3;
const DANGER_LINE_Y = 80;
const DROP_COOLDOWN_MS = 500;
const GAME_OVER_GRACE_FRAMES = 90;
const CALC_THRESHOLD = 10;     // sum > 10 triggers calculator challenge
const MULTIPLY_ROUND_INTERVAL = 50; // every 50 rounds
const COPPER_TO_SILVER = 10;
const SILVER_TO_GOLD = 5;

// ─── Ball (Physics Body) ────────────────────────────────────────────────────────
class Ball {
  constructor(x, y, level) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.level = level;
    this.radius = getBallRadius(level);
    this.settled = false;
    this.merging = false;
    this.framesAboveLine = 0;
    this.selected = false; // for gold coin selection
    this.id = Ball.nextId++;
  }

  update() {
    if (this.merging) return;
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
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
      if (Math.abs(this.vy) < 0.5) this.vy = 0;
    }

    this.settled = Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1;
  }

  draw(ctx) {
    ctx.save();

    // Shadow
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + 3, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    // Ball body with gradient
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.1,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, getBallColorLight(this.level));
    gradient.addColorStop(1, getBallColor(this.level));

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = getBallColorDark(this.level);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glossy highlight
    ctx.beginPath();
    ctx.arc(
      this.x - this.radius * 0.25,
      this.y - this.radius * 0.25,
      this.radius * 0.35,
      0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    // Number in center
    const fontSize = Math.max(12, Math.floor(this.radius * 0.7));
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(this.level, this.x + 1, this.y + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(this.level, this.x, this.y);

    // Selection highlight (gold coin mode)
    if (this.selected) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}

Ball.nextId = 0;

// ─── Game Class ─────────────────────────────────────────────────────────────────
class GSukiaGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.balls = [];
    this.score = 0;
    this.round = 0;
    this.gameOver = false;
    this.paused = false;
    this.dropX = CANVAS_WIDTH / 2;
    this.canDrop = true;
    this.lastDropTime = 0;

    // Currency
    this.copper = 0;
    this.silver = 0;
    this.gold = 0;

    // Selection mode (for gold coin)
    this.selectionMode = false;
    this.selectedBalls = [];
    this.selectionTarget = 3;

    // Pending merge (for calculator challenge)
    this.pendingMerge = null;

    // Current / Next ball types
    this.currentBallLevel = this.randomDropLevel();
    this.nextBallLevel = this.randomDropLevel();

    // Game over reason tracking
    this.gameOverReason = 'stack'; // 'stack' | 'calculator' | 'multiply'

    // DOM elements
    this.scoreEl = document.getElementById('score-value');
    this.roundEl = document.getElementById('round-value');
    this.copperEl = document.getElementById('copper-count');
    this.silverEl = document.getElementById('silver-count');
    this.goldEl = document.getElementById('gold-count');
    this.dropGuide = document.getElementById('drop-guide');
    this.previewCanvas = document.getElementById('next-ball-preview');
    this.gameContainer = document.getElementById('game-container');
    this.selectionBar = document.getElementById('selection-bar');
    this.selectionRemainingEl = document.getElementById('selection-remaining');

    // Dialog elements
    this.calcDialog = document.getElementById('calculator-dialog');
    this.calcProblem = document.getElementById('math-problem');
    this.calcAnswer = document.getElementById('math-answer');
    this.calcAttempts = document.getElementById('calc-attempts');
    this.calcFeedback = document.getElementById('calc-feedback');
    this.calcSubmit = document.getElementById('calc-submit');
    this.calcSubtitle = document.getElementById('calc-subtitle');

    this.multiplyDialog = document.getElementById('multiply-dialog');
    this.multiplyProblem = document.getElementById('multiply-problem');
    this.multiplyAnswer = document.getElementById('multiply-answer');
    this.multiplyFeedback = document.getElementById('multiply-feedback');
    this.multiplySubmit = document.getElementById('multiply-submit');

    this.gameoverDialog = document.getElementById('gameover-dialog');
    this.finalScoreEl = document.getElementById('final-score');
    this.reviveScoreBtn = document.getElementById('revive-score');
    this.reviveCoinBtn = document.getElementById('revive-coin');
    this.restartBtn = document.getElementById('restart-btn');

    // Silver / Gold buttons
    this.useSilverBtn = document.getElementById('use-silver');
    this.useGoldBtn = document.getElementById('use-gold');
    this.cancelSelectionBtn = document.getElementById('cancel-selection');

    // Calculator challenge state
    this.calcCorrectAnswer = 0;
    this.calcAttemptsLeft = 3;

    // Multiply challenge state
    this.multiplyCorrectAnswer = 0;

    this.setupEventListeners();
    this.updateNextBallPreview();
    this.buildBallLegend();
    this.updateCurrencyUI();
    this.gameLoop();
  }

  randomDropLevel() {
    return Math.floor(Math.random() * MAX_DROP_LEVEL) + 1;
  }

  // ─── Event Listeners ───────────────────────────────────────────────────────
  setupEventListeners() {
    // Mouse/Touch movement
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.gameOver || this.paused) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      this.dropX = (e.clientX - rect.left) * scaleX;
      const r = getBallRadius(this.currentBallLevel);
      this.dropX = Math.max(r, Math.min(CANVAS_WIDTH - r, this.dropX));
      this.dropGuide.style.left = (this.dropX / CANVAS_WIDTH * 100) + '%';
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.gameOver || this.paused) return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const touch = e.touches[0];
      this.dropX = (touch.clientX - rect.left) * scaleX;
      const r = getBallRadius(this.currentBallLevel);
      this.dropX = Math.max(r, Math.min(CANVAS_WIDTH - r, this.dropX));
      this.dropGuide.style.left = (this.dropX / CANVAS_WIDTH * 100) + '%';
    }, { passive: false });

    // Click/Tap to drop or select
    this.canvas.addEventListener('click', (e) => {
      if (this.selectionMode) {
        this.handleSelectionClick(e);
        return;
      }
      this.dropBall();
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.selectionMode) return; // handled by click
      this.dropBall();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (this.paused || this.gameOver) {
        if (e.key === 'Enter') {
          // Submit dialog if one is open
          if (this.calcDialog.classList.contains('active')) this.submitCalcAnswer();
          else if (this.multiplyDialog.classList.contains('active')) this.submitMultiplyAnswer();
        }
        return;
      }
      const r = getBallRadius(this.currentBallLevel);
      if (e.key === 'ArrowLeft') {
        this.dropX = Math.max(r, this.dropX - 10);
        this.dropGuide.style.left = (this.dropX / CANVAS_WIDTH * 100) + '%';
      } else if (e.key === 'ArrowRight') {
        this.dropX = Math.min(CANVAS_WIDTH - r, this.dropX + 10);
        this.dropGuide.style.left = (this.dropX / CANVAS_WIDTH * 100) + '%';
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.dropBall();
      }
    });

    // Dialog buttons
    this.calcSubmit.addEventListener('click', () => this.submitCalcAnswer());
    this.multiplySubmit.addEventListener('click', () => this.submitMultiplyAnswer());
    this.restartBtn.addEventListener('click', () => this.restart());
    this.reviveScoreBtn.addEventListener('click', () => this.reviveWithScore());
    this.reviveCoinBtn.addEventListener('click', () => this.reviveWithCoin());

    // Currency buttons
    this.useSilverBtn.addEventListener('click', () => this.useSilverCoin());
    this.useGoldBtn.addEventListener('click', () => this.startGoldSelection());
    this.cancelSelectionBtn.addEventListener('click', () => this.cancelSelection());
  }

  // ─── Drop Ball ─────────────────────────────────────────────────────────────
  dropBall() {
    if (this.gameOver || this.paused || !this.canDrop || this.selectionMode) return;
    const now = Date.now();
    if (now - this.lastDropTime < DROP_COOLDOWN_MS) return;

    const ball = new Ball(this.dropX, getBallRadius(this.currentBallLevel), this.currentBallLevel);
    this.balls.push(ball);

    this.round++;
    this.roundEl.textContent = this.round;

    this.currentBallLevel = this.nextBallLevel;
    this.nextBallLevel = this.randomDropLevel();
    this.updateNextBallPreview();

    this.lastDropTime = now;
    this.canDrop = false;
    setTimeout(() => {
      this.canDrop = true;
      // Check for multiplication challenge after cooldown
      if (this.round > 0 && this.round % MULTIPLY_ROUND_INTERVAL === 0) {
        this.showMultiplyChallenge();
      }
    }, DROP_COOLDOWN_MS);
  }

  // ─── Preview ───────────────────────────────────────────────────────────────
  updateNextBallPreview() {
    const ctx = this.previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, 50, 50);

    const level = this.nextBallLevel;
    const gradient = ctx.createRadialGradient(20, 20, 3, 25, 25, 18);
    gradient.addColorStop(0, getBallColorLight(level));
    gradient.addColorStop(1, getBallColor(level));

    ctx.beginPath();
    ctx.arc(25, 25, 18, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = getBallColorDark(level);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Number
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(level, 25, 25);
  }

  // ─── Ball Legend ───────────────────────────────────────────────────────────
  buildBallLegend() {
    const legend = document.getElementById('ball-legend');
    for (let lvl = 1; lvl <= TOTAL_LEVELS; lvl++) {
      const item = document.createElement('div');
      item.className = 'legend-item';

      const circle = document.createElement('div');
      circle.className = 'legend-circle';
      circle.style.backgroundColor = getBallColor(lvl);
      circle.textContent = lvl;

      const label = document.createElement('span');
      label.textContent = `Lv${lvl}`;

      item.appendChild(circle);
      item.appendChild(label);
      legend.appendChild(item);
    }
  }

  // ─── Currency ──────────────────────────────────────────────────────────────
  updateCurrencyUI() {
    this.copperEl.textContent = this.copper;
    this.silverEl.textContent = this.silver;
    this.goldEl.textContent = this.gold;

    this.useSilverBtn.disabled = this.silver < 1 || this.paused || this.gameOver;
    this.useGoldBtn.disabled = this.gold < 1 || this.paused || this.gameOver;
  }

  addCopper(amount) {
    this.copper += amount;
    this.autoConvertCurrency();
    this.updateCurrencyUI();
  }

  autoConvertCurrency() {
    // 10 copper → 1 silver
    while (this.copper >= COPPER_TO_SILVER) {
      this.copper -= COPPER_TO_SILVER;
      this.silver++;
    }
    // 5 silver → 1 gold
    while (this.silver >= SILVER_TO_GOLD) {
      this.silver -= SILVER_TO_GOLD;
      this.gold++;
    }
  }

  // ─── Silver Coin: Remove 3 random balls ────────────────────────────────────
  useSilverCoin() {
    if (this.silver < 1 || this.paused || this.gameOver || this.selectionMode) return;
    if (this.balls.length === 0) return;

    this.silver--;
    const count = Math.min(3, this.balls.length);
    const indices = [];
    const available = [...Array(this.balls.length).keys()];

    for (let i = 0; i < count; i++) {
      const pick = Math.floor(Math.random() * available.length);
      indices.push(available[pick]);
      available.splice(pick, 1);
    }

    // Show effects then remove
    const idsToRemove = new Set();
    for (const idx of indices) {
      const b = this.balls[idx];
      idsToRemove.add(b.id);
      this.showMergeEffect(b.x, b.y, getBallColor(b.level));
    }
    this.balls = this.balls.filter(b => !idsToRemove.has(b.id));

    this.autoConvertCurrency();
    this.updateCurrencyUI();
  }

  // ─── Gold Coin: Select 3 balls to remove ───────────────────────────────────
  startGoldSelection() {
    if (this.gold < 1 || this.paused || this.gameOver || this.selectionMode) return;
    if (this.balls.length === 0) return;

    this.selectionMode = true;
    this.selectedBalls = [];
    this.selectionTarget = Math.min(3, this.balls.length);
    this.selectionRemainingEl.textContent = this.selectionTarget;
    this.selectionBar.classList.add('active');
    this.paused = true;
  }

  handleSelectionClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Find closest ball under click
    let closest = null;
    let closestDist = Infinity;
    for (const ball of this.balls) {
      const dx = ball.x - mx;
      const dy = ball.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ball.radius && dist < closestDist) {
        closest = ball;
        closestDist = dist;
      }
    }

    if (!closest) return;

    // Toggle selection
    if (closest.selected) {
      closest.selected = false;
      this.selectedBalls = this.selectedBalls.filter(b => b.id !== closest.id);
    } else if (this.selectedBalls.length < this.selectionTarget) {
      closest.selected = true;
      this.selectedBalls.push(closest);
    }

    const remaining = this.selectionTarget - this.selectedBalls.length;
    this.selectionRemainingEl.textContent = remaining;

    // If all selected, remove them
    if (this.selectedBalls.length >= this.selectionTarget) {
      this.gold--;
      const idsToRemove = new Set(this.selectedBalls.map(b => b.id));
      for (const b of this.selectedBalls) {
        this.showMergeEffect(b.x, b.y, getBallColor(b.level));
      }
      this.balls = this.balls.filter(b => !idsToRemove.has(b.id));
      this.endSelection();
    }

    this.draw(); // redraw to show selection highlights
  }

  cancelSelection() {
    for (const b of this.selectedBalls) b.selected = false;
    this.endSelection();
  }

  endSelection() {
    this.selectionMode = false;
    this.selectedBalls = [];
    this.selectionBar.classList.remove('active');
    this.paused = false;
    this.autoConvertCurrency();
    this.updateCurrencyUI();
  }

  // ─── Calculator Challenge ──────────────────────────────────────────────────
  showCalculatorChallenge(ballA, ballB, newLevel, newX, newY) {
    this.paused = true;
    this.pendingMerge = { ballA, ballB, newLevel, newX, newY };

    // Generate random addition/subtraction problem
    const a = Math.floor(Math.random() * 40) + 5;
    const b = Math.floor(Math.random() * 40) + 5;
    const isAdd = Math.random() > 0.4;

    if (isAdd) {
      this.calcCorrectAnswer = a + b;
      this.calcProblem.textContent = `${a} + ${b} = ?`;
    } else {
      const big = Math.max(a, b);
      const small = Math.min(a, b);
      this.calcCorrectAnswer = big - small;
      this.calcProblem.textContent = `${big} − ${small} = ?`;
    }

    this.calcAttemptsLeft = 3;
    this.calcAttempts.textContent = `Attempts: 3 / 3`;
    this.calcAnswer.value = '';
    this.calcFeedback.textContent = '';
    this.calcFeedback.className = 'feedback-msg';
    this.calcSubtitle.textContent = `Lv${ballA.level} + Lv${ballB.level} merge → Answer to earn points!`;
    this.calcDialog.classList.add('active');
    setTimeout(() => this.calcAnswer.focus(), 100);
  }

  submitCalcAnswer() {
    const answer = parseInt(this.calcAnswer.value, 10);
    if (isNaN(answer)) {
      this.calcFeedback.textContent = 'Please enter a number!';
      this.calcFeedback.className = 'feedback-msg wrong';
      return;
    }

    if (answer === this.calcCorrectAnswer) {
      // Correct - complete the merge
      this.calcFeedback.textContent = '✓ Correct!';
      this.calcFeedback.className = 'feedback-msg correct';
      setTimeout(() => {
        this.calcDialog.classList.remove('active');
        if (this.pendingMerge) {
          this.completePendingMerge();
        }
        this.paused = false;
        this.updateCurrencyUI();
      }, 600);
    } else {
      // Wrong
      this.calcAttemptsLeft--;
      this.calcAttempts.textContent = `Attempts: ${this.calcAttemptsLeft} / 3`;
      this.calcFeedback.textContent = `✗ Wrong! ${this.calcAttemptsLeft > 0 ? 'Try again!' : ''}`;
      this.calcFeedback.className = 'feedback-msg wrong';
      this.calcAnswer.value = '';

      if (this.calcAttemptsLeft <= 0) {
        // Game over
        setTimeout(() => {
          this.calcDialog.classList.remove('active');
          this.cancelPendingMerge();
          this.gameOverReason = 'calculator';
          this.endGame();
        }, 800);
      }
    }
  }

  completePendingMerge() {
    if (!this.pendingMerge) return;
    const { ballA, ballB, newLevel, newX, newY } = this.pendingMerge;

    // Remove the two merging balls
    const idsToRemove = new Set([ballA.id, ballB.id]);
    this.balls = this.balls.filter(b => !idsToRemove.has(b.id));

    // Create merged ball
    if (newLevel <= TOTAL_LEVELS) {
      const newBall = new Ball(newX, newY, newLevel);
      newBall.vy = -2;
      this.balls.push(newBall);
    }

    // Add score
    this.score += newLevel;
    this.scoreEl.textContent = this.score;

    this.showMergeEffect(newX, newY, getBallColor(newLevel));
    this.showScorePopup(newX, newY, newLevel);

    this.pendingMerge = null;
  }

  cancelPendingMerge() {
    if (!this.pendingMerge) return;
    const { ballA, ballB } = this.pendingMerge;
    // Un-mark merging so they just stay
    ballA.merging = false;
    ballB.merging = false;
    this.pendingMerge = null;
  }

  // ─── Multiplication Challenge ──────────────────────────────────────────────
  showMultiplyChallenge() {
    this.paused = true;

    // Generate 1-2 digit × 1-2 digit
    const digits1 = Math.random() > 0.5 ? 2 : 1;
    const digits2 = Math.random() > 0.5 ? 2 : 1;
    const a = digits1 === 2
      ? Math.floor(Math.random() * 90) + 10
      : Math.floor(Math.random() * 9) + 1;
    const b = digits2 === 2
      ? Math.floor(Math.random() * 90) + 10
      : Math.floor(Math.random() * 9) + 1;

    this.multiplyCorrectAnswer = a * b;
    this.multiplyProblem.textContent = `${a} × ${b} = ?`;
    this.multiplyAnswer.value = '';
    this.multiplyFeedback.textContent = '';
    this.multiplyFeedback.className = 'feedback-msg';
    this.multiplyDialog.classList.add('active');
    setTimeout(() => this.multiplyAnswer.focus(), 100);
  }

  submitMultiplyAnswer() {
    const answer = parseInt(this.multiplyAnswer.value, 10);
    if (isNaN(answer)) {
      this.multiplyFeedback.textContent = 'Please enter a number!';
      this.multiplyFeedback.className = 'feedback-msg wrong';
      return;
    }

    if (answer === this.multiplyCorrectAnswer) {
      this.multiplyFeedback.textContent = '✓ Correct! +1 Copper Coin!';
      this.multiplyFeedback.className = 'feedback-msg correct';
      this.addCopper(1);
      setTimeout(() => {
        this.multiplyDialog.classList.remove('active');
        this.paused = false;
        this.updateCurrencyUI();
      }, 800);
    } else {
      this.multiplyFeedback.textContent = `✗ Wrong! Answer was ${this.multiplyCorrectAnswer}`;
      this.multiplyFeedback.className = 'feedback-msg wrong';
      setTimeout(() => {
        this.multiplyDialog.classList.remove('active');
        this.gameOverReason = 'multiply';
        this.endGame();
      }, 1200);
    }
  }

  // ─── Collision Detection & Resolution ──────────────────────────────────────
  resolveCollisions() {
    if (this.paused) return;

    const toRemove = new Set();
    const toAdd = [];
    let challengeTriggered = false;

    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        if (a.merging || b.merging) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) continue;

        const minDist = a.radius + b.radius;
        if (dist >= minDist) continue;

        // Same level: merge!
        if (a.level === b.level && a.level < TOTAL_LEVELS) {
          const sum = a.level + b.level;
          const newLevel = a.level + 1;
          const newX = (a.x + b.x) / 2;
          const newY = (a.y + b.y) / 2;

          if (sum > CALC_THRESHOLD && !challengeTriggered) {
            // Calculator challenge needed
            a.merging = true;
            b.merging = true;
            challengeTriggered = true;
            this.showCalculatorChallenge(a, b, newLevel, newX, newY);
            return; // pause game loop
          }

          // Auto-merge (sum ≤ threshold)
          a.merging = true;
          b.merging = true;
          toRemove.add(a.id);
          toRemove.add(b.id);

          const newBall = new Ball(newX, newY, newLevel);
          newBall.vy = -2;
          toAdd.push(newBall);

          this.score += newLevel;
          this.scoreEl.textContent = this.score;

          this.showMergeEffect(newX, newY, getBallColor(newLevel));
          this.showScorePopup(newX, newY, newLevel);
        } else {
          // Push apart
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const pushX = nx * overlap * 0.5;
          const pushY = ny * overlap * 0.5;

          a.x -= pushX;
          a.y -= pushY;
          b.x += pushX;
          b.y += pushY;

          // Momentum transfer
          const relVelX = a.vx - b.vx;
          const relVelY = a.vy - b.vy;
          const relDot = relVelX * nx + relVelY * ny;

          if (relDot > 0) {
            const massA = a.radius * a.radius;
            const massB = b.radius * b.radius;
            const total = massA + massB;
            const impulse = relDot * BOUNCE;

            a.vx -= (impulse * massB / total) * nx;
            a.vy -= (impulse * massB / total) * ny;
            b.vx += (impulse * massA / total) * nx;
            b.vy += (impulse * massA / total) * ny;
          }
        }
      }
    }

    if (toRemove.size > 0) {
      this.balls = this.balls.filter(b => !toRemove.has(b.id));
      this.balls.push(...toAdd);
    }
  }

  // ─── Visual Effects ────────────────────────────────────────────────────────
  showMergeEffect(x, y, color) {
    const effect = document.createElement('div');
    effect.className = 'merge-effect';
    effect.style.left = (x - 20) + 'px';
    effect.style.top = (y - 20) + 'px';
    effect.style.width = '40px';
    effect.style.height = '40px';
    effect.style.background = color;
    effect.style.opacity = '0.6';
    this.gameContainer.appendChild(effect);
    setTimeout(() => effect.remove(), 400);
  }

  showScorePopup(x, y, points) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+' + points;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    this.gameContainer.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
  }

  // ─── Game Over ─────────────────────────────────────────────────────────────
  checkGameOver() {
    if (this.paused) return;
    for (const ball of this.balls) {
      if (ball.merging) continue;
      if (ball.y - ball.radius < DANGER_LINE_Y && ball.vy <= 0.5) {
        ball.framesAboveLine++;
        if (ball.framesAboveLine > GAME_OVER_GRACE_FRAMES) {
          this.gameOverReason = 'stack';
          this.endGame();
          return;
        }
      } else {
        ball.framesAboveLine = 0;
      }
    }
  }

  endGame() {
    this.gameOver = true;
    this.paused = true;
    this.finalScoreEl.textContent = `Score: ${this.score}`;

    // Update revive button states
    this.reviveScoreBtn.disabled = this.score < 30;
    this.reviveCoinBtn.disabled = this.copper < 1;

    // Check for any remaining copper (including after auto-conversion)
    const totalCopper = this.copper;
    this.reviveCoinBtn.disabled = totalCopper < 1;

    this.gameoverDialog.classList.add('active');
  }

  reviveWithScore() {
    if (this.score < 30) return;
    this.score -= 30;
    this.scoreEl.textContent = this.score;
    this.revive();
  }

  reviveWithCoin() {
    if (this.copper < 1) return;
    this.copper--;
    this.updateCurrencyUI();
    this.revive();
  }

  revive() {
    this.gameOver = false;
    this.paused = false;
    this.gameoverDialog.classList.remove('active');

    // Remove balls above danger line to give player breathing room
    this.balls = this.balls.filter(b => {
      if (b.y - b.radius < DANGER_LINE_Y) {
        this.showMergeEffect(b.x, b.y, getBallColor(b.level));
        return false;
      }
      return true;
    });

    // Reset frames above line for remaining balls
    for (const ball of this.balls) {
      ball.framesAboveLine = 0;
    }

    this.updateCurrencyUI();
  }

  restart() {
    this.balls = [];
    this.score = 0;
    this.round = 0;
    this.gameOver = false;
    this.paused = false;
    this.canDrop = true;
    this.lastDropTime = 0;
    this.dropX = CANVAS_WIDTH / 2;
    this.copper = 0;
    this.silver = 0;
    this.gold = 0;
    this.selectionMode = false;
    this.selectedBalls = [];
    this.pendingMerge = null;

    this.currentBallLevel = this.randomDropLevel();
    this.nextBallLevel = this.randomDropLevel();

    this.scoreEl.textContent = '0';
    this.roundEl.textContent = '0';
    this.dropGuide.style.left = '50%';
    this.gameoverDialog.classList.remove('active');
    this.calcDialog.classList.remove('active');
    this.multiplyDialog.classList.remove('active');
    this.selectionBar.classList.remove('active');
    this.updateNextBallPreview();
    this.updateCurrencyUI();

    Ball.nextId = 0;
  }

  // ─── Draw ──────────────────────────────────────────────────────────────────
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0d0d1a');
    bgGrad.addColorStop(0.5, '#111128');
    bgGrad.addColorStop(1, '#0a1a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Danger line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, DANGER_LINE_Y);
    ctx.lineTo(CANVAS_WIDTH, DANGER_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Drop preview
    if (!this.gameOver && !this.paused && this.canDrop) {
      const r = getBallRadius(this.currentBallLevel);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(this.dropX, r, r, 0, Math.PI * 2);
      ctx.fillStyle = getBallColor(this.currentBallLevel);
      ctx.fill();

      // Preview number
      const fontSize = Math.max(10, Math.floor(r * 0.6));
      ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(this.currentBallLevel, this.dropX, r);
      ctx.globalAlpha = 1.0;
    }

    // Draw all balls
    for (const ball of this.balls) {
      ball.draw(ctx);
    }
  }

  // ─── Game Loop ─────────────────────────────────────────────────────────────
  gameLoop() {
    if (!this.gameOver && !this.paused) {
      for (const ball of this.balls) {
        ball.update();
      }
      for (let i = 0; i < 5; i++) {
        this.resolveCollisions();
        if (this.paused) break; // calculator challenge triggered
      }
      this.checkGameOver();
    }
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// ─── Start ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  new GSukiaGame();
});
