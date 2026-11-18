/**
 * BossShotId.ts
 * Identifies every boss shooting pattern. Adding a fan variant = one value here plus one
 * entry in BossConfig.SHOTS; a new pattern type also needs a class implementing IBossShot.
 */
export enum BossShotId {
    /** 6 bullets in a fan toward the player. */
    NormalFan = 'normal-fan',
    /** 18 bullets in a wider fan toward the player. */
    CrazyFan = 'crazy-fan',
}
