/**
 * PausePanel.ts
 * Pause button in the HUD and the pause menu (Resume, Restart, Home). The button pauses the round
 * through GameManager; the menu is shown while the state is Paused and hidden otherwise. Esc / P
 * (and the Android back key) toggle the pause, and the round pauses itself when the app goes to the
 * background, so a phone call or a tab switch never costs the player HP.
 *
 * Attach to node PauseMenu (always active, full screen, above the HUD and the Game Over popup);
 * `panel` is its child (inactive by default) with a blocker and the three buttons. `pauseButton`
 * lives in the HUD (SafeArea) and is shown only while Playing.
 */
import {
    _decorator, Button, Component, EventKeyboard, game, Game, input, Input, KeyCode, Node, view, Widget,
} from 'cc';
import { GameManager } from '../controller/GameManager';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { ViewEvents } from '../core/ViewEvents';
import { GameState } from '../model/GameState';
import { StartScreen } from './StartScreen';
const { ccclass, property } = _decorator;

/** Keys that open the pause menu while Playing and close it while Paused. */
const PAUSE_KEYS: ReadonlySet<KeyCode> = new Set([KeyCode.ESCAPE, KeyCode.KEY_P, KeyCode.MOBILE_BACK]);

/** Pause button + pause menu; every action goes through GameManager, the only owner of the state. */
@ccclass('PausePanel')
export class PausePanel extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    /** Shown again by the Home button. */
    @property(StartScreen)
    private startScreen: StartScreen = null!;

    @property(Node)
    private panel: Node = null!;

    @property(Button)
    private pauseButton: Button = null!;

    @property(Button)
    private resumeButton: Button = null!;

    @property(Button)
    private restartButton: Button = null!;

    @property(Button)
    private homeButton: Button = null!;

    /** Widgets of this menu (holder first), re-aligned by hand while the director is paused. */
    private menuWidgets: Widget[] = [];

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.startScreen || !this.panel || !this.pauseButton || !this.resumeButton
            || !this.restartButton || !this.homeButton) {
            console.error(`[PausePanel] a reference is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        // PERF: looked up once; includes the inactive panel's widgets and this node's own (parents first).
        this.menuWidgets = this.node.getComponentsInChildren(Widget);
        this.panel.active = false;
        this.pauseButton.node.active = false;
    }

    protected onEnable(): void {
        EventBus.on(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        this.pauseButton.node.on(Button.EventType.CLICK, this.onPauseClicked, this);
        this.resumeButton.node.on(Button.EventType.CLICK, this.onResumeClicked, this);
        this.restartButton.node.on(Button.EventType.CLICK, this.onRestartClicked, this);
        this.homeButton.node.on(Button.EventType.CLICK, this.onHomeClicked, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        game.on(Game.EVENT_HIDE, this.onAppHidden, this);
        view.on(ViewEvents.CANVAS_RESIZE, this.onCanvasResize, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with the eight on() calls in onEnable; same event, handler and target.
        EventBus.off(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        this.pauseButton.node.off(Button.EventType.CLICK, this.onPauseClicked, this);
        this.resumeButton.node.off(Button.EventType.CLICK, this.onResumeClicked, this);
        this.restartButton.node.off(Button.EventType.CLICK, this.onRestartClicked, this);
        this.homeButton.node.off(Button.EventType.CLICK, this.onHomeClicked, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        game.off(Game.EVENT_HIDE, this.onAppHidden, this);
        view.off(ViewEvents.CANVAS_RESIZE, this.onCanvasResize, this);
    }

    protected onDestroy(): void {
        // CLEANUP: drop the cached component references (filled in onLoad).
        this.menuWidgets.length = 0;
    }

    // ---- Private ----

    private onStateChanged(state: GameState): void {
        this.pauseButton.node.active = state === GameState.Playing;
        const isPaused = state === GameState.Paused;
        this.panel.active = isPaused;
        if (isPaused) {
            this.alignMenu();
        }
    }

    /**
     * NOTE: widgets are aligned after each director update, which does not run while paused, so the
     * menu shown during the pause (or a resize during the pause) is aligned here by hand.
     */
    private alignMenu(): void {
        for (const widget of this.menuWidgets) {
            widget.updateAlignment();
        }
    }

    private onCanvasResize(): void {
        if (this.panel.active) {
            this.alignMenu();
        }
    }

    private onKeyDown(event: EventKeyboard): void {
        if (!PAUSE_KEYS.has(event.keyCode)) {
            return;
        }
        // GameManager ignores pause() outside Playing and resume() outside Paused.
        if (this.gameManager.state === GameState.Paused) {
            this.gameManager.resume();
            return;
        }
        this.gameManager.pause();
    }

    private onAppHidden(): void {
        this.gameManager.pause();
    }

    private onPauseClicked(): void {
        this.gameManager.pause();
    }

    private onResumeClicked(): void {
        this.gameManager.resume();
    }

    private onRestartClicked(): void {
        // NOTE: ignore a second click in the same frame once the new round has started.
        if (this.gameManager.state !== GameState.Paused) {
            return;
        }
        this.gameManager.startGame();
    }

    private onHomeClicked(): void {
        if (this.gameManager.state !== GameState.Paused) {
            return;
        }
        this.gameManager.returnToTitle();
        this.startScreen.show();
    }
}
