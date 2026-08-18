import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "@/auth";
import { LAST_DAY_ID } from "@/content/onboarding/days";
import { isAdminEmail } from "@/lib/auth/config";
import { ADMIN_ENABLED } from "@/lib/dev-flags";
import {
  emptyProgress,
  PROGRESS_VERSION,
  type ProgressState,
} from "@/lib/progress/types";
import { isSupabaseConfigured } from "./db";
import { gradeQuiz, UnknownQuizError } from "./grade";
import { buildDailyReport, istToday } from "./report";
import {
  adminOverview,
  cohortLeaderboard,
  ensureProfile,
  loadProgress,
  saveProgress,
} from "./store";

const submitSchema = z.object({
  responses: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selected: z.string().min(1).nullable(),
      }),
    )
    .max(50),
});

/**
 * Whole-state upload - the same shape the client keeps locally. Field types
 * are validated strictly; unknown drill/item keys are accepted so old clients
 * survive content renames.
 */
const progressSchema = z.object({
  version: z.literal(PROGRESS_VERSION),
  completedItems: z.record(z.string(), z.string()),
  attempts: z
    .array(
      z.object({
        id: z.uuid(),
        quizSlug: z.string().min(1),
        score: z.number().int().min(0),
        maxScore: z.number().int().min(1),
        passed: z.boolean(),
        submittedAt: z.iso.datetime(),
      }),
    )
    .max(500),
  drills: z.record(
    z.string(),
    z.object({
      status: z.string().min(1),
      score: z.number().int().min(0).optional(),
      maxScore: z.number().int().min(1).optional(),
      updatedAt: z.string(),
    }),
  ),
  exercises: z.record(
    z.string(),
    z.object({ body: z.string().max(20_000), submittedAt: z.string() }),
  ),
  // Deliberately permissive at the edge, clamped below. The journey was
  // scoped from five days to three, so a browser still holding day 4 or 5
  // would 400 on every sync if this rejected them - and a joinee whose
  // progress silently stops uploading is worse than one who resumes a day
  // early. Anything above the last real day is pulled back to it.
  lastVisitedDay: z.number().int().min(1).max(365),
  // Optional - Zod strips unknown keys, so without this line an uploaded
  // avatar would silently vanish on every sync.
  avatar: z
    .object({
      color: z.number().int().min(0),
      face: z.number().int().min(0),
      hat: z.number().int().min(0),
    })
    .optional(),
});

/** Resolve the signed-in joinee's profile, or null when sync is unavailable. */
async function currentProfile() {
  if (!isSupabaseConfigured) return null;
  const session = await auth();
  if (!session?.user?.email || !session.user.id) return null;
  return ensureProfile({
    googleSub: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
}

const app = new Hono().basePath("/api/onboarding");

const routes = app
  .get("/health", (c) =>
    c.json({ ok: true, service: "onboarding", sync: isSupabaseConfigured }),
  )

  .post("/quiz/:slug/submit", zValidator("json", submitSchema), (c) => {
    const slug = c.req.param("slug");
    const { responses } = c.req.valid("json");

    try {
      return c.json(gradeQuiz(slug, responses));
    } catch (error) {
      if (error instanceof UnknownQuizError) {
        return c.json({ error: "Unknown quiz" }, 404);
      }
      throw error;
    }
  })

  /** The signed-in joinee's synced progress. */
  .get("/progress", async (c) => {
    const profile = await currentProfile();
    if (!profile) return c.json({ error: "Sync unavailable" }, 503);
    const state = await loadProgress(profile.id);
    return c.json({ state, cohortDate: profile.cohort_date });
  })

  .put("/progress", zValidator("json", progressSchema), async (c) => {
    const profile = await currentProfile();
    if (!profile) return c.json({ error: "Sync unavailable" }, 503);
    const body = c.req.valid("json");
    // Clamped to a day that actually exists, then cast: the schema bounds the
    // input, this bounds it to the content. Without the clamp a stored day 5
    // resolves to no day at all on read.
    const lastVisitedDay = Math.min(
      body.lastVisitedDay,
      LAST_DAY_ID,
    ) as ProgressState["lastVisitedDay"];
    const state: ProgressState = {
      ...emptyProgress(),
      ...body,
      lastVisitedDay,
    };
    await saveProgress(profile.id, state);
    return c.json({ ok: true });
  })

  /** Cohort-scoped leaderboard - visible to every joinee in that cohort. */
  .get("/leaderboard", async (c) => {
    const profile = await currentProfile();
    if (!profile) return c.json({ error: "Sync unavailable" }, 503);
    const board = await cohortLeaderboard(profile.id);
    if (!board) return c.json({ error: "Sync unavailable" }, 503);
    return c.json(board);
  })

  /** Manager-only: one row per joinee across all cohorts. */
  .get("/admin/overview", async (c) => {
    if (!ADMIN_ENABLED) return c.json({ error: "Not found" }, 404);
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const rows = await adminOverview();
    if (!rows) return c.json({ error: "Database not configured" }, 503);
    return c.json({ rows });
  })

  /**
   * The end-of-day report - facts only, plus ready-to-post Slack blocks. The
   * scheduled worker in `worker/` pulls this once a day and posts the blocks to
   * a Slack webhook; the app itself never talks to Slack.
   *
   * Auth: an admin session, or the REPORT_TOKEN header for the automation.
   * While that env var is unset the token path is off entirely, so an empty
   * header cannot match an empty secret.
   */
  .get("/admin/daily-report", async (c) => {
    if (!ADMIN_ENABLED) return c.json({ error: "Not found" }, 404);
    const token = process.env.REPORT_TOKEN;
    const headerToken = c.req.header("x-report-token");
    const session = await auth();
    const authorised =
      isAdminEmail(session?.user?.email) ||
      (Boolean(token) && headerToken === token);
    if (!authorised) return c.json({ error: "Forbidden" }, 403);

    // The worker's only signal is this response, and it forwards the text into
    // Slack - so an unreachable database should say so rather than arrive as an
    // unexplained 500. "Not configured" and "cannot be reached" want different
    // reactions: one is a deploy mistake, the other is a network fault.
    let rows: Awaited<ReturnType<typeof adminOverview>>;
    try {
      rows = await adminOverview();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return c.json({ error: `Database unreachable: ${detail}` }, 503);
    }
    if (!rows) return c.json({ error: "Database not configured" }, 503);
    // IST, not UTC: the report covers an Indian working day, and defaulting to
    // the server's UTC date would report the wrong one for anything after 18:30.
    const forDate = c.req.query("date") ?? istToday();
    return c.json(buildDailyReport(rows, forDate));
  });

export type OnboardingApi = typeof routes;
export { app };
