import { hc } from "hono/client";
import type { OnboardingApi } from "@/server/onboarding/app";
export const api = hc<OnboardingApi>("/");
