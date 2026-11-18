/**
 * KeyboardInput.ts
 * Turns WASD / arrow key events into the keyboard axes of InputState (keyX, keyY).
 * It only records which keys are held; PlayerModel decides how that moves the player.
 *
 * Attach to node GameRoot.
 */
import { _decorator, Component, EventKeyboard, Input, input, KeyCode } from 'cc';
import { GameManager } from '../controller/GameManager';
const { ccclass, property } = _decorator;

/** Writes held movement keys into the shared InputState. */
@ccclass('KeyboardInput')
export class KeyboardInput extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    // NOTE: one flag per direction, shared by the letter key and the arrow key. Releasing A while
    // still holding Left stops the move until Left is pressed again: an accepted simplification.
    private isLeftHeld = false;
    private isRightHeld = false;
    private isUpHeld = false;
    private isDownHeld = false;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager) {
            console.error(`[KeyboardInput] gameManager is not assigned on node "${this.node.name}"`);
            this.enabled = false;
        }
    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with input.on in onEnable; same event, handler and target.
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        // NOTE: a key released while disabled would never send KEY_UP, so forget every held key.
        this.isLeftHeld = false;
        this.isRightHeld = false;
        this.isUpHeld = false;
        this.isDownHeld = false;
        this.writeAxes();
    }

    // ---- Private ----

    private onKeyDown(event: EventKeyboard): void {
        this.setKeyHeld(event.keyCode, true);
    }

    private onKeyUp(event: EventKeyboard): void {
        this.setKeyHeld(event.keyCode, false);
    }

    private setKeyHeld(keyCode: KeyCode, isHeld: boolean): void {
        switch (keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.isLeftHeld = isHeld;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.isRightHeld = isHeld;
                break;
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this.isUpHeld = isHeld;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.isDownHeld = isHeld;
                break;
            default:
                // Not a movement key: nothing changed.
                return;
        }
        this.writeAxes();
    }

    /** Converts the held flags into -1 / 0 / 1 per axis (opposite keys cancel out). */
    private writeAxes(): void {
        const state = this.gameManager.input;
        state.keyX = this.toAxis(this.isLeftHeld, this.isRightHeld);
        state.keyY = this.toAxis(this.isDownHeld, this.isUpHeld);
    }

    private toAxis(isNegativeHeld: boolean, isPositiveHeld: boolean): number {
        return Number(isPositiveHeld) - Number(isNegativeHeld);
    }
}
