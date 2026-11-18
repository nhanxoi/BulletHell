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
    enter(boss: BossModel, target: Point): void {
        this.startWindup(boss, target);
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
                    this.startWindup(boss, target);
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

    private startWindup(boss: BossModel, target: Point): void {
        // NOTE: the PDF says "toward the player's position at the moment of activation, direction locked
        // during the dash". Activation = the start of the windup, so the windup telegraphs a fixed
        // direction and the player can dodge sideways; aiming at the end of the windup would be unfair.
        const dx = target.x - boss.x;
        const dy = target.y - boss.y;
        const distanceSqr = dx * dx + dy * dy;
        // NOTE: target exactly on the boss: no direction, so the dash stays in place.
        const scale = distanceSqr > 0 ? 1 / Math.sqrt(distanceSqr) : 0;
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
