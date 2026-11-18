/**
 * GameEvents.ts
 * Single source of truth for EventBus event names. Each entry documents who emits it and its
 * payload, so emitters and listeners agree. GameManager is the only emitter of gameplay events;
 * HUD, popups, camera and audio only listen.
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
    /** No payload. The boss lost HP this frame. */
    BOSS_HIT: 'boss-hit',
    /** Payload: (isVictory: boolean) - true when the boss was defeated. */
    GAME_OVER: 'game-over',
} as const;
