/** One recipe environment as derived from its import.yaml (see workshop-envs-plugin.ts). */

export type WorkshopServicePort = { port: number; http: boolean };

export type WorkshopService = {
  name: string;
  typeId: string;
  version: string;
  ha: boolean;
  /** minContainers from the import, or 1. Import-time value, not what the project runs right now. */
  containers: number;
  ports: WorkshopServicePort[];
  kind: "runtime" | "managed" | "workspace";
  /** True for the *dev hostnames, whose zeropsSetup ends with -dev. */
  dev: boolean;
  /** Managed hostnames this runtime references through ${hostname_...} in its zerops.yaml run.envVariables. Empty for managed services. */
  dependsOn: string[];
};

export type WorkshopEnv = {
  slug: string;
  title: string;
  projectMode: "LIGHT" | "SERIOUS";
  services: WorkshopService[];
};
