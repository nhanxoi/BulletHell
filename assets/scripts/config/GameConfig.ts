/**
 * GameConfig.ts
 * Every gameplay tuning number lives here, so balancing never requires touching logic code.
 * World units are pixels with the origin at the arena centre, +x right, +y up.
 * Boss move/shot parameters live in BossConfig.
 */
export const GameConfig = {
    FRAME: {
        /** Longest simulated step, seconds. A long frame (tab switch, GC) is clamped so bullets cannot tunnel. */
        MAX_DT: 0.05,
    },
    ARENA: {
        /** Inner playable size, px (walls are outside it). */
        WIDTH: 2400,
        HEIGHT: 1600,
        /** Wall thickness, px (visual only, the inner rect is the boundary). */
        WALL_THICKNESS: 40,
    },
    CAMERA: {
        /** How fast the camera catches up with the player, 1/s (higher = snappier). */
        FOLLOW_SHARPNESS: 8,
        /** Screen shake when the player is hit: offset in px and duration in seconds. */
        SHAKE_AMPLITUDE: 8,
        SHAKE_DURATION: 0.2,
    },
    PLAYER: {
        RADIUS: 20,
        /** px/s. */
        SPEED: 320,
        MAX_HP: 100,
        /** Seconds of invulnerability after a hit. */
        HIT_INVULNERABLE: 1.0,
        START_X: 0,
        START_Y: -250,
        /** Seconds between two auto shots. */
        FIRE_INTERVAL: 0.15,
        /** The player auto-shoots when the boss centre is closer than this, px. */
        AUTO_AIM_RANGE: 750,
        /** px/s. */
        BULLET_SPEED: 900,
        BULLET_RADIUS: 8,
        BULLET_DAMAGE: 10,
    },
    BOSS: {
        /** Half of the square side, px. */
        HALF_SIZE: 60,
        MAX_HP: 2000,
        /** Damage when the boss body touches the player (then the player is invulnerable for a while). */
        CONTACT_DAMAGE: 20,
        START_X: 0,
        START_Y: 200,
        BULLET_RADIUS: 10,
        BULLET_DAMAGE: 10,
        /** HP ratio thresholds: >= HIGH_MIN is High, >= MEDIUM_MIN is Medium, below is Low. */
        PHASE_HIGH_MIN_RATIO: 0.6,
        PHASE_MEDIUM_MIN_RATIO: 0.3,
        /** In a phase with several options, a new random move/shot is picked every [MIN, MAX] seconds. */
        ACTION_SWITCH_MIN: 2.0,
        ACTION_SWITCH_MAX: 4.0,
    },
    BULLETS: {
        /** Fixed capacity of each bullet store; a spawn beyond it is skipped (and warned once). */
        PLAYER_CAPACITY: 64,
        BOSS_CAPACITY: 400,
        /** Bullet nodes created when the scene loads, so the first volleys do not stutter. */
        PLAYER_PRELOAD: 32,
        BOSS_PRELOAD: 200,
    },
    FEEDBACK: {
        /** Seconds between two player blink toggles while invulnerable. */
        BLINK_INTERVAL: 0.1,
        /** Player sprite alpha (0-255) during the "off" half of a blink. */
        BLINK_ALPHA: 70,
        /** Seconds between two boss flash toggles while it winds up a dash. */
        WINDUP_FLASH_INTERVAL: 0.08,
    },
    JOYSTICK: {
        /** Max knob distance from the base centre, UI px. */
        RADIUS: 90,
        /** Stick input below this fraction of RADIUS is ignored. */
        DEAD_ZONE: 0.15,
    },
    COLORS: {
        PLAYER: '#3B82F6',
        PLAYER_BULLET: '#22C55E',
        BOSS: '#EF4444',
        BOSS_BULLET: '#F97316',
        WALL: '#64748B',
        FLOOR: '#1E293B',
        /** Boss tint per phase (visual feedback when it gets angrier) and while winding up a dash. */
        BOSS_PHASE_MEDIUM: '#DC2626',
        BOSS_PHASE_LOW: '#7F1D1D',
        BOSS_WINDUP: '#FFFFFF',
    },
} as const;
