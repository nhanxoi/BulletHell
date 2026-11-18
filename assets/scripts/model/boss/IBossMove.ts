/**
 * IBossMove.ts
 * Contract of a boss movement behaviour (ChaseMove, DashMove). BossBrain owns one instance per
 * move, calls enter() when it becomes active, step() every frame and exit() when it is replaced.
 * Adding a move = a class implementing this + a BossMoveId value + a BossActionFactory line.
 */
import { ArenaBounds } from '../ArenaBounds';
import { BossModel } from '../BossModel';
import { Point } from '../Point';

/** One way the boss can move. */
export interface IBossMove {
    /** False while the move must not be cut (dash windup and charge); BossBrain then waits. */
    readonly isInterruptible: boolean;

    /**
     * Called when the move becomes active; resets its own state.
     * @param bounds Arena, for moves that aim at a point the boss can actually reach (DashMove).
     */
    enter(boss: BossModel, target: Point, bounds: ArenaBounds): void;

    /** Advances the move by one frame, writing the boss position. */
    step(dt: number, boss: BossModel, target: Point, bounds: ArenaBounds): void;

    /** Called when another move replaces this one; clears any boss flag it set. */
    exit(boss: BossModel): void;
}
