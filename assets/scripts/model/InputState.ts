/**
 * InputState.ts
 * Latest player input, written by input components (KeyboardInput, VirtualJoystick) when events
 * arrive and read once per frame by PlayerModel. Keeping it a plain object decouples the
 * simulation from Cocos input APIs, so the model stays testable without the engine.
 */

/** Movement intent from keyboard and joystick (each axis in [-1, 1]) plus a one-shot dash request. */
export class InputState {
    /** Keyboard axis, -1 (left/down), 0 or 1 (right/up). */
    keyX = 0;
    keyY = 0;
    /** Joystick axis, any value in [-1, 1]; 0 when the stick is released. */
    stickX = 0;
    stickY = 0;
    /**
     * Set by an input component when a dash key or button is pressed; PlayerModel.step resets it.
     * NOTE: a one-shot flag, not a held state. A press during the dash cooldown is consumed and
     * dropped (not buffered), so a dash never fires late, long after the player pressed.
     */
    isDashRequested = false;
}
