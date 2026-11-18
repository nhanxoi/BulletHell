/**
 * ChaseMove.ts
 * Normal boss move: walk straight toward the player at a constant speed, every frame.
 * Can be replaced at any moment (no state to finish).
 */
import { ChaseMoveConfig } from '../../config/BossConfigTypes';
import { ArenaBounds } from '../ArenaBounds';
import { BossModel } from '../BossModel';
import { Point } from '../Point';
import { IBossMove } from './IBossMove';

/** Continuously follows the target. */
export class ChaseMove implements IBossMove {
    readonly isInterruptible = true;

    private readonly config: ChaseMoveConfig;

    /** @param config Chase speed (BossConfig.CHASE). */
    constructor(config: ChaseMoveConfig) {
        this.config = config;
    }

    /** Nothing to prepare: chasing has no internal state. */
    enter(): void {
        // NOTE: intentionally empty; the interface needs it for moves that do have state (DashMove).
    }

    /** Moves the boss toward the target without overshooting it, kept inside the arena. */
    step(dt: number, boss: BossModel, target: Point, bounds: ArenaBounds): void {
        const dx = target.x - boss.x;
        const dy = target.y - boss.y;
        const distanceSqr = dx * dx + dy * dy;
        if (distanceSqr === 0) {
            return;
        }
        const maxStep = this.config.SPEED * dt;
        if (distanceSqr <= maxStep * maxStep) {
            // Close enough to arrive this frame: land on the target instead of jumping past it.
            boss.x = target.x;
            boss.y = target.y;
        } else {
            const scale = maxStep / Math.sqrt(distanceSqr);
            boss.x += dx * scale;
            boss.y += dy * scale;
        }
        boss.x = bounds.clampX(boss.x, boss.halfSize);
        boss.y = bounds.clampY(boss.y, boss.halfSize);
    }

    /** Nothing to clean up: chasing sets no boss flag. */
    exit(): void {
        // NOTE: intentionally empty, see enter().
    }
}
