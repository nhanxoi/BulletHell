/**
 * PlayerWeapon.ts
 * Player auto-fire: shoots at the target (the boss) on a fixed cooldown, but only while the
 * target is within auto-aim range. Fires through IBulletEmitter, so it does not know about storage.
 */
import { GameConfig } from '../config/GameConfig';
import { IBulletEmitter } from './IBulletEmitter';
import { Point } from './Point';

const PLAYER = GameConfig.PLAYER;
// PERF: squared once at load, so the range test needs no Math.sqrt.
const AUTO_AIM_RANGE_SQR = PLAYER.AUTO_AIM_RANGE * PLAYER.AUTO_AIM_RANGE;

/** Auto-aim gun of the player. */
export class PlayerWeapon {
    /** Seconds until the next shot is allowed; 0 means ready. */
    private cooldown = 0;

    /** Ready to fire at the start of a round. */
    reset(): void {
        this.cooldown = 0;
    }

    /**
     * Ticks the cooldown and fires one bullet at the target centre when ready and in range.
     * @param shooter Where the bullet starts (the player centre).
     * @param target  What to aim at (the boss centre).
     * @param emitter Where the bullet is created (the player bullet store).
     * @returns true when a bullet was fired during this step (BattleWorld counts shots for audio).
     */
    step(dt: number, shooter: Point, target: Point, emitter: IBulletEmitter): boolean {
        this.cooldown = Math.max(0, this.cooldown - dt);
        if (this.cooldown > 0) {
            return false;
        }
        const dx = target.x - shooter.x;
        const dy = target.y - shooter.y;
        const distanceSqr = dx * dx + dy * dy;
        // NOTE: distance 0 has no direction; skip the shot instead of dividing by zero.
        if (distanceSqr > AUTO_AIM_RANGE_SQR || distanceSqr === 0) {
            return false;
        }
        // PERF: one sqrt per shot (a few per second), not per frame.
        const scale = PLAYER.BULLET_SPEED / Math.sqrt(distanceSqr);
        emitter.spawn(shooter.x, shooter.y, dx * scale, dy * scale);
        this.cooldown = PLAYER.FIRE_INTERVAL;
        return true;
    }
}
