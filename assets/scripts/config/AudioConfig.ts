/**
 * AudioConfig.ts
 * Volumes and timing for music and sound effects, read by view/AudioPlayer.
 * Volumes are linear gains from 0 (silent) to 1 (full); times are in seconds.
 */
export const AudioConfig = {
    /** Volume of the looping background music. */
    MUSIC_VOLUME: 0.5,
    /** Base volume of the sound-effect source; each effect scales it with its own factor below. */
    SFX_VOLUME: 0.8,
    /** Per-effect volume scale passed to playOneShot (result = SFX_VOLUME * scale). */
    PLAYER_HIT_SCALE: 1,
    BOSS_HIT_SCALE: 0.35,
    BOSS_DASH_SCALE: 0.8,
    PHASE_CHANGE_SCALE: 0.9,
    RESULT_SCALE: 1,
    PLAYER_DASH_SCALE: 0.6,
    /** Shortest time between two boss-hit ticks; the player weapon hits many times per second. */
    BOSS_HIT_MIN_INTERVAL: 0.08,
} as const;
