/**
 * PickupView.ts
 * Draws the shield orb (world.pickup): shown only while the orb is active, at its position, with a
 * gentle time-based pulse so it catches the eye. Display only: spawning, collecting and granting the
 * shield are rules of the model (BattleWorld / PickupModel / PlayerModel).
 *
 * Attach to node Pickup (child of World; UITransform + Sprite with the white circle).
 */
import { _decorator, Color, Component, Sprite, UITransform } from 'cc';
import { FeedbackConfig } from '../config/FeedbackConfig';
import { GameConfig } from '../config/GameConfig';
import { GameManager } from '../controller/GameManager';
const { ccclass, property } = _decorator;

const TWO_PI = Math.PI * 2;

/** Shows the shield orb while it is on the map. */
@ccclass('PickupView')
export class PickupView extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Sprite)
    private sprite: Sprite = null!;

    /** Seconds the orb has been visible, drives the pulse. */
    private pulseElapsed = 0;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.sprite) {
            console.error(`[PickupView] gameManager or sprite is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        const diameter = 2 * GameConfig.PICKUP.RADIUS;
        // NOTE: CUSTOM so the sprite keeps this size instead of the texture size.
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.sprite.getComponent(UITransform)?.setContentSize(diameter, diameter);
        this.sprite.color = new Color(GameConfig.COLORS.PICKUP);
        // NOTE: only the Sprite is toggled, the node stays active so lateUpdate keeps watching the model.
        this.sprite.enabled = false;
    }

    protected lateUpdate(dt: number): void {
        const pickup = this.gameManager.world?.pickup;
        const isVisible = pickup !== undefined && pickup.isActive;
        // PERF: toggling a renderer marks render data dirty; only do it when visibility changes.
        if (this.sprite.enabled !== isVisible) {
            this.sprite.enabled = isVisible;
            this.pulseElapsed = 0;
        }
        // NOTE: TypeScript narrows `pickup` through the const isVisible (aliased condition), so no
        // second undefined check is needed.
        if (!isVisible) {
            return;
        }
        this.pulseElapsed += dt;
        const scale = 1 + FeedbackConfig.PICKUP_PULSE_AMOUNT
            * Math.sin(TWO_PI * FeedbackConfig.PICKUP_PULSE_HZ * this.pulseElapsed);
        this.node.setPosition(pickup.x, pickup.y, 0);
        this.node.setScale(scale, scale, 1);
    }
}
