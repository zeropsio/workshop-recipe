/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Recipe environment slug set by import.yaml on the frontend service (ai-agent, remote-cde, local, stage, ...). */
  readonly VITE_WORKSHOP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:workshop-envs" {
  const envs: Record<string, import("./lib/workshop-env-types").WorkshopEnv>;
  export default envs;
}
