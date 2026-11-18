/**
 * BulletStore.ts
 * All bullets of one side (player or boss) in fixed-capacity typed arrays: position and velocity
 * per bullet, the live ones packed in [0, count). BattleWorld steps it and tests hits against it;
 * BulletLayerView reads the arrays to place bullet nodes. Implements IBulletEmitter for the shooters.
 */
import { circleOverlapsBox, circleOverlapsCircle } from '../utils/Collision';
import { ArenaBounds } from './ArenaBounds';
import { IBulletEmitter } from './IBulletEmitter';

/** Fixed-size bullet storage with O(1) spawn and O(1) removal. */
export class BulletStore implements IBulletEmitter {
    // PERF: Float32Arrays allocated once, no object per bullet, so spawning and removing never
    // allocates or creates garbage. Only indices [0, count) hold live bullets.
    readonly x: Float32Array;
    readonly y: Float32Array;
    readonly vx: Float32Array;
    readonly vy: Float32Array;
    /** Maximum number of live bullets. */
    readonly capacity: number;
    /** Same radius for every bullet of this store, px. */
    readonly radius: number;

    private readonly name: string;
    private _count = 0;
    private hasWarnedFull = false;

    /**
     * @param capacity Maximum number of live bullets.
     * @param radius   Bullet radius, px.
     * @param name     Used in the warning when the store is full.
     */
    constructor(capacity: number, radius: number, name: string) {
        this.capacity = capacity;
        this.radius = radius;
        this.name = name;
        this.x = new Float32Array(capacity);
        this.y = new Float32Array(capacity);
        this.vx = new Float32Array(capacity);
        this.vy = new Float32Array(capacity);
    }

    /** Number of live bullets (they occupy indices 0 .. count - 1). */
    get count(): number {
        return this._count;
    }

    /** Adds a bullet; skipped (with one warning per store) when the store is full. */
    spawn(x: number, y: number, vx: number, vy: number): void {
        if (this._count >= this.capacity) {
            this.warnFullOnce();
            return;
        }
        const index = this._count;
        this.x[index] = x;
        this.y[index] = y;
        this.vx[index] = vx;
        this.vy[index] = vy;
        this._count++;
    }

    /** Moves every bullet and removes the ones that touch a wall. */
    step(dt: number, bounds: ArenaBounds): void {
        // NOTE: loop backwards: removeAt moves the last bullet into slot i, and that bullet was
        // already processed, so nothing is skipped or moved twice.
        for (let i = this._count - 1; i >= 0; i--) {
            this.x[i] += this.vx[i] * dt;
            this.y[i] += this.vy[i] * dt;
            if (bounds.touchesWall(this.x[i], this.y[i], this.radius)) {
                this.removeAt(i);
            }
        }
    }

    /** Removes every bullet at once (boss defeated, new round). */
    clear(): void {
        // PERF: the arrays are kept; old values past count are simply ignored.
        this._count = 0;
    }

    /**
     * Removes every bullet overlapping a circle.
     * @returns How many bullets hit.
     */
    consumeHitsOnCircle(cx: number, cy: number, r: number): number {
        let hits = 0;
        for (let i = this._count - 1; i >= 0; i--) {
            if (circleOverlapsCircle(this.x[i], this.y[i], this.radius, cx, cy, r)) {
                this.removeAt(i);
                hits++;
            }
        }
        return hits;
    }

    /**
     * Removes every bullet overlapping an axis-aligned square.
     * @returns How many bullets hit.
     */
    consumeHitsOnBox(cx: number, cy: number, halfSize: number): number {
        let hits = 0;
        for (let i = this._count - 1; i >= 0; i--) {
            if (circleOverlapsBox(this.x[i], this.y[i], this.radius, cx, cy, halfSize)) {
                this.removeAt(i);
                hits++;
            }
        }
        return hits;
    }

    // ---- Private ----

    /** Swap-remove: the last bullet takes the freed slot. */
    private removeAt(index: number): void {
        // PERF: O(1) instead of shifting every later bullet (order does not matter for bullets).
        const last = this._count - 1;
        if (index !== last) {
            this.x[index] = this.x[last];
            this.y[index] = this.y[last];
            this.vx[index] = this.vx[last];
            this.vy[index] = this.vy[last];
        }
        this._count = last;
    }

    private warnFullOnce(): void {
        if (this.hasWarnedFull) {
            return;
        }
        this.hasWarnedFull = true;
        console.warn(`[BulletStore] ${this.name} store is full (${this.capacity}); extra bullets are skipped`);
    }
}
