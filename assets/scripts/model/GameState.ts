/**
 * GameState.ts
 * High-level states of one play session. GameManager is the only class allowed to change it.
 * Restart goes GameOver -> Ready -> Playing so every view can reset itself on Ready.
 */
export enum GameState {
    Ready,
    Playing,
    GameOver,
}
