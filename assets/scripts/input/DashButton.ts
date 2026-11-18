/**
 * DashButton.ts
 * On-screen dash button for touch screens: a touch on its node requests a dash
 * (InputState.isDashRequested), and a radial fill over the button shows the dash cooldown.
 * Disabled when the device has no touch screen, where KeyboardInput (Space / Shift) is used.
 *
 * Attach to node DashButton (UITransform + Sprite of the button, on the right side of the screen,
 * outside the joystick touch area). `cooldownFill` is a Sprite on a child node of the same size.
 */
import { _decorator, Component, Node, Sprite, sys, Vec2 } from 'cc';
import { GameManager } from '../controller/GameManager';
const { ccclass, property } = _decorator;

/** Radial fill pivot in normalised sprite space: the centre of the button. */
const FILL_CENTER_RATIO = 0.5;
/** Radial fill start angle as a fraction of a full turn: 0.25 starts at 12 o'clock. */
const FILL_START_TOP = 0.25;

/** Touch button that requests a dash and shows how much of the cooldown is left. */
@ccclass('DashButton')
export class DashButton extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    /** Dark overlay whose radial fill shrinks from full (just used) to empty (ready). */
    @property(Sprite)
    private cooldownFill: Sprite = null!;

    /** Last fill value written, so the sprite is only marked dirty when the cooldown changed. */
    private shownRatio = -1;

    // ---- Lifecycle ----

    protected onLoad(): void {
        // NOTE: same rule as VirtualJoystick: feature detection, not sys.isMobile.
        if (!sys.hasFeature(sys.Feature.INPUT_TOUCH)) {
            // Keyboard only: hiding the node also stops it from catching clicks.
            this.node.active = false;
            return;
        }
        if (!this.gameManager || !this.cooldownFill) {
            console.error(`[DashButton] gameManager or cooldownFill is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        // NOTE: the fill mode is set here, not in the scene, so the scene only needs a plain Sprite.
        this.cooldownFill.type = Sprite.Type.FILLED;
        this.cooldownFill.fillType = Sprite.FillType.RADIAL;
        this.cooldownFill.fillCenter = new Vec2(FILL_CENTER_RATIO, FILL_CENTER_RATIO);
        this.cooldownFill.fillStart = FILL_START_TOP;
        this.showCooldown(0);
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with node.on in onEnable; same event, handler and target.
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    protected lateUpdate(): void {
        const world = this.gameManager.world;
        if (!world) {
            return;
        }
        this.showCooldown(world.player.dashCooldownRatio);
    }

    // ---- Private ----

    private onTouchStart(): void {
        this.gameManager.requestDash();
    }

    private showCooldown(ratio: number): void {
        // PERF: fillRange marks the render data dirty; skip it when the value did not change
        // (true for every frame while the dash is ready).
        if (ratio === this.shownRatio) {
            return;
        }
        this.shownRatio = ratio;
        this.cooldownFill.fillRange = ratio;
    }
}
