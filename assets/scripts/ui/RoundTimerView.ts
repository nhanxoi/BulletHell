/**
 * RoundTimerView.ts
 * HUD clock of the current round ("TIME m:ss"), read from GameManager.roundTime (simulated Playing
 * time, so it stops on Game Over and restarts at 0 with each round). Display only.
 *
 * Attach to node RoundTimer (inside SafeArea, top right) with a Label (Cache Mode CHAR).
 */
import { _decorator, Component, Label } from 'cc';
import { GameManager } from '../controller/GameManager';
import { formatTime } from '../utils/TimeFormat';
const { ccclass, property } = _decorator;

const TIME_PREFIX = 'TIME ';

/** Shows the round time, rebuilding the text only when the displayed second changes. */
@ccclass('RoundTimerView')
export class RoundTimerView extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Label)
    private label: Label = null!;

    /** Whole second currently on the label; -1 forces the first write. */
    private shownSeconds = -1;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.label) {
            console.error(`[RoundTimerView] gameManager or label is not assigned on node "${this.node.name}"`);
            this.enabled = false;
        }
    }

    protected lateUpdate(): void {
        const seconds = Math.floor(this.gameManager.roundTime);
        // PERF: building the string and assigning it (which re-lays out the label) happens only once per
        // displayed second, not every frame; CHAR cache mode then reuses the cached digit glyphs.
        if (seconds === this.shownSeconds) {
            return;
        }
        this.shownSeconds = seconds;
        this.label.string = TIME_PREFIX + formatTime(seconds);
    }
}
