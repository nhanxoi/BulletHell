/**
 * BattleWorld.ts
 * The whole fight as plain data: arena, player, boss, their weapons, both bullet stores and the
 * shield orb. GameManager calls step() one or more times per frame (fixed-size sub-steps) and reacts
 * to the returned BattleOutcome; views read the public members to draw. Event counters (shots,
 * volleys, orb spawns, pickups and shield breaks) only grow during a round, so GameManager can
 * compare them once per frame and emit each event at most once, however many sub-steps ran. No
 * engine import, so the rules can be reasoned about (and tested) alone.
 */
import { BossPhase } from '../config/BossPhase';
import { GameConfig } from '../config/GameConfig';
import { circleOverlapsBox, circleOverlapsCircle } from '../utils/Collision';
import { ArenaBounds } from './ArenaBounds';
import { BattleOutcome } from './BattleOutcome';
import { BossModel } from './BossModel';
import { BulletStore } from './BulletStore';
import { InputState } from './InputState';
import { PickupModel } from './PickupModel';
import { PlayerModel } from './PlayerModel';
import { PlayerWeapon } from './PlayerWeapon';
import { BossBrain } from './boss/BossBrain';

const PLAYER = GameConfig.PLAYER;
const BOSS = GameConfig.BOSS;
const BULLETS = GameConfig.BULLETS;

/** Owns every simulation object and advances them in a fixed order. */
export class BattleWorld {
    readonly bounds = new ArenaBounds(GameConfig.ARENA.WIDTH, GameConfig.ARENA.HEIGHT);
    readonly player = new PlayerModel();
    readonly boss = new BossModel();
    readonly playerBullets = new BulletStore(BULLETS.PLAYER_CAPACITY, PLAYER.BULLET_RADIUS, 'player');
    readonly bossBullets = new BulletStore(BULLETS.BOSS_CAPACITY, BOSS.BULLET_RADIUS, 'boss');
    readonly weapon = new PlayerWeapon();
    readonly brain = new BossBrain();
    readonly pickup = new PickupModel();

    private _playerShotCount = 0;
    private _bossVolleyCount = 0;
    private _pickupSpawnCount = 0;
    private _pickupCollectCount = 0;
    private _shieldBreakCount = 0;
    /** Boss phase already rewarded with an orb, so one spawns only when the phase increases. */
    private rewardedPhase = BossPhase.High;

    /** Player shots fired this round. */
    get playerShotCount(): number {
        return this._playerShotCount;
    }

    /** Boss volleys fired this round. */
    get bossVolleyCount(): number {
        return this._bossVolleyCount;
    }

    /** Shield orbs spawned this round. */
    get pickupSpawnCount(): number {
        return this._pickupSpawnCount;
    }

    /** Shield orbs collected this round. */
    get pickupCollectCount(): number {
        return this._pickupCollectCount;
    }

    /** Hits absorbed by the player's shield this round (each one used up the charge). */
    get shieldBreakCount(): number {
        return this._shieldBreakCount;
    }

    /** Puts everything back to the start of a round. */
    reset(): void {
        this.player.reset();
        this.boss.reset();
        this.weapon.reset();
        this.brain.reset();
        this.clearAllBullets();
        this.pickup.clear();
        this._playerShotCount = 0;
        this._bossVolleyCount = 0;
        this._pickupSpawnCount = 0;
        this._pickupCollectCount = 0;
        this._shieldBreakCount = 0;
        this.rewardedPhase = BossPhase.High;
    }

    /**
     * Advances the fight by one frame.
     * @param dt    Seconds since the last step (already clamped by GameManager).
     * @param input Latest player input.
     * @returns Whether someone was defeated this frame.
     */
    step(dt: number, input: InputState): BattleOutcome {
        // NOTE: order matters: everyone moves and shoots first, then bullets fly, then hits are
        // resolved on the final positions of this frame.
        this.player.step(dt, input, this.bounds);
        if (this.weapon.step(dt, this.player, this.boss, this.playerBullets)) {
            this._playerShotCount++;
        }
        if (this.brain.step(dt, this.boss, this.player, this.bounds, this.bossBullets)) {
            this._bossVolleyCount++;
        }
        this.spawnPickupOnPhaseUp();
        this.playerBullets.step(dt, this.bounds);
        this.bossBullets.step(dt, this.bounds);
        this.hitBoss();
        this.hitPlayer();
        this.collectPickup();
        const outcome = this.outcome();
        // NOTE: the world is not stepped after the round ends, so running effects (boss windup flash,
        // player blink or dash tint) would freeze behind the result screen, and an orb left on the map
        // would stay drawn there; they are cleared once here.
        if (outcome !== BattleOutcome.None) {
            this.boss.clearActionFlags();
            this.player.clearTimedEffects();
            this.pickup.clear();
        }
        return outcome;
    }

    /** Removes every bullet of both sides (boss defeated, new round). */
    clearAllBullets(): void {
        this.playerBullets.clear();
        this.bossBullets.clear();
    }

    // ---- Private ----

    private hitBoss(): void {
        const boss = this.boss;
        const hits = this.playerBullets.consumeHitsOnBox(boss.x, boss.y, boss.halfSize);
        if (hits > 0) {
            boss.health.applyDamage(hits * PLAYER.BULLET_DAMAGE);
        }
    }

    private hitPlayer(): void {
        const player = this.player;
        // NOTE: while invulnerable, boss bullets fly through the player instead of being consumed.
        if (player.isInvulnerable) {
            return;
        }
        const hits = this.bossBullets.consumeHitsOnCircle(player.x, player.y, player.radius);
        if (hits > 0) {
            this.damagePlayer(hits * BOSS.BULLET_DAMAGE);
        }
        // NOTE: if the bullets above already landed (or broke the shield), takeHit() refuses this
        // contact hit because the hit invulnerability has started.
        const boss = this.boss;
        if (circleOverlapsBox(player.x, player.y, player.radius, boss.x, boss.y, boss.halfSize)) {
            this.damagePlayer(BOSS.CONTACT_DAMAGE);
        }
    }

    /** Hits the player and counts the hit when the shield absorbed it instead of HP. */
    private damagePlayer(damage: number): void {
        const player = this.player;
        const hadShield = player.hasShield;
        player.takeHit(damage);
        if (hadShield && !player.hasShield) {
            this._shieldBreakCount++;
        }
    }

    /** Spawns the shield orb (replacing an uncollected one) when the boss reaches a new HP phase. */
    private spawnPickupOnPhaseUp(): void {
        const phase = this.boss.phase;
        // NOTE: BossBrain only moves the phase forward (High < Medium < Low), so the first High of a
        // round gives nothing and a jump straight from High to Low gives one orb, not two.
        if (phase <= this.rewardedPhase) {
            return;
        }
        this.rewardedPhase = phase;
        this.pickup.spawnAwayFrom(this.boss, this.bounds);
        this._pickupSpawnCount++;
    }

    /** Gives the player a shield charge when they touch the orb. */
    private collectPickup(): void {
        const pickup = this.pickup;
        const player = this.player;
        // NOTE: a player killed earlier in this step cannot take the orb; the round is already lost.
        if (!pickup.isActive || player.health.isDead) {
            return;
        }
        if (!circleOverlapsCircle(player.x, player.y, player.radius, pickup.x, pickup.y, pickup.radius)) {
            return;
        }
        // NOTE: consumed even while already shielded (the charge does not stack): one simple rule,
        // touching = taking.
        player.grantShield();
        pickup.collect();
        this._pickupCollectCount++;
    }

    private outcome(): BattleOutcome {
        // NOTE: boss checked first, so a same-frame double kill counts as a victory.
        if (this.boss.health.isDead) {
            return BattleOutcome.BossDefeated;
        }
        if (this.player.health.isDead) {
            return BattleOutcome.PlayerDefeated;
        }
        return BattleOutcome.None;
    }
}
