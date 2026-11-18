/**
 * BossModel.ts
 * Boss simulation state: position, HP, current HP phase and the flags views use for VFX.
 * Boss moves (ChaseMove, DashMove) write the position and flags; BossBrain writes the phase;
 * BossView only reads.
 */
import { BossPhase } from '../config/BossPhase';
import { GameConfig } from '../config/GameConfig';
import { Health } from './Health';
import { Point } from './Point';

const BOSS = GameConfig.BOSS;

/** The boss square. Plain mutable data: behaviour lives in BossBrain and the moves. */
export class BossModel implements Point {
    /** World centre, px. Written by the active move. */
    x: number = BOSS.START_X;
    y: number = BOSS.START_Y;
    readonly halfSize: number = BOSS.HALF_SIZE;
    readonly health = new Health(BOSS.MAX_HP);
    /** Behaviour stage from HP, written by BossBrain. */
    phase: BossPhase = BossPhase.High;
    /** True while a dash is being telegraphed (views flash the boss). */
    isWindingUp = false;
    /** True while the boss is charging. */
    isDashing = false;

    /** Back to the start position, full HP, first phase, no VFX flags. */
    reset(): void {
        this.x = BOSS.START_X;
        this.y = BOSS.START_Y;
        this.health.reset();
        this.phase = BossPhase.High;
        this.clearActionFlags();
    }

    /** Clears the windup and dash flags, so views stop flashing the boss (round over, new round). */
    clearActionFlags(): void {
        this.isWindingUp = false;
        this.isDashing = false;
    }
}
