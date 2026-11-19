/**
 * GameManager.ts
 * Entry point of a play session: owns the simulation (BattleWorld) and the player input
 * (InputState), runs the only gameplay update of the game and drives the state machine.
 * Changes are broadcast through EventBus by BattleBroadcaster, so HUD, popups, effects and audio never poll the model.
 * Also times the round, keeps the best clear time (persisted through SaveStore) and is the only
 * place that pauses and resumes the engine (director), so the state machine and the director agree.
 *
 * Attach to node GameRoot in Main.scene. Views read `world` in lateUpdate; input components
 * write `input` when input events arrive.
 */
import { _decorator, Component, director } from 'cc';
import { GameConfig } from '../config/GameConfig';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/GameEvents';
import { SaveStore } from '../core/SaveStore';
import { BattleBroadcaster } from './BattleBroadcaster';
import { BattleOutcome } from '../model/BattleOutcome';
import { BattleWorld } from '../model/BattleWorld';
import { GameState } from '../model/GameState';
import { InputState } from '../model/InputState';
import { RoundTimer } from '../model/RoundTimer';
const { ccclass } = _decorator;

/** Owns the battle simulation and the session state machine; the only writer of GameState. */
@ccclass('GameManager')
export class GameManager extends Component {
    private _world: BattleWorld | null = null;
    // NOTE: a plain data object with no side effects, so it is safe to create it with the component;
    // input components can then write to it without a null check.
    private readonly _input = new InputState();
    /** Plain data like _input: round clock and best clear time. */
    private readonly roundTimer = new RoundTimer();
    /** Turns world changes into EventBus events, once per frame. */
    private readonly broadcaster = new BattleBroadcaster();
    private _state = GameState.Ready;

    // ---- Lifecycle ----

    protected onLoad(): void {
        // NOTE: created here, not in a field initializer, because the editor also constructs
        // components when it opens the scene and does not need a running simulation.
        this._world = new BattleWorld();
        // NOTE: read once per session; SaveStore never throws and returns 0 (no record) on any failure.
        this.roundTimer.setBestClearTime(SaveStore.load().bestClearTime);
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

    protected onDestroy(): void {
        // CLEANUP: pairs with director.pause() in pause(); leaving the scene while paused must not
        // leave the engine paused for whatever is loaded next.
        this.resumeDirectorIfPaused();
    }

    protected update(dt: number): void {
        if (this._state !== GameState.Playing || !this._world) {
            return;
        }
        const outcome = this.simulateFrame(dt, this._world);
        // NOTE: HP is broadcast before the outcome, so the HUD already shows 0 when GAME_OVER arrives.
        this.broadcaster.emitFrameChanges(this._world);
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

    /** Seconds of simulated Playing time in the current round (frozen on the result screen). */
    get roundTime(): number {
        return this.roundTimer.roundTime;
    }

    /** Shortest victory time ever, seconds; 0 when the boss was never defeated. */
    get bestClearTime(): number {
        return this.roundTimer.bestClearTime;
    }

    /** True only when the last round was a victory that beat the previous record. */
    get isNewBestTime(): boolean {
        return this.roundTimer.isNewBestTime;
    }

    /** Starts a new round without reloading the scene. Used by the start screen and both Restart buttons. */
    startGame(): void {
        if (!this._world) {
            return;
        }
        this.resumeDirectorIfPaused();
        this.prepareRound();
        this.setState(GameState.Playing);
    }

    /**
     * Freezes the round behind the pause menu. Ignored outside Playing.
     * NOTE: director.pause() stops update, schedules, tweens and widgets, but input, rendering and
     * audio keep running, so the pause menu stays clickable (it must not open with a tween).
     */
    pause(): void {
        if (this._state !== GameState.Playing) {
            return;
        }
        this.setState(GameState.Paused);
        director.pause();
    }

    /** Continues the paused round. Ignored outside Paused. */
    resume(): void {
        if (this._state !== GameState.Paused) {
            return;
        }
        // NOTE: the director runs again before Playing is broadcast, so listeners see a live engine.
        director.resume();
        this.setState(GameState.Playing);
    }

    /**
     * Abandons the paused round and prepares a fresh one that waits in Ready (the start screen shows it).
     * Ignored outside Paused.
     */
    returnToTitle(): void {
        if (this._state !== GameState.Paused) {
            return;
        }
        this.resumeDirectorIfPaused();
        this.prepareRound();
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
        this.roundTimer.startRound();
        this._input.isDashRequested = false;
        this.broadcaster.emitRoundStart(this._world);
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
            // NOTE: simulated time, not wall time: a cut long frame is not counted, so the clear time
            // matches what was actually played.
            this.roundTimer.advance(step);
            remaining -= step;
        }
        return outcome;
    }

    private handleOutcome(outcome: BattleOutcome, world: BattleWorld): void {
        switch (outcome) {
            case BattleOutcome.BossDefeated:
                // Requirement: when the boss dies every bullet on the map disappears instantly.
                world.clearAllBullets();
                this.saveIfBestTime();
                this.endGame(true);
                break;
            case BattleOutcome.PlayerDefeated:
                this.endGame(false);
                break;
            default:
                break;
        }
    }

    /**
     * Records the victory time and persists it when it beats the record.
     * NOTE: called before GAME_OVER is emitted, so the result panel already reads the new values.
     */
    private saveIfBestTime(): void {
        if (this.roundTimer.recordVictory()) {
            SaveStore.save({ bestClearTime: this.roundTimer.bestClearTime });
        }
    }

    /** Stops the simulation (update() only runs while Playing) and shows the result. */
    private endGame(isVictory: boolean): void {
        this.setState(GameState.GameOver);
        EventBus.emit(GameEvents.GAME_OVER, isVictory);
    }

    /** Restarting or leaving from the pause menu must not keep the engine frozen. */
    private resumeDirectorIfPaused(): void {
        if (this._state === GameState.Paused) {
            director.resume();
        }
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
