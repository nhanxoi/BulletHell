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
    /**
     * Centre-to-centre distance at which the boss stops walking, px. Keep it inside contact range
     * (boss half size + player radius) so touching still hurts, but above 0 so the boss never parks
     * its centre on the player's.
     */
    readonly STOP_DISTANCE: number;
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
    /** px. An aim point closer than this to the boss gives no usable direction: the dash is skipped. */
    readonly MIN_AIM_DISTANCE: number;
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

/**
 * Actions a phase may use; with more than one option the boss picks randomly on a timer.
 * NOTE: non-empty tuple types, so a phase with no move or no shot is a compile error
 * (randomItem() has nothing to pick from an empty list).
 */
export interface PhaseConfig {
    readonly MOVES: readonly [BossMoveId, ...BossMoveId[]];
    readonly SHOTS: readonly [BossShotId, ...BossShotId[]];
}
