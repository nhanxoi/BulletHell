/**
 * ChaseMove.ts
 * Normal boss move: walk straight toward the player at a constant speed, every frame, and stop
 * a short distance from them.
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

    /** @param config Chase speed and stop distance (BossConfig.CHASE). */
    constructor(config: ChaseMoveConfig) {
        this.config = config;
    }

    /** Nothing to prepare: chasing has no internal state. */
    enter(): void {
        // NOTE: intentionally empty; the interface needs it for moves that do have state (DashMove).
    }

    /** Moves the boss toward the target, stopping STOP_DISTANCE short of it, kept inside the arena. */
    step(dt: number, boss: BossModel, target: Point, bounds: ArenaBounds): void {
        const dx = target.x - boss.x;
        const dy = target.y - boss.y;
        const distanceSqr = dx * dx + dy * dy;
        const stopDistance = this.config.STOP_DISTANCE;
        // NOTE: stop short instead of landing on the target: the boss still touches the player (contact
        // damage), but it never parks its centre on the player's, where aiming (player weapon, fan
        // shot) has no direction. Inside the range the boss simply waits.
        // PERF: compared squared, so a boss already in range costs no sqrt.
        if (distanceSqr <= stopDistance * stopDistance) {
            return;
        }
        const distance = Math.sqrt(distanceSqr);
        // Never walk past the stop distance in one frame.
        const travel = Math.min(this.config.SPEED * dt, distance - stopDistance);
        const scale = travel / distance;
        boss.x = bounds.clampX(boss.x + dx * scale, boss.halfSize);
        boss.y = bounds.clampY(boss.y + dy * scale, boss.halfSize);
    }

    /** Nothing to clean up: chasing sets no boss flag. */
    exit(): void {
        // NOTE: intentionally empty, see enter().
    }
}
