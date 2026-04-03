/**
 * MergeManager — listens to Matter.js collision events, queues merges,
 * and processes them safely outside the physics step.
 *
 * A "merge flag" on each ball prevents the same body from being
 * counted twice in one frame (debounce / anti-duplicate).
 */
import { BALL_DEFS } from '../config.js';
import { canMerge, getMergeResult, calculateMergeScore, calculateMergeCoins } from './mergeLogic.js';

export class MergeManager {
  constructor(scene) {
    this.scene = scene;
    /** @type {Array<{ballA: object, ballB: object, result: object}>} */
    this.mergeQueue = [];
    this._setupCollisionHandler();
  }

  /* ── Private: wire up Matter collision callback ─────────────────────────── */
  _setupCollisionHandler() {
    this.scene.matter.world.on('collisionstart', (event) => {
      for (const pair of event.pairs) {
        const objA = pair.bodyA.gameObject;
        const objB = pair.bodyB.gameObject;

        // Ignore wall / non-ball collisions
        if (!objA || !objB) continue;
        if (objA.ballLevel === undefined || objB.ballLevel === undefined) continue;

        // Merge-flag debounce — skip if either ball is already queued
        if (objA.merging || objB.merging) continue;

        if (canMerge(objA.ballLevel, objB.ballLevel)) {
          // Lock BOTH balls immediately so no later pair re-uses them
          objA.merging = true;
          objB.merging = true;

          const result = getMergeResult(
            objA.ballLevel,
            { x: objA.x, y: objA.y },
            { x: objB.x, y: objB.y },
          );

          this.mergeQueue.push({ ballA: objA, ballB: objB, result });
        }
      }
    });
  }

  /* ── Public: called from scene.update() every frame ─────────────────────── */
  processMergeQueue() {
    while (this.mergeQueue.length > 0) {
      const { ballA, ballB, result } = this.mergeQueue.shift();

      // Destroy the two source balls
      this.scene.removeBall(ballA);
      this.scene.removeBall(ballB);

      // Spawn the merged ball at the collision midpoint
      this.scene.createBall(result.x, result.y, result.level);

      // Update score
      const scoreGain = calculateMergeScore(result.level);
      this.scene.addScore(scoreGain);

      // Copper-coin reward
      const coinGain = calculateMergeCoins(result.level);
      if (coinGain > 0) {
        this.scene.addCoins(coinGain);
      }

      // Eye-candy: expanding ring at merge point
      this._playMergeEffect(result);
    }
  }

  /* ── Visual feedback ────────────────────────────────────────────────────── */
  _playMergeEffect(result) {
    const def = BALL_DEFS[result.level - 1];
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, def.color, 0.7);
    ring.strokeCircle(0, 0, result.radius * 0.5);
    ring.setPosition(result.x, result.y);
    ring.setDepth(5);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }
}
