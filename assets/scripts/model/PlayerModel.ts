/**
 * PlayerModel.ts
 * Player simulation state: position, HP and the invulnerability timer after a hit.
 * BattleWorld steps it once per frame; PlayerView and CameraFollow only read it.
 */
import { GameConfig } from '../config/GameConfig';
import { ArenaBounds } from './ArenaBounds';
import { Health } from './Health';
import { InputState } from './InputState';
import { Point } from './Point';

const PLAYER = GameConfig.PLAYER;

/** The player circle: moves from input, takes hits with short invulnerability. */
export class PlayerModel implements Point {
    readonly radius: number = PLAYER.RADIUS;
    readonly health = new Health(PLAYER.MAX_HP);

    private _x: number = PLAYER.START_X;
    private _y: number = PLAYER.START_Y;
    /** Seconds of invulnerability left; 0 means the player can be hit. */
    private invulnerableTimer = 0;

    /** World x, px. */
    get x(): number {
        return this._x;
    }

    /** World y, px. */
    get y(): number {
        return this._y;
    }

    /** True for a short time after a hit; bullets and contact then do nothing. */
    get isInvulnerable(): boolean {
        return this.invulnerableTimer > 0;
    }

    /** Back to the start position with full HP and no invulnerability. */
    reset(): void {
        this._x = PLAYER.START_X;
        this._y = PLAYER.START_Y;
        this.invulnerableTimer = 0;
        this.health.reset();
    }

    /**
     * Advances the player by one frame.
     * @param dt     Seconds since the last step.
     * @param input  Latest keyboard and joystick axes.
     * @param bounds Arena the player is kept inside.
     */
    step(dt: number, input: InputState, bounds: ArenaBounds): void {
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
        }
        this.move(dt, input, bounds);
    }

    /**
     * Applies damage unless the player is invulnerable, then starts the invulnerability window.
     * @returns True when the hit landed (HP was removed).
     */
    takeHit(damage: number): boolean {
        if (this.isInvulnerable) {
            return false;
        }
        if (this.health.applyDamage(damage) <= 0) {
            return false;
        }
        // NOTE: no invulnerability after a lethal hit: the round ends this frame and the world stops
        // stepping, so the timer would never run out and the dead player would blink behind DEFEAT.
        if (this.health.isDead) {
            return true;
        }
        this.invulnerableTimer = PLAYER.HIT_INVULNERABLE;
        return true;
    }

    // ---- Private ----

    private move(dt: number, input: InputState, bounds: ArenaBounds): void {
        // Keyboard and joystick are added so either one works; the sum is normalised below.
        let dirX = input.keyX + input.stickX;
        let dirY = input.keyY + input.stickY;
        const lengthSqr = dirX * dirX + dirY * dirY;
        if (lengthSqr === 0) {
            return;
        }
        // NOTE: only shrink, never grow: a diagonal key press (length ~1.41) is scaled to 1 so it is not
        // faster, while a half-tilted joystick (length < 1) keeps its slower speed.
        if (lengthSqr > 1) {
            const scale = 1 / Math.sqrt(lengthSqr);
            dirX *= scale;
            dirY *= scale;
        }
        const distance = PLAYER.SPEED * dt;
        this._x = bounds.clampX(this._x + dirX * distance, this.radius);
        this._y = bounds.clampY(this._y + dirY * distance, this.radius);
    }
}
