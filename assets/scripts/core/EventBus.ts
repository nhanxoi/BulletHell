/**
 * EventBus.ts
 * Global publish/subscribe channel for systems that have no parent-child relationship
 * (for example: game logic -> HUD, gameplay -> audio).
 *
 * Rules:
 * - Use event names from GameEvents only, never raw strings.
 * - Always pass `this` as the target so a component can remove all its listeners
 *   with EventBus.targetOff(this).
 */
import { EventTarget } from 'cc';

/** Shared event channel for the whole game. */
export const EventBus = new EventTarget();
