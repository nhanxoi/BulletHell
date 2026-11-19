/**
 * AudioPlayer.ts
 * Plays the background music and every sound effect of the fight. Listens to GameManager events
 * (state, shots, volleys, hits, shield pickups and breaks, phase, game over) and reads the dash flags of the models in
 * lateUpdate, so the game rules never know that sound exists. Display-side only, it owns no game rules.
 *
 * Attach to node GameRoot with two AudioSource components: one for the music, one for effects.
 * Volumes come from AudioConfig and are applied in code, so the inspector values do not matter.
 *
 * NOTE (web autoplay): browsers keep the AudioContext suspended until a user gesture. In Cocos 3.7
 * the web player (pal/audio/web/player-web) resumes it on the first `touchend` / `mouseup` on the
 * GameCanvas; the music `play()` called before that is queued and starts then, and every call is
 * wrapped in `.catch`, so nothing throws. A key press is a valid gesture for the browser but the
 * engine does not listen to it, so the first key press plays a silent one-shot: a one-shot calls
 * `context.resume()` directly, which unlocks the queued music for keyboard-only players.
 */
import { _decorator, AudioClip, AudioSource, Component, input, Input } from 'cc';
import { AudioConfig } from '../config/AudioConfig';
import { GameManager } from '../controller/GameManager';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { GameState } from '../model/GameState';
import { RateLimiter } from '../utils/RateLimiter';
const { ccclass, property } = _decorator;

/** Turns game events and model flags into music and sound effects. */
@ccclass('AudioPlayer')
export class AudioPlayer extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    // Sources: one loops the music, the other plays every one-shot effect.
    @property(AudioSource) private musicSource: AudioSource = null!;
    @property(AudioSource) private sfxSource: AudioSource = null!;

    // Clips (assets/audio), one per sound.
    @property(AudioClip) private bgmClip: AudioClip = null!;
    @property(AudioClip) private playerHitClip: AudioClip = null!;
    @property(AudioClip) private bossHitClip: AudioClip = null!;
    @property(AudioClip) private bossDashClip: AudioClip = null!;
    @property(AudioClip) private phaseChangeClip: AudioClip = null!;
    @property(AudioClip) private victoryClip: AudioClip = null!;
    @property(AudioClip) private defeatClip: AudioClip = null!;
    @property(AudioClip) private playerDashClip: AudioClip = null!;
    @property(AudioClip) private playerShotClip: AudioClip = null!;
    @property(AudioClip) private bossVolleyClip: AudioClip = null!;
    @property(AudioClip) private explosionClip: AudioClip = null!;
    @property(AudioClip) private pickupClip: AudioClip = null!;
    @property(AudioClip) private uiClickClip: AudioClip = null!;
    @property(AudioClip) private shieldBreakClip: AudioClip = null!;

    /** Rate limits for the frequent effects (see playThrottled). */
    private readonly bossHitLimiter = new RateLimiter(AudioConfig.BOSS_HIT_MIN_INTERVAL);
    private readonly playerShotLimiter = new RateLimiter(AudioConfig.PLAYER_SHOT_MIN_INTERVAL);
    /** Dash flags seen last frame, to play the whoosh only on the rising edge. */
    private wasBossDashing = false;
    private wasPlayerDashing = false;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.hasAllReferences()) {
            console.error(`[AudioPlayer] a source or clip is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        this.musicSource.clip = this.bgmClip;
        this.musicSource.loop = true;
        this.musicSource.playOnAwake = false;
        this.musicSource.volume = AudioConfig.MUSIC_VOLUME;
        this.sfxSource.playOnAwake = false;
        this.sfxSource.volume = AudioConfig.SFX_VOLUME;
    }

    protected onEnable(): void {
        EventBus.on(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        EventBus.on(GameEvents.GAME_OVER, this.onGameOver, this);
        EventBus.on(GameEvents.PLAYER_HIT, this.onPlayerHit, this);
        EventBus.on(GameEvents.BOSS_HIT, this.onBossHit, this);
        EventBus.on(GameEvents.BOSS_PHASE_CHANGED, this.onBossPhaseChanged, this);
        EventBus.on(GameEvents.PLAYER_SHOT, this.onPlayerShot, this);
        EventBus.on(GameEvents.BOSS_VOLLEY_FIRED, this.onBossVolleyFired, this);
        EventBus.on(GameEvents.PICKUP_COLLECTED, this.onPickupCollected, this);
        EventBus.on(GameEvents.SHIELD_BROKEN, this.onShieldBroken, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    protected onDisable(): void {
        // CLEANUP: pairs with the EventBus.on / input.on calls in onEnable; same event, handler and target.
        EventBus.off(GameEvents.STATE_CHANGED, this.onStateChanged, this);
        EventBus.off(GameEvents.GAME_OVER, this.onGameOver, this);
        EventBus.off(GameEvents.PLAYER_HIT, this.onPlayerHit, this);
        EventBus.off(GameEvents.BOSS_HIT, this.onBossHit, this);
        EventBus.off(GameEvents.BOSS_PHASE_CHANGED, this.onBossPhaseChanged, this);
        EventBus.off(GameEvents.PLAYER_SHOT, this.onPlayerShot, this);
        EventBus.off(GameEvents.BOSS_VOLLEY_FIRED, this.onBossVolleyFired, this);
        EventBus.off(GameEvents.PICKUP_COLLECTED, this.onPickupCollected, this);
        EventBus.off(GameEvents.SHIELD_BROKEN, this.onShieldBroken, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        // CLEANUP: the looping music started in onStateChanged must not outlive this component.
        this.musicSource.stop();
        // CLEANUP: pairs with scheduleOnce in onGameOver (a pending victory jingle).
        this.unschedule(this.playVictoryJingle);
    }

    protected lateUpdate(dt: number): void {
        this.bossHitLimiter.tick(dt);
        this.playerShotLimiter.tick(dt);
        const world = this.gameManager.world;
        if (!world || this.gameManager.state !== GameState.Playing) {
            return;
        }
        this.wasBossDashing = this.playOnRisingEdge(world.boss.isDashing, this.wasBossDashing,
            this.bossDashClip, AudioConfig.BOSS_DASH_SCALE);
        this.wasPlayerDashing = this.playOnRisingEdge(world.player.isDashing, this.wasPlayerDashing,
            this.playerDashClip, AudioConfig.PLAYER_DASH_SCALE);
    }

    // ---- Private ----

    private hasAllReferences(): boolean {
        return Boolean(this.gameManager && this.musicSource && this.sfxSource && this.bgmClip
            && this.playerHitClip && this.bossHitClip && this.bossDashClip && this.phaseChangeClip
            && this.victoryClip && this.defeatClip && this.playerDashClip && this.playerShotClip
            && this.bossVolleyClip && this.explosionClip && this.pickupClip && this.uiClickClip
            && this.shieldBreakClip);
    }

    private onStateChanged(state: GameState): void {
        if (state === GameState.Ready) {
            // A new round: no edge or throttle state carries over from the previous one.
            this.wasBossDashing = false;
            this.wasPlayerDashing = false;
            this.bossHitLimiter.reset();
            this.playerShotLimiter.reset();
            // CLEANUP: a victory jingle still pending from the last round must not play over the new one.
            this.unschedule(this.playVictoryJingle);
            return;
        }
        if (state !== GameState.Playing) {
            return;
        }
        // NOTE: Playing is only entered from the start screen or the Restart button, so this is their
        // click. It bypasses playSfx(): music play() is asynchronous, so `playing` may still be false
        // here, and this single one-shot runs inside the user gesture that unlocks audio anyway.
        this.sfxSource.playOneShot(this.uiClickClip, AudioConfig.UI_CLICK_SCALE);
        if (!this.musicSource.playing) {
            this.musicSource.play();
        }
    }

    private onGameOver(isVictory: boolean): void {
        // NOTE: read before stop(): music playing means the AudioContext is unlocked (see playSfx).
        const isAudioUnlocked = this.musicSource.playing;
        this.musicSource.stop();
        if (!isAudioUnlocked) {
            return;
        }
        if (!isVictory) {
            this.sfxSource.playOneShot(this.defeatClip, AudioConfig.RESULT_SCALE);
            return;
        }
        // The boss explodes first; the jingle follows once the boom has peaked, so they do not mask each other.
        this.sfxSource.playOneShot(this.explosionClip, AudioConfig.EXPLOSION_SCALE);
        this.scheduleOnce(this.playVictoryJingle, AudioConfig.VICTORY_JINGLE_DELAY);
    }

    private playVictoryJingle(): void {
        this.sfxSource.playOneShot(this.victoryClip, AudioConfig.RESULT_SCALE);
    }

    private onPlayerHit(): void {
        this.playSfx(this.playerHitClip, AudioConfig.PLAYER_HIT_SCALE);
    }

    private onBossHit(): void {
        this.playThrottled(this.bossHitClip, AudioConfig.BOSS_HIT_SCALE, this.bossHitLimiter);
    }

    private onPlayerShot(): void {
        this.playThrottled(this.playerShotClip, AudioConfig.PLAYER_SHOT_SCALE, this.playerShotLimiter);
    }

    private onBossVolleyFired(): void {
        this.playSfx(this.bossVolleyClip, AudioConfig.BOSS_VOLLEY_SCALE);
    }

    private onPickupCollected(): void {
        this.playSfx(this.pickupClip, AudioConfig.PICKUP_SCALE);
    }

    private onShieldBroken(): void {
        this.playSfx(this.shieldBreakClip, AudioConfig.SHIELD_BREAK_SCALE);
    }

    private onBossPhaseChanged(): void {
        // NOTE: GameManager also broadcasts the starting phase while the state is still Ready;
        // only a phase change during a running round deserves the alarm.
        if (this.gameManager.state !== GameState.Playing) {
            return;
        }
        this.playSfx(this.phaseChangeClip, AudioConfig.PHASE_CHANGE_SCALE);
    }

    /**
     * First key press: unlock the AudioContext for keyboard-only players (see the NOTE in the header).
     * NOTE: calling musicSource.play() again would not help: the engine only queues it behind the
     * first, still pending play(). A zero-volume one-shot resumes the context inside this gesture.
     */
    private onKeyDown(): void {
        // CLEANUP: one unlock is enough; pairs with input.on in onEnable (also removed in onDisable).
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        if (!this.musicSource.playing) {
            this.sfxSource.playOneShot(this.uiClickClip, 0);
        }
    }

    /**
     * Plays a one-shot effect at SFX_VOLUME * scale.
     * NOTE: skipped while the music is not playing: during a round that only happens while the
     * AudioContext is still locked, and one-shots started then would all fire at once on unlock.
     */
    private playSfx(clip: AudioClip, scale: number): void {
        if (!this.musicSource.playing) {
            return;
        }
        this.sfxSource.playOneShot(clip, scale);
    }

    /**
     * PERF: the weapon fires and hits several times per second; one sound per limiter interval avoids
     * stacking dozens of overlapping one-shots (each one is a new audio node on web).
     */
    private playThrottled(clip: AudioClip, scale: number, limiter: RateLimiter): void {
        if (limiter.tryConsume()) {
            this.playSfx(clip, scale);
        }
    }

    /**
     * Plays the clip only on the frame a flag turns on (a dash starts), not while it stays on.
     * @returns The flag, to store as "seen last frame".
     */
    private playOnRisingEdge(isOn: boolean, wasOn: boolean, clip: AudioClip, scale: number): boolean {
        if (isOn && !wasOn) {
            this.playSfx(clip, scale);
        }
        return isOn;
    }
}
