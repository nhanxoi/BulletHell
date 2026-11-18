/**
 * MathUtil.ts
 * Small pure math helpers shared by the simulation (clamping, angles, randomness).
 * No engine import, so the model stays plain TypeScript.
 */

/** Limits `value` to the range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/** Converts degrees to radians. */
export function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/** Random number in [min, max). */
export function randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

/**
 * Picks one element at random.
 * NOTE: `items` must not be empty; callers pass config lists that always hold at least one id.
 */
export function randomItem<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}
