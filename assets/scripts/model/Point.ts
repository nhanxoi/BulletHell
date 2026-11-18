/**
 * Point.ts
 * Minimal 2D position shape shared by the models. PlayerModel and BossModel satisfy it
 * structurally, so moves and shots can aim at "a point" without depending on a concrete class.
 */
export interface Point {
    readonly x: number;
    readonly y: number;
}
