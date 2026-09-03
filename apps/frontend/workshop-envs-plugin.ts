import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { Plugin } from "vite";
import type { WorkshopEnv, WorkshopService, WorkshopServicePort } from "./src/lib/workshop-env-types";

// The homepage draws the topology of the environment it was deployed from. Rather than hand-copying container counts into the
// frontend, this plugin reads the six import.yaml files under .zerops-recipe/ plus repo-root zerops.yaml at build time and
// exposes them as the `virtual:workshop-envs` module, keyed by the VITE_WORKSHOP_ENV value each import sets on its frontend service.

const VIRTUAL_ID = "virtual:workshop-envs";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

type ImportService = {
  hostname: string;
  type: string;
  zeropsSetup?: string;
  minContainers?: number;
  vault?: Record<string, unknown>;
};

type ImportDoc = {
  project?: { corePackage?: string };
  services?: ImportService[];
};

type ZeropsYamlDoc = {
  zerops?: Array<{
    setup: string;
    run?: {
      ports?: Array<{ port: number; httpSupport?: boolean }>;
      envVariables?: Record<string, unknown>;
    };
  }>;
};

type SetupInfo = { ports: WorkshopServicePort[]; refs: string[] };

// ${db_connectionString} style references name the hostname before the underscore.
const HOST_REF = /\$\{([a-z0-9]+)_[A-Za-z0-9]+\}/g;

function referencedHosts(envVariables: Record<string, unknown> | undefined): string[] {
  const hosts = new Set<string>();
  for (const value of Object.values(envVariables ?? {})) {
    if (typeof value !== "string") continue;
    for (const match of value.matchAll(HOST_REF)) hosts.add(match[1]);
  }
  return [...hosts];
}

function parseType(type: string): { typeId: string; version: string; ha: boolean } {
  // ubuntu/nodejs@22 -> nodejs, postgresql:ha@17 -> postgresql (ha), static -> static, zcp@1 -> zcp
  const [beforeAt, version = ""] = type.split("@");
  const base = beforeAt.split("/").pop() ?? beforeAt;
  const [typeId, mode] = base.split(":");
  return { typeId, version, ha: mode === "ha" };
}

function toService(
  service: ImportService,
  setups: Map<string, SetupInfo>,
  managedHosts: Set<string>,
): WorkshopService {
  const { typeId, version, ha } = parseType(service.type);
  const setup = service.zeropsSetup;
  const kind: WorkshopService["kind"] =
    typeId === "zcp" ? "workspace" : setup ? "runtime" : "managed";
  const info = setup ? setups.get(setup) : undefined;
  return {
    name: service.hostname,
    typeId,
    version,
    ha,
    containers: service.minContainers ?? 1,
    ports: info?.ports ?? [],
    kind,
    dev: Boolean(setup?.endsWith("-dev")),
    dependsOn: (info?.refs ?? []).filter((host) => managedHosts.has(host)),
  };
}

export function loadWorkshopEnvs(repoRoot: string): {
  envs: Record<string, WorkshopEnv>;
  files: string[];
} {
  const files: string[] = [];
  const zeropsPath = path.join(repoRoot, "zerops.yaml");
  const recipeDir = path.join(repoRoot, ".zerops-recipe");
  if (!existsSync(zeropsPath) || !existsSync(recipeDir)) {
    // A runtime container deployed with deployFiles ./ carries no dot-directories, so `npm run build` there has no recipe folder
    // to read. The real static build runs from the git checkout where both exist. Build without topology instead of failing.
    console.warn(`workshop-envs: ${recipeDir} or ${zeropsPath} not found, the homepage will have no topology to draw`);
    return { envs: {}, files: [] };
  }
  files.push(zeropsPath);
  const zeropsDoc = parse(readFileSync(zeropsPath, "utf8")) as ZeropsYamlDoc;
  const setups = new Map<string, SetupInfo>();
  for (const entry of zeropsDoc.zerops ?? []) {
    setups.set(entry.setup, {
      ports: (entry.run?.ports ?? []).map((p) => ({ port: p.port, http: Boolean(p.httpSupport) })),
      refs: referencedHosts(entry.run?.envVariables),
    });
  }

  const envs: Record<string, WorkshopEnv> = {};
  for (const folder of readdirSync(recipeDir, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const file = path.join(recipeDir, folder.name, "import.yaml");
    if (!existsSync(file)) continue;
    files.push(file);
    const doc = parse(readFileSync(file, "utf8")) as ImportDoc;
    const services = doc.services ?? [];
    const slug = services.find((s) => s.vault?.VITE_WORKSHOP_ENV)?.vault?.VITE_WORKSHOP_ENV;
    if (typeof slug !== "string" || !slug) {
      throw new Error(`${file}: no service sets vault.VITE_WORKSHOP_ENV, the homepage cannot identify this environment`);
    }
    const managedHosts = new Set(
      services.filter((s) => !s.zeropsSetup && parseType(s.type).typeId !== "zcp").map((s) => s.hostname),
    );
    envs[slug] = {
      slug,
      title: folder.name.replace(/^\d+\s*[—–-]\s*/, ""),
      projectMode: doc.project?.corePackage === "SERIOUS" ? "SERIOUS" : "LIGHT",
      services: services.map((s) => toService(s, setups, managedHosts)),
    };
  }
  return { envs, files };
}

export function workshopEnvsPlugin(repoRoot: string): Plugin {
  return {
    name: "workshop-envs",
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const { envs, files } = loadWorkshopEnvs(repoRoot);
      for (const file of files) this.addWatchFile(file);
      return `export default ${JSON.stringify(envs)};`;
    },
  };
}
