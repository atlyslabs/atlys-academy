-- Rename the drill id `apac-loop` -> `odpac-loop`. REVIEW BEFORE RUNNING.
--
-- Sep 2026. The academy teaches one conversation framework, ODPAC; the
-- objection drill had shipped under a second acronym. The drill and every
-- joinee's play of it are kept - only the id changed.
--
-- At the time of writing this touches 23 rows (21 complete, 2 in-progress)
-- belonging to real joinees. Those plays earn the Day 2 "Sequenced" stamp, and
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
-- The table's primary key is (profile_id, drill_id), so a joinee who somehow
-- holds BOTH ids - played it once before the rename and again after - would
-- collide on update. That is why the delete below runs first: it drops the
-- stale `apac-loop` row only for profiles that already have an `odpac-loop`
-- one, keeping the newer play, which is the same rule `migrateDrillIds` uses.
delete from public.drill_results old
where old.drill_id = 'apac-loop'
  and exists (
    select 1
    from public.drill_results current
    where current.profile_id = old.profile_id
      and current.drill_id = 'odpac-loop'
  );

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
