# Content request — Pre-checkout Sales University

**For: Shovan** (sections 8 and 9 need Ops and IT instead)
**From: Ashutosh**

The app is built and works. What it does not have is **content**. It currently
lists what a joinee should learn and links out to Notion. Turning it into a
university means the app has to teach those things, run exercises against real
Atlys material, and score them — and none of that material exists anywhere I can
reach.

Everything below is a blank I cannot fill by guessing. Where I have already
guessed, I say so and ask you to correct it. Those are the dangerous ones: a
confidently wrong answer in a scored quiz teaches the wrong thing, and a
pre-checkout agent repeats it to a guest.

---

## 0. Read this first — what "Atlys-specific" can and cannot mean today

The brief is to make the quiz Atlys-specific, using the topics in the source
journey doc. I have that doc — it is `docs/source-journey.md`, transcribed from
what was pasted at the start of the project. So the **topics** are not the
problem.

**The problem is that topics are titles, not facts.** "Types of visas handled" is
a heading. It does not say which visas Atlys handles. I can build a question
about a heading only by inventing what sits under it.

What I *can* write Atlys-specific questions from right now, because it is real
content in the source doc:

| Source material | What it supports |
|---|---|
| **Cluster A objection scripts** (5, fully written) | The strongest questions in the app. Real policy: refunds on eligible routes, what the Atlys fee buys, what self-service cannot do, why not to attack a local agent |
| **The 5 Dos and 5 Don'ts** | Judgment questions with genuinely tempting wrong answers |
| **The 5 key responsibilities** | Ownership questions — what is Pre-checkout's job and what is Ops' |
| **The tools list** (Grafana, Freshchat, Retool/WT, Notion, Exotel, WhatsApp) | Which tool for which job |
| **The "shut up for 10 seconds" example** | The pause rule, already a working drill |
| **Tone guidelines** (friendly, calm, confident) | Tone questions |

That is enough for Days 1, 2, 4 and 5 to be properly Atlys-specific. I will
rewrite them against this material.

**Day 3 is the exception and it stays blocked.** The source doc names DS-160,
required documents, appointment booking logic, and rejections & resubmissions as
things to go *read elsewhere*. It contains no facts about any of them. So I can
write Day 3 questions about **ownership and framing** — what is the officer's
call versus Atlys's, what a refund actually covers — because Cluster A gives me
that. I cannot write questions about documents, timelines, or DS-160 fields.

Section 3 is the list of visa facts that do not exist anywhere I can reach.

---

## 1. Decisions already made — recorded here so nothing drifts

These are settled. Listed so you can see what I am building against.

| Decision | Setting |
|---|---|
| Points | Yes — see 2.1 for weights needing sign-off |
| Leaderboard | Yes |
| Admin access | `shovan@atlys.com` only. No joinee sees it |
| Admin login | Google sign-in, authorised by email match. No separate password |
| Cohort / start date | Everyone who signs in on the same day shares a start date |
| End-of-day report | Slack message to Shovan: tasks done + what they learned |
| Database | Supabase |
| Joinee identity | Google sign-in, `@atlys.com` only |
| Notion docs | Linked, not embedded |

---

## 2. Decisions I still need — from Ashutosh, not Shovan

### 2.1 Point weights — approve or adjust

| Action | Points |
|---|---|
| Tick off one activity | 5 |
| Complete a drill | 15 |
| Complete a drill with a perfect score | +10 bonus |
| Each correct quiz answer | 10 |
| Finish a whole day (all activities + quiz passed) | +25 bonus |
| Complete a software task (section 4) | 10 |

Roughly **700 points** across five days once software tasks are included.

- Does the 70% quiz pass mark still gate the next day? → ______
- Do retries cost points? My default: no. Unlimited free retries, best score
  counts. Charging for retries makes people avoid the quiz rather than learn.
  → ______

### 2.2 Leaderboard scope

You have decided to have one. Two things still need answering, and they change
how it feels rather than whether it exists:

- **Who can see it?** All joinees, or Shovan only? → ______
- **Ranked against whom?** Only their own cohort (people who started the same
  day), or every joinee ever? Cohort-only is fairer — someone on day 2 compared
  against someone on day 5 is not a real comparison. → ______

Since the leaderboard is in, I would suggest ranking within a cohort and showing
a joinee their own position plus the top few, rather than a full public ladder
with a visible last place. Your call — say the word and I will build the full
ladder instead.

### 2.3 Admin access — settled

Google sign-in, admin if the email is `shovan@atlys.com`. No password, no hash,
no reset flow, and it inherits whatever 2FA Atlys already enforces on Workspace.

One consequence to be aware of: **the admin route cannot work until the Google
OAuth keys arrive**, because there is no other way in by design. Until then
`/admin` is unreachable for everyone. That is the correct trade — the alternative
was a second, weaker credential.

The admin email lives in config, not code, so adding a second manager later is a
one-line change rather than a deploy.

### 2.4 End-of-day report — settled: Slack webhook, no Gideon

**Decided, Aug 2026.** Gideon cannot call arbitrary endpoints — it only reads
platforms it integrates with (Sheets, Notion, Slack, Gmail, Grafana), so it could
never pull from us. The fallback would have been writing rows to a Notion
database for it to read, which relocates the permission problem to a Notion admin
and adds a second schedule that fails silently: if our writer breaks, Gideon
cheerfully reports yesterday's rows as today's.

Infra confirmed Slack incoming webhooks are open to everyone, so that route is
gone. A Cloudflare cron worker (`worker/`) pulls the endpoint below and posts to
the webhook. Two hops, one schedule, and a broken run shows up as a message in
the channel rather than as stale data.

The endpoint was built as designed:

- **A JSON endpoint** — `GET /api/onboarding/admin/daily-report`, returning
  per-joinee: day reached, activities completed, quiz score, points, drill
  results, and the free-text they wrote. Authenticated, admin-only.
- **A pre-formatted Slack message** in the same response, as Slack Block Kit
  blocks, so the worker forwards it without transforming anything.

✅ **Does Gideon pull, or do we push?** Neither — Gideon is out. The worker pulls
from us and pushes to Slack.

Still needed:

- **When should it fire?** The worker is set to 19:00 IST as a placeholder, and
  covers all active joinees in one message. Confirm the time, and whether one
  message per joinee is wanted instead. → ______
- **Which channel?** A private one, because the report carries joinees' verbatim
  writing. A DM to Shovan instead would need a bot token and a real scope grant
  rather than a webhook, and nobody else could find the history. → ______
- **Should the joinee see what was sent about them?** My default is yes. A report
  about someone's performance that they are not allowed to read is worse for
  trust than one they can. → ______
- **What counts as "what they learned"?** I can report facts — days done,
  activities ticked, scores, drill outcomes, and their free-text answers verbatim.
  I cannot report comprehension. If you want a judgement rather than a record, say
  so and I will flag it as generated rather than observed. → ______

---

## 3. Day 3 — US visa process. The biggest gap in the app.

**Current state: the app teaches nothing about visas.** The source doc names four
topics — types of visas, application stages, Atlys's role, where delays happen —
and contains not one fact about any of them. No DS-160 detail, no document list,
no booking logic, no rejection handling.

This is also where being wrong is most expensive. A joinee who learns an
incorrect document requirement tells a guest, and that guest loses money and a
trip. **So Day 3 is deliberately empty right now, and I would rather ship it
empty than fill it with invented visa facts.** That is not caution for its own
sake — it is the one place in this app where a confident-sounding wrong answer
causes real harm outside the building.

The source journey doc tells a joinee to go *read* the US visa process doc. It
does not contain it. So either point me at that document — an export into `docs/`
is easiest — or answer the questions below. Either unblocks a full Day 3 with real
Atlys-specific questions and a working test-application exercise.

Anything answered here is reusable: these are also the facts the mock scenarios
and the Retool lookup task need.

### 3.1 Scope

1. Which visa types does Atlys handle today? Ranked by volume, so I know what to
   teach first. → ______
2. Which one should Day 3 teach in depth? I have assumed US B1/B2 because the
   source doc says "US Visa process doc". Correct? → ______

### 3.2 The US B1/B2 flow

3. The end-to-end stages, in order. For each: **who does it** — the applicant,
   Atlys, or the consulate. The split matters more than the list, because every
   objection a guest raises is really about who controls what. → ______
4. **DS-160** — what it is, who fills it in, what Atlys does with it, and the
   mistakes guests most often make on it. → ______
5. The **document list**. Which are mandatory, which are optional, and which one
   gets missed most often. → ______
6. **Appointment booking** — how a slot gets found, what actually drives the wait
   time, and whether Atlys can speed it up. If it cannot, say so plainly, because
   that is the honest answer to a very common objection. → ______

### 3.3 What Atlys controls, and what it does not

7. Draw the line explicitly. What is genuinely Atlys's responsibility, and what
   is the consulate's? → ______
8. **Fees** — Atlys's fee versus the consulate fee, and what a guest is actually
   paying for. → ______
9. **Refunds** — if the visa is rejected, what does the guest get back? Exact
   policy, because this is the single question where a wrong answer costs money.
   → ______

### 3.4 Rejections and delays

10. Most common rejection reasons, in order. → ______
11. What happens after a rejection — can they reapply, how soon, at what cost?
    → ______
12. Resubmission rules. → ______
13. Honest timeline ranges, best case to worst case. Not the marketing number —
    the one an agent can say without creating a problem later. → ______
14. Where delays actually happen, and which are Atlys's fault versus not.
    → ______

### 3.5 The material that makes good exercises

15. **The 10 questions guests ask most about US visas**, in their words, with the
    correct answer to each. This single item is worth more to me than everything
    else in section 3 — it is exactly what quiz questions and mock chats are built
    from. → ______
16. **What must an agent never promise?** Specific forbidden sentences. These
    become the wrong-but-tempting quiz options and the Don'ts. → ______
17. Is there an **interview** for B1/B2, and what should a guest expect? → ______

---

## 4. Software training tasks — designed, needing your input

You asked for tasks that teach the tools. Here is what I propose, per tool. I
have designed the tasks; what I need from you is the detail that makes each one
answerable, and confirmation that a joinee can do it without touching a real
customer.

### 4.0 One safety question first, before any of the rest

**Is there a sandbox or test environment for Freshchat and Exotel?**

If not, a joinee "practising" is talking to real guests and placing real calls on
day 2 of their job. If there is no sandbox, I will design these as
mentor-supervised observation tasks instead of solo exercises — but I need to know
which. → ______

### 4.1 Freshchat — inbound chat, the core tool

| Task | What I need from you |
|---|---|
| F1 · Find an unassigned chat and claim it | Who normally assigns chats — is claiming even the right verb? |
| F2 · Send a canned/template response | Do templates exist? Where? Can I see the list? |
| F3 · Tag a conversation correctly | **The tag taxonomy.** Without it this task cannot exist |
| F4 · Escalate to Ops | The exact mechanism — transfer, tag, WhatsApp, something else? |
| F5 · Find a past conversation for a returning guest | Searchable by email, phone, both? |

### 4.2 Exotel — calls

| Task | What I need from you |
|---|---|
| E1 · Place a test outbound call | Is there a safe number to call? |
| E2 · Find the recording for a given call | Where do recordings live, how far back? |
| E3 · Log a call outcome | Where does it get logged, and what fields are mandatory? |

### 4.3 Retool / WT — looking up an application

This is the highest-value tool task, because "where is my application" is the
question a pre-checkout agent gets constantly.

| Task | What I need from you |
|---|---|
| R1 · Look up an application and report its stage | **The full list of possible application states**, in order |
| R2 · Work out what is blocking an application | Which fields actually tell you this? |
| R3 · Find the appointment date | Which screen? |

- Is there **test data** a joinee can safely query, or do they need a real
  application? → ______

### 4.4 Grafana

| Task | What I need from you |
|---|---|
| G1 · Read today's checkout drop-off | Which dashboard, which panel? |
| G2 · Find chat volume by hour | Same |

- **Which numbers should a pre-checkout agent actually watch**, and what is a
  normal versus an alarming value? A dashboard without that context teaches
  nothing. → ______

### 4.5 Notion and WhatsApp

- Which Notion pages should a joinee be able to find their way around? → ______
- Which WhatsApp groups do they get added to, who adds them, and what is each one
  for? → ______

---

## 5. Teaching content — 21 topics

Each day lists topics under "What to learn". The app shows them as bullet points
and nothing more. To teach them, each needs real content.

**Per topic:**

1. **2–5 paragraphs** in your words — how you would explain it on a call.
2. **One concrete example** — a real, sanitised situation where it mattered.
3. **One thing new joiners get wrong.** Most valuable line in this whole
   document. It becomes the wrong-but-tempting quiz option, and it is the part I
   cannot invent.

### Day 1 — Welcome

| # | Topic | Content |
|---|---|---|
| 1.1 | Why we exist | |
| 1.2 | What Pre-checkout Sales is | |
| 1.3 | How this role impacts revenue **and trust** | |
| 1.4 | Pre-checkout versus Post-checkout support | |

### Day 2 — Product & Customer Basics

| # | Topic | Content |
|---|---|---|
| 2.1 | Who our guests are — persona, geography, intent | |
| 2.2 | Why guests reach out before checkout | |
| 2.3 | Typical fears & objections | |
| 2.4 | "Shut up for 10 seconds" — why it works | |

Day 2 is the only day with real substance today, because your Cluster A objection
scripts gave me something to build from. **Days 1, 3 and 4 have no equivalent.**

### Day 3 — Visa Deep Dive

Covered in section 3.

### Day 4 — Execution & Collaboration

| # | Topic | Content |
|---|---|---|
| 4.1 | Chat/call dashboard overview | |
| 4.2 | Lead status & intent | |
| 4.3 | Follow-ups & handovers | |
| 4.4 | Product: feature clarity, bugs, roadmap | |
| 4.5 | Ops: visa processing, timelines, exceptions | |

Two extras Day 4 depends on:

- **What separates a hot lead from a cold one?** 3–4 signals each. The app
  currently asks a joinee to identify hot versus cold and never tells them how.
  → ______
- **The escalation matrix.** Who owns what, who to go to for which problem.
  → ______

### Day 5 — Mock Chats & Calls

Covered in section 7.

---

## 6. Quiz questions — Atlys-specific

**29 questions exist. I wrote every one of them and chose every correct answer.**
That is the wrong arrangement for a scored system a manager reviews. You should
own the answer key.

| Day | Now | Verdict |
|---|---|---|
| 1 | 5 | Generic. **I will rewrite** from the responsibilities + tools list |
| 2 | 8 | Built from your scripts. **Review and sign off** |
| 3 | 5 | Framing only. **I will rewrite the framing half**; the factual half is blocked on section 3 |
| 4 | 5 | Generic. **Partly rewritable**; needs 5.4's hot/cold signals and the escalation matrix to go further |
| 5 | 6 | Built from your scripts. **Review and sign off** |

### 6.1 What I will rewrite myself, no input needed

Using Cluster A, the Dos/Don'ts, the responsibilities and the tools list, I can
make Days 1, 2, 4 and 5 genuinely Atlys-specific. Examples of the questions that
material supports — these are real, answerable from the source doc, and not
generic:

- A guest says their local agent charges half. What is the *first* thing to
  establish? *(Whether the quote includes the government fee — half the time the
  comparison is fee-vs-total and the gap disappears.)*
- Why not criticise the local agent? *(The guest often knows him personally, so
  attacking him makes his word more credible, not less.)*
- What does the embassy fee buy, and what does the Atlys fee buy on top?
- A guest says they will just use the VFS portal. Which two things can
  self-service genuinely not do?
- An application needs its current stage checked. Which tool?
- A guest asks you to guarantee approval. Which Don't does promising it break?

That is the standard I will hold the rewrite to. **Where I cannot reach it, I will
leave the question out rather than pad the day.**

### 6.2 What still needs you — Day 3's factual half

Six questions per day for Days 1, 3 and 4 was the original ask. After the rewrite
above, what I still cannot write is anything that depends on a visa fact. Answer
section 3 and I write those myself; otherwise Day 3's quiz stays at framing only.

Format if you would rather write them directly:

Format:

```
Question:      A guest asks whether you can get their appointment moved earlier.
Option A:      (correct) …
Option B:      …
Option C:      …
Option D:      …
Explanation:   …
```

What makes these work, since you asked for Atlys-specific:

- **Use real numbers, real tools, real policies.** "Which Retool screen shows an
  application's current stage" teaches the job. "What does pre-checkout mean" does
  not.
- **Wrong options must be tempting.** A joinee who has not learned the material
  should plausibly pick B. That is what makes it a test rather than a formality.
- **The explanation is the teaching moment** — it is what they read after
  answering. Worth more care than the question.
- **Exactly one defensible answer.** If two could be argued, the joinee who
  understands the job gets it wrong and stops trusting the whole thing.

---

## 7. Mock chats & calls, and the rewrite drill

### 7.1 The four existing scenarios

Price objection, timeline anxiety, visa rejection fear, comparing competitors —
built as branching conversations from your Cluster A scripts. Each has replies
that close the objection and replies that deepen it.

**I need you to confirm I got the good and bad replies right.** I will send them
side by side.

### 7.2 More scenarios — cheapest way to add real depth

Each new scenario is about 15 minutes of your time and adds a genuine exercise.
For each, I need:

- The guest's **opening message**, in their words
- What they are **actually** worried about, underneath the question
- **2–3 replies that work**, and **2–3 that sound reasonable but make it worse**
- What the guest **says next** to each

Candidates, based on what the source doc implies is common — tell me which are
real and which I have invented:

| Scenario | Real? |
|---|---|
| "My visa was rejected before" *(built)* | ✅ |
| "Why is Atlys more expensive than doing it myself?" *(built)* | ✅ |
| "Will I get it before my flight?" *(built)* | ✅ |
| "How are you different from \[competitor\]?" *(built)* | ✅ |
| "I need to cancel and get a refund" | ❓ |
| "The website charged me twice" | ❓ |
| "Can you guarantee I get the visa?" | ❓ |
| "My friend got theirs in 3 days, why is mine slower?" | ❓ |
| Guest is angry and abusive | ❓ |
| Guest wants something we genuinely cannot do | ❓ |

### 7.3 The rewrite drill needs a real transcript

Day 2 asks a joinee to rewrite a bad reply into a good one. **The bad reply is
one I invented as a foil.** No real agent wrote it, so it is a straw man and a
sharp joinee will notice.

Please send **3–5 sanitised real chat excerpts** — two handled well, three badly,
identifying details removed. Real material beats anything I can write, and this
is the exercise where that gap shows most.

---

## 8. Slack directory

Each day should open a list of who to reach out to, with clickable Slack links.

| Day | Mentor | Slack member ID | What they own | Best time |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

Plus a standing directory, since these come up outside any one day:

| Role | Name | Slack member ID | When to go to them |
|---|---|---|---|
| Ops Lead | | | |
| Ops — escalations | | | |
| Product | | | |
| Growth / Design | | | |
| Fallback when the day's mentor is away | | | |

**Member IDs, not @handles.** A member ID looks like `U01AB2CD3EF` and is under
*View full profile → ⋮ → Copy member ID*. Handles break when someone changes
their display name; member IDs do not, and only a member ID lets me build a link
that opens a DM directly.

- Is there a **channel** joinees should post in rather than DMing? → ______
- The source doc names Shovan (days 1, 2, 4, 5), Santosh (day 4), an Ops Lead
  (day 3) and Growth/Design (day 3). I need real names and IDs for the last
  three. → ______

---

## 9. Links only — no document contents

| Activity | Link | Opens without requesting access? |
|---|---|---|
| Company + Product overview (Glossary) | *(have the link — cannot open it)* | ❓ |
| Top pre-checkout FAQs | | |
| Past high-quality chat/call transcripts | | |
| Tone guidelines | | |
| **US Visa process doc** | | |
| Sanitised real applications | | |
| Chat/call dashboard | | |
| Escalation paths / ownership | | |

The access column is what people forget. A link that opens "Request access" on
someone's first morning reads as being locked out of your own onboarding.

---

## 10. Not for Shovan

### From Ops

- **The 5 common failure points.** Day 3 already tells the joinee to go ask Ops.
  Written down once, every joinee gets them — and they are the raw material for
  the strongest objection answers in the app.
- **Sign-off on every visa fact** in Day 3, if that is Ops rather than Shovan.
  Section 3 should probably be answered by whoever owns visa operations.

### From IT

- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, plus the two redirect URIs
  registered. Details in the README.
- A **Slack bot token** with `chat:write`, or an incoming webhook — see 2.5.
- **Supabase project** credentials once created.
- Confirmation on the record that **employee performance data** — scores,
  progress, free-text answers, and a leaderboard position — may be stored in
  Supabase. This is personal data about staff and someone should say yes to it
  deliberately, not by default.

---

## What I will build while waiting

Not blocked on all of this:

1. Supabase schema; move progress off `localStorage` so it survives a browser
   change and Shovan can actually see it.
2. Points engine on the 2.1 weights.
3. Cohort assignment by sign-in date.
4. Admin route for `shovan@atlys.com` via Google sign-in.
5. Leaderboard.
6. Daily-report JSON endpoint plus Slack Block Kit payload, and the cron worker
   that posts it to Slack.
7. **Rewrite Days 1, 2, 4 and 5 quiz questions** against Cluster A, the
   Dos/Don'ts, the responsibilities and the tools list — see 6.1.
8. Mentor panel per day, empty state until section 8 arrives.
9. Software-task framework, empty until section 4 arrives.
10. Teaching-content templates, so section 5 is paste-in rather than a rebuild.

**What I will not do is write the missing content and present it as Atlys's.**
Days 1, 3 and 4 stay visibly thin until real material arrives. Filler would hide
the gap rather than close it, and on Day 3 specifically it would eventually teach
a joinee something untrue that they repeat to a paying guest.
