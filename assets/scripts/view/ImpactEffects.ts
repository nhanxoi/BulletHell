/**
 * ImpactEffects.ts
 * Decides which burst effect to play for each game event: a flash when the player is hit, sparks on
 * the boss, a ring closing in where the shield orb appears, a pop when it is collected, a bubble
 * bursting when the shield absorbs a hit, a shock ring when the boss enters a new phase and a
 * multi-burst explosion when the boss is defeated. The nodes and their animation live in
 * BurstPool; this component only listens and picks the style (FeedbackConfig.BURSTS).
 *
 * Attach to node Effects (child of World at position (0, 0), last sibling so bursts draw on top):
 * burst positions are world px, which equal local px only while Effects stays at the World origin.
 */
import { _decorator, Color, Component, Prefab } from 'cc';
import { BurstStyle, FeedbackConfig } from '../config/FeedbackConfig';
import { GameManager } from '../controller/GameManager';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { GameState } from '../model/GameState';
import { randomRange } from '../utils/MathUtil';
import { RateLimiter } from '../utils/RateLimiter';
import { BurstPool } from './BurstPool';
const { ccclass, property } = _decorator;

const BURSTS = FeedbackConfig.BURSTS;

/** Turns hit / pickup / shield / phase / victory events into pooled burst effects. */
@ccclass('ImpactEffects')
export class ImpactEffects extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    /** Root needs a UITransform and a Sprite (white circle); the Bullet prefab fits. */
    @property(Prefab)
    private burstPrefab: Prefab = null!;

    private pool: BurstPool | null = null;
    // PERF: the weapon hits several times per second; one spark per interval keeps the pool free.
    private readonly bossSparkLimiter = new RateLimiter(FeedbackConfig.BOSS_HIT_BURST_INTERVAL);
    // PERF: style colours are parsed once; a burst only copies one of them into its slot.
    private readonly playerHitColor = new Color(BURSTS.PLAYER_HIT.COLOR);
    private readonly bossHitColor = new Color(BURSTS.BOSS_HIT.COLOR);
    /** Shared by the PICKUP and PICKUP_SPAWN styles (same colour, playStyle sets the alpha). */
    private readonly pickupColor = new Color(BURSTS.PICKUP.COLOR);
    private readonly shieldBreakColor = new Color(BURSTS.SHIELD_BREAK.COLOR);
    private readonly phaseRingColor = new Color(BURSTS.PHASE_RING.COLOR);
    private readonly explosionColor = new Color(BURSTS.EXPLOSION.COLOR);

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.burstPrefab) {
            console.error(`[ImpactEffects] gameManager or burstPrefab is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        // NOTE: BurstPool checks the prefab root (Sprite + UITransform); a wrong prefab logs once and
        // leaves an empty pool, so every burst is then skipped instead of crashing.
        // PERF: the whole pool is created at load, so an effect never instantiates mid-fight.
        this.pool = new BurstPool(this.burstPrefab, this.node, FeedbackConfig.BURST_POOL_SIZE);
    }

    protected onEnable(): void {
        EventBus.on(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        EventBus.on(GameEvents.PLAYER_HIT, this.onPlayerHit, this);
        EventBus.on(GameEvents.BOSS_HIT, this.onBossHit, this);
        EventBus.on(GameEvents.PICKUP_SPAWNED, this.onPickupSpawned, this);
        EventBus.on(GameEvents.PICKUP_COLLECTED, this.onPickupCollected, this);
        EventBus.on(GameEvents.SHIELD_BROKEN, this.onShieldBroken, this);
        EventBus.on(GameEvents.BOSS_PHASE_CHANGED, this.onBossPhaseChanged, this);
        EventBus.on(GameEvents.GAME_OVER, this.onGameOver, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with the EventBus.on calls in onEnable; same event, handler and target.
        EventBus.off(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        EventBus.off(GameEvents.PLAYER_HIT, this.onPlayerHit, this);
        EventBus.off(GameEvents.BOSS_HIT, this.onBossHit, this);
        EventBus.off(GameEvents.PICKUP_SPAWNED, this.onPickupSpawned, this);
        EventBus.off(GameEvents.PICKUP_COLLECTED, this.onPickupCollected, this);
        EventBus.off(GameEvents.SHIELD_BROKEN, this.onShieldBroken, this);
        EventBus.off(GameEvents.BOSS_PHASE_CHANGED, this.onBossPhaseChanged, this);
        EventBus.off(GameEvents.GAME_OVER, this.onGameOver, this);
        this.resetEffects();
    }

    protected lateUpdate(dt: number): void {
        this.bossSparkLimiter.tick(dt);
        this.pool?.tick(dt);
    }

    protected onDestroy(): void {
        // CLEANUP: pairs with new BurstPool in onLoad; destroys the nodes it instantiated.
        this.pool?.destroyAll();
        this.pool = null;
    }

    // ---- Private ----

    private resetEffects(): void {
        this.pool?.stopAll();
        this.bossSparkLimiter.reset();
    }

    /**
     * Plays a configured burst style at (x, y) world px, scaled in size and duration (1 = as
     * configured). When all bursts are busy one is reused (see BurstPool.play).
     */
    private playStyle(x: number, y: number, style: BurstStyle, color: Color, scale: number): void {
        // NOTE: the style alpha is written into the shared colour; the pool copies it into the slot.
        color.a = style.ALPHA;
        this.pool?.play(x, y, color, style.START_SIZE * scale, style.END_SIZE * scale, style.DURATION * scale);
    }

    private onStateChanged(state: GameState): void {
        // A new round starts clean: no burst of the previous round stays on screen.
        if (state === GameState.Ready) {
            this.resetEffects();
        }
    }

    private onPlayerHit(): void {
        const player = this.gameManager.world?.player;
        if (player) {
            this.playStyle(player.x, player.y, BURSTS.PLAYER_HIT, this.playerHitColor, 1);
        }
    }

    private onBossHit(): void {
        const boss = this.gameManager.world?.boss;
        if (!boss || !this.bossSparkLimiter.tryConsume()) {
            return;
        }
        // A random point on the boss, so consecutive sparks do not stack on its centre.
        const spread = boss.halfSize * FeedbackConfig.BOSS_HIT_SPREAD;
        const x = boss.x + randomRange(-spread, spread);
        const y = boss.y + randomRange(-spread, spread);
        this.playStyle(x, y, BURSTS.BOSS_HIT, this.bossHitColor, 1);
    }

    private onPickupSpawned(x: number, y: number): void {
        this.playStyle(x, y, BURSTS.PICKUP_SPAWN, this.pickupColor, 1);
    }

    private onPickupCollected(x: number, y: number): void {
        this.playStyle(x, y, BURSTS.PICKUP, this.pickupColor, 1);
    }

    private onShieldBroken(): void {
        const player = this.gameManager.world?.player;
        if (player) {
            this.playStyle(player.x, player.y, BURSTS.SHIELD_BREAK, this.shieldBreakColor, 1);
        }
    }

    private onBossPhaseChanged(): void {
        const boss = this.gameManager.world?.boss;
        // NOTE: the starting phase is also broadcast while Ready; only a real change gets the ring.
        if (!boss || this.gameManager.state !== GameState.Playing) {
            return;
        }
        this.playStyle(boss.x, boss.y, BURSTS.PHASE_RING, this.phaseRingColor, 1);
    }

    /** Victory: one big burst on the boss plus smaller ones of random size scattered around it. */
    private onGameOver(isVictory: boolean): void {
        const boss = this.gameManager.world?.boss;
        if (!isVictory || !boss) {
            return;
        }
        this.playStyle(boss.x, boss.y, BURSTS.EXPLOSION, this.explosionColor, 1);
        const { EXPLOSION_EXTRA_BURSTS, EXPLOSION_SPREAD, EXPLOSION_EXTRA_MIN_SCALE } = FeedbackConfig;
        for (let i = 0; i < EXPLOSION_EXTRA_BURSTS; i++) {
            const x = boss.x + randomRange(-EXPLOSION_SPREAD, EXPLOSION_SPREAD);
            const y = boss.y + randomRange(-EXPLOSION_SPREAD, EXPLOSION_SPREAD);
            this.playStyle(x, y, BURSTS.EXPLOSION, this.explosionColor, randomRange(EXPLOSION_EXTRA_MIN_SCALE, 1));
        }
    }
}
