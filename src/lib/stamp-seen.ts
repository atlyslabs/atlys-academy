/**
 * Which stamps this browser tab has already SEEN earned - the memory behind
 * the landing animation.
 *
 * A stamp is earned in one window (a drill, the checklist) while the passport
 * sheet is unmounted, so "animate when the prop flips" would play to nobody.
 * Instead the sheet asks, on mount, which of its earned stamps this session
 * has not yet laid eyes on - those slam in; the rest sit as printed ink.
 *
 * sessionStorage on purpose: this is presentation state, not progress. A new
 * tab or a fresh visit starts over with calm pages (the first look at a sheet
 * baselines it silently), and nothing here can disagree with real progress
 * because it stores only "shown already", never "earned".
 */

const KEY = "atlys-onboarding.stamps-seen.v1";

interface SeenLedger {
  /** Sheets that have had their first look this session (by dayId). */
  baselined: number[];
  /** Stamp ids whose earned state has been shown. */
  seen: string[];
}

function readLedger(): SeenLedger {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray((parsed as SeenLedger).baselined) &&
        Array.isArray((parsed as SeenLedger).seen)
      ) {
        return parsed as SeenLedger;
      }
    }
  } catch {
    /* quota, privacy mode, corrupt JSON - fall through to a fresh ledger */
  }
  return { baselined: [], seen: [] };
}

function writeLedger(ledger: SeenLedger): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(ledger));
  } catch {
    /* storage refused: every mount re-baselines, so nothing ever replays */
  }
}

/**
 * Earned stamps on a sheet that this session has never shown - a PURE read,
 * safe to call during render (a component wants its slam classes present from
 * the very first paint, before any effect has run).
 *
 * A day with no baseline yet reports nothing: the first look at a sheet is
 * history, not news. `takeUnseenEarned` is the write half; the two must agree.
 */
export function peekUnseenEarned(
  dayId: number,
  earnedIds: readonly string[],
): string[] {
  if (typeof window === "undefined") return [];
  const ledger = readLedger();
  if (!ledger.baselined.includes(dayId)) return [];
  return earnedIds.filter((id) => !ledger.seen.includes(id));
}

/**
 * Record that a sheet's earned stamps have now been shown (the write half of
 * `peekUnseenEarned`, called from an effect after paint). Returns what was
 * newly recorded; idempotent, so a StrictMode double-effect records once.
 *
 * The first call for a day records everything and reports nothing: a page
 * opened mid-journey, or after a reload, reads as already-printed history
 * rather than a volley of slams.
 */
export function takeUnseenEarned(
  dayId: number,
  earnedIds: readonly string[],
): string[] {
  if (typeof window === "undefined") return [];
  const ledger = readLedger();

  if (!ledger.baselined.includes(dayId)) {
    writeLedger({
      baselined: [...ledger.baselined, dayId],
      seen: [...new Set([...ledger.seen, ...earnedIds])],
    });
    return [];
  }

  const fresh = earnedIds.filter((id) => !ledger.seen.includes(id));
  if (fresh.length > 0) {
    writeLedger({ ...ledger, seen: [...ledger.seen, ...fresh] });
  }
  return fresh;
}
