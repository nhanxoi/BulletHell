/**
 * GameManager.ts
 * Entry point of a play session: owns the simulation (BattleWorld) and the player input
 * (InputState), runs the only gameplay update of the game and drives the state machine.
 * Changes are broadcast through EventBus so HUD, popups and camera never poll the model.
 *
 * Attach to node GameRoot in Main.scene. Views read `world` in lateUpdate; input components
 * write `input` when input events arrive.
 */
import { _decorator, Component } from 'cc';
import { GameConfig } from '../config/GameConfig';
import { BossPhase } from '../config/BossPhase';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { BattleOutcome } from '../model/BattleOutcome';
import { BattleWorld } from '../model/BattleWorld';
import { GameState } from '../model/GameState';
import { Health } from '../model/Health';
import { InputState } from '../model/InputState';
const { ccclass } = _decorator;

/** Owns the battle simulation and the session state machine; the only writer of GameState. */
@ccclass('GameManager')
export class GameManager extends Component {
    private _world: BattleWorld | null = null;
    // NOTE: a plain data object with no side effects, so it is safe to create it with the component;
    // input components can then write to it without a null check.
    private readonly _input = new InputState();
    private _state = GameState.Ready;
    /** Last values broadcast to the HUD, so events are only emitted when something changed. */
    private lastPlayerHp = 0;
    private lastBossHp = 0;
    private lastBossPhase = BossPhase.High;

    // ---- Lifecycle ----

    protected onLoad(): void {
        // NOTE: created here, not in a field initializer, because the editor also constructs
        // components when it opens the scene and does not need a running simulation.
        this._world = new BattleWorld();
    }

    protected start(): void {
        // NOTE: start() instead of onLoad() so every view has registered its listeners (onEnable)
        // before the first round broadcasts its initial HP and phase. The round then waits in Ready
        // until the start screen calls startGame(), so the player is not attacked while the page loads.
        // NOTE: on web, input is dispatched straight from the DOM, so a tap or key can reach the start
        // screen before this first start(); the round is then already running and must not be reset.
        if (this._state === GameState.Ready) {
            this.prepareRound();
        }
    }

    protected update(dt: number): void {
        if (this._state !== GameState.Playing || !this._world) {
            return;
        }
        const outcome = this.simulateFrame(dt, this._world);
        // NOTE: HP is broadcast before the outcome, so the HUD already shows 0 when GAME_OVER arrives.
        this.emitChanges(this._world);
        this.handleOutcome(outcome, this._world);
    }

    // ---- Public API ----

    /** The battle simulation; null only before onLoad has run. */
    get world(): BattleWorld | null {
        return this._world;
    }

    /**
     * Latest player input. Movement axes are written by KeyboardInput and VirtualJoystick;
     * the dash request goes through requestDash() so it can be gated by the state.
     */
    get input(): InputState {
        return this._input;
    }

    /** Current state, read-only for other classes. */
    get state(): GameState {
        return this._state;
    }

    /** Starts a new round without reloading the scene. Used by the start screen and the Restart button. */
    startGame(): void {
        if (!this._world) {
            return;
        }
        this.prepareRound();
        this.setState(GameState.Playing);
    }

    /**
     * Asks the player to dash on the next simulation step (keyboard or on-screen button).
     * Ignored outside Playing, so a press on the result screen does not dash at the start of the next round.
     */
    requestDash(): void {
        if (this._state !== GameState.Playing) {
            return;
        }
        this._input.isDashRequested = true;
    }

    // ---- Private ----

    /**
     * Resets the world and the HUD, and leaves the game in Ready (nothing moves until Playing).
     * NOTE: passing through Ready lets every view clear the previous round (panel, camera snap).
     */
    private prepareRound(): void {
        if (!this._world) {
            return;
        }
        this.setState(GameState.Ready);
        this._world.reset();
        this._input.isDashRequested = false;
        this.emitInitialValues(this._world);
    }

    /**
     * Advances the world by one real frame, split into steps no longer than MAX_DT, so a slow frame
     * stays real-time (no slow motion below 20 fps) and fast bullets still cannot skip a target.
     * @returns The outcome of the last step; stepping stops as soon as the round is decided.
     */
    private simulateFrame(dt: number, world: BattleWorld): BattleOutcome {
        // NOTE: frames longer than MAX_FRAME_TIME (tab switch, debugger) are cut, not fast-forwarded.
        let remaining = Math.min(dt, GameConfig.FRAME.MAX_FRAME_TIME);
        let outcome = BattleOutcome.None;
        while (remaining > 0 && outcome === BattleOutcome.None) {
            const step = Math.min(remaining, GameConfig.FRAME.MAX_DT);
            outcome = world.step(step, this._input);
            remaining -= step;
        }
        return outcome;
    }

    /** Broadcasts the start values so the HUD never shows numbers from the previous round. */
    private emitInitialValues(world: BattleWorld): void {
        const playerHealth = world.player.health;
        const bossHealth = world.boss.health;
        this.lastPlayerHp = playerHealth.current;
        this.lastBossHp = bossHealth.current;
        this.lastBossPhase = world.boss.phase;
        EventBus.emit(GameEvents.PLAYER_HP_CHANGED, playerHealth.current, playerHealth.max);
        EventBus.emit(GameEvents.BOSS_HP_CHANGED, bossHealth.current, bossHealth.max);
        EventBus.emit(GameEvents.BOSS_PHASE_CHANGED, this.lastBossPhase);
    }

    /** Emits HP / phase / hit events for what changed during this frame. */
    private emitChanges(world: BattleWorld): void {
        // PERF: compare with the last broadcast value, so the HUD is not updated every frame.
        this.lastPlayerHp = this.emitHealthChange(
            world.player.health, this.lastPlayerHp, GameEvents.PLAYER_HP_CHANGED, GameEvents.PLAYER_HIT);
        this.lastBossHp = this.emitHealthChange(
            world.boss.health, this.lastBossHp, GameEvents.BOSS_HP_CHANGED, GameEvents.BOSS_HIT);
        if (world.boss.phase !== this.lastBossPhase) {
            this.lastBossPhase = world.boss.phase;
            EventBus.emit(GameEvents.BOSS_PHASE_CHANGED, this.lastBossPhase);
        }
    }

    /**
     * Emits the HP event (and the hit event when HP dropped) if the value changed.
     * @returns The HP value to remember as "last broadcast".
     */
    private emitHealthChange(health: Health, lastHp: number, hpEvent: string, hitEvent: string): number {
        const hp = health.current;
        if (hp === lastHp) {
            return lastHp;
        }
        if (hp < lastHp) {
            EventBus.emit(hitEvent);
        }
        EventBus.emit(hpEvent, hp, health.max);
        return hp;
    }

    private handleOutcome(outcome: BattleOutcome, world: BattleWorld): void {
        switch (outcome) {
            case BattleOutcome.BossDefeated:
                // Requirement: when the boss dies every bullet on the map disappears instantly.
                world.clearAllBullets();
                this.endGame(true);
                break;
            case BattleOutcome.PlayerDefeated:
                this.endGame(false);
                break;
            default:
                break;
        }
    }

    /** Stops the simulation (update() only runs while Playing) and shows the result. */
    private endGame(isVictory: boolean): void {
        this.setState(GameState.GameOver);
        EventBus.emit(GameEvents.GAME_OVER, isVictory);
    }

    /**
     * Single place where the state changes, so every transition is easy to trace.
     * NOTE: no "same state" early return: the first round starts while the state is already
     * Ready, and views still need that Ready broadcast to reset themselves.
     */
    private setState(next: GameState): void {
        this._state = next;
        EventBus.emit(GameEvents.STATE_CHANGED, next);
    }
}
