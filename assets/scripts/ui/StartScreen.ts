/**
 * StartScreen.ts
 * Title screen shown once when the game opens: the first round is prepared but waits in Ready
 * until the player taps the screen or presses a key, so nobody is attacked while the page loads.
 * The tap or key press is also the user gesture browsers need before they allow audio.
 *
 * Attach to node StartScreen (full-screen, with BlockInputEvents so the tap does not reach the
 * joystick under it). The node hides itself when the round starts; Home in the pause menu shows it
 * again (show()) after GameManager has prepared a fresh round in Ready.
 */
import { _decorator, Component, EventKeyboard, input, Input, KeyCode, Node } from 'cc';
import { GameManager } from '../controller/GameManager';
import { GameState } from '../model/GameState';
const { ccclass, property } = _decorator;

/**
 * Keys that never start the round: Esc / Tab / modifiers are often released while switching windows
 * (Alt+Tab back into the game), and Esc is not a user gesture that unlocks audio in browsers.
 */
const IGNORED_START_KEYS: ReadonlySet<KeyCode> = new Set([
    KeyCode.ESCAPE, KeyCode.TAB, KeyCode.ALT_LEFT, KeyCode.ALT_RIGHT, KeyCode.CTRL_LEFT, KeyCode.CTRL_RIGHT,
]);

/** Starts the round on the first tap or key press, then hides itself. */
@ccclass('StartScreen')
export class StartScreen extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager) {
            console.error(`[StartScreen] gameManager is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            // NOTE: hide the blocker too, so a wiring error does not leave an opaque screen over the game.
            this.node.active = false;
        }
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_END, this.onStartRequested, this);
        // NOTE: KEY_UP, not KEY_DOWN: the dash key's KEY_DOWN arrives while the game is still Ready
        // (and is ignored there), so starting on release never turns that same press into a dash.
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with the two on() calls in onEnable; same event, handler and target.
        this.node.off(Node.EventType.TOUCH_END, this.onStartRequested, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    // ---- Public API ----

    /** Shows the screen again; it waits for a tap or key like at launch. Activating runs onEnable. */
    show(): void {
        this.node.active = true;
    }

    // ---- Private ----

    private onKeyUp(event: EventKeyboard): void {
        if (IGNORED_START_KEYS.has(event.keyCode)) {
            return;
        }
        this.onStartRequested();
    }

    private onStartRequested(): void {
        // NOTE: guards a second event in the same frame (touch and key together) after the round began.
        if (this.gameManager.state !== GameState.Ready) {
            return;
        }
        // Hiding the node runs onDisable, which removes both listeners: the screen is used only once.
        this.node.active = false;
        this.gameManager.startGame();
    }
}
