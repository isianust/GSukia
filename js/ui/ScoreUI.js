/**
 * ScoreUI — HUD layer rendered by Phaser.
 *
 * Displays:
 *   • Total Score  (top-right)
 *   • Copper Coins (below score)
 *   • High Score   (below coins)
 *   • Next Ball preview (top-left area)
 */
import { BALL_DEFS, HIGH_SCORE_KEY, CANVAS_WIDTH } from '../config.js';

export class ScoreUI {
  constructor(scene) {
    this.scene = scene;

    const rightX = CANVAS_WIDTH - 12;

    // ── Total Score ──────────────────────────────────────────────────────────
    this.scoreText = scene.add.text(rightX, 10, 'Score: 0', {
      fontSize: '18px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffd93d',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'right',
    }).setOrigin(1, 0).setDepth(100);

    // ── Copper Coins ────────────────────────────────────────────────────────
    this.coinText = scene.add.text(rightX, 34, '🪙 0', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'right',
    }).setOrigin(1, 0).setDepth(100);

    // ── High Score ──────────────────────────────────────────────────────────
    this.highScore = this._loadHighScore();
    this.highScoreText = scene.add.text(rightX, 55, `Best: ${this.highScore}`, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'right',
    }).setOrigin(1, 0).setDepth(100);

    // ── "NEXT" label (top-left) ─────────────────────────────────────────────
    scene.add.text(12, 10, 'NEXT', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: 'rgba(255,255,255,0.45)',
      letterSpacing: 2,
    }).setDepth(100);

    /** Container for the next-ball mini-preview (positioned by GameScene) */
    this.nextPreviewContainer = null;
  }

  /* ── Public helpers ──────────────────────────────────────────────────────── */

  updateScore(score) {
    this.scoreText.setText(`Score: ${score}`);
    if (score > this.highScore) {
      this.highScore = score;
      this.highScoreText.setText(`Best: ${this.highScore}`);
      this._saveHighScore(score);
    }
    // Quick "bump" tween
    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
    });
  }

  updateCoins(coins) {
    this.coinText.setText(`🪙 ${coins}`);
  }

  /**
   * Show a small coloured circle + number in the top-left "NEXT" slot.
   */
  showNextBall(level) {
    if (this.nextPreviewContainer) {
      this.nextPreviewContainer.destroy();
    }
    const def = BALL_DEFS[level - 1];
    const r = 10; // fixed small preview radius

    const g = this.scene.add.graphics();
    g.fillStyle(def.color, 1);
    g.fillCircle(0, 0, r);
    g.lineStyle(1, 0xffffff, 0.3);
    g.strokeCircle(0, 0, r);

    const txt = this.scene.add.text(0, 0, String(def.value), {
      fontSize: '9px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.nextPreviewContainer = this.scene.add.container(50, 22, [g, txt]);
    this.nextPreviewContainer.setDepth(100);
  }

  /* ── Persistence ─────────────────────────────────────────────────────────── */

  _loadHighScore() {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    } catch {
      return 0;
    }
  }

  _saveHighScore(score) {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    } catch {
      /* storage full / unavailable */
    }
  }
}
