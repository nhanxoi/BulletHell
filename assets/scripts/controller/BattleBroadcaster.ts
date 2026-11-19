/**
 * BattleBroadcaster.ts
 * Turns changes in the BattleWorld into EventBus events, at most once per frame: HP, hits, phase,
 * shield breaks, shots, volleys and shield orbs. It remembers the last broadcast values and the world counters, so
 * HUD, effects and audio only hear about real changes, even when a frame ran several sub-steps.
 *
 * Owned and called by GameManager (plain class, no component). Split out of GameManager so the
 * state machine and the "what changed this frame" bookkeeping can be read separately.
 */
import { BossPhase } from '../config/BossPhase';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { BattleWorld } from '../model/BattleWorld';
import { Health } from '../model/Health';

/** Remembers what the views were last told and emits events for what changed since. */
export class BattleBroadcaster {
    /** Last values broadcast to the HUD, so events are only emitted when something changed. */
    private lastPlayerHp = 0;
    private lastBossHp = 0;
    private lastBossPhase = BossPhase.High;
    /** World counters at the last broadcast; a different value means the event happened this frame. */
    private lastPlayerShotCount = 0;
    private lastBossVolleyCount = 0;
    private lastPickupSpawnCount = 0;
    private lastPickupCollectCount = 0;
    private lastShieldBreakCount = 0;

    /** Broadcasts the start values of a new round, so the HUD never shows numbers from the previous one. */
    emitRoundStart(world: BattleWorld): void {
        const playerHealth = world.player.health;
        const bossHealth = world.boss.health;
        this.lastPlayerHp = playerHealth.current;
        this.lastBossHp = bossHealth.current;
        this.lastBossPhase = world.boss.phase;
        // The counters were just reset with the world; no action event is pending for the new round.
        this.lastPlayerShotCount = world.playerShotCount;
        this.lastBossVolleyCount = world.bossVolleyCount;
        this.lastPickupSpawnCount = world.pickupSpawnCount;
        this.lastPickupCollectCount = world.pickupCollectCount;
        this.lastShieldBreakCount = world.shieldBreakCount;
        EventBus.emit(GameEvents.PLAYER_HP_CHANGED, playerHealth.current, playerHealth.max);
        EventBus.emit(GameEvents.BOSS_HP_CHANGED, bossHealth.current, bossHealth.max);
        EventBus.emit(GameEvents.BOSS_PHASE_CHANGED, this.lastBossPhase);
    }

    /** Emits every event for what changed during the frame that was just simulated. */
    emitFrameChanges(world: BattleWorld): void {
        this.emitStatusChanges(world);
        this.emitActionEvents(world);
    }

    // ---- Private ----

    /** HP / hit / shield break / phase events. */
    private emitStatusChanges(world: BattleWorld): void {
        // PERF: compare with the last broadcast value, so the HUD is not updated every frame.
        this.lastPlayerHp = this.emitHealthChange(
            world.player.health, this.lastPlayerHp, GameEvents.PLAYER_HP_CHANGED, GameEvents.PLAYER_HIT);
        this.lastBossHp = this.emitHealthChange(
            world.boss.health, this.lastBossHp, GameEvents.BOSS_HP_CHANGED, GameEvents.BOSS_HIT);
        // NOTE: a hit absorbed by the shield costs no HP, so it is reported by its own counter.
        if (world.shieldBreakCount !== this.lastShieldBreakCount) {
            this.lastShieldBreakCount = world.shieldBreakCount;
            EventBus.emit(GameEvents.SHIELD_BROKEN);
        }
        if (world.boss.phase !== this.lastBossPhase) {
            this.lastBossPhase = world.boss.phase;
            EventBus.emit(GameEvents.BOSS_PHASE_CHANGED, this.lastBossPhase);
        }
    }

    /**
     * Emits the HP event (and the hit event when HP dropped) if the value changed.
     * NOTE: nothing heals during a round, so a change here is always a drop; the `<` test keeps the
     * hit event tied to a real loss anyway (HP only rises on reset, which emitRoundStart covers).
     * @returns The HP value to remember as "last broadcast".
     */
    private emitHealthChange(health: Health, lastHp: number, hpEvent: string, hitEvent: string): number {
        const hp = health.current;
        if (hp === lastHp) {
            return lastHp;
        }
        if (hp < lastHp) {
            EventBus.emit(hitEvent);
        }
        EventBus.emit(hpEvent, hp, health.max);
        return hp;
    }

    /**
     * Emits shot / volley / orb events at most once per frame, when the matching world counter moved.
     * PERF: several sub-steps can each fire; audio and effects only need one event per frame.
     */
    private emitActionEvents(world: BattleWorld): void {
        if (world.playerShotCount !== this.lastPlayerShotCount) {
            this.lastPlayerShotCount = world.playerShotCount;
            EventBus.emit(GameEvents.PLAYER_SHOT);
        }
        if (world.bossVolleyCount !== this.lastBossVolleyCount) {
            this.lastBossVolleyCount = world.bossVolleyCount;
            EventBus.emit(GameEvents.BOSS_VOLLEY_FIRED);
        }
        const pickup = world.pickup;
        if (world.pickupSpawnCount !== this.lastPickupSpawnCount) {
            this.lastPickupSpawnCount = world.pickupSpawnCount;
            EventBus.emit(GameEvents.PICKUP_SPAWNED, pickup.x, pickup.y);
        }
        if (world.pickupCollectCount !== this.lastPickupCollectCount) {
            this.lastPickupCollectCount = world.pickupCollectCount;
            EventBus.emit(GameEvents.PICKUP_COLLECTED, pickup.collectedX, pickup.collectedY);
        }
    }
}
