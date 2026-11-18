/**
 * BattleOutcome.ts
 * Result of one simulation step, returned by BattleWorld.step() to GameManager.
 */
export enum BattleOutcome {
    /** The fight goes on. */
    None,
    /** Boss HP reached 0 (wins over a same-frame player death). */
    BossDefeated,
    /** Player HP reached 0. */
    PlayerDefeated,
}
