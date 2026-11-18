/**
 * PlayerView.ts
 * Draws the player: copies the model position onto the node every frame and blinks the sprite
 * while the player is invulnerable after a hit. Display only, it owns no game rules.
 *
 * Attach to node Player (UITransform + Sprite with the white circle).
 */
import { _decorator, Color, Component, Sprite, UITransform } from 'cc';
import { GameConfig } from '../config/GameConfig';
import { GameManager } from '../controller/GameManager';
const { ccclass, property } = _decorator;

/** Shows the player model on screen. */
@ccclass('PlayerView')
export class PlayerView extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Sprite)
    private sprite: Sprite = null!;

    // PERF: both colours are parsed once; lateUpdate only switches between the two references.
    private readonly normalColor = new Color();
    private readonly blinkColor = new Color();
    private shownColor: Color | null = null;
    private blinkElapsed = 0;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.sprite) {
            console.error(`[PlayerView] gameManager or sprite is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        Color.fromHEX(this.normalColor, GameConfig.COLORS.PLAYER);
        this.blinkColor.set(this.normalColor);
        this.blinkColor.a = GameConfig.FEEDBACK.BLINK_ALPHA;

        const diameter = 2 * GameConfig.PLAYER.RADIUS;
        // NOTE: CUSTOM so the sprite keeps this size instead of the texture size.
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.sprite.getComponent(UITransform)?.setContentSize(diameter, diameter);
    }

    protected lateUpdate(dt: number): void {
        const world = this.gameManager.world;
        if (!world) {
            return;
        }
        const player = world.player;
        this.node.setPosition(player.x, player.y, 0);
        this.applyColor(this.pickColor(player.isInvulnerable, dt));
    }

    // ---- Private ----

    /** Time-based blink (no tween): alternates colours every FEEDBACK.BLINK_INTERVAL while invulnerable. */
    private pickColor(isInvulnerable: boolean, dt: number): Color {
        if (!isInvulnerable) {
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
