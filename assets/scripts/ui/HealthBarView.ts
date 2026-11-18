/**
 * HealthBarView.ts
 * HUD health bar of one combatant: listens to that side's HP event and shows HP / max HP on a
 * ProgressBar. Display only, it owns no game rules.
 *
 * Attach to nodes PlayerHpBar (target Player) and BossHpBar (target Boss).
 */
import { _decorator, Component, Enum, ProgressBar } from 'cc';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { Combatant } from '../model/Combatant';
const { ccclass, property } = _decorator;

/** Shows the HP ratio of the player or the boss. */
@ccclass('HealthBarView')
export class HealthBarView extends Component {
    @property(ProgressBar)
    private bar: ProgressBar = null!;

    /** Whose HP this bar shows. */
    @property({ type: Enum(Combatant) })
    private target: Combatant = Combatant.Player;

    /** Event chosen once from `target`, so on() and off() always use the same name. */
    private hpEventName: string = GameEvents.PLAYER_HP_CHANGED;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.bar) {
            console.error(`[HealthBarView] bar is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        this.hpEventName = this.target === Combatant.Player
            ? GameEvents.PLAYER_HP_CHANGED
            : GameEvents.BOSS_HP_CHANGED;
    }

    protected onEnable(): void {
        EventBus.on(this.hpEventName, this.onHpChanged, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with EventBus.on in onEnable; same event, handler and target.
        EventBus.off(this.hpEventName, this.onHpChanged, this);
    }

    // ---- Private ----

    private onHpChanged(hp: number, maxHp: number): void {
        // NOTE: guard against a zero max HP (bad config) instead of showing NaN.
        this.bar.progress = maxHp > 0 ? hp / maxHp : 0;
    }
}
