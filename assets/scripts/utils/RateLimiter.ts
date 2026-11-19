/**
 * RateLimiter.ts
 * Lets a frequent action through at most once per `minInterval` seconds (boss-hit ticks and sparks,
 * player shot ticks). Plain TypeScript, no engine import: the owner calls tick(dt) once per frame
 * and tryConsume() when the action wants to happen. Used by AudioPlayer and ImpactEffects.
 */

/** Allows an action at most once per interval. */
export class RateLimiter {
    private readonly minInterval: number;
    /** Seconds since the last allowed action; starts "ready" so the first one is never blocked. */
    private elapsed: number;

    /** @param minInterval Shortest time between two allowed actions, seconds. */
    constructor(minInterval: number) {
        this.minInterval = minInterval;
        this.elapsed = minInterval;
    }

    /** Advances the clock by dt seconds. */
    tick(dt: number): void {
        // NOTE: stop counting once the interval has passed, so the value never grows without bound.
        if (this.elapsed < this.minInterval) {
            this.elapsed += dt;
        }
    }

    /**
     * @returns true (and restarts the interval) when enough time has passed since the last allowed action.
     */
    tryConsume(): boolean {
        if (this.elapsed < this.minInterval) {
            return false;
        }
        this.elapsed = 0;
        return true;
    }

    /** Ready again at once (new round). */
    reset(): void {
        this.elapsed = this.minInterval;
    }
}
