/**
 * FanShot.ts
 * Boss fan pattern: every INTERVAL seconds, COUNT bullets spread evenly over SPREAD_DEG, centred on
 * the direction to the player. One class serves every fan (Normal 6 bullets, Crazy 18 bullets);
 * the numbers come from FanShotConfig, so a new fan variant needs no new class: a BossShotId value,
 * a BossConfig.SHOTS entry and one BossActionFactory line (a missing one is a compile error).
 */
import { FanShotConfig } from '../../config/BossConfigTypes';
import { degToRad } from '../../utils/MathUtil';
import { IBulletEmitter } from '../IBulletEmitter';
import { Point } from '../Point';
import { IBossShot } from './IBossShot';

/** Fan of bullets aimed at the target. */
export class FanShot implements IBossShot {
    private readonly config: FanShotConfig;
    /** Angle of the first bullet relative to the aim direction, radians. */
    private readonly firstOffset: number;
    /** Angle between two neighbour bullets, radians. */
    private readonly angleStep: number;
    /** Seconds until the next volley. */
    private cooldown = 0;

    /** @param config Bullet count, spread, speed and interval (an entry of BossConfig.SHOTS). */
    constructor(config: FanShotConfig) {
        this.config = config;
        const spread = degToRad(config.SPREAD_DEG);
        // angle_i = base - spread/2 + spread * i / (count - 1). NOTE: one bullet has no spread and
        // would divide by zero, so it simply flies straight at the target.
        const hasSpread = config.COUNT > 1;
        this.firstOffset = hasSpread ? -spread / 2 : 0;
        this.angleStep = hasSpread ? spread / (config.COUNT - 1) : 0;
    }

    /** Called when the shot becomes active: waits one full interval before the first volley. */
    enter(): void {
        // NOTE: not 0 on purpose: switching shots never fires two volleys back to back, and a new
        // round gives the player a moment before the first bullets.
        this.cooldown = this.config.INTERVAL;
    }

    /** Fires a volley when the cooldown runs out. */
    step(dt: number, origin: Point, target: Point, emitter: IBulletEmitter): void {
        this.cooldown -= dt;
        if (this.cooldown > 0) {
            return;
        }
        this.cooldown = this.config.INTERVAL;
        this.fireVolley(origin, target, emitter);
    }

    // ---- Private ----

    private fireVolley(origin: Point, target: Point, emitter: IBulletEmitter): void {
        // PERF: atan2 once per volley for the aim direction; the per-bullet cos/sin run only when a
        // volley fires (about once a second), not every frame.
        const baseAngle = Math.atan2(target.y - origin.y, target.x - origin.x);
        const speed = this.config.SPEED;
        for (let i = 0; i < this.config.COUNT; i++) {
            const angle = baseAngle + this.firstOffset + this.angleStep * i;
            emitter.spawn(origin.x, origin.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
    }
}
