/**
 * GameState.ts
 * High-level states of one play session. GameManager is the only class allowed to change it.
 * Ready = round prepared, waiting (start screen at launch); Playing = simulation running;
 * Paused = round frozen behind the pause menu (only reachable from Playing).
 * Restart goes GameOver/Paused -> Ready -> Playing so every view can reset itself on Ready.
 */
export enum GameState {
    Ready,
    Playing,
    GameOver,
    Paused,
}
