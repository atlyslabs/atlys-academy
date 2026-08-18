-- Schema hardening — REVIEW BEFORE RUNNING. Nothing here is applied automatically.
--
-- `schema.sql` is the shape the app needs to work. This file is the shape it
-- should have before real cohorts run through it. Every statement is
-- idempotent, and the ones that could fail against existing rows are added
-- `not valid` first so they never block a deploy — validate them separately
-- once you know the data is clean.
--
-- Ordered by what bites first.


-- ---------------------------------------------------------------------------
-- 1. Make the row-level security posture explicit.
--
-- Every table already has RLS enabled and *zero* policies. That is fail-closed
-- and correct — the app reaches Supabase only through the service-role key,
-- which bypasses RLS — but it is invisible. The danger is the next person who
-- adds a browser-side query with the anon key: RLS with no policy returns an
-- empty result set rather than an error, so it looks like missing data, not
-- missing permission, and it can be debugged for an hour.
--
-- Revoking outright turns that silent empty result into a hard permission
-- error, which is the failure you want.

revoke all on public.profiles              from anon, authenticated;
revoke all on public.progress_items        from anon, authenticated;
revoke all on public.quiz_attempts         from anon, authenticated;
revoke all on public.drill_results         from anon, authenticated;
revoke all on public.exercise_submissions  from anon, authenticated;
revoke all on public.app_state             from anon, authenticated;

comment on table public.exercise_submissions is
  'Free-text joinee work, including the daily ODPAC report under key dayN.odpac. Service-role only: no RLS policy exists by design.';


-- ---------------------------------------------------------------------------
-- 2. The index the leaderboard actually needs.
--
-- `cohortLeaderboard` filters profiles by cohort_date on every load, and
-- `adminOverview` orders by it. Both are sequential scans today. Harmless at
-- four rows, not at four cohorts of twenty.

create index if not exists profiles_cohort_date
  on public.profiles (cohort_date desc);


-- ---------------------------------------------------------------------------
-- 3. Constraints the API already enforces, enforced where they cannot be
--    bypassed.
--
-- The Zod schema in src/server/onboarding/app.ts is the only thing stopping a
-- nonsense score today. That is one `curl` away from being untrue, and the
-- client is the writer in this trust model.

alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_score_within_max;
alter table public.quiz_attempts
  add constraint quiz_attempts_score_within_max
  check (score <= max_score) not valid;

-- Mirrors `z.string().max(20_000)` on the write path. Also protects the Slack
-- report: a single unbounded body is the one input that can push a block past
-- Slack's 3000-character limit and get the whole message rejected.
alter table public.exercise_submissions
  drop constraint if exists exercise_body_length;
alter table public.exercise_submissions
  add constraint exercise_body_length
  check (char_length(body) <= 20000) not valid;

-- `status` is free text today. These four are the only values the client
-- writes; anything else means a bug upstream and should not persist silently.
alter table public.drill_results
  drop constraint if exists drill_status_known;
alter table public.drill_results
  add constraint drill_status_known
  check (status in ('not-started', 'in-progress', 'complete', 'passed')) not valid;

-- The journey was scoped from five days to three. Nothing in the database
-- stopped a stored `5`, and on read it resolves to no day at all. The app now
-- clamps on write; this stops it at the table too. Widen the bound when the
-- day count grows — it is deliberately a number, not a reference, so that
-- adding a day is one considered edit rather than a silent schema drift.
alter table public.app_state
  drop constraint if exists app_state_day_in_range;
alter table public.app_state
  add constraint app_state_day_in_range
  check (last_visited_day between 1 and 3) not valid;

-- Run these once you have confirmed no existing row violates them. Each
-- rewrites nothing and takes only a brief lock.
--   alter table public.quiz_attempts        validate constraint quiz_attempts_score_within_max;
--   alter table public.exercise_submissions validate constraint exercise_body_length;
--   alter table public.drill_results        validate constraint drill_status_known;
--   alter table public.app_state            validate constraint app_state_day_in_range;
--
-- Find violations first:
--   select * from public.quiz_attempts where score > max_score;
--   select profile_id, exercise_key from public.exercise_submissions where char_length(body) > 20000;
--   select distinct status from public.drill_results;
--   select * from public.app_state where last_visited_day not between 1 and 3;


-- ---------------------------------------------------------------------------
-- 4. Somewhere to record that a mentor has actually read an ODPAC report.
--
-- ODPAC is explicitly not machine-scored — content/onboarding/odpac.ts says
-- "your mentor reads it". Today there is nowhere to record that reading. The
-- Slack report can say who filed one, but not whether anybody responded, so a
-- joinee writing carefully into a void looks identical to one being coached.
--
-- Nullable and additive: the app ignores these columns until something writes
-- them, and the daily report can then say "2 filed, 1 still unread".

alter table public.exercise_submissions
  add column if not exists reviewed_at  timestamptz,
  add column if not exists reviewed_by  text,
  add column if not exists mentor_note  text;

create index if not exists exercise_submissions_unreviewed
  on public.exercise_submissions (submitted_at desc)
  where reviewed_at is null;


-- ---------------------------------------------------------------------------
-- 5. Keep the profile's email current.
--
-- `ensureProfile` writes email once, at first sign-in, and keys on google_sub
-- thereafter. Google accounts get renamed. When that happens the admin desk and
-- every Slack report keep printing the old address forever, with nothing
-- indicating it is stale.
--
-- Cheapest fix is in the application: have `ensureProfile` update email and
-- full_name on each sign-in rather than only inserting. This column just makes
-- the staleness visible in the meantime.

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();


-- ---------------------------------------------------------------------------
-- 6. The read pattern that will hurt first.
--
-- `adminOverview` calls `loadProgress` once per profile, and `loadProgress`
-- issues five queries. One admin page load, or one nightly Slack report, is
-- therefore 1 + 5N round trips — roughly a hundred for a twenty-person cohort,
-- each one a separate HTTP request to Supabase. It is not slow today because
-- there are four rows.
--
-- This view collapses the counting half into a single query. The written work
-- still needs its own fetch (it is the part a human reads), but the numbers on
-- every joinee card stop costing a round trip each.

create or replace view public.joinee_activity as
select
  p.id                as profile_id,
  p.email,
  p.full_name,
  p.cohort_date,
  (select count(*) from public.progress_items pi where pi.profile_id = p.id)
                      as activities_done,
  (select count(distinct qa.quiz_slug)
     from public.quiz_attempts qa
    where qa.profile_id = p.id and qa.passed)
                      as days_passed,
  (select count(*)
     from public.exercise_submissions es
    where es.profile_id = p.id and es.exercise_key like '%.odpac')
                      as odpac_filed,
  nullif(greatest(
    coalesce((select max(pi.completed_at) from public.progress_items pi        where pi.profile_id = p.id), 'epoch'::timestamptz),
    coalesce((select max(qa.submitted_at) from public.quiz_attempts qa         where qa.profile_id = p.id), 'epoch'::timestamptz),
    coalesce((select max(dr.updated_at)   from public.drill_results dr         where dr.profile_id = p.id), 'epoch'::timestamptz),
    -- Written work counts as activity. Leaving this out is what made a joinee
    -- whose only action that day was filing their ODPAC report read as
    -- inactive, and drop out of the Slack report entirely.
    coalesce((select max(es.submitted_at) from public.exercise_submissions es  where es.profile_id = p.id), 'epoch'::timestamptz)
  ), 'epoch'::timestamptz) as last_activity_at
from public.profiles p;

revoke all on public.joinee_activity from anon, authenticated;

comment on view public.joinee_activity is
  'One row per joinee with the counts the admin desk and daily report need, without the per-profile fan-out in store.ts.';


-- ---------------------------------------------------------------------------
-- Deliberately NOT changed, and why
--
-- * quiz_attempts.id stays client-supplied. It is forgeable, and the trust
--   model in store.ts already says so out loud ("state is client-pushed and
--   stored as-is"). Fixing it properly means moving scoring authority to the
--   server, which is a product decision, not a migration.
--
-- * cohort_date still defaults to current_date at first sign-in, so a cohort is
--   whoever signed in that day and a straggler lands in a cohort of one. Worth
--   an explicit cohort table if cohorts ever become a real unit of management.
--
-- * No soft deletes and no audit trail. Everything cascades on profile delete,
--   which is the right default under GDPR-style deletion and the wrong one if
--   anybody ever needs to prove a joinee completed the programme.
