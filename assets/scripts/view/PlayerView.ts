/**
 * PlayerView.ts
 * Draws the player: copies the model position onto the node every frame, tints it lighter while
 * dashing, blinks the sprite while the player is invulnerable after a hit and shows a pulsing
 * shield bubble while the player holds a shield. Display only, it owns no game rules.
 *
 * Attach to node Player (UITransform + Sprite with the white circle). `shieldSprite` sits on its
 * child node Shield (UITransform + Sprite with the white circle), so the bubble follows the player.
 */
import { _decorator, Color, Component, Sprite, UITransform } from 'cc';
import { FeedbackConfig } from '../config/FeedbackConfig';
import { GameConfig } from '../config/GameConfig';
import { GameManager } from '../controller/GameManager';
const { ccclass, property } = _decorator;

const TWO_PI = Math.PI * 2;

/** Gives a circle sprite a fixed diameter, px. */
function setCircleSize(sprite: Sprite, diameter: number): void {
    // NOTE: CUSTOM so the sprite keeps this size instead of the texture size.
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.getComponent(UITransform)?.setContentSize(diameter, diameter);
}

/** Shows the player model on screen. */
@ccclass('PlayerView')
export class PlayerView extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Sprite)
    private sprite: Sprite = null!;

    /** Bubble shown while the player holds a shield; on the child node Shield. */
    @property(Sprite)
    private shieldSprite: Sprite = null!;

    // PERF: the colours are parsed once; lateUpdate only switches between these references.
    private readonly normalColor = new Color();
    private readonly blinkColor = new Color();
    private readonly dashColor = new Color();
    private shownColor: Color | null = null;
    private blinkElapsed = 0;
    /** Seconds the shield has been visible, drives its pulse. */
    private shieldElapsed = 0;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.sprite || !this.shieldSprite) {
            console.error(`[PlayerView] gameManager, sprite or shieldSprite is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        Color.fromHEX(this.normalColor, GameConfig.COLORS.PLAYER);
        this.blinkColor.set(this.normalColor);
        this.blinkColor.a = GameConfig.FEEDBACK.BLINK_ALPHA;
        Color.fromHEX(this.dashColor, GameConfig.COLORS.PLAYER_DASH);

        setCircleSize(this.sprite, 2 * GameConfig.PLAYER.RADIUS);
        this.setupShield();
    }

    protected lateUpdate(dt: number): void {
        const world = this.gameManager.world;
        if (!world) {
            return;
        }
        const player = world.player;
        this.node.setPosition(player.x, player.y, 0);
        this.updateShield(player.hasShield, dt);
        // NOTE: the dash tint wins over the blink; only hit invulnerability blinks, the dash's own
        // invulnerability is shown by the tint, so a dodge never looks like a hit.
        if (player.isDashing) {
            this.applyColor(this.dashColor);
            return;
        }
        this.applyColor(this.pickBlinkColor(player.isHitInvulnerable, dt));
    }

    // ---- Private ----

    private setupShield(): void {
        setCircleSize(this.shieldSprite, FeedbackConfig.SHIELD_DIAMETER);
        const shieldColor = new Color(GameConfig.COLORS.PLAYER_SHIELD);
        shieldColor.a = FeedbackConfig.SHIELD_ALPHA;
        this.shieldSprite.color = shieldColor;
        // NOTE: only the Sprite is toggled; the node stays active and simply follows its parent.
        this.shieldSprite.enabled = false;
    }

    /** Shows the bubble only while the model has a shield, with a gentle time-based pulse. */
    private updateShield(hasShield: boolean, dt: number): void {
        // PERF: toggling a renderer marks render data dirty; only do it when visibility changes.
        if (this.shieldSprite.enabled !== hasShield) {
            this.shieldSprite.enabled = hasShield;
            this.shieldElapsed = 0;
        }
        if (!hasShield) {
            return;
        }
        this.shieldElapsed += dt;
        const scale = 1 + FeedbackConfig.SHIELD_PULSE_AMOUNT
            * Math.sin(TWO_PI * FeedbackConfig.SHIELD_PULSE_HZ * this.shieldElapsed);
        this.shieldSprite.node.setScale(scale, scale, 1);
    }

    /** Time-based blink (no tween): alternates colours every FEEDBACK.BLINK_INTERVAL while invulnerable. */
    private pickBlinkColor(isHitInvulnerable: boolean, dt: number): Color {
        if (!isHitInvulnerable) {
            this.blinkElapsed = 0;
            return this.normalColor;
        }
        this.blinkElapsed += dt;
        const isOffHalf = Math.floor(this.blinkElapsed / GameConfig.FEEDBACK.BLINK_INTERVAL) % 2 === 1;
        return isOffHalf ? this.blinkColor : this.normalColor;
    }

    private applyColor(color: Color): void {
        // PERF: assigning a colour marks the render data dirty; skip it when nothing changed.
        if (color === this.shownColor) {
            return;
        }
        this.shownColor = color;
        this.sprite.color = color;
    }
}
