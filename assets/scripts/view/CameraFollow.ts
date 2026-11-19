/**
 * CameraFollow.ts
 * Top-down camera: smoothly follows the player, never shows anything outside the outer walls,
 * snaps to the player when a round starts and shakes briefly when the player is hit. Its zoom
 * adapts to the screen shape so at least CAMERA.MIN_VIEW_WIDTH x MIN_VIEW_HEIGHT world px are
 * visible on any phone, tablet or window.
 * It reads the player position from the model (not from the Player node), so it does not depend
 * on the order in which views run lateUpdate.
 *
 * Attach to node GameCamera (orthographic Camera of the World).
 */
import { _decorator, Camera, Component, view } from 'cc';
import { GameConfig } from '../config/GameConfig';
import { ViewEvents } from '../core/ViewEvents';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { GameManager } from '../controller/GameManager';
import { GameState } from '../model/GameState';
import { clamp } from '../utils/MathUtil';
const { ccclass, property } = _decorator;

/** Eases the camera toward the player, clamped to the arena, with a time-based hit shake. */
@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Camera)
    private camera: Camera = null!;

    /** Followed position without shake; the shake is added on top so it never accumulates. */
    private followX = 0;
    private followY = 0;
    /** Farthest the camera centre may go from the arena centre so the view stays inside the walls. */
    private limitX = 0;
    private limitY = 0;
    /** The camera keeps its original z (2D cameras sit in front of the scene). */
    private cameraZ = 0;
    private shakeTimeLeft = 0;
    /** True when the next frame must jump to the player instead of easing toward it. */
    private isSnapPending = true;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.camera) {
            console.error(`[CameraFollow] gameManager or camera is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        this.cameraZ = this.node.position.z;
        this.fitViewToScreen();
    }

    protected onEnable(): void {
        EventBus.on(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        EventBus.on(GameEvents.PLAYER_HIT, this.onPlayerHit, this);
        view.on(ViewEvents.CANVAS_RESIZE, this.onCanvasResize, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with the three on() calls in onEnable; same event, handler and target.
        EventBus.off(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        EventBus.off(GameEvents.PLAYER_HIT, this.onPlayerHit, this);
        view.off(ViewEvents.CANVAS_RESIZE, this.onCanvasResize, this);
        this.shakeTimeLeft = 0;
    }

    protected lateUpdate(dt: number): void {
        const world = this.gameManager.world;
        if (!world) {
            return;
        }
        const targetX = clamp(world.player.x, -this.limitX, this.limitX);
        const targetY = clamp(world.player.y, -this.limitY, this.limitY);
        if (this.isSnapPending) {
            this.isSnapPending = false;
            this.followX = targetX;
            this.followY = targetY;
        } else {
            // NOTE: 1 - exp(-k * dt) gives the same smoothing at any frame rate, unlike a fixed lerp factor.
            const blend = 1 - Math.exp(-GameConfig.CAMERA.FOLLOW_SHARPNESS * dt);
            this.followX += (targetX - this.followX) * blend;
            this.followY += (targetY - this.followY) * blend;
        }
        this.applyPosition(dt);
    }

    // ---- Private ----

    /** Writes the followed position plus the current shake offset onto the camera node. */
    private applyPosition(dt: number): void {
        if (this.shakeTimeLeft <= 0) {
            this.node.setPosition(this.followX, this.followY, this.cameraZ);
            return;
        }
        this.shakeTimeLeft = Math.max(0, this.shakeTimeLeft - dt);
        // The shake fades out linearly over its duration.
        const strength = GameConfig.CAMERA.SHAKE_AMPLITUDE * (this.shakeTimeLeft / GameConfig.CAMERA.SHAKE_DURATION);
        const offsetX = (Math.random() * 2 - 1) * strength;
        const offsetY = (Math.random() * 2 - 1) * strength;
        this.node.setPosition(this.followX + offsetX, this.followY + offsetY, this.cameraZ);
    }

    /**
     * Sizes the camera for the current screen shape, then recomputes how far it may move inside the
     * outer wall rect.
     */
    private fitViewToScreen(): void {
        // NOTE: getVisibleSize() allocates a Size, which is why it is only called on load and resize.
        const visibleSize = view.getVisibleSize();
        const aspect = visibleSize.height > 0 ? visibleSize.width / visibleSize.height : 1;
        const { MIN_VIEW_WIDTH, MIN_VIEW_HEIGHT } = GameConfig.CAMERA;
        // An orthographic camera shows orthoHeight above and below its centre. Wide screens keep the
        // minimum height and see more to the sides; narrow or portrait screens keep the minimum width.
        const halfViewHeight = Math.max(MIN_VIEW_HEIGHT / 2, MIN_VIEW_WIDTH / 2 / aspect);
        this.camera.orthoHeight = halfViewHeight;
        const halfViewWidth = halfViewHeight * aspect;
        const { WIDTH, HEIGHT, WALL_THICKNESS } = GameConfig.ARENA;
        // If the view is larger than the arena, the limit is 0 and the camera stays centred.
        this.limitX = Math.max(0, WIDTH / 2 + WALL_THICKNESS - halfViewWidth);
        this.limitY = Math.max(0, HEIGHT / 2 + WALL_THICKNESS - halfViewHeight);
    }

    private onCanvasResize(): void {
        this.fitViewToScreen();
    }

    private onStateChanged(state: GameState): void {
        if (state !== GameState.Ready) {
            return;
        }
        // NOTE: Ready is broadcast before the world resets the player, so snap on the next frame,
        // when the player is already back at the start position.
        this.isSnapPending = true;
        this.shakeTimeLeft = 0;
    }

    private onPlayerHit(): void {
        this.shakeTimeLeft = GameConfig.CAMERA.SHAKE_DURATION;
    }
}
