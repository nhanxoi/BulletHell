/**
 * BossConfig.ts
 * Boss tuning data: parameters of every move and shot, and which actions each HP phase uses.
 * Phases are pure data, so changing the boss behaviour per stage never touches logic code.
 * Typed Record constants make a missing enum entry a compile error.
 */
import { BossMoveId } from './BossMoveId';
import { BossPhase } from './BossPhase';
import { BossShotId } from './BossShotId';
import { ChaseMoveConfig, DashMoveConfig, FanShotConfig, PhaseConfig } from './BossConfigTypes';

const CHASE: ChaseMoveConfig = { SPEED: 150, STOP_DISTANCE: 60 };

const DASH: DashMoveConfig = { WINDUP: 0.5, SPEED: 1200, DURATION: 0.45, RECOVER: 0.6, MIN_AIM_DISTANCE: 1 };

const SHOTS: Readonly<Record<BossShotId, FanShotConfig>> = {
    [BossShotId.NormalFan]: { COUNT: 6, SPREAD_DEG: 50, SPEED: 300, INTERVAL: 0.9 },
    [BossShotId.CrazyFan]: { COUNT: 18, SPREAD_DEG: 140, SPEED: 260, INTERVAL: 1.2 },
};

const PHASES: Readonly<Record<BossPhase, PhaseConfig>> = {
    [BossPhase.High]: { MOVES: [BossMoveId.Chase], SHOTS: [BossShotId.NormalFan] },
    [BossPhase.Medium]: {
        MOVES: [BossMoveId.Chase, BossMoveId.Dash],
        SHOTS: [BossShotId.NormalFan, BossShotId.CrazyFan],
    },
    [BossPhase.Low]: { MOVES: [BossMoveId.Dash], SHOTS: [BossShotId.CrazyFan] },
};

/** Boss moves, shots and phase table. */
export const BossConfig = {
    CHASE,
    DASH,
    SHOTS,
    PHASES,
} as const;
