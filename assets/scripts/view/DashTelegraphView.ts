/**
 * DashTelegraphView.ts
 * Draws the dash warning: while the boss winds up a dash, a pulsing line starts at the boss centre
 * and points along the locked dash direction, as long as the dash will travel, so the player can
 * see where the charge will go and step aside. Hidden at any other time. Display only.
 *
 * Attach to node DashTelegraph (child of World). `sprite` sits on its child node Line: a white
 * square with anchor (0, 0.5), so the line grows from the boss forward and rotates around its start.
 * The component toggles the Line node, not its own node, so it keeps running while the line is hidden.
 */
import { _decorator, Color, Component, Sprite, UITransform } from 'cc';
import { FeedbackConfig } from '../config/FeedbackConfig';
import { GameManager } from '../controller/GameManager';
const { ccclass, property } = _decorator;

const RAD_TO_DEG = 180 / Math.PI;
const TWO_PI = Math.PI * 2;

/** Shows the windup telegraph of the boss dash. */
@ccclass('DashTelegraphView')
export class DashTelegraphView extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Sprite)
    private sprite: Sprite = null!;

    // PERF: one colour reused every frame; only its alpha changes.
    private readonly lineColor = new Color();
    /** Seconds since the current windup started, drives the pulse. */
    private pulseElapsed = 0;
    /** Direction the line was last rotated to, so atan2 runs only when it changes. */
    private shownDirX = 0;
    private shownDirY = 0;
    private shownAlpha = -1;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.sprite) {
            console.error(`[DashTelegraphView] gameManager or sprite is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        Color.fromHEX(this.lineColor, FeedbackConfig.TELEGRAPH_COLOR);
        // NOTE: CUSTOM so the sprite keeps this size instead of the texture size.
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.sprite.getComponent(UITransform)?.setContentSize(
            FeedbackConfig.TELEGRAPH_LENGTH, FeedbackConfig.TELEGRAPH_THICKNESS);
        this.sprite.node.active = false;
    }

    protected lateUpdate(dt: number): void {
        const world = this.gameManager.world;
        const boss = world ? world.boss : null;
        if (!boss || !boss.isWindingUp) {
            this.hide();
            return;
        }
        const lineNode = this.sprite.node;
        if (!lineNode.active) {
            lineNode.active = true;
            this.pulseElapsed = 0;
        }
        this.pulseElapsed += dt;
        lineNode.setPosition(boss.x, boss.y, 0);
        this.applyDirection(boss.dashDirX, boss.dashDirY);
        this.applyPulse();
    }

    // ---- Private ----

    private hide(): void {
        // PERF: changing node.active walks the node's components, so never set it when unchanged.
        if (this.sprite.node.active) {
            this.sprite.node.active = false;
        }
    }

    /** Rotates the line toward the dash direction; skipped while the direction is unchanged. */
    private applyDirection(dirX: number, dirY: number): void {
        if (dirX === this.shownDirX && dirY === this.shownDirY) {
            return;
        }
        this.shownDirX = dirX;
        this.shownDirY = dirY;
        // NOTE: node.angle is in degrees, counter-clockwise, 0 = +x: the same convention as atan2.
        this.sprite.node.angle = Math.atan2(dirY, dirX) * RAD_TO_DEG;
    }

    /** Time-based alpha pulse (no tween, so nothing to stop when the windup ends). */
    private applyPulse(): void {
        const { TELEGRAPH_ALPHA_MIN, TELEGRAPH_ALPHA_MAX, TELEGRAPH_PULSE_HZ } = FeedbackConfig;
        // Cosine starts at 1, so each windup begins at full alpha and reads immediately.
        const wave = 0.5 + 0.5 * Math.cos(TWO_PI * TELEGRAPH_PULSE_HZ * this.pulseElapsed);
        const alpha = Math.round(TELEGRAPH_ALPHA_MIN + (TELEGRAPH_ALPHA_MAX - TELEGRAPH_ALPHA_MIN) * wave);
        // PERF: assigning a colour marks the render data dirty; skip it when the alpha did not change.
        if (alpha === this.shownAlpha) {
            return;
        }
        this.shownAlpha = alpha;
        this.lineColor.a = alpha;
        this.sprite.color = this.lineColor;
    }
}
