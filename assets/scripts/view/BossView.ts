/**
 * BossView.ts
 * Draws the boss: copies the model position onto the node every frame, tints it darker in each
 * HP phase and flashes it while it winds up a dash, so the player can read and dodge the attack.
 * Display only, it owns no game rules.
 *
 * Attach to node Boss (UITransform + Sprite with the white square).
 */
import { _decorator, Color, Component, Sprite, UITransform } from 'cc';
import { BossPhase } from '../config/BossPhase';
import { GameConfig } from '../config/GameConfig';
import { GameManager } from '../controller/GameManager';
const { ccclass, property } = _decorator;

/** Shows the boss model on screen, with phase tint and windup flash. */
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
    private shownColor: Color | null = null;
    private flashElapsed = 0;

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

    protected lateUpdate(dt: number): void {
        const world = this.gameManager.world;
        if (!world) {
            return;
        }
        const boss = world.boss;
        this.node.setPosition(boss.x, boss.y, 0);
        this.applyColor(this.pickColor(boss.phase, boss.isWindingUp, dt));
    }

    // ---- Private ----

    /** Phase tint, alternating with the windup colour while a dash is being telegraphed. */
    private pickColor(phase: BossPhase, isWindingUp: boolean, dt: number): Color {
        if (!isWindingUp) {
            this.flashElapsed = 0;
            return this.phaseColors[phase];
        }
        this.flashElapsed += dt;
        const isFlashOn = Math.floor(this.flashElapsed / GameConfig.FEEDBACK.WINDUP_FLASH_INTERVAL) % 2 === 0;
        return isFlashOn ? this.windupColor : this.phaseColors[phase];
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
