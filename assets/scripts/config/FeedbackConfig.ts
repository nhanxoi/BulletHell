/**
 * FeedbackConfig.ts
 * Tuning numbers of the purely visual feedback: dash telegraph, impact bursts, shield orb pulse,
 * player shield bubble, phase banner and camera shakes. Read only by view/ and ui/ components; changing a value here
 * never changes the game rules. Sizes are px, times are seconds, alphas are 0-255.
 */
import { BossConfig } from './BossConfig';
import { GameConfig } from './GameConfig';

/** Look of one burst kind played by ImpactEffects (every entry of BURSTS matches it). */
export interface BurstStyle {
    readonly COLOR: string;
    /** Starting alpha (0-255); the burst fades from it to 0. */
    readonly ALPHA: number;
    /** Diameter at the start and at the end of the burst, px. */
    readonly START_SIZE: number;
    readonly END_SIZE: number;
    readonly DURATION: number;
}

/** Shield bubble diameter, px: 2.6x the player diameter, so it reads as a bubble around the player. */
const SHIELD_DIAMETER = 2.6 * 2 * GameConfig.PLAYER.RADIUS;

export const FeedbackConfig = {
    /** Dash telegraph line: as long as the distance a full dash covers, so it shows the real reach. */
    TELEGRAPH_LENGTH: BossConfig.DASH.SPEED * BossConfig.DASH.DURATION,
    TELEGRAPH_THICKNESS: 12,
    TELEGRAPH_COLOR: '#FFFFFF',
    /** The line alpha pulses between these values, PULSE_HZ times per second. */
    TELEGRAPH_ALPHA_MIN: 50,
    TELEGRAPH_ALPHA_MAX: 190,
    TELEGRAPH_PULSE_HZ: 6,

    /** Burst nodes created at load; when all are busy the one with the least time left is reused. */
    BURST_POOL_SIZE: 24,
    /** Shortest time between two boss-hit sparks; the weapon hits several times per second. */
    BOSS_HIT_BURST_INTERVAL: 0.1,
    /** Boss-hit sparks appear at a random point within this fraction of the boss half size. */
    BOSS_HIT_SPREAD: 0.7,
    /** Victory explosion: this many extra bursts at random points within SPREAD px of the boss. */
    EXPLOSION_EXTRA_BURSTS: 6,
    EXPLOSION_SPREAD: 90,
    /** Extra bursts get a random size and duration between MIN_SCALE and 1 of the EXPLOSION style. */
    EXPLOSION_EXTRA_MIN_SCALE: 0.4,
    BURSTS: {
        PLAYER_HIT: { COLOR: '#FFFFFF', ALPHA: 220, START_SIZE: 30, END_SIZE: 120, DURATION: 0.3 },
        BOSS_HIT: { COLOR: '#FDE68A', ALPHA: 230, START_SIZE: 16, END_SIZE: 60, DURATION: 0.16 },
        PICKUP: { COLOR: GameConfig.COLORS.PICKUP, ALPHA: 230, START_SIZE: 40, END_SIZE: 160, DURATION: 0.4 },
        /** Shrinks onto the orb (END_SIZE = its diameter) so the eye is drawn to where it appeared. */
        PICKUP_SPAWN: {
            COLOR: GameConfig.COLORS.PICKUP, ALPHA: 170, START_SIZE: 220, END_SIZE: 2 * GameConfig.PICKUP.RADIUS,
            DURATION: 0.45,
        },
        /** Starts at the shield bubble size and bursts outwards: the bubble visibly pops. */
        SHIELD_BREAK: {
            COLOR: GameConfig.COLORS.PLAYER_SHIELD, ALPHA: 240, START_SIZE: SHIELD_DIAMETER, END_SIZE: 280,
            DURATION: 0.35,
        },
        PHASE_RING: { COLOR: '#FCA5A5', ALPHA: 110, START_SIZE: 120, END_SIZE: 700, DURATION: 0.6 },
        EXPLOSION: { COLOR: '#FDBA74', ALPHA: 255, START_SIZE: 80, END_SIZE: 420, DURATION: 0.8 },
    },

    /** Shield orb: its scale swings by +-PULSE_AMOUNT around 1, PULSE_HZ times per second. */
    PICKUP_PULSE_AMOUNT: 0.15,
    PICKUP_PULSE_HZ: 2,

    /** Shield bubble around the player while PlayerModel.hasShield (colour COLORS.PLAYER_SHIELD). */
    SHIELD_DIAMETER,
    /** Kept translucent so the player, and bullets passing over it, stay readable. */
    SHIELD_ALPHA: 110,
    /** Its scale swings by +-PULSE_AMOUNT around 1, PULSE_HZ times per second (slower than the orb). */
    SHIELD_PULSE_AMOUNT: 0.05,
    SHIELD_PULSE_HZ: 1.5,

    /** Phase banner: total time on screen, pop-in time (scale POP_SCALE -> 1) and fade-out time. */
    BANNER_DURATION: 1.6,
    BANNER_POP_TIME: 0.2,
    BANNER_POP_SCALE: 1.8,
    BANNER_FADE_TIME: 0.4,
    BANNER_COLOR: '#FDE047',

    /** Camera shakes on top of the hit shake (GameConfig.CAMERA): offset px and duration s. */
    PHASE_SHAKE_AMPLITUDE: 14,
    PHASE_SHAKE_DURATION: 0.4,
    VICTORY_SHAKE_AMPLITUDE: 26,
    VICTORY_SHAKE_DURATION: 0.9,
} as const;
