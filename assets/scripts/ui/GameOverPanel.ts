/**
 * GameOverPanel.ts
 * Game Over screen: when the round ends shows a title that matches the outcome ("VICTORY" or
 * "GAME OVER"), the result line and the round time (plus the best clear time after a victory), and
 * restarts the round when Restart is clicked. The component sits on an
 * always-active holder node so it can listen while the panel itself is hidden.
 *
 * Attach to node Popups; `panel` is its child (inactive by default) containing the title, the result
 * and time labels, and the button.
 */
import { _decorator, Button, Color, Component, Label, Node } from 'cc';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { GameManager } from '../controller/GameManager';
import { GameState } from '../model/GameState';
import { formatTime } from '../utils/TimeFormat';
const { ccclass, property } = _decorator;

const VICTORY_TITLE = 'VICTORY';
const DEFEAT_TITLE = 'GAME OVER';
const VICTORY_TEXT = 'The boss is defeated';
const DEFEAT_TEXT = 'You were defeated';
/** Title colours: gold for a win, red for a loss. Read-only, copied into the label (never mutated). */
const VICTORY_TITLE_COLOR = new Color(251, 191, 36, 255);
const DEFEAT_TITLE_COLOR = new Color(248, 113, 113, 255);
const NEW_BEST_TEXT = '  NEW BEST!';
/** The result panel shows tenths of a second (see buildTimeText). */
const SHOW_TENTHS = true;

/** Shows the round result and offers a restart. */
@ccclass('GameOverPanel')
export class GameOverPanel extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Node)
    private panel: Node = null!;

    /** "VICTORY" or "GAME OVER", coloured by the outcome. */
    @property(Label)
    private titleLabel: Label = null!;

    /** Result line under the title. */
    @property(Label)
    private resultLabel: Label = null!;

    /** Round time under the result; after a victory also the best clear time. */
    @property(Label)
    private timeLabel: Label = null!;

    @property(Button)
    private restartButton: Button = null!;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.panel || !this.titleLabel || !this.resultLabel || !this.timeLabel || !this.restartButton) {
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
        this.titleLabel.string = isVictory ? VICTORY_TITLE : DEFEAT_TITLE;
        // NOTE: the color setter copies the value, so the shared constants are never changed.
        this.titleLabel.color = isVictory ? VICTORY_TITLE_COLOR : DEFEAT_TITLE_COLOR;
        this.resultLabel.string = isVictory ? VICTORY_TEXT : DEFEAT_TEXT;
        this.timeLabel.string = this.buildTimeText(isVictory);
        this.panel.active = true;
    }

    /**
     * "Time 0:06.8" after a defeat; "Time 0:06.8   Best 0:06.2" (+ "  NEW BEST!") after a victory.
     * Built once per Game Over, never per frame.
     * NOTE: tenths here (the HUD shows whole seconds) so a slightly slower clear does not show the
     * same text as the record it failed to beat.
     * NOTE: GameManager saves the record before it emits GAME_OVER, so bestClearTime already
     * includes this round.
     */
    private buildTimeText(isVictory: boolean): string {
        const timeText = `Time ${formatTime(this.gameManager.roundTime, SHOW_TENTHS)}`;
        if (!isVictory) {
            return timeText;
        }
        const bestText = `${timeText}   Best ${formatTime(this.gameManager.bestClearTime, SHOW_TENTHS)}`;
        return this.gameManager.isNewBestTime ? bestText + NEW_BEST_TEXT : bestText;
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
