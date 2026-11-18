/**
 * ArenaBounds.ts
 * The inner playable rectangle, centred on the world origin. Player and boss are clamped inside
 * it by their size, and bullets are removed when they touch it (the four walls are its edges).
 */
import { clamp } from '../utils/MathUtil';

/** Inner arena rectangle with clamp and wall tests. */
export class ArenaBounds {
    readonly halfWidth: number;
    readonly halfHeight: number;

    /** @param width Inner width, px. @param height Inner height, px. */
    constructor(width: number, height: number) {
        this.halfWidth = width / 2;
        this.halfHeight = height / 2;
    }

    /**
     * Keeps an x coordinate inside the arena.
     * @param margin Distance kept from the wall (radius or half size of the object).
     */
    clampX(x: number, margin: number): number {
        return clamp(x, -this.halfWidth + margin, this.halfWidth - margin);
    }

    /**
     * Keeps a y coordinate inside the arena.
     * @param margin Distance kept from the wall (radius or half size of the object).
     */
    clampY(y: number, margin: number): number {
        return clamp(y, -this.halfHeight + margin, this.halfHeight - margin);
    }

    /** True when a circle touches or crosses any wall. */
    touchesWall(x: number, y: number, radius: number): boolean {
        if (x - radius <= -this.halfWidth || x + radius >= this.halfWidth) {
            return true;
        }
        return y - radius <= -this.halfHeight || y + radius >= this.halfHeight;
    }
}
