/**
 * Collision.ts
 * Overlap tests used by BattleWorld and BulletStore: circle vs circle (boss bullets vs player)
 * and circle vs axis-aligned square (player bullets vs boss, boss body vs player).
 * Custom math instead of the physics engine: two shape types, one target per side.
 */
import { clamp } from './MathUtil';

/** True when two circles overlap. */
export function circleOverlapsCircle(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
    const dx = bx - ax;
    const dy = by - ay;
    const radiusSum = ar + br;
    // PERF: compare squared lengths, no Math.sqrt (this runs for every bullet every frame).
    return dx * dx + dy * dy < radiusSum * radiusSum;
}

/**
 * True when a circle overlaps an axis-aligned square.
 * @param boxX     Square centre.
 * @param boxY     Square centre.
 * @param halfSize Half of the square side.
 */
export function circleOverlapsBox(
    cx: number, cy: number, r: number, boxX: number, boxY: number, halfSize: number,
): boolean {
    // The point of the square closest to the circle centre; the circle overlaps if that point is inside it.
    const nearestX = clamp(cx, boxX - halfSize, boxX + halfSize);
    const nearestY = clamp(cy, boxY - halfSize, boxY + halfSize);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    // PERF: squared distance, no Math.sqrt.
    return dx * dx + dy * dy < r * r;
}
