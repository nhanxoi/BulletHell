/**
 * GameOverPanel.ts
 * Game Over screen: shows "GAME OVER" with the result (boss defeated or player defeated) when the
 * round ends, and restarts the round when Restart is clicked. The component sits on an always-active holder node so it can listen while
 * the panel itself is hidden.
 *
 * Attach to node Popups; `panel` is its child (inactive by default) containing the title and button.
 */
import { _decorator, Button, Component, Label, Node } from 'cc';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { GameManager } from '../controller/GameManager';
import { GameState } from '../model/GameState';
const { ccclass, property } = _decorator;

const VICTORY_TEXT = 'VICTORY! The boss is defeated';
const DEFEAT_TEXT = 'DEFEAT! You were defeated';

/** Shows the round result and offers a restart. */
@ccclass('GameOverPanel')
export class GameOverPanel extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Node)
    private panel: Node = null!;

    /** Shows the result line under the fixed "GAME OVER" title. */
    @property(Label)
    private resultLabel: Label = null!;

    @property(Button)
    private restartButton: Button = null!;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.panel || !this.resultLabel || !this.restartButton) {
            console.error(`[GameOverPanel] a reference is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        this.panel.active = false;
    }

    protected onEnable(): void {
        EventBus.on(GameEvents.GAME_OVER, this.onGameOver, this);
        EventBus.on(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        this.restartButton.node.on(Button.EventType.CLICK, this.onRestartClicked, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with the three on() calls in onEnable; same event, handler and target.
        EventBus.off(GameEvents.GAME_OVER, this.onGameOver, this);
        EventBus.off(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        this.restartButton.node.off(Button.EventType.CLICK, this.onRestartClicked, this);
    }

    // ---- Private ----

    private onGameOver(isVictory: boolean): void {
        this.resultLabel.string = isVictory ? VICTORY_TEXT : DEFEAT_TEXT;
        this.panel.active = true;
    }

    private onStateChanged(state: GameState): void {
        if (state === GameState.Ready) {
            this.panel.active = false;
        }
    }

    private onRestartClicked(): void {
        // NOTE: ignore a second click (or a click in the same frame) once the new round has started.
        if (this.gameManager.state !== GameState.GameOver) {
            return;
        }
        this.gameManager.startGame();
    }
}
