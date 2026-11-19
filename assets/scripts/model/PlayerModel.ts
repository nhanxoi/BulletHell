/**
 * PlayerModel.ts
 * Player simulation state: position, HP, the shield charge from the shield orb, the invulnerability
 * timer after a hit and the dash (a short burst of speed with its own invulnerability and cooldown).
 * BattleWorld steps it once per frame; PlayerView, CameraFollow and DashButton only read it.
 */
import { GameConfig } from '../config/GameConfig';
import { ArenaBounds } from './ArenaBounds';
import { Health } from './Health';
import { InputState } from './InputState';
import { Point } from './Point';

const PLAYER = GameConfig.PLAYER;

/** The player circle: moves from input, dashes on request, takes hits with short invulnerability. */
export class PlayerModel implements Point {
    readonly radius: number = PLAYER.RADIUS;
    readonly health = new Health(PLAYER.MAX_HP);

    private _x: number = PLAYER.START_X;
    private _y: number = PLAYER.START_Y;
    private _hasShield = false;
    /** Seconds of invulnerability left after a hit; 0 means no hit invulnerability. */
    private hitInvulnerableTimer = 0;
    /** Seconds of dash left; 0 means the player is not dashing. */
    private dashTimer = 0;
    /** Seconds until the next dash is allowed; counted from the start of the last dash. */
    private dashCooldownTimer = 0;
    /** Unit direction of the current dash. */
    private dashDirX = 0;
    private dashDirY = 0;
    /** Last non-zero move input (not normalised), used when the player dashes without input. */
    private lastMoveX = 0;
    private lastMoveY = 1;

    /** World x, px. */
    get x(): number {
        return this._x;
    }

    /** World y, px. */
    get y(): number {
        return this._y;
    }

    /**
     * True while bullets and boss contact do nothing: after a hit, or during a dash.
     * NOTE: the dash is a classic dodge, so the player passes through bullets and the boss body.
     */
    get isInvulnerable(): boolean {
        return this.isHitInvulnerable || this.isDashing;
    }

    /** True only for the invulnerability window after a hit (the view blinks during it). */
    get isHitInvulnerable(): boolean {
        return this.hitInvulnerableTimer > 0;
    }

    /** True while a dash is moving the player. */
    get isDashing(): boolean {
        return this.dashTimer > 0;
    }

    /** True while the player holds a shield charge (the next hit costs no HP). */
    get hasShield(): boolean {
        return this._hasShield;
    }

    /** Dash cooldown left as a ratio: 0 = ready, 1 = just used. */
    get dashCooldownRatio(): number {
        return this.dashCooldownTimer / PLAYER.DASH_COOLDOWN;
    }

    /** Back to the start position with full HP, no shield, no invulnerability and the dash ready. */
    reset(): void {
        this._x = PLAYER.START_X;
        this._y = PLAYER.START_Y;
        this._hasShield = false;
        this.clearTimedEffects();
        this.dashCooldownTimer = 0;
        this.lastMoveX = 0;
        this.lastMoveY = 1;
        this.health.reset();
    }

    /**
     * Advances the player by one frame.
     * @param dt     Seconds since the last step.
     * @param input  Latest keyboard and joystick axes and the dash request (consumed here).
     * @param bounds Arena the player is kept inside.
     */
    step(dt: number, input: InputState, bounds: ArenaBounds): void {
        this.hitInvulnerableTimer = Math.max(0, this.hitInvulnerableTimer - dt);
        this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
        const moveX = input.keyX + input.stickX;
        const moveY = input.keyY + input.stickY;
        if (moveX !== 0 || moveY !== 0) {
            this.lastMoveX = moveX;
            this.lastMoveY = moveY;
        }
        if (input.isDashRequested) {
            input.isDashRequested = false;
            this.tryStartDash();
        }
        if (this.isDashing) {
            this.dash(dt, bounds);
            return;
        }
        this.move(dt, moveX, moveY, bounds);
    }

    /**
     * Gives the player one shield charge. NOTE: a charge does not stack: collecting a second orb
     * while shielded still leaves exactly one.
     */
    grantShield(): void {
        this._hasShield = true;
    }

    /**
     * Resolves one hit: nothing while invulnerable; otherwise the shield absorbs it if held, else
     * HP is lost. Either way the hit invulnerability window starts.
     * NOTE: a shielded hit also starts the window, so the other bullets overlapping the player in the
     * same frame (or the boss body touching it) do not land right after the shield breaks.
     */
    takeHit(damage: number): void {
        // NOTE: `!(damage > 0)` also rejects NaN, so a bad value never breaks the shield for free.
        if (this.isInvulnerable || !(damage > 0)) {
            return;
        }
        if (this._hasShield) {
            this._hasShield = false;
            this.hitInvulnerableTimer = PLAYER.HIT_INVULNERABLE;
            return;
        }
        if (this.health.applyDamage(damage) > 0) {
            this.hitInvulnerableTimer = PLAYER.HIT_INVULNERABLE;
        }
    }

    /**
     * Ends the hit invulnerability and any dash in progress (not the dash cooldown).
     * Called by reset() and by BattleWorld when the round ends, because the world is no longer
     * stepped after that and running timers would otherwise freeze (endless blink or dash tint).
     */
    clearTimedEffects(): void {
        this.hitInvulnerableTimer = 0;
        this.dashTimer = 0;
    }

    // ---- Private ----

    /** Starts a dash along the last move direction; does nothing while dashing or cooling down. */
    private tryStartDash(): void {
        if (this.isDashing || this.dashCooldownTimer > 0) {
            return;
        }
        // NOTE: lastMove is never (0, 0) (it starts as "up" and only takes non-zero input), so the
        // length is never 0. Always normalised: a half-tilted stick still dashes the full distance.
        const scale = 1 / Math.sqrt(this.lastMoveX * this.lastMoveX + this.lastMoveY * this.lastMoveY);
        this.dashDirX = this.lastMoveX * scale;
        this.dashDirY = this.lastMoveY * scale;
        this.dashTimer = PLAYER.DASH_DURATION;
        this.dashCooldownTimer = PLAYER.DASH_COOLDOWN;
    }

    /** Moves along the dash direction at DASH_SPEED, ignoring input, for what is left of the dash. */
    private dash(dt: number, bounds: ArenaBounds): void {
        // NOTE: the last step of the dash only uses the time left, so the distance is exactly
        // DASH_SPEED * DASH_DURATION; the rest of that frame is not spent on normal movement.
        // BattleWorld checks hits after this step, so the step that ends the dash is already vulnerable.
        const dashTime = Math.min(dt, this.dashTimer);
        this.dashTimer -= dashTime;
        const distance = PLAYER.DASH_SPEED * dashTime;
        this.moveClamped(this.dashDirX * distance, this.dashDirY * distance, bounds);
    }

    private move(dt: number, dirX: number, dirY: number, bounds: ArenaBounds): void {
        // Keyboard and joystick are added so either one works; the sum is normalised below.
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
        this.moveClamped(dirX * distance, dirY * distance, bounds);
    }

    /** Moves by (deltaX, deltaY) px and keeps the whole circle inside the arena walls. */
    private moveClamped(deltaX: number, deltaY: number, bounds: ArenaBounds): void {
        this._x = bounds.clampX(this._x + deltaX, this.radius);
        this._y = bounds.clampY(this._y + deltaY, this.radius);
    }
}
