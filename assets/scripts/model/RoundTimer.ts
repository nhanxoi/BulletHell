/**
 * RoundTimer.ts
 * Simulated time of the current round and the best (shortest) victory time. GameManager advances
 * it with the same sub-steps as the world, loads the record from SaveStore once and saves it when a
 * victory beats it; the round timer and Game Over panel read it through GameManager.
 * Plain TypeScript (no persistence here), so the record rule can be tested without the engine.
 */

/** Round clock plus best clear time; 0 means "no record yet". */
export class RoundTimer {
    private _roundTime = 0;
    private _bestClearTime = 0;
    private _isNewBestTime = false;

    /** Seconds of simulated Playing time in the current round. */
    get roundTime(): number {
        return this._roundTime;
    }

    /** Shortest victory time so far, seconds; 0 when the boss was never defeated. */
    get bestClearTime(): number {
        return this._bestClearTime;
    }

    /** True only when the last finished round was a victory that beat the previous record. */
    get isNewBestTime(): boolean {
        return this._isNewBestTime;
    }

    /**
     * Sets the record read from the save file.
     * NOTE: SaveStore already validates it; the check is repeated so this class stays safe on its own.
     */
    setBestClearTime(seconds: number): void {
        this._bestClearTime = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    }

    /** Back to 0 for a new round; the "new best" flag of the previous round is dropped. */
    startRound(): void {
        this._roundTime = 0;
        this._isNewBestTime = false;
    }

    /** Adds simulated time (one sub-step); invalid values (<= 0, NaN) are ignored. */
    advance(dt: number): void {
        if (!(dt > 0)) {
            return;
        }
        this._roundTime += dt;
    }

    /**
     * Compares this round's time with the record (call once, on victory).
     * @returns true when the record was beaten (or set for the first time); the caller then saves it.
     */
    recordVictory(): boolean {
        const hasRecord = this._bestClearTime > 0;
        this._isNewBestTime = !hasRecord || this._roundTime < this._bestClearTime;
        if (this._isNewBestTime) {
            this._bestClearTime = this._roundTime;
        }
        return this._isNewBestTime;
    }
}
