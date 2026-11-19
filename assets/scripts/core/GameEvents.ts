/**
 * GameEvents.ts
 * Single source of truth for EventBus event names. Each entry documents who emits it and its
 * payload, so emitters and listeners agree. GameManager is the only emitter of gameplay events;
 * HUD, popups, camera, the boss view and AudioPlayer only listen.
 */
export const GameEvents = {
    /** Payload: (state: GameState) - the state the game just entered. */
    STATE_CHANGED: 'state-changed',
    /** Payload: (hp: number, maxHp: number). Emitted on start and whenever player HP changes. */
    PLAYER_HP_CHANGED: 'player-hp-changed',
    /** Payload: (hp: number, maxHp: number). Emitted on start and whenever boss HP changes. */
    BOSS_HP_CHANGED: 'boss-hp-changed',
    /** Payload: (phase: BossPhase). Emitted on start and whenever the boss enters a new HP phase. */
    BOSS_PHASE_CHANGED: 'boss-phase-changed',
    /** No payload. The player lost HP this frame (bullet or boss contact). */
    PLAYER_HIT: 'player-hit',
    /**
     * No payload. The player's shield absorbed a hit this frame (no HP lost, so no PLAYER_HIT).
     * Emitted at most once per frame.
     */
    SHIELD_BROKEN: 'shield-broken',
    /** No payload. The boss lost HP this frame. */
    BOSS_HIT: 'boss-hit',
    /** No payload. The player fired at least one bullet this frame. */
    PLAYER_SHOT: 'player-shot',
    /** No payload. The boss fired at least one volley this frame. */
    BOSS_VOLLEY_FIRED: 'boss-volley-fired',
    /** Payload: (x: number, y: number) - world position of the shield orb that just appeared. */
    PICKUP_SPAWNED: 'pickup-spawned',
    /**
     * Payload: (x: number, y: number) - world position where the player took the shield orb.
     * HP does not change; views read world.player.hasShield to show the charge.
     */
    PICKUP_COLLECTED: 'pickup-collected',
    /** Payload: (isVictory: boolean) - true when the boss was defeated. */
    GAME_OVER: 'game-over',
} as const;
