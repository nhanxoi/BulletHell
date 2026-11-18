/**
 * PhaseLabelView.ts
 * HUD label that names the current boss phase ("Boss phase: High / Medium / Low").
 * Event-driven: the text only changes when BOSS_PHASE_CHANGED arrives.
 *
 * Attach to node PhaseLabel.
 */
import { _decorator, Component, Label } from 'cc';
import { BossPhase } from '../config/BossPhase';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
const { ccclass, property } = _decorator;

/** Display text per phase; a Record makes a missing phase a compile error. */
const PHASE_TEXTS: Record<BossPhase, string> = {
    [BossPhase.High]: 'Boss phase: High',
    [BossPhase.Medium]: 'Boss phase: Medium',
    [BossPhase.Low]: 'Boss phase: Low',
};

/** Shows the boss phase name. */
@ccclass('PhaseLabelView')
export class PhaseLabelView extends Component {
    @property(Label)
    private label: Label = null!;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.label) {
            console.error(`[PhaseLabelView] label is not assigned on node "${this.node.name}"`);
            this.enabled = false;
        }
    }

    protected onEnable(): void {
        EventBus.on(GameEvents.BOSS_PHASE_CHANGED, this.onBossPhaseChanged, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with EventBus.on in onEnable; same event, handler and target.
        EventBus.off(GameEvents.BOSS_PHASE_CHANGED, this.onBossPhaseChanged, this);
    }

    // ---- Private ----

    private onBossPhaseChanged(phase: BossPhase): void {
        // PERF: the strings are constants, so no string is built at runtime.
        this.label.string = PHASE_TEXTS[phase];
    }
}
