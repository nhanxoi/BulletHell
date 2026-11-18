/**
 * BattleWorld.ts
 * The whole fight as plain data: arena, player, boss, their weapons and both bullet stores.
 * GameManager calls step() once per frame and reacts to the returned BattleOutcome; views read
 * the public members to draw. No engine import, so the rules can be reasoned about (and tested) alone.
 */
import { GameConfig } from '../config/GameConfig';
import { circleOverlapsBox } from '../utils/Collision';
import { ArenaBounds } from './ArenaBounds';
import { BattleOutcome } from './BattleOutcome';
import { BossModel } from './BossModel';
import { BulletStore } from './BulletStore';
import { InputState } from './InputState';
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

    /** Puts everything back to the start of a round. */
    reset(): void {
        this.player.reset();
        this.boss.reset();
        this.weapon.reset();
        this.brain.reset();
        this.clearAllBullets();
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
        this.weapon.step(dt, this.player, this.boss, this.playerBullets);
        this.brain.step(dt, this.boss, this.player, this.bounds, this.bossBullets);
        this.playerBullets.step(dt, this.bounds);
        this.bossBullets.step(dt, this.bounds);
        this.hitBoss();
        this.hitPlayer();
        return this.outcome();
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
            player.takeHit(hits * BOSS.BULLET_DAMAGE);
        }
        // NOTE: if the bullets above already landed, takeHit() refuses this contact hit (invulnerable).
        const boss = this.boss;
        if (circleOverlapsBox(player.x, player.y, player.radius, boss.x, boss.y, boss.halfSize)) {
            player.takeHit(BOSS.CONTACT_DAMAGE);
        }
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
