/**
 * IBulletEmitter.ts
 * Something that can create a bullet. BulletStore implements it; weapons and boss shots only
 * see this interface, so they do not care how bullets are stored or rendered.
 */
export interface IBulletEmitter {
    /**
     * Creates one bullet.
     * @param x  Start position, world px.
     * @param y  Start position, world px.
     * @param vx Velocity, px/s.
     * @param vy Velocity, px/s.
     */
    spawn(x: number, y: number, vx: number, vy: number): void;
}
