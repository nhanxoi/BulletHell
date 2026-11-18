/**
 * DashMove.ts
 * Boss dash move, a loop of three stages: Windup (stand still and flash) -> Dash (charge fast in a
 * locked direction) -> Recover (stand still) -> Windup again. Only Recover may be interrupted,
 * so BossBrain never cuts a telegraphed or running dash.
 */
import { DashMoveConfig } from '../../config/BossConfigTypes';
import { ArenaBounds } from '../ArenaBounds';
import { BossModel } from '../BossModel';
import { Point } from '../Point';
import { IBossMove } from './IBossMove';

/** Stage of the dash loop (one enum instead of several booleans). */
enum DashStage {
    Windup,
    Dash,
    Recover,
}

/** Repeated telegraphed dashes toward where the player was. */
export class DashMove implements IBossMove {
    private readonly config: DashMoveConfig;
    private stage = DashStage.Windup;
    /** Seconds left in the current stage. */
    private stageTimer = 0;
    /** Unit vector of the dash, locked when the windup starts. */
    private directionX = 0;
    private directionY = 0;

    /** @param config Windup, speed, duration and recover times (BossConfig.DASH). */
    constructor(config: DashMoveConfig) {
        this.config = config;
    }

    /** Only during Recover: a telegraphed or running dash is never cut. */
    get isInterruptible(): boolean {
        return this.stage === DashStage.Recover;
    }

    /** Starts with a windup aimed at the target. */
    enter(boss: BossModel, target: Point, bounds: ArenaBounds): void {
        this.startWindup(boss, target, bounds);
    }

    /** Advances the current stage and switches stage when its time is up. */
    step(dt: number, boss: BossModel, target: Point, bounds: ArenaBounds): void {
        this.stageTimer -= dt;
        switch (this.stage) {
            case DashStage.Windup:
                if (this.stageTimer <= 0) {
                    this.startDash(boss);
                }
                break;
            case DashStage.Dash:
                this.stepDash(dt, boss, bounds);
                break;
            case DashStage.Recover:
                if (this.stageTimer <= 0) {
                    this.startWindup(boss, target, bounds);
                }
                break;
        }
    }

    /** Clears the VFX flags so the boss does not keep flashing after the move is replaced. */
    exit(boss: BossModel): void {
        boss.isWindingUp = false;
        boss.isDashing = false;
    }

    // ---- Private ----

    private startWindup(boss: BossModel, target: Point, bounds: ArenaBounds): void {
        // NOTE: the PDF says "toward the player's position at the moment of activation, direction locked
        // during the dash". Activation = the start of the windup, so the windup telegraphs a fixed
        // direction and the player can dodge sideways; aiming at the end of the windup would be unfair.
        // NOTE: the aim point is the target clamped into the rectangle the boss centre can reach. The
        // player can stand closer to a wall than the boss (smaller margin), so aiming at the raw position
        // would point every dash into that wall and pin the boss there. Clamped, a boss already at the
        // wall dashes along it (the wall-side component is exactly 0) instead of into it.
        const dx = bounds.clampX(target.x, boss.halfSize) - boss.x;
        const dy = bounds.clampY(target.y, boss.halfSize) - boss.y;
        const distanceSqr = dx * dx + dy * dy;
        const minDistance = this.config.MIN_AIM_DISTANCE;
        // NOTE: the boss already stands on the aim point (e.g. both in the same corner): there is no
        // direction to lock, and normalising would divide by ~0. Skip this dash and rest instead; the
        // next windup re-aims after RECOVER seconds.
        if (distanceSqr < minDistance * minDistance) {
            this.startRecover(boss);
            return;
        }
        const scale = 1 / Math.sqrt(distanceSqr);
        this.directionX = dx * scale;
        this.directionY = dy * scale;
        this.stage = DashStage.Windup;
        this.stageTimer = this.config.WINDUP;
        boss.isWindingUp = true;
        boss.isDashing = false;
    }

    private startDash(boss: BossModel): void {
        this.stage = DashStage.Dash;
        this.stageTimer = this.config.DURATION;
        boss.isWindingUp = false;
        boss.isDashing = true;
    }

    private startRecover(boss: BossModel): void {
        this.stage = DashStage.Recover;
        this.stageTimer = this.config.RECOVER;
        // Both flags: Recover is also entered straight from a skipped windup.
        boss.isWindingUp = false;
        boss.isDashing = false;
    }

    /** Moves along the locked direction; ends the dash on timeout or when a wall stops the boss. */
    private stepDash(dt: number, boss: BossModel, bounds: ArenaBounds): void {
        const distance = this.config.SPEED * dt;
        const nextX = boss.x + this.directionX * distance;
        const nextY = boss.y + this.directionY * distance;
        boss.x = bounds.clampX(nextX, boss.halfSize);
        boss.y = bounds.clampY(nextY, boss.halfSize);
        // NOTE: clamping changed the position = the boss hit a wall. Comparing with the unclamped
        // value (not "is it touching a wall") lets a dash start next to a wall and move away from it.
        const isStoppedByWall = boss.x !== nextX || boss.y !== nextY;
        if (isStoppedByWall || this.stageTimer <= 0) {
            this.startRecover(boss);
        }
    }
}
