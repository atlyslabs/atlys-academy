/**
 * Local-calendar-day helpers for the "come back tomorrow" gate.
 *
 * Days are compared in the joinee's local timezone, not UTC - someone who
 * finishes Day 1 at 11pm in Mumbai should get Day 2 the next morning their
 * time, not when UTC rolls over.
 *
 * The gate does not open at midnight. A day unseals at **10:30 the next
 * morning**, so the journey keeps a working-day rhythm: finish Day N today,
 * Day N+1 is on the desk when you sit down tomorrow - not at 00:01 for
 * whoever is still awake.
 */

/** The local wall-clock time a new day unseals. */
export const UNLOCK_HOUR = 10;
export const UNLOCK_MINUTE = 30;

/** `YYYY-MM-DD` in the *local* timezone. */
export function toLocalDateKey(iso: string): string {
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The date key the day gate compares against: the gate's calendar rolls over
 * at 10:30 local rather than midnight. Before 10:30 this still returns
 * *yesterday's* key, so "passed on an earlier day than the gate day" becomes
 * true at exactly 10:30 the morning after the pass.
 */
export function gateDayKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime());
  shifted.setMinutes(shifted.getMinutes() - (UNLOCK_HOUR * 60 + UNLOCK_MINUTE));
  return toLocalDateKey(shifted.toISOString());
}

/**
 * The instant the seal after `dateKey` (`YYYY-MM-DD`, local) breaks:
 * 10:30 local on the following morning.
 */
export function unlockInstantAfter(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day + 1, UNLOCK_HOUR, UNLOCK_MINUTE, 0, 0);
}
