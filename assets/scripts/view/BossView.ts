/**
 * BossView.ts
 * Draws the boss: copies the model position onto the node every frame and tints it so the player
 * can read what it is doing: darker in each HP phase, a distinct colour while dashing, a short
 * light flash when it takes a hit and a blinking flash while it winds up a dash.
 * Hides the boss when it is defeated and shows it again when a new round starts.
 * Display only, it owns no game rules.
 *
 * Attach to node Boss (UITransform + Sprite with the white square).
 */
import { _decorator, Color, Component, Sprite, UITransform } from 'cc';
import { BossPhase } from '../config/BossPhase';
import { GameConfig } from '../config/GameConfig';
import { GameManager } from '../controller/GameManager';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { BossModel } from '../model/BossModel';
import { GameState } from '../model/GameState';
const { ccclass, property } = _decorator;

/** Shows the boss model on screen, with phase / dash / hit / windup tints. */
@ccclass('BossView')
export class BossView extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Sprite)
    private sprite: Sprite = null!;

    // PERF: colours are parsed once; lateUpdate only switches between these references.
    private readonly phaseColors: Record<BossPhase, Color> = {
        [BossPhase.High]: new Color(GameConfig.COLORS.BOSS),
        [BossPhase.Medium]: new Color(GameConfig.COLORS.BOSS_PHASE_MEDIUM),
        [BossPhase.Low]: new Color(GameConfig.COLORS.BOSS_PHASE_LOW),
    };
    private readonly windupColor = new Color(GameConfig.COLORS.BOSS_WINDUP);
    private readonly hitColor = new Color(GameConfig.COLORS.BOSS_HIT);
    private readonly dashColor = new Color(GameConfig.COLORS.BOSS_DASH);
    private shownColor: Color | null = null;
    private flashElapsed = 0;
    private hitFlashTimeLeft = 0;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.sprite) {
            console.error(`[BossView] gameManager or sprite is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        const side = 2 * GameConfig.BOSS.HALF_SIZE;
        // NOTE: CUSTOM so the sprite keeps this size instead of the texture size.
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.sprite.getComponent(UITransform)?.setContentSize(side, side);
    }

    protected onEnable(): void {
        EventBus.on(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        EventBus.on(GameEvents.GAME_OVER, this.onGameOver, this);
        EventBus.on(GameEvents.BOSS_HIT, this.onBossHit, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with the three EventBus.on calls in onEnable; same event, handler and target.
        EventBus.off(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        EventBus.off(GameEvents.GAME_OVER, this.onGameOver, this);
        EventBus.off(GameEvents.BOSS_HIT, this.onBossHit, this);
        this.hitFlashTimeLeft = 0;
    }

    protected lateUpdate(dt: number): void {
        const world = this.gameManager.world;
        if (!world) {
            return;
        }
        const boss = world.boss;
        this.node.setPosition(boss.x, boss.y, 0);
        // NOTE: time-based countdown instead of a tween, so it needs no stop/cleanup.
        this.hitFlashTimeLeft = Math.max(0, this.hitFlashTimeLeft - dt);
        this.applyColor(this.pickColor(boss, dt));
    }

    // ---- Private ----

    private onStateChanged(state: GameState): void {
        if (state !== GameState.Ready) {
            return;
        }
        // A new round: the boss is alive again and no flash carries over.
        this.sprite.enabled = true;
        this.hitFlashTimeLeft = 0;
        this.flashElapsed = 0;
    }

    private onGameOver(isVictory: boolean): void {
        if (isVictory) {
            // NOTE: only the Sprite is disabled, the node stays active so this view keeps its
            // listeners and can show the boss again on the next Ready.
            this.sprite.enabled = false;
        }
    }

    private onBossHit(): void {
        this.hitFlashTimeLeft = GameConfig.FEEDBACK.BOSS_HIT_FLASH;
    }

    /**
     * Colour priority, highest first: windup flash > hit flash > dashing > phase tint.
     * The windup telegraph wins because it warns of a dash the player must dodge.
     */
    private pickColor(boss: BossModel, dt: number): Color {
        const baseColor = this.pickBaseColor(boss);
        if (!boss.isWindingUp) {
            this.flashElapsed = 0;
            return baseColor;
        }
        this.flashElapsed += dt;
        const isFlashOn = Math.floor(this.flashElapsed / GameConfig.FEEDBACK.WINDUP_FLASH_INTERVAL) % 2 === 0;
        return isFlashOn ? this.windupColor : baseColor;
    }

    /** Colour without the windup flash: hit flash > dashing > phase tint. */
    private pickBaseColor(boss: BossModel): Color {
        if (this.hitFlashTimeLeft > 0) {
            return this.hitColor;
        }
        if (boss.isDashing) {
            return this.dashColor;
        }
        return this.phaseColors[boss.phase];
    }

    private applyColor(color: Color): void {
        // PERF: assigning a colour marks the render data dirty; skip it when nothing changed.
        if (color === this.shownColor) {
            return;
        }
        this.shownColor = color;
        this.sprite.color = color;
    }
}
