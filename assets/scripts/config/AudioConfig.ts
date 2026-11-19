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
    /** The auto shot fires every GameConfig.PLAYER.FIRE_INTERVAL, so its tick stays quiet under the music. */
    PLAYER_SHOT_SCALE: 0.25,
    BOSS_VOLLEY_SCALE: 0.6,
    EXPLOSION_SCALE: 1,
    PICKUP_SCALE: 0.9,
    UI_CLICK_SCALE: 0.7,
    /** Glassy crack when the shield absorbs a hit; loud enough to read as "you were saved". */
    SHIELD_BREAK_SCALE: 0.9,
    /** Shortest time between two boss-hit ticks; the player weapon hits many times per second. */
    BOSS_HIT_MIN_INTERVAL: 0.08,
    /** Shortest time between two shot ticks: a safety cap just below GameConfig.PLAYER.FIRE_INTERVAL. */
    PLAYER_SHOT_MIN_INTERVAL: 0.1,
    /** Seconds between the victory explosion and the victory jingle. */
    VICTORY_JINGLE_DELAY: 0.45,
} as const;
