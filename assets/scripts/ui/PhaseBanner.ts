/**
 * PhaseBanner.ts
 * Big centred warning when the boss enters a new phase during a round ("BOSS ENRAGED!",
 * "FINAL PHASE!"). It pops in (scale down to 1), stays, then fades out, all time-based in
 * lateUpdate (no tween, so nothing to stop). Hidden again when a new round is prepared.
 *
 * Attach to node PhaseBanner (inside SafeArea, top centre) with a Label on the same node or a child.
 * Only the Label is toggled, so this component keeps listening while the banner is hidden.
 */
import { _decorator, Color, Component, Label } from 'cc';
import { BossPhase } from '../config/BossPhase';
import { FeedbackConfig } from '../config/FeedbackConfig';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { GameState } from '../model/GameState';
const { ccclass, property } = _decorator;

/** Banner text per phase; null = no banner (the starting phase). A Record makes a missing phase a compile error. */
const BANNER_TEXTS: Record<BossPhase, string | null> = {
    [BossPhase.High]: null,
    [BossPhase.Medium]: 'BOSS ENRAGED!',
    [BossPhase.Low]: 'FINAL PHASE!',
};

const FULL_ALPHA = 255;

/** Shows a short animated banner on each boss phase change. */
@ccclass('PhaseBanner')
export class PhaseBanner extends Component {
    @property(Label)
    private label: Label = null!;

    // PERF: one colour reused for the fade; only its alpha changes.
    private readonly textColor = new Color();
    /** Seconds since the banner appeared; the banner is hidden when the label is disabled. */
    private elapsed = 0;
    private shownAlpha = -1;
    /** Last broadcast state is Playing; kept from STATE_CHANGED so the banner needs no GameManager reference. */
    private isPlaying = false;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.label) {
            console.error(`[PhaseBanner] label is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        Color.fromHEX(this.textColor, FeedbackConfig.BANNER_COLOR);
        this.label.enabled = false;
    }

    protected onEnable(): void {
        EventBus.on(GameEvents.BOSS_PHASE_CHANGED, this.onBossPhaseChanged, this);
        EventBus.on(GameEvents.STATE_CHANGED, this.onStateChanged, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with the two EventBus.on calls in onEnable; same event, handler and target.
        EventBus.off(GameEvents.BOSS_PHASE_CHANGED, this.onBossPhaseChanged, this);
        EventBus.off(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        this.hide();
    }

    protected lateUpdate(dt: number): void {
        if (!this.label.enabled) {
            return;
        }
        this.elapsed += dt;
        if (this.elapsed >= FeedbackConfig.BANNER_DURATION) {
            this.hide();
            return;
        }
        this.applyScale();
        this.applyAlpha();
    }

    // ---- Private ----

    private onBossPhaseChanged(phase: BossPhase): void {
        const text = BANNER_TEXTS[phase];
        // NOTE: the starting phase is also broadcast while Ready; only a change mid-round is announced.
        if (text === null || !this.isPlaying) {
            return;
        }
        this.label.string = text;
        this.label.enabled = true;
        this.elapsed = 0;
        this.shownAlpha = -1;
        this.applyScale();
        this.applyAlpha();
    }

    private onStateChanged(state: GameState): void {
        this.isPlaying = state === GameState.Playing;
        if (state === GameState.Ready) {
            this.hide();
        }
    }

    private hide(): void {
        this.label.enabled = false;
        this.label.node.setScale(1, 1, 1);
    }

    /** Pop-in: from BANNER_POP_SCALE down to 1 during BANNER_POP_TIME, with an ease-out. */
    private applyScale(): void {
        const { BANNER_POP_TIME, BANNER_POP_SCALE } = FeedbackConfig;
        if (this.elapsed >= BANNER_POP_TIME) {
            // PERF: after the pop the scale stays 1; skip the transform write.
            if (this.label.node.scale.x !== 1) {
                this.label.node.setScale(1, 1, 1);
            }
            return;
        }
        const remaining = 1 - this.elapsed / BANNER_POP_TIME;
        const scale = 1 + (BANNER_POP_SCALE - 1) * remaining * remaining;
        this.label.node.setScale(scale, scale, 1);
    }

    /** Full alpha, then a linear fade during the last BANNER_FADE_TIME seconds. */
    private applyAlpha(): void {
        const { BANNER_DURATION, BANNER_FADE_TIME } = FeedbackConfig;
        const timeLeft = BANNER_DURATION - this.elapsed;
        const fade = timeLeft < BANNER_FADE_TIME ? timeLeft / BANNER_FADE_TIME : 1;
        const alpha = Math.round(FULL_ALPHA * fade);
        // PERF: assigning a colour marks the render data dirty; skip it when the alpha did not change.
        if (alpha === this.shownAlpha) {
            return;
        }
        this.shownAlpha = alpha;
        this.textColor.a = alpha;
        this.label.color = this.textColor;
    }
}
