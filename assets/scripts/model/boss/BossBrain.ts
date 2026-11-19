/**
 * BossBrain.ts
 * Decides what the boss does: its HP phase (High / Medium / Low from GameConfig.BOSS thresholds)
 * and which move and shot are active, from the phase table in BossConfig.PHASES. In a phase with
 * several options the move and the shot are re-picked independently on random timers.
 * BattleWorld steps it once per frame; it then steps the active move and shot.
 */
import { BossConfig } from '../../config/BossConfig';
import { PhaseConfig } from '../../config/BossConfigTypes';
import { BossMoveId } from '../../config/BossMoveId';
import { BossPhase } from '../../config/BossPhase';
import { BossShotId } from '../../config/BossShotId';
import { GameConfig } from '../../config/GameConfig';
import { randomItem, randomRange } from '../../utils/MathUtil';
import { ArenaBounds } from '../ArenaBounds';
import { BossModel } from '../BossModel';
import { IBulletEmitter } from '../IBulletEmitter';
import { Point } from '../Point';
import { BossActionFactory } from './BossActionFactory';
import { IBossMove } from './IBossMove';
import { IBossShot } from './IBossShot';

const BOSS = GameConfig.BOSS;

/** Boss decision making: phase, action choice and switching. */
export class BossBrain {
    // PERF: each move/shot object is created on first use, then reused for the whole game.
    private readonly moves = new Map<BossMoveId, IBossMove>();
    private readonly shots = new Map<BossShotId, IBossShot>();
    /** False until the first step of a round has applied the starting phase. */
    private hasStartedRound = false;
    private phaseConfig: PhaseConfig = BossConfig.PHASES[BossPhase.High];
    private move: IBossMove | null = null;
    private shot: IBossShot | null = null;
    /** Seconds until the next random re-pick; 0 or less = due now. */
    private moveSwitchTimer = 0;
    private shotSwitchTimer = 0;

    /** Forgets the previous round; the first step applies the phase and picks the actions. */
    reset(): void {
        // NOTE: the old move's exit() is not needed here: BossModel.reset() clears the VFX flags and
        // the phase, and enter() resets the move's own state when it is picked again.
        this.hasStartedRound = false;
        this.phaseConfig = BossConfig.PHASES[BossPhase.High];
        this.move = null;
        this.shot = null;
        this.moveSwitchTimer = 0;
        this.shotSwitchTimer = 0;
    }

    /**
     * Updates the phase and the action choice, then steps the active move and shot.
     * @param target  The player (chased and aimed at).
     * @param emitter The boss bullet store.
     * @returns true when the active shot fired a volley during this step.
     */
    step(dt: number, boss: BossModel, target: Point, bounds: ArenaBounds, emitter: IBulletEmitter): boolean {
        this.updatePhase(boss);
        this.updateMoveChoice(dt, boss, target, bounds);
        this.updateShotChoice(dt);
        if (this.move !== null) {
            this.move.step(dt, boss, target, bounds);
        }
        if (this.shot === null) {
            return false;
        }
        return this.shot.step(dt, boss, target, emitter);
    }

    // ---- Private ----

    private updatePhase(boss: BossModel): void {
        const next = BossBrain.phaseFromRatio(boss.health.ratio);
        // NOTE: boss.phase is the only record of the phase (views read it too). It only moves forward
        // within a round: BossPhase values grow in the order High < Medium < Low, so a value not
        // greater than the current one is ignored, except on the first step, which must apply it.
        if (this.hasStartedRound && next <= boss.phase) {
            return;
        }
        this.hasStartedRound = true;
        boss.phase = next;
        this.phaseConfig = BossConfig.PHASES[next];
        // The new phase may not allow the current actions: re-pick both now (a running dash still finishes).
        this.moveSwitchTimer = 0;
        this.shotSwitchTimer = 0;
    }

    private updateMoveChoice(dt: number, boss: BossModel, target: Point, bounds: ArenaBounds): void {
        this.moveSwitchTimer -= dt;
        if (this.moveSwitchTimer > 0) {
            return;
        }
        // NOTE: a dash in windup or charge is never cut: the timer stays expired, so this retries
        // every frame and switches as soon as the move becomes interruptible.
        if (this.move !== null && !this.move.isInterruptible) {
            return;
        }
        const next = this.getMove(randomItem(this.phaseConfig.MOVES));
        // Picking the move already running keeps it going instead of restarting it.
        if (next !== this.move) {
            if (this.move !== null) {
                this.move.exit(boss);
            }
            this.move = next;
            next.enter(boss, target, bounds);
        }
        this.moveSwitchTimer = BossBrain.nextSwitchDelay(this.phaseConfig.MOVES.length);
    }

    private updateShotChoice(dt: number): void {
        this.shotSwitchTimer -= dt;
        if (this.shotSwitchTimer > 0) {
            return;
        }
        const next = this.getShot(randomItem(this.phaseConfig.SHOTS));
        if (next !== this.shot) {
            this.shot = next;
            next.enter();
        }
        this.shotSwitchTimer = BossBrain.nextSwitchDelay(this.phaseConfig.SHOTS.length);
    }

    private getMove(id: BossMoveId): IBossMove {
        let move = this.moves.get(id);
        if (move === undefined) {
            move = BossActionFactory.MOVES[id]();
            this.moves.set(id, move);
        }
        return move;
    }

    private getShot(id: BossShotId): IBossShot {
        let shot = this.shots.get(id);
        if (shot === undefined) {
            shot = BossActionFactory.SHOTS[id]();
            this.shots.set(id, shot);
        }
        return shot;
    }

    /** Phase for an HP ratio: >= HIGH_MIN is High, >= MEDIUM_MIN is Medium, below is Low. */
    private static phaseFromRatio(ratio: number): BossPhase {
        if (ratio >= BOSS.PHASE_HIGH_MIN_RATIO) {
            return BossPhase.High;
        }
        if (ratio >= BOSS.PHASE_MEDIUM_MIN_RATIO) {
            return BossPhase.Medium;
        }
        return BossPhase.Low;
    }

    /** Seconds until the next random re-pick. */
    private static nextSwitchDelay(optionCount: number): number {
        // NOTE: a single-option phase has nothing to switch to; Infinity means "never" without an extra flag.
        if (optionCount < 2) {
            return Number.POSITIVE_INFINITY;
        }
        return randomRange(BOSS.ACTION_SWITCH_MIN, BOSS.ACTION_SWITCH_MAX);
    }
}
