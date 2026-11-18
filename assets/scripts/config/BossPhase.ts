/**
 * BossPhase.ts
 * Boss behaviour stage chosen from its HP ratio (thresholds in GameConfig.BOSS).
 * Lives in config because the phase table in BossConfig is keyed by it.
 */
export enum BossPhase {
    High,
    Medium,
    Low,
}
