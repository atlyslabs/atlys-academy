-- Rename the drill id `apac-loop` -> `odpac-loop`. REVIEW BEFORE RUNNING.
--
-- Sep 2026. The academy teaches one conversation framework, ODPAC; the
-- objection drill had shipped under a second acronym. The drill and every
-- joinee's play of it are kept - only the id changed.
--
-- At the time of writing this touches 24 `apac-loop` rows (22 complete, 2
-- in-progress) belonging to real joinees, with 2 of those profiles also holding
-- an `odpac-loop` row. The academy is live, so run step 1 for today's numbers
-- rather than trusting these. Those plays earn the Day 2 "Sequenced" stamp, and
-- that stamp is one of the stamps `dayWorkFinished` requires before Day 3
-- unseals - so losing them would re-seal a day people have already finished.
--
-- SAFE TO SKIP, AND SAFE TO RUN LATE. The application aliases the old id on
-- every read (`src/lib/progress/drill-aliases.ts`), so a joinee whose row or
-- browser still says `apac-loop` is scored correctly either way, and their next
-- sync writes the new id. This file just does it in one pass instead of waiting
-- for 23 people to log in.
--
-- IDEMPOTENT. Running it twice is a no-op: the second run matches nothing.


-- 1. Look before you leap. Expect one row: apac-loop with a count.
select drill_id, count(*) as rows, min(updated_at) as oldest, max(updated_at) as newest
from public.drill_results
where drill_id in ('apac-loop', 'odpac-loop')
group by drill_id
order by drill_id;


-- 2. The rename.
--
-- The table's primary key is (profile_id, drill_id), so a joinee who holds BOTH
-- ids - played it once before the rename and again after - would collide on
-- update. The two deletes below clear that first, and between them they apply
-- exactly the rule `migrateDrillIds` applies in the app: the LATER play
-- survives, whichever id it happens to be filed under. A tie keeps the row
-- already under the canonical id, so the two agree row for row.
--
-- The direction matters, and getting it wrong is the one way this file could
-- destroy someone's work. It is tempting to just drop `apac-loop` whenever an
-- `odpac-loop` row exists - but a browser tab opened before the rename and
-- never reloaded still writes the old id, so an `apac-loop` row CAN be the
-- newer play. Dropping it unconditionally would throw away the better row and
-- hand the joinee back an older, possibly unfinished, attempt.
--
-- `updated_at` is `not null`, so neither comparison can go NULL and leave a
-- pair intact for the update to collide on.

-- 2a. The old id loses: the canonical row is at least as recent.
delete from public.drill_results loser
using public.drill_results keeper
where loser.profile_id = keeper.profile_id
  and loser.drill_id = 'apac-loop'
  and keeper.drill_id = 'odpac-loop'
  and loser.updated_at <= keeper.updated_at;

-- 2b. The old id wins: it was played more recently, so the canonical row goes
-- and the update below renames the survivor into its place. Strictly `<`, so
-- this and 2a are mutually exclusive - exactly one fires per colliding pair,
-- and a pair can never lose both of its rows.
delete from public.drill_results loser
using public.drill_results keeper
where loser.profile_id = keeper.profile_id
  and loser.drill_id = 'odpac-loop'
  and keeper.drill_id = 'apac-loop'
  and loser.updated_at < keeper.updated_at;

update public.drill_results
set drill_id = 'odpac-loop'
where drill_id = 'apac-loop';


-- 3. Confirm. Expect only odpac-loop, with the count from step 1.
select drill_id, count(*) as rows
from public.drill_results
where drill_id in ('apac-loop', 'odpac-loop')
group by drill_id;


-- NOT renamed, deliberately: the lesson's item key `lesson.day5.apac` in
-- `progress_items`, ticked by 22 joinees. It is invisible to everyone - the
-- joinee sees the lesson title, not the key - so renaming it would risk 22
-- people's reading progress to change a string nobody reads. The `day5` in it
-- is already a fossil from the five-day era, kept for the same reason:
-- `content/onboarding/odpac.ts` states the rule as "Persisted - never renamed
-- in place."
