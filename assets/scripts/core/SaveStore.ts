/**
 * SaveStore.ts
 * Reads and writes the player's save data (the best clear time) in local storage. GameManager loads
 * it once in onLoad and saves after a victory that beats the record. It never throws: storage can be
 * missing or refuse writes (private browsing, quota) and stored data can be corrupted or edited, so
 * every failure is logged and falls back to defaults. Data written by a newer version of the game is
 * not trusted and replaced by defaults.
 */
import { sys } from 'cc';

/** Shape of the persisted data. Bump SAVE_VERSION when it changes and migrate in sanitize(). */
export interface SaveData {
    version: number;
    /** Shortest victory time, seconds; 0 = the boss was never defeated. */
    bestClearTime: number;
}

const SAVE_KEY = 'bullethell-save';
const SAVE_VERSION = 1;

/** Static helpers around sys.localStorage with validation and safe defaults. */
export class SaveStore {
    /** Returns the saved data, or defaults when nothing valid is stored. Never throws. */
    static load(): SaveData {
        let raw: string | null = null;
        try {
            // NOTE: inside the try: on some platforms sys.localStorage itself is missing, and reading it
            // can throw (storage disabled by the browser), not only getItem().
            raw = sys.localStorage.getItem(SAVE_KEY);
        } catch (err) {
            console.error('[SaveStore] local storage is not available, using defaults', err);
            return SaveStore.defaults();
        }
        if (!raw) {
            return SaveStore.defaults();
        }
        try {
            return SaveStore.sanitize(JSON.parse(raw));
        } catch (err) {
            console.error('[SaveStore] save data is corrupted, using defaults', err);
            return SaveStore.defaults();
        }
    }

    /**
     * Persists the data with the current version.
     * @returns false when storage failed (the game keeps running either way, the record lives in memory).
     */
    static save(data: Omit<SaveData, 'version'>): boolean {
        try {
            const payload: SaveData = { version: SAVE_VERSION, bestClearTime: data.bestClearTime };
            sys.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
            return true;
        } catch (err) {
            console.error('[SaveStore] could not write save data', err);
            return false;
        }
    }

    // ---- Private ----

    private static defaults(): SaveData {
        return { version: SAVE_VERSION, bestClearTime: 0 };
    }

    /** Accepts only well-formed fields; anything missing or invalid falls back to its default. */
    private static sanitize(value: unknown): SaveData {
        const result = SaveStore.defaults();
        if (typeof value !== 'object' || value === null) {
            return result;
        }
        const data = value as Record<string, unknown>;
        const version = typeof data.version === 'number' ? data.version : 0;
        if (version > SAVE_VERSION) {
            console.warn(`[SaveStore] save version ${version} is newer than ${SAVE_VERSION}, using defaults`);
            return result;
        }
        const best = data.bestClearTime;
        // NOTE: Number.isFinite rejects NaN and Infinity, which typeof === 'number' accepts.
        if (typeof best === 'number' && Number.isFinite(best) && best >= 0) {
            result.bestClearTime = best;
        }
        return result;
    }
}
