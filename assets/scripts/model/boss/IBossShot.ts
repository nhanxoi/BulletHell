/**
 * IBossShot.ts
 * Contract of a boss shooting pattern (FanShot). Each shot owns its cooldown; BossBrain calls
 * reset() when the shot becomes active and step() every frame while it is.
 * Adding a pattern type = a class implementing this + a BossShotId value + a BossActionFactory line.
 */
import { IBulletEmitter } from '../IBulletEmitter';
import { Point } from '../Point';

/** One way the boss can shoot. */
export interface IBossShot {
    /** Restarts the cooldown when the shot becomes active. */
    reset(): void;

    /**
     * Ticks the cooldown and fires a volley when it is due.
     * @param origin  Where bullets start (the boss centre).
     * @param target  What the volley aims at (the player).
     * @param emitter Where bullets are created (the boss bullet store).
     */
    step(dt: number, origin: Point, target: Point, emitter: IBulletEmitter): void;
}
