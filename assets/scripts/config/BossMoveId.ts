/**
 * BossMoveId.ts
 * Identifies every boss movement behaviour. Adding a move = one value here, one class
 * implementing IBossMove, one line in BossActionFactory (a missing line is a compile error).
 */
export enum BossMoveId {
    /** Continuously moves toward the player. */
    Chase = 'chase',
    /** Winds up, then dashes toward where the player was, direction locked. */
    Dash = 'dash',
}
