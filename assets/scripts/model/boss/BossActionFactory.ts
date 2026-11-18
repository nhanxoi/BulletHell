/**
 * BossActionFactory.ts
 * Maps every BossMoveId / BossShotId to a function that creates its object with its config.
 * Typed as Record over the enums, so adding an id without a line here is a compile error.
 * Used only by BossBrain, which creates each action once and reuses it.
 */
import { BossConfig } from '../../config/BossConfig';
import { BossMoveId } from '../../config/BossMoveId';
import { BossShotId } from '../../config/BossShotId';
import { ChaseMove } from './ChaseMove';
import { DashMove } from './DashMove';
import { FanShot } from './FanShot';
import { IBossMove } from './IBossMove';
import { IBossShot } from './IBossShot';

const MOVES: Readonly<Record<BossMoveId, () => IBossMove>> = {
    [BossMoveId.Chase]: () => new ChaseMove(BossConfig.CHASE),
    [BossMoveId.Dash]: () => new DashMove(BossConfig.DASH),
};

const SHOTS: Readonly<Record<BossShotId, () => IBossShot>> = {
    [BossShotId.NormalFan]: () => new FanShot(BossConfig.SHOTS[BossShotId.NormalFan]),
    [BossShotId.CrazyFan]: () => new FanShot(BossConfig.SHOTS[BossShotId.CrazyFan]),
};

/** Creators of every boss move and shot, keyed by id. */
export const BossActionFactory = {
    MOVES,
    SHOTS,
} as const;
