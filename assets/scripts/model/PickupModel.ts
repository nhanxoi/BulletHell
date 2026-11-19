/**
 * PickupModel.ts
 * The shield orb: at most one at a time. BattleWorld spawns it when the boss enters a new HP phase
 * (away from the boss, inside the walls) and collects it when the player touches it; PickupView
 * draws it and GameManager reports where it appeared and where it was collected.
 */
import { GameConfig } from '../config/GameConfig';
import { randomRange } from '../utils/MathUtil';
import { ArenaBounds } from './ArenaBounds';
import { Point } from './Point';

const PICKUP = GameConfig.PICKUP;
// PERF: squared once at load, so the distance test needs no Math.sqrt.
const MIN_DISTANCE_SQR = PICKUP.MIN_DISTANCE_FROM_BOSS * PICKUP.MIN_DISTANCE_FROM_BOSS;
/** Distance kept between the orb centre and every wall, px. */
const WALL_MARGIN = PICKUP.RADIUS + PICKUP.WALL_GAP;

/** One shield orb: position, active flag and the position of the last collection. */
export class PickupModel implements Point {
    readonly radius: number = PICKUP.RADIUS;

    private _isActive = false;
    private _x = 0;
    private _y = 0;
    private _collectedX = 0;
    private _collectedY = 0;

    /** True while the orb is on the map and can be collected. */
    get isActive(): boolean {
        return this._isActive;
    }

    /** World x, px (last spawn position; meaningful while isActive). */
    get x(): number {
        return this._x;
    }

    /** World y, px (last spawn position; meaningful while isActive). */
    get y(): number {
        return this._y;
    }

    /**
     * Where the orb was last collected, px.
     * NOTE: kept apart from x / y because a new orb can spawn later in the same frame (sub-steps),
     * and the collect effect must still play where the old orb was.
     */
    get collectedX(): number {
        return this._collectedX;
    }

    /** See collectedX. */
    get collectedY(): number {
        return this._collectedY;
    }

    /** Places the orb at (x, y) and activates it; an uncollected orb is simply replaced. */
    spawn(x: number, y: number): void {
        this._x = x;
        this._y = y;
        this._isActive = true;
    }

    /**
     * Spawns the orb at a random point inside the walls, at least MIN_DISTANCE_FROM_BOSS from `avoid`.
     * @param avoid  The boss centre.
     * @param bounds Arena the orb must stay inside.
     */
    spawnAwayFrom(avoid: Point, bounds: ArenaBounds): void {
        const minX = -bounds.halfWidth + WALL_MARGIN;
        const maxX = bounds.halfWidth - WALL_MARGIN;
        const minY = -bounds.halfHeight + WALL_MARGIN;
        const maxY = bounds.halfHeight - WALL_MARGIN;
        // PERF: a few random tries with plain numbers, no candidate list, so nothing is allocated.
        for (let attempt = 0; attempt < PICKUP.SPAWN_ATTEMPTS; attempt++) {
            const x = randomRange(minX, maxX);
            const y = randomRange(minY, maxY);
            const dx = x - avoid.x;
            const dy = y - avoid.y;
            if (dx * dx + dy * dy >= MIN_DISTANCE_SQR) {
                this.spawn(x, y);
                return;
            }
        }
        // NOTE: every try landed near the boss (very unlikely: the forbidden disc covers about a quarter
        // of the arena at most). The corner farthest from the boss is the farthest reachable point, so it
        // satisfies the minimum distance whenever any point does.
        this.spawn(avoid.x > 0 ? minX : maxX, avoid.y > 0 ? minY : maxY);
    }

    /** Records where the orb was taken and removes it. Does nothing when no orb is active. */
    collect(): void {
        if (!this._isActive) {
            return;
        }
        this._collectedX = this._x;
        this._collectedY = this._y;
        this._isActive = false;
    }

    /** Removes the orb without collecting it (round over, new round). */
    clear(): void {
        this._isActive = false;
    }
}
