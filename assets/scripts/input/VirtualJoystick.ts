/**
 * VirtualJoystick.ts
 * Floating on-screen stick for touch screens: the base jumps to where the finger lands on the left
 * half of the screen, the knob follows the finger (clamped to JOYSTICK.RADIUS) and the offset is
 * written to InputState.stickX / stickY. Only one finger drives it; other touches are ignored.
 * Disabled when the device has no touch screen, where KeyboardInput is used; when it is active
 * it hides the keyboard hint label.
 *
 * Attach to node Joystick (UITransform covering the left half of the screen, via a Widget).
 * `base` is a child of Joystick and `knob` is a child of `base`.
 */
import { _decorator, Component, EventTouch, Node, sys, UITransform, Vec2, Vec3 } from 'cc';
import { GameConfig } from '../config/GameConfig';
import { GameManager } from '../controller/GameManager';
const { ccclass, property } = _decorator;

/** Touch id value meaning "no finger is driving the stick". */
const NO_TOUCH = -1;

// PERF: scratch objects reused by every touch event instead of allocating new ones.
const _uiLocation = new Vec2();
const _worldPoint = new Vec3();
const _localPoint = new Vec3();

/** Touch joystick that writes a normalized stick direction into InputState. */
@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Node)
    private base: Node = null!;

    @property(Node)
    private knob: Node = null!;

    /** "Move: WASD / Arrow keys" label, hidden when the stick is used instead of the keyboard. */
    @property(Node)
    private keyboardHint: Node = null!;

    private touchArea: UITransform | null = null;
    private activeTouchId = NO_TOUCH;
    /** Where the base rests when no finger is down (its position in the scene). */
    private readonly baseRestPosition = new Vec3();

    // ---- Lifecycle ----

    protected onLoad(): void {
        // NOTE: feature detection, not sys.isMobile: isMobile is a user-agent guess that misses
        // iPadOS (it reports "Macintosh"). On the web INPUT_TOUCH is true when the browser exposes
        // touch events, which desktop Chrome only does when a touch screen is present.
        if (!sys.hasFeature(sys.Feature.INPUT_TOUCH)) {
            // Keyboard only: hiding the node also stops it from catching clicks.
            this.node.active = false;
            return;
        }
        this.touchArea = this.node.getComponent(UITransform);
        if (!this.gameManager || !this.base || !this.knob || !this.keyboardHint || !this.touchArea) {
            console.error(`[VirtualJoystick] a reference or the UITransform is missing on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        this.keyboardHint.active = false;
        this.baseRestPosition.set(this.base.position);
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with the four node.on calls in onEnable; same event, handler and target.
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        // NOTE: a finger lifted while disabled would never send TOUCH_END, so release the stick now.
        this.release();
    }

    // ---- Private ----

    private onTouchStart(event: EventTouch): void {
        const touchId = event.getID();
        if (this.activeTouchId !== NO_TOUCH || touchId === null) {
            return;
        }
        this.activeTouchId = touchId;
        this.toLocalPoint(event, _localPoint);
        this.base.setPosition(_localPoint.x, _localPoint.y, 0);
        this.knob.setPosition(0, 0, 0);
    }

    private onTouchMove(event: EventTouch): void {
        if (event.getID() !== this.activeTouchId) {
            return;
        }
        this.toLocalPoint(event, _localPoint);
        const basePosition = this.base.position;
        let offsetX = _localPoint.x - basePosition.x;
        let offsetY = _localPoint.y - basePosition.y;
        const radius = GameConfig.JOYSTICK.RADIUS;
        const distanceSqr = offsetX * offsetX + offsetY * offsetY;
        if (distanceSqr > radius * radius) {
            // Clamp the knob to the rim; sqrt is only needed when the finger is outside it.
            const scale = radius / Math.sqrt(distanceSqr);
            offsetX *= scale;
            offsetY *= scale;
        }
        this.knob.setPosition(offsetX, offsetY, 0);
        this.writeStick(offsetX / radius, offsetY / radius, distanceSqr);
    }

    private onTouchEnd(event: EventTouch): void {
        if (event.getID() !== this.activeTouchId) {
            return;
        }
        this.release();
    }

    /** Writes the stick axes, or zero inside the dead zone so a resting thumb does not drift. */
    private writeStick(stickX: number, stickY: number, distanceSqr: number): void {
        const state = this.gameManager.input;
        const deadZone = GameConfig.JOYSTICK.DEAD_ZONE * GameConfig.JOYSTICK.RADIUS;
        // PERF: compare squared lengths, no sqrt.
        if (distanceSqr < deadZone * deadZone) {
            state.stickX = 0;
            state.stickY = 0;
            return;
        }
        state.stickX = stickX;
        state.stickY = stickY;
    }

    /** Converts the touch position (UI world space) into this node's local space. */
    private toLocalPoint(event: EventTouch, out: Vec3): void {
        event.getUILocation(_uiLocation);
        _worldPoint.set(_uiLocation.x, _uiLocation.y, 0);
        // onLoad guarantees touchArea is set whenever touch listeners are registered.
        this.touchArea?.convertToNodeSpaceAR(_worldPoint, out);
    }

    /** Lets go of the stick: zero input, knob centred, base back at rest. */
    private release(): void {
        this.activeTouchId = NO_TOUCH;
        this.gameManager.input.stickX = 0;
        this.gameManager.input.stickY = 0;
        this.knob.setPosition(0, 0, 0);
        this.base.setPosition(this.baseRestPosition);
    }
}
