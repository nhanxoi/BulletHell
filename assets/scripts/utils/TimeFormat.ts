/**
 * TimeFormat.ts
 * Formats a duration for display ("m:ss", or "m:ss.t" with tenths). Shared by the HUD round timer
 * (whole seconds) and the Game Over panel (tenths), so both always show the same minutes and seconds
 * for the same time. Pure function, no engine import.
 */

const SECONDS_PER_MINUTE = 60;
const TENTHS_PER_SECOND = 10;
/** Seconds below this need a leading zero to keep two digits ("1:05", not "1:5"). */
const TWO_DIGIT_MIN = 10;

/**
 * Formats seconds as "m:ss" or "m:ss.t", rounded DOWN (never up) so it matches a ticking timer: the
 * HUD never shows a second the round has not reached yet.
 * NOTE: negative, NaN or infinite input (should not happen) shows "0:00" instead of garbage text.
 * @param seconds    Duration in seconds.
 * @param showTenths true adds one decimal, so two results that differ by 0.1 s or more never look equal.
 * @returns For example 83.76 -> "1:23", or "1:23.7" with showTenths.
 */
export function formatTime(seconds: number, showTenths = false): string {
    const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const totalSeconds = Math.floor(safeSeconds);
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const remainder = totalSeconds % SECONDS_PER_MINUTE;
    const padding = remainder < TWO_DIGIT_MIN ? '0' : '';
    const wholeText = `${minutes}:${padding}${remainder}`;
    if (!showTenths) {
        return wholeText;
    }
    // NOTE: computed from the same floored total, so the tenths digit can never roll the seconds over.
    const tenths = Math.floor((safeSeconds - totalSeconds) * TENTHS_PER_SECOND);
    return `${wholeText}.${tenths}`;
}
