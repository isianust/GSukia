/**
 * GameScene — the single Phaser 3 scene that runs the Suika game.
 *
 * Responsibilities:
 *   • World setup (Matter.js bounds, background, danger line)
 *   • Ball creation / destruction (Container ← Graphics + Text + Matter body)
 *   • Player input (pointer, keyboard)
 *   • Drop logic with cooldown
 *   • Game-over detection and restart
 *
 * Physics and merge logic are delegated to MergeManager.
 * HUD is delegated to ScoreUI.
 */
import {
  BALL_DEFS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DANGER_LINE_Y,
  DROP_COOLDOWN_MS,
  MAX_DROP_LEVEL,
  GAME_OVER_GRACE_FRAMES,
  MAX_LEVEL,
} from '../config.js';
import { ScoreUI } from '../ui/ScoreUI.js';
import { MergeManager } from '../physics/MergeManager.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  /* ==================================================================
   *  CREATE — called once when the scene starts
   * ================================================================== */
  create() {
    // ── State ─────────────────────────────────────────────────────────────
    this.score = 0;
    this.coins = 0;
    /** @type {Phaser.GameObjects.Container[]} */
    this.balls = [];
    this.canDrop = true;
    this.isGameOver = false;
    this.dangerFrameCount = 0;
    this.dropX = CANVAS_WIDTH / 2;
    this.nextBallLevel = this._randomDropLevel();

    // ── Matter.js world bounds ────────────────────────────────────────────
    this.matter.world.setBounds(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 32, true, true, true, true);

    // ── Background ───────────────────────────────────────────────────────
    this.cameras.main.setBackgroundColor('#16213e');
    this._drawBackgroundGrid();

    // ── Danger line ──────────────────────────────────────────────────────
    const dl = this.add.graphics();
    dl.lineStyle(2, 0xff0000, 0.5);
    dl.lineBetween(0, DANGER_LINE_Y, CANVAS_WIDTH, DANGER_LINE_Y);
    dl.setDepth(10);

    // ── Subsystems ───────────────────────────────────────────────────────
    this.scoreUI = new ScoreUI(this);
    this.mergeManager = new MergeManager(this);

    // ── Input ────────────────────────────────────────────────────────────
    this._setupInput();

    // ── Initial preview ──────────────────────────────────────────────────
    this._createPreview();
    this.scoreUI.showNextBall(this.nextBallLevel);

    // ── Drop guide line ──────────────────────────────────────────────────
    this.dropGuide = this.add.graphics();
    this.dropGuide.setDepth(9);

    // ── Game-over overlay (hidden) ───────────────────────────────────────
    this._createGameOverOverlay();
  }

  /* ==================================================================
   *  UPDATE — called every frame
   * ================================================================== */
  update() {
    if (this.isGameOver) return;

    // Process any queued merges from the last physics step
    this.mergeManager.processMergeQueue();

    // Move the ghost preview to follow the pointer / keyboard position
    if (this.previewContainer) {
      const def = BALL_DEFS[this.nextBallLevel - 1];
      this.dropX = Phaser.Math.Clamp(this.dropX, def.radius + 2, CANVAS_WIDTH - def.radius - 2);
      this.previewContainer.setPosition(this.dropX, 30);
    }

    // Redraw drop guide
    if (this.dropGuide) {
      this.dropGuide.clear();
      this.dropGuide.lineStyle(1, 0xffffff, 0.15);
      this.dropGuide.lineBetween(this.dropX, 50, this.dropX, CANVAS_HEIGHT);
    }

    this._checkGameOver();
  }

  /* ==================================================================
   *  BALL FACTORY
   * ================================================================== */
  /**
   * Create a ball (container = circle graphic + number text + Matter body).
   * @param {number} x  spawn x
   * @param {number} y  spawn y
   * @param {number} level  1-based level (1 … MAX_LEVEL)
   * @returns {Phaser.GameObjects.Container}
   */
  createBall(x, y, level) {
    const def = BALL_DEFS[level - 1];

    // ── Colored circle ───────────────────────────────────────────────────
    const gfx = this.add.graphics();
    gfx.fillStyle(def.color, 1);
    gfx.fillCircle(0, 0, def.radius);
    // subtle highlight
    gfx.fillStyle(0xffffff, 0.15);
    gfx.fillCircle(-def.radius * 0.15, -def.radius * 0.2, def.radius * 0.4);
    // border
    gfx.lineStyle(2, 0xffffff, 0.25);
    gfx.strokeCircle(0, 0, def.radius);

    // ── Number label ─────────────────────────────────────────────────────
    const fontSize = Math.max(12, Math.floor(def.radius * 0.55));
    const label = this.add.text(0, 0, String(def.value), {
      fontSize: `${fontSize}px`,
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: Math.max(1, Math.floor(fontSize / 10)),
      align: 'center',
    }).setOrigin(0.5);

    // ── Container ────────────────────────────────────────────────────────
    const container = this.add.container(x, y, [gfx, label]);
    container.setSize(def.radius * 2, def.radius * 2);

    // ── Attach Matter.js body ────────────────────────────────────────────
    this.matter.add.gameObject(container, {
      shape: { type: 'circle', radius: def.radius },
      restitution: 0.2,
      friction: 0.05,
      frictionAir: 0.001,
      density: 0.001 + level * 0.0005,
      label: `ball_${level}`,
    });

    // ── Custom properties ────────────────────────────────────────────────
    container.ballLevel = level;
    container.ballValue = def.value;
    container.ballRadius = def.radius;
    container.merging = false;

    this.balls.push(container);
    return container;
  }

  /**
   * Safely remove a ball from the world and the tracking array.
   */
  removeBall(ball) {
    const idx = this.balls.indexOf(ball);
    if (idx !== -1) this.balls.splice(idx, 1);
    if (ball.body) this.matter.world.remove(ball.body);
    ball.destroy();
  }

  /* ==================================================================
   *  SCORE / COINS
   * ================================================================== */
  addScore(points) {
    this.score += points;
    this.scoreUI.updateScore(this.score);
  }

  addCoins(amount) {
    this.coins += amount;
    this.scoreUI.updateCoins(this.coins);
  }

  /* ==================================================================
   *  DROP LOGIC
   * ================================================================== */
  dropBall() {
    if (!this.canDrop || this.isGameOver) return;
    this.canDrop = false;

    const def = BALL_DEFS[this.nextBallLevel - 1];
    const clampedX = Phaser.Math.Clamp(this.dropX, def.radius + 2, CANVAS_WIDTH - def.radius - 2);
    this.createBall(clampedX, DANGER_LINE_Y - 10, this.nextBallLevel);

    // Prepare next ball
    this.nextBallLevel = this._randomDropLevel();
    this._createPreview();
    this.scoreUI.showNextBall(this.nextBallLevel);

    // Cooldown timer
    this.time.delayedCall(DROP_COOLDOWN_MS, () => { this.canDrop = true; });
  }

  /* ==================================================================
   *  INPUT SETUP
   * ================================================================== */
  _setupInput() {
    this.input.on('pointermove', (pointer) => { this.dropX = pointer.x; });
    this.input.on('pointerup', () => { this.dropBall(); });

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.dropBall());
      this.input.keyboard.on('keydown-ENTER', () => this.dropBall());

      this.input.keyboard.on('keydown-LEFT', () => {
        this.dropX = Math.max(20, this.dropX - 10);
      });
      this.input.keyboard.on('keydown-RIGHT', () => {
        this.dropX = Math.min(CANVAS_WIDTH - 20, this.dropX + 10);
      });
      this.input.keyboard.on('keydown-R', () => {
        if (this.isGameOver) this.restartGame();
      });
    }
  }

  /* ==================================================================
   *  PREVIEW (ghost ball at top)
   * ================================================================== */
  _createPreview() {
    if (this.previewContainer) this.previewContainer.destroy();

    const def = BALL_DEFS[this.nextBallLevel - 1];
    const g = this.add.graphics();
    g.fillStyle(def.color, 0.4);
    g.fillCircle(0, 0, def.radius);
    g.lineStyle(1, 0xffffff, 0.2);
    g.strokeCircle(0, 0, def.radius);

    const fontSize = Math.max(10, Math.floor(def.radius * 0.5));
    const txt = this.add.text(0, 0, String(def.value), {
      fontSize: `${fontSize}px`,
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.5);

    this.previewContainer = this.add.container(this.dropX, 30, [g, txt]);
    this.previewContainer.setDepth(20);
  }

  /* ==================================================================
   *  GAME OVER
   * ================================================================== */
  _checkGameOver() {
    let inDanger = false;
    for (const ball of this.balls) {
      if (ball.merging || !ball.body || !ball.active) continue;
      const vy = Math.abs(ball.body.velocity ? ball.body.velocity.y : 0);
      if (ball.y - ball.ballRadius < DANGER_LINE_Y && vy < 1) {
        inDanger = true;
        break;
      }
    }

    if (inDanger) {
      this.dangerFrameCount++;
      if (this.dangerFrameCount >= GAME_OVER_GRACE_FRAMES) this._gameOver();
    } else {
      this.dangerFrameCount = 0;
    }
  }

  _gameOver() {
    this.isGameOver = true;
    this.canDrop = false;

    this.finalScoreText.setText(`Score: ${this.score}  |  🪙 ${this.coins}`);
    this.gameOverContainer.setVisible(true);

    // Allow restart on next click
    this.input.once('pointerup', () => this.restartGame());
  }

  _createGameOverOverlay() {
    this.gameOverContainer = this.add.container(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    this.gameOverContainer.setDepth(200);
    this.gameOverContainer.setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT);

    const title = this.add.text(0, -50, 'GAME OVER', {
      fontSize: '36px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5);

    this.finalScoreText = this.add.text(0, 10, '', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    const hint = this.add.text(0, 60, 'Click or press R to restart', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5);

    this.gameOverContainer.add([bg, title, this.finalScoreText, hint]);
  }

  restartGame() {
    this.scene.restart();
  }

  /* ==================================================================
   *  HELPERS
   * ================================================================== */
  _randomDropLevel() {
    return Phaser.Math.Between(1, MAX_DROP_LEVEL);
  }

  _drawBackgroundGrid() {
    const bg = this.add.graphics();
    bg.setDepth(-1);
    bg.lineStyle(1, 0xffffff, 0.04);
    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      bg.lineBetween(x, 0, x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 40) {
      bg.lineBetween(0, y, CANVAS_WIDTH, y);
    }
  }
}
