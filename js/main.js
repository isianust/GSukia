/**
 * Suika Game — Phaser 3 + Matter.js entry point.
 *
 * Loads the GameScene and starts the Phaser application.
 * Phaser is expected to be loaded globally via CDN <script> tag.
 */
import { GameScene } from './scenes/GameScene.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';

const config = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#16213e',
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 },
      debug: false,
    },
  },
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);
