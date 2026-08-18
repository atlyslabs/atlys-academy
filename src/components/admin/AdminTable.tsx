"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { DAYS } from "@/content/onboarding/days";
import {
  ODPAC_STAGES,
  odpacExerciseKey,
  parseOdpacBody,
} from "@/content/onboarding/odpac";
import type { DayId } from "@/content/onboarding/types";
// Type-only import: erased at compile time, so none of the server-only store
// module lands in the client bundle.
import type { AdminJoineeRow } from "@/server/onboarding/store";
import {
  ProgressRadar,
  radarMean,
  type RadarAxis,
} from "@/components/onboarding/ProgressRadar";
import { cn } from "@/lib/utils";

/** However many days the journey is, every per-day readout below mirrors it. */
const TOTAL_DAYS = DAYS.length;
const DAY_IDS: readonly DayId[] = DAYS.map((day) => day.id);

/** `quizBest` and `quizPassed` are keyed by quiz slug: `day1` … `day5`. */
function slugForDay(dayId: DayId): string {
  return `day${dayId}`;
}

/**
 * One joinee's best quiz mark on one day, as a fraction.
 *
 * A missing or malformed entry reads as 0 **and still counts in the cohort
 * denominator**: never sitting the quiz demonstrates nothing, so dropping those
 * rows would let an untouched day plot as strong as a mastered one - exactly the
 * blind spot the panel exists to expose.
 */
function scoreFraction(best: string | undefined): number {
  if (!best) return 0;
  const [score, max] = best.split("/").map(Number);
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return 0;
  // The denominator is the stored max, not the quiz's current length: the row's
  // own marks print this same fraction, and the panel must agree with the ink
  // beside it. Clamping covers a mark carried over from a longer paper.
  return Math.min(score / max, 1);
}

/** Mean best quiz mark per day across the rows shown, one axis per day. */
function cohortAxes(rows: AdminJoineeRow[]): RadarAxis[] {
  return DAYS.map((day) => {
    const total = rows.reduce(
      (sum, row) => sum + scoreFraction(row.quizBest[slugForDay(day.id)]),
      0,
    );
    return {
      // The vertex says which day to go and fix, not which airport it stages in.
      label: `Day ${day.id}`,
      title: day.title,
      value: rows.length > 0 ? total / rows.length : 0,
    };
  });
}

/**
 * Dates are formatted in UTC so the server render and the client hydration
 * agree even when they sit in different timezones.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const LONG_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string | null, long = false): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return (long ? LONG_DATE_FORMAT : DATE_FORMAT).format(date);
}

/* ---------------------------------------------------------------------------
 * Row facts, derived once and shared by the filters, the columns and the
 * expanded panel - so a row can never be filtered on one reading of "done" and
 * printed with another.
 * ------------------------------------------------------------------------- */

interface RowFacts {
  row: AdminJoineeRow;
  name: string;
  /** Quizzes passed at the mark, and quizzes sat at all. */
  passed: number;
  sat: number;
  stampsComplete: boolean;
  /** Days whose ODPAC report has been filed. */
  odpacFiled: DayId[];
  /** Whole days since the last recorded action, or null if there has been none. */
  idleDays: number | null;
}

const DAY_MS = 86_400_000;
/** Idleness prints in whole days, so an hourly bucket is as fine as it needs. */
const CLOCK_BUCKET_MS = 3_600_000;

/** The clock never changes on its own here; nothing on this desk ticks. */
function subscribeToClock(): () => void {
  return () => {};
}

/**
 * Wall clock as a coarse bucket, read through `useSyncExternalStore` rather
 * than during render: the server snapshot is 0, so SSR and the first client
 * paint agree, and idleness only appears once there is a browser to ask.
 */
function useCoarseClock(): number | null {
  const bucket = useSyncExternalStore(
    subscribeToClock,
    () => Math.floor(Date.now() / CLOCK_BUCKET_MS),
    () => 0,
  );
  return bucket === 0 ? null : bucket * CLOCK_BUCKET_MS;
}

function factsFor(row: AdminJoineeRow, now: number | null): RowFacts {
  const passed = DAY_IDS.filter(
    (dayId) => row.quizPassed[slugForDay(dayId)],
  ).length;
  const sat = DAY_IDS.filter((dayId) => row.quizBest[slugForDay(dayId)]).length;
  const filedKeys = new Set(row.exercises.map((exercise) => exercise.key));
  const last = row.lastActivityAt ? Date.parse(row.lastActivityAt) : NaN;

  return {
    row,
    name: row.name || row.email.split("@")[0],
    passed,
    sat,
    stampsComplete:
      row.stamps.total > 0 && row.stamps.earned >= row.stamps.total,
    odpacFiled: DAY_IDS.filter((dayId) =>
      filedKeys.has(odpacExerciseKey(dayId)),
    ),
    idleDays:
      now !== null && Number.isFinite(last)
        ? Math.max(0, Math.floor((now - last) / DAY_MS))
        : null,
  };
}

/* ---------------------------------------------------------------------------
 * Filters. One control per column, because each column answers a different
 * question a manager actually asks: who is this, are they moving, are they
 * passing, are they collecting, are they writing, are they still here.
 * ------------------------------------------------------------------------- */

type DaysFilter = "any" | "finished" | "moving" | "none";
type QuizFilter = "any" | "all-passed" | "below" | "none";
type StampFilter = "any" | "complete" | "moving" | "none";
type OdpacFilter = "any" | "all" | "missing" | "none";
type ActiveFilter = "any" | "recent" | "dormant" | "never";

interface Filters {
  cohort: string;
  query: string;
  days: DaysFilter;
  quiz: QuizFilter;
  stamps: StampFilter;
  odpac: OdpacFilter;
  active: ActiveFilter;
}

const NO_FILTERS: Filters = {
  cohort: "all",
  query: "",
  days: "any",
  quiz: "any",
  stamps: "any",
  odpac: "any",
  active: "any",
};

/** Dormant is measured in whole days idle, which is how a manager thinks. */
const DORMANT_AFTER_DAYS = 7;

function matches(facts: RowFacts, filters: Filters): boolean {
  const { row } = facts;

  if (filters.cohort !== "all" && row.cohortDate !== filters.cohort) {
    return false;
  }

  const query = filters.query.trim().toLowerCase();
  if (
    query &&
    !facts.name.toLowerCase().includes(query) &&
    !row.email.toLowerCase().includes(query)
  ) {
    return false;
  }

  if (filters.days === "finished" && row.daysCompleted < TOTAL_DAYS) {
    return false;
  }
  if (
    filters.days === "moving" &&
    (row.daysCompleted === 0 || row.daysCompleted >= TOTAL_DAYS)
  ) {
    return false;
  }
  if (filters.days === "none" && row.daysCompleted > 0) return false;

  if (filters.quiz === "all-passed" && facts.passed < TOTAL_DAYS) return false;
  // Sat something and did not clear it: the papers worth a second look.
  if (
    filters.quiz === "below" &&
    (facts.sat === 0 || facts.sat === facts.passed)
  ) {
    return false;
  }
  if (filters.quiz === "none" && facts.sat > 0) return false;

  if (filters.stamps === "complete" && !facts.stampsComplete) return false;
  if (
    filters.stamps === "moving" &&
    (row.stamps.earned === 0 || facts.stampsComplete)
  ) {
    return false;
  }
  if (filters.stamps === "none" && row.stamps.earned > 0) return false;

  if (filters.odpac === "all" && facts.odpacFiled.length < TOTAL_DAYS) {
    return false;
  }
  if (filters.odpac === "missing" && facts.odpacFiled.length >= TOTAL_DAYS) {
    return false;
  }
  if (filters.odpac === "none" && facts.odpacFiled.length > 0) return false;

  if (filters.active === "never" && facts.idleDays !== null) return false;
  if (
    filters.active === "recent" &&
    (facts.idleDays === null || facts.idleDays > DORMANT_AFTER_DAYS)
  ) {
    return false;
  }
  if (
    filters.active === "dormant" &&
    (facts.idleDays === null || facts.idleDays <= DORMANT_AFTER_DAYS)
  ) {
    return false;
  }

  return true;
}

/**
 * The admin overview - presentation only. All authorisation and data fetching
 * happen in the server page; this component just renders rows.
 *
 * Three readings, in the order a manager needs them: the shape of whoever is on
 * screen, the filters that decide who that is, then the joinees themselves
 * grouped under the morning they started - so a fortnight of staggered joiners
 * reads as three cohorts rather than one confusing list.
 */
export function AdminTable({ rows }: { rows: AdminJoineeRow[] }) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  // Keyed by email, and held here rather than per cohort so a row stays open
  // while the filters move it between bands.
  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(new Set());

  function toggle(email: string) {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  // Idleness is the one derived fact that needs a clock. It only drives the
  // last-active filters and the "14d idle" note beside a date the server
  // already sent, so a null clock before hydration costs nothing.
  const now = useCoarseClock();
  const facts = useMemo(
    () => rows.map((row) => factsFor(row, now)),
    [rows, now],
  );

  const cohorts = useMemo(
    () =>
      [...new Set(rows.map((row) => row.cohortDate))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [rows],
  );

  const shown = useMemo(
    () => facts.filter((fact) => matches(fact, filters)),
    [facts, filters],
  );

  /** Newest cohort first, and inside a cohort the fullest passport first. */
  const groups = useMemo(() => {
    const byDate = new Map<string, RowFacts[]>();
    for (const fact of shown) {
      const list = byDate.get(fact.row.cohortDate) ?? [];
      list.push(fact);
      byDate.set(fact.row.cohortDate, list);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([cohortDate, members]) => ({
        cohortDate,
        members: members.sort(
          (a, b) =>
            b.row.stamps.earned - a.row.stamps.earned ||
            a.name.localeCompare(b.name),
        ),
      }));
  }, [shown]);

  const axes = useMemo(
    () => cohortAxes(shown.map((fact) => fact.row)),
    [shown],
  );

  if (rows.length === 0) {
    return (
      <div className="desk-card px-7 py-12 text-center sm:px-12 sm:py-16">
        <FrameBeam />
        <p className="font-display text-[26px] italic leading-snug text-ink">
          Nobody has signed in yet.
        </p>
        <p className="mx-auto mt-3 max-w-[46ch] text-[14px] leading-relaxed text-ink-muted">
          The first row appears the moment a joinee signs in with their Atlys
          account. Until then there is nothing to watch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CohortPanel
        axes={axes}
        joinees={shown.length}
        filtered={shown.length !== rows.length}
      />

      <FilterBar
        filters={filters}
        cohorts={cohorts}
        onChange={setFilters}
        shown={shown.length}
        total={rows.length}
      />

      {groups.length === 0 ? (
        <div className="desk-card px-7 py-12 text-center sm:py-14">
          <FrameBeam />
          <p className="font-display text-[24px] italic leading-snug text-ink">
            No joinee matches these filters.
          </p>
          <button
            type="button"
            onClick={() => setFilters(NO_FILTERS)}
            className="mt-4 text-[13.5px] text-ink underline decoration-hairline-lit underline-offset-4 transition-colors hover:decoration-ink-dim"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <section className="desk-card">
          <FrameBeam />

          <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 pb-5 pt-6 sm:px-8 sm:pt-7">
            <h2 className="font-display text-[26px] italic leading-none text-ink">
              Joinees
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim tabular-nums">
              Grouped by cohort, fullest passport first
            </p>
          </header>

          {/* One table for every cohort rather than one per band: separate
              tables size their columns independently, so the same column
              landed at a different x in each cohort and nothing could be
              scanned down the page. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left">
              <caption className="sr-only">
                Every joinee shown, grouped by the day their cohort started,
                newest cohort first, and inside each cohort the fullest
                passport first.
              </caption>
              <thead>
                <tr className="border-y border-hairline bg-white/[0.015]">
                  <th scope="col" className="w-10 py-2.5 pl-5 sm:pl-8">
                    <span className="sr-only">
                      ODPAC reports and written answers
                    </span>
                  </th>
                  <HeaderCell>Joinee</HeaderCell>
                  <HeaderCell>Days cleared</HeaderCell>
                  <HeaderCell>Quiz marks</HeaderCell>
                  <HeaderCell>Activities</HeaderCell>
                  <HeaderCell>ODPAC reports</HeaderCell>
                  <HeaderCell>Last active</HeaderCell>
                </tr>
              </thead>

              {groups.map((group) => (
                <CohortBody
                  key={group.cohortDate}
                  cohortDate={group.cohortDate}
                  members={group.members}
                  openRows={openRows}
                  onToggle={toggle}
                />
              ))}
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * The shape of whoever is on screen, in three readings across the plate: the
 * headline mean, then every day named with its own number, then the plot. The
 * list is the accessible reading and the plot is decoration on top of it, which
 * is why the plot carries no table of its own here.
 *
 * The shortest day is marked, but only when there is a spread to mark - a group
 * sitting flat at nothing has no weakest day, it has no marks.
 */
function CohortPanel({
  axes,
  joinees,
  filtered,
}: {
  axes: RadarAxis[];
  joinees: number;
  filtered: boolean;
}) {
  const mean = radarMean(axes);
  const values = axes.map((axis) => axis.value);
  const lowest = Math.min(...values);
  const spread = Math.max(...values) > lowest;

  return (
    <section className="desk-card px-5 py-6 sm:px-8 sm:py-8">
      <FrameBeam />

      <div className="grid items-start gap-8 md:grid-cols-2 md:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_264px] xl:items-center xl:gap-14">
        <div className="min-w-0">
          <h2 className="font-display text-[26px] italic leading-none text-ink">
            Cohort shape
          </h2>
          <p className="mt-3 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-muted">
            Every joinee&apos;s best quiz mark per day, averaged across the{" "}
            {filtered ? "joinees shown" : "whole cohort"}. A short spoke is a day
            the material has not landed on yet.
          </p>

          <p className="mt-7 flex items-baseline gap-3">
            <span className="font-condensed text-[56px] leading-none text-ink tabular-nums">
              {mean}%
            </span>
            <span className="font-mono text-[10px] uppercase leading-tight tracking-[0.16em] text-ink-dim">
              mean quiz mark
              <br />
              {joinees} {joinees === 1 ? "joinee" : "joinees"}
            </span>
          </p>
        </div>

        {/* Third at wide sizes, full width under the pair at medium: the day
            list is the reading, so it never gets squeezed into a gutter. */}
        <ol className="min-w-0 md:order-last md:col-span-2 xl:order-none xl:col-span-1">
          {axes.map((axis) => (
            <li
              key={axis.label}
              className="flex items-baseline gap-4 border-t border-hairline/70 py-2.5 first:border-t-0 first:pt-0"
            >
              <span className="w-[46px] shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
                {axis.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-muted">
                {axis.title}
              </span>
              {spread && axis.value === lowest && (
                <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-brand-text">
                  shortest
                </span>
              )}
              <span
                className={cn(
                  "w-11 shrink-0 text-right font-mono text-[14px] tabular-nums",
                  axis.value === 0 ? "text-ink-dim/70" : "text-ink",
                )}
              >
                {Math.round(axis.value * 100)}%
              </span>
            </li>
          ))}
        </ol>

        <ProgressRadar
          axes={axes}
          withTable={false}
          size={264}
          className="mx-auto md:w-[264px] xl:shrink-0"
        />
      </div>
    </section>
  );
}

/** One control per column. Labels sit above their control, never inside it. */
function FilterBar({
  filters,
  cohorts,
  onChange,
  shown,
  total,
}: {
  filters: Filters;
  cohorts: string[];
  onChange: (next: Filters) => void;
  shown: number;
  total: number;
}) {
  const dirty = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <section aria-label="Filters" className="desk-card px-5 py-5 sm:px-8 sm:py-6">
      <FrameBeam />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Field label="Cohort start">
          <Select
            value={filters.cohort}
            onChange={(value) => set("cohort", value)}
            options={[
              {
                value: "all",
                label: `All ${cohorts.length} ${
                  cohorts.length === 1 ? "cohort" : "cohorts"
                }`,
              },
              ...cohorts.map((date) => ({
                value: date,
                label: formatDate(date),
              })),
            ]}
          />
        </Field>

        <Field label="Joinee">
          <input
            type="search"
            value={filters.query}
            onChange={(event) => set("query", event.target.value)}
            placeholder="Name or email"
            className="h-9 w-full rounded-lg border border-hairline bg-raised px-2.5 text-[13px] text-ink transition-colors placeholder:text-ink-dim hover:border-hairline-lit focus:border-brand-text focus:outline-none"
          />
        </Field>

        <Field label="Days cleared">
          <Select
            value={filters.days}
            onChange={(value) => set("days", value as DaysFilter)}
            options={[
              { value: "any", label: "Any progress" },
              { value: "finished", label: `All ${TOTAL_DAYS} cleared` },
              { value: "moving", label: "Part way" },
              { value: "none", label: "Not started" },
            ]}
          />
        </Field>

        <Field label="Quiz marks">
          <Select
            value={filters.quiz}
            onChange={(value) => set("quiz", value as QuizFilter)}
            options={[
              { value: "any", label: "Any marks" },
              { value: "all-passed", label: "Every quiz passed" },
              { value: "below", label: "Below the mark" },
              { value: "none", label: "No quiz sat" },
            ]}
          />
        </Field>

        <Field label="Activities">
          <Select
            value={filters.stamps}
            onChange={(value) => set("stamps", value as StampFilter)}
            options={[
              { value: "any", label: "Any stamps" },
              { value: "complete", label: "Every stamp" },
              { value: "moving", label: "Collecting" },
              { value: "none", label: "None collected" },
            ]}
          />
        </Field>

        <Field label="ODPAC reports">
          <Select
            value={filters.odpac}
            onChange={(value) => set("odpac", value as OdpacFilter)}
            options={[
              { value: "any", label: "Any reports" },
              { value: "all", label: `All ${TOTAL_DAYS} filed` },
              { value: "missing", label: "Missing a report" },
              { value: "none", label: "None filed" },
            ]}
          />
        </Field>

        <Field label="Last active">
          <Select
            value={filters.active}
            onChange={(value) => set("active", value as ActiveFilter)}
            options={[
              { value: "any", label: "Any time" },
              { value: "recent", label: `Within ${DORMANT_AFTER_DAYS} days` },
              { value: "dormant", label: `Idle ${DORMANT_AFTER_DAYS} days+` },
              { value: "never", label: "Never active" },
            ]}
          />
        </Field>
      </div>

      <p
        aria-live="polite"
        className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim tabular-nums"
      >
        Showing {shown} of {total} {total === 1 ? "joinee" : "joinees"}
        {dirty && (
          <button
            type="button"
            onClick={() => onChange(NO_FILTERS)}
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-text underline decoration-brand-text/40 underline-offset-4 transition-colors hover:decoration-brand-text"
          >
            Clear filters
          </button>
        )}
      </p>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      // bg-raised rather than a translucent plate: the native option list
      // inherits this colour, and a transparent one renders white on Windows.
      className="h-9 w-full appearance-none rounded-lg border border-hairline bg-raised bg-[length:9px] bg-[right_0.7rem_center] bg-no-repeat pl-2.5 pr-7 text-[13px] text-ink transition-colors hover:border-hairline-lit focus:border-brand-text focus:outline-none"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23999999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * One cohort as its own `<tbody>`: a banded row naming the morning they all
 * started, then their rows. Multiple bodies in one table is what keeps the
 * columns aligned down the whole page while still separating the cohorts.
 */
function CohortBody({
  cohortDate,
  members,
  openRows,
  onToggle,
}: {
  cohortDate: string;
  members: RowFacts[];
  openRows: ReadonlySet<string>;
  onToggle: (email: string) => void;
}) {
  const baseId = useId();

  return (
    <tbody className="border-b border-hairline last:border-b-0">
      <tr>
        <th
          scope="colgroup"
          colSpan={7}
          className="border-b border-hairline/70 bg-white/[0.03] px-5 py-3 text-left sm:px-8"
        >
          <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-[18px] font-normal italic leading-none text-ink">
              Started {formatDate(cohortDate, true)}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim tabular-nums">
              {members.length} {members.length === 1 ? "joinee" : "joinees"}
            </span>
          </span>
        </th>
      </tr>

      {members.map((facts, index) => {
        const { row } = facts;
        const isOpen = openRows.has(row.email);
        const detailId = `${baseId}-detail-${index}`;
        const last = index === members.length - 1;

        return (
          <RowGroup key={row.email}>
            <tr
              className={cn(
                "align-top transition-colors",
                // The expanded panel carries this row's own rule.
                !isOpen && !last && "border-b border-hairline/70",
                isOpen ? "bg-white/[0.02]" : "hover:bg-white/[0.02]",
              )}
            >
              <td className="py-3.5 pl-5 sm:pl-8">
                <button
                  type="button"
                  onClick={() => onToggle(row.email)}
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? detailId : undefined}
                  aria-label={`ODPAC reports and written answers from ${facts.name}`}
                  className="grid size-6 place-items-center rounded-full border border-hairline text-ink-dim transition-colors hover:border-hairline-lit hover:text-ink"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={cn(
                      "size-3 transition-transform duration-200",
                      isOpen && "rotate-90",
                    )}
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </button>
              </td>

              <td className="px-4 py-3.5">
                <p className="text-[14px] font-medium leading-tight text-ink">
                  {facts.name}
                </p>
                <p className="mt-1 text-[11.5px] leading-tight text-ink-dim">
                  {row.email}
                </p>
              </td>

              <td className="px-4 py-3.5">
                <SegmentCell done={row.daysCompleted} total={TOTAL_DAYS} />
              </td>

              <td className="px-4 py-3.5">
                <QuizMarks row={row} />
              </td>

              <td className="px-4 py-3.5">
                <StampsCell
                  earned={row.stamps.earned}
                  total={row.stamps.total}
                />
              </td>

              <td className="px-4 py-3.5">
                <OdpacCell filed={facts.odpacFiled} />
              </td>

              <td className="whitespace-nowrap px-4 py-3.5 pr-5 sm:pr-8">
                <p className="font-mono text-[11.5px] text-ink-muted tabular-nums">
                  {formatDate(row.lastActivityAt)}
                </p>
                {facts.idleDays !== null && facts.idleDays > 0 && (
                  <p
                    className={cn(
                      "mt-1 font-mono text-[10px] tabular-nums",
                      facts.idleDays > DORMANT_AFTER_DAYS
                        ? "text-badge-coral"
                        : "text-ink-dim",
                    )}
                  >
                    {facts.idleDays}d idle
                  </p>
                )}
              </td>
            </tr>

            {isOpen && (
              <tr
                id={detailId}
                className={cn(
                  "bg-white/[0.02]",
                  !last && "border-b border-hairline/70",
                )}
              >
                <td colSpan={7} className="px-5 pb-7 pt-1 sm:pl-[68px] sm:pr-8">
                  <WrittenWork row={row} />
                </td>
              </tr>
            )}
          </RowGroup>
        );
      })}
    </tbody>
  );
}

/** The etched perimeter every plate on this stage carries. */
function FrameBeam() {
  return (
    <svg className="beam" aria-hidden="true">
      <rect
        className="beam-hairline"
        x="0"
        y="0"
        width="100%"
        height="100%"
        pathLength={100}
      />
    </svg>
  );
}

/** `<tbody>` only accepts `<tr>` children, so the pair shares a plain fragment. */
function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-ink-dim"
    >
      {children}
    </th>
  );
}

/**
 * Days cleared: `n/5` and one segment per day. Gold once the whole journey is
 * done, which is the app's finishing ink everywhere else too.
 */
function SegmentCell({ done, total }: { done: number; total: number }) {
  const complete = total > 0 && done >= total;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "whitespace-nowrap font-mono text-[12px] tabular-nums",
          complete ? "text-gold" : "text-ink-muted",
        )}
      >
        {done}/{total}
      </span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, segment) => (
          <span
            key={segment}
            className={cn(
              "h-1 w-3.5 rounded-full",
              segment < done
                ? complete
                  ? "bg-gold"
                  : "bg-brand-text"
                : "bg-hairline-lit",
            )}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * The quiz marks, one fixed slot per day.
 *
 * Fixed slots rather than chips for the days actually sat: the slots line up
 * down the whole column, so "Day 3 is thin across the cohort" is legible by
 * scanning one position instead of reading a label per mark on every row. A mark
 * that did not reach the pass mark prints in coral - the number a manager acts
 * on.
 */
function QuizMarks({ row }: { row: AdminJoineeRow }) {
  return (
    <span className="flex gap-3.5">
      {DAY_IDS.map((dayId) => {
        const slug = slugForDay(dayId);
        const best = row.quizBest[slug];
        const passed = row.quizPassed[slug];
        return (
          <span key={dayId} className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase leading-none tracking-[0.1em] text-ink-dim">
              D{dayId}
            </span>
            <span
              className={cn(
                "whitespace-nowrap font-mono text-[12px] leading-none tabular-nums",
                !best
                  ? "text-ink-dim/60"
                  : passed
                    ? "text-ink"
                    : "text-badge-coral",
              )}
            >
              {best ?? "-"}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * Activities, counted in passport stamps.
 *
 * A stamp is issued for finishing a real thing - the day's reading, its
 * checklist, each drill, the quiz - so stamps collected *is* the count of
 * activities done. Completing the passport is the souvenir of that work, not
 * another activity, which is why nothing is added for the book itself.
 */
function StampsCell({ earned, total }: { earned: number; total: number }) {
  const complete = total > 0 && earned >= total;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "whitespace-nowrap font-mono text-[12px] tabular-nums",
          complete ? "text-gold" : "text-ink-muted",
        )}
      >
        {earned}/{total}
      </span>
      {/* A rail rather than one segment per stamp: at two dozen stamps the
          segments would be thinner than the gaps between them. */}
      <span
        aria-hidden="true"
        className="relative h-1 w-16 overflow-hidden rounded-full bg-hairline-lit"
      >
        <span
          style={{ width: `${total > 0 ? (earned / total) * 100 : 0}%` }}
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            complete ? "bg-gold" : "bg-brand-text",
          )}
        />
      </span>
    </div>
  );
}

/** Which days have an ODPAC report filed, one numbered slot per day. */
function OdpacCell({ filed }: { filed: DayId[] }) {
  const set = new Set(filed);
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "whitespace-nowrap font-mono text-[12px] tabular-nums",
          filed.length >= TOTAL_DAYS ? "text-gold" : "text-ink-muted",
        )}
      >
        {filed.length}/{TOTAL_DAYS}
      </span>
      <span className="flex gap-1.5">
        {DAY_IDS.map((dayId) => (
          <span
            key={dayId}
            title={`Day ${dayId}: ${set.has(dayId) ? "filed" : "not filed"}`}
            className={cn(
              "grid size-[18px] place-items-center rounded-[4px] border font-mono text-[9px] leading-none tabular-nums",
              set.has(dayId)
                ? "border-brand-text/50 bg-brand/15 text-brand-text"
                : "border-hairline text-ink-dim/60",
            )}
          >
            {dayId}
          </span>
        ))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Everything the joinee has written, day by day.
 *
 * The ODPAC report is the artefact a mentor actually reads, so it leads: five
 * stages per day under their own headings. Days with nothing filed are named in
 * one line at the end rather than given five empty boxes each, and any other
 * written exercise from a day follows that day's report.
 */
function WrittenWork({ row }: { row: AdminJoineeRow }) {
  const byKey = new Map(
    row.exercises.map((exercise) => [exercise.key, exercise]),
  );
  const days = DAYS.map((day) => ({
    day,
    report: byKey.get(odpacExerciseKey(day.id)),
    others: row.exercises.filter(
      (exercise) =>
        exercise.key.startsWith(`day${day.id}`) &&
        exercise.key !== odpacExerciseKey(day.id),
    ),
  }));

  const withWork = days.filter(
    (entry) => entry.report || entry.others.length > 0,
  );
  const missing = days
    .filter((entry) => !entry.report)
    .map((entry) => entry.day.id);
  // Keys belonging to no day at all. Nothing writes these today, but a renamed
  // exercise key must not silently vanish from the one place a mentor reads.
  const loose = row.exercises.filter(
    (exercise) => !DAYS.some((day) => exercise.key.startsWith(`day${day.id}`)),
  );

  if (withWork.length === 0 && loose.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-hairline-lit/70 px-4 py-3 text-[13px] text-ink-dim">
        Nothing written yet. No ODPAC report has been filed.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {withWork.map(({ day, report, others }) => (
        <article
          key={day.id}
          className="rounded-xl border border-hairline bg-white/[0.02] px-4 py-4 sm:px-5"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-hairline/70 pb-3">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-text">
              Day {day.id} ODPAC
              <span className="ml-2.5 normal-case tracking-normal text-ink-dim">
                {day.title}
              </span>
            </h4>
            <p className="font-mono text-[10px] text-ink-dim tabular-nums">
              {report ? formatDate(report.submittedAt) : "not filed"}
            </p>
          </header>

          {report ? (
            <OdpacStages body={report.body} />
          ) : (
            <p className="pt-3 text-[13px] text-ink-dim">
              No report filed for this day.
            </p>
          )}

          {others.map((exercise) => (
            <div
              key={exercise.key}
              className="mt-4 border-t border-hairline/70 pt-3"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
                {exercise.key}
                <span className="ml-2.5 normal-case tracking-normal">
                  {formatDate(exercise.submittedAt)}
                </span>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-muted">
                {exercise.body}
              </p>
            </div>
          ))}
        </article>
      ))}

      {loose.map((exercise) => (
        <article
          key={exercise.key}
          className="rounded-xl border border-hairline bg-white/[0.02] px-4 py-4 sm:px-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
            {exercise.key}
            <span className="ml-2.5 normal-case tracking-normal">
              {formatDate(exercise.submittedAt)}
            </span>
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-muted">
            {exercise.body}
          </p>
        </article>
      ))}

      {missing.length > 0 && (
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-dim">
          No ODPAC report yet for{" "}
          {missing.map((dayId) => `Day ${dayId}`).join(", ")}
        </p>
      )}
    </div>
  );
}

/**
 * One report, split back into its five stages.
 *
 * `parseOdpacBody` is deliberately tolerant: anything it cannot label comes
 * back under Opening rather than being dropped, so a mentor always sees the
 * whole submission even when it was written before the headings existed.
 */
function OdpacStages({ body }: { body: string }) {
  const sections = parseOdpacBody(body);
  return (
    <dl className="grid gap-x-8 gap-y-4 pt-3 lg:grid-cols-2">
      {ODPAC_STAGES.map((stage) => {
        const text = (sections[stage.id] ?? "").trim();
        return (
          <div key={stage.id} className="min-w-0">
            <dt className="flex items-baseline gap-2">
              <span
                aria-hidden="true"
                className="grid size-[18px] shrink-0 place-items-center rounded-[4px] border border-hairline-lit font-mono text-[9.5px] leading-none text-ink-dim"
              >
                {stage.letter}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
                {stage.label}
              </span>
            </dt>
            <dd
              className={cn(
                "mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed",
                text ? "text-ink-muted" : "text-ink-dim/70",
              )}
            >
              {text || "Left blank."}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
