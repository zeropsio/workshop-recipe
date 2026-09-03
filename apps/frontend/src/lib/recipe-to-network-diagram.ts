import type { WorkshopEnv, WorkshopService } from "@/lib/workshop-envs";
import type {
  NetworkDiagramConfig,
  NetworkServiceConfig,
} from "@/lib/network-diagram-types";

function serviceLabel(service: WorkshopService): string {
  const port = service.ports.find((p) => p.http)?.port;
  return port ? `${service.name}:${port}` : service.name;
}

function runtimeCategory(service: WorkshopService): "http-runtime" | "side-runtime" {
  if (service.typeId === "static" || service.ports.some((port) => port.http)) {
    return "http-runtime";
  }
  return "side-runtime";
}

/** Services the diagram leaves out: workspace containers (zcp and the *dev hostnames) that never serve the app. */
export function undrawnServices(env: WorkshopEnv): WorkshopService[] {
  return env.services.filter((service) => service.kind === "workspace" || service.dev);
}

/** Map one recipe environment to the marketing-style network diagram config. */
export function workshopEnvToNetworkDiagram(env: WorkshopEnv, endpoint: string): NetworkDiagramConfig {
  const drawn = env.services.filter((service) => service.kind !== "workspace" && !service.dev);

  const runtimes: NetworkServiceConfig[] = [];
  const managed: NetworkServiceConfig[] = [];

  for (const service of drawn) {
    const base = {
      id: service.name,
      label: serviceLabel(service),
      containers: { active: service.containers, standby: 0 },
      techIcon: service.typeId === "static" ? "nginx" : service.typeId,
    };

    if (service.kind === "runtime") {
      runtimes.push({ ...base, category: runtimeCategory(service), dependsOn: service.dependsOn });
      continue;
    }

    // Managed HA services run on three nodes behind their own balancer pair. Single mode is one node, no balancer.
    const isHaDb = service.ha && service.typeId === "postgresql";
    managed.push({
      ...base,
      containers: { active: service.ha ? 3 : 1, standby: 0 },
      category: "managed",
      ...(isHaDb
        ? {
            hasLoadBalancer: true,
            loadBalancer: {
              label: "load\nbalancers",
              containers: { active: 2, standby: 0 },
            },
          }
        : {}),
    });
  }

  const dbIndex = managed.findIndex((service) => service.techIcon === "postgresql");
  if (dbIndex >= 0 && dbIndex !== Math.floor(managed.length / 2)) {
    const [db] = managed.splice(dbIndex, 1);
    managed.splice(Math.floor(managed.length / 2), 0, db);
  }

  const serious = env.projectMode === "SERIOUS";

  return {
    endpoint,
    lightweight: false,
    infrastructure: {
      ctrl: { active: 1, standby: serious ? 1 : 0 },
      stats: { active: 1, standby: 0 },
      logger: { active: 1, standby: 0 },
    },
    routing: { active: serious ? 2 : 1, standby: 0 },
    services: [...runtimes, ...managed],
  };
}
