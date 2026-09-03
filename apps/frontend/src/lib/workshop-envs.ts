import envs from "virtual:workshop-envs";
import type { WorkshopEnv } from "@/lib/workshop-env-types";

export type { WorkshopEnv, WorkshopService, WorkshopServicePort } from "@/lib/workshop-env-types";

/** Every recipe environment, derived at build time from the import.yaml of every .zerops-recipe folder. */
export const WORKSHOP_ENVS: Record<string, WorkshopEnv> = envs;

export const FALLBACK_ENV_SLUG = "highly-available-production";

/**
 * The environment this build was deployed from. The import.yaml sets VITE_WORKSHOP_ENV on the frontend service and the Vite
 * build bakes it in. A build without it (no import, or a plain zcli push) falls back to the Stage topology and says so.
 */
export function resolveWorkshopEnv(): { env: WorkshopEnv | null; resolved: boolean } {
  const slug = import.meta.env.VITE_WORKSHOP_ENV;
  const env = slug ? WORKSHOP_ENVS[slug] : undefined;
  if (env) return { env, resolved: true };
  const fallback = WORKSHOP_ENVS[FALLBACK_ENV_SLUG] ?? Object.values(WORKSHOP_ENVS)[0] ?? null;
  return { env: fallback, resolved: false };
}
