/**
 * ViewEvents.ts
 * Names of the engine's own `view` events used by the game, kept in one place like GameEvents.
 */
export const ViewEvents = {
    /** Emitted by `view` after the game canvas is resized (window resize, device rotation). */
    CANVAS_RESIZE: 'canvas-resize',
} as const;
