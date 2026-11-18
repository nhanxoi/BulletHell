/**
 * BossConfigTypes.ts
 * Shapes of the boss tuning data in BossConfig. Kept apart from the values so the classes that
 * consume a config (ChaseMove, DashMove, FanShot, BossBrain) import only the type they need.
 */
import { BossMoveId } from './BossMoveId';
import { BossShotId } from './BossShotId';

/** Normal move: follow the player. */
export interface ChaseMoveConfig {
    /** px/s. */
    readonly SPEED: number;
}

/** Dash move: telegraph, charge in a locked direction, then recover. */
export interface DashMoveConfig {
    /** Seconds the boss stands still (and flashes) before dashing. */
    readonly WINDUP: number;
    /** px/s during the dash. */
    readonly SPEED: number;
    /** Seconds the dash lasts (stops early at a wall). */
    readonly DURATION: number;
    /** Seconds the boss stays still after the dash before the next windup. */
    readonly RECOVER: number;
}

/** Fan shot: COUNT bullets spread evenly over SPREAD_DEG, centred on the player direction. */
export interface FanShotConfig {
    /** Bullets per volley (>= 1). */
    readonly COUNT: number;
    /** Total fan angle, degrees. */
    readonly SPREAD_DEG: number;
    /** Bullet speed, px/s. */
    readonly SPEED: number;
    /** Seconds between two volleys. */
    readonly INTERVAL: number;
}

/** Actions a phase may use; with more than one option the boss picks randomly on a timer. */
export interface PhaseConfig {
    readonly MOVES: readonly BossMoveId[];
    readonly SHOTS: readonly BossShotId[];
}
