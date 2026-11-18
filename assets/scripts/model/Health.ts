/**
 * Health.ts
 * Hit points of one combatant (player or boss). Damage is clamped so HP never goes below 0,
 * and bad input (negative, NaN) is ignored instead of breaking the fight.
 */

/** Current and maximum HP with damage and reset. */
export class Health {
    private _current: number;
    private readonly _max: number;

    /** @param max Full HP, restored by reset(). */
    constructor(max: number) {
        this._max = max;
        this._current = max;
    }

    /** HP left. */
    get current(): number {
        return this._current;
    }

    /** Full HP. */
    get max(): number {
        return this._max;
    }

    /** HP left as a fraction of max, in [0, 1]. */
    get ratio(): number {
        // NOTE: guard against a 0 max HP in config so the ratio never becomes NaN or Infinity.
        if (this._max <= 0) {
            return 0;
        }
        return this._current / this._max;
    }

    /** True when no HP is left. */
    get isDead(): boolean {
        return this._current <= 0;
    }

    /**
     * Removes HP, never below 0.
     * @returns HP actually removed (0 when the amount is invalid or the owner is already dead).
     */
    applyDamage(amount: number): number {
        // NOTE: `!(amount > 0)` also rejects NaN, which `amount <= 0` would let through.
        if (!(amount > 0)) {
            return 0;
        }
        const removed = Math.min(amount, this._current);
        this._current -= removed;
        return removed;
    }

    /** Restores full HP for a new round. */
    reset(): void {
        this._current = this._max;
    }
}
