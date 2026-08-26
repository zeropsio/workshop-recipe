import { contentHash, splitSlides } from "@deck/shared";
import { createLock, createMemoryBus, createMemoryCache, createMemoryStore } from "./index.js";
import { handleJob } from "./handle.js";

const DEFAULT_DECK = "# A\n\n---\n\n# B\n\n---\n\n# C";

export type ReplicaRunResult = {
  replicas: number;
  acquired: number;
  conflicts: number;
  progress: number;
  slideCount: number;
  logs: string[];
};

/** Drives one job through N in-process replicas and reports per-replica outcomes. */
export async function runReplicas(
  replicas: number,
  markdown = DEFAULT_DECK,
): Promise<ReplicaRunResult> {
  const store = createMemoryStore();
  const cache = createMemoryCache();
  const bus = createMemoryBus();
  const logs: string[] = [];

  for (let i = 0; i < replicas; i += 1) {
    const replicaId = `worker-${i + 1}`;
    const lock = createLock();
    await bus.subscribe((jobId) =>
      handleJob(
        {
          store,
          cache,
          replicaId,
          renderDriver: "stub",
          spinMs: 0,
          lock,
          log: (line) => logs.push(line),
        },
        jobId,
      ),
    );
  }

  const slideCount = splitSlides(markdown).length;
  const job = await store.insertJob({
    markdown,
    contentHash: await contentHash(markdown),
    slideCount,
  });
  await bus.publish(job.id);
  await new Promise((resolve) => setTimeout(resolve, 200));

  const acquired = logs.filter((line) =>
    line.startsWith("acquired local render lock"),
  ).length;
  const conflicts = logs.filter((line) =>
    line.startsWith("duplicate slide persist"),
  ).length;
  const progress = await cache.getProgress(job.id);

  return {
    replicas,
    acquired,
    conflicts,
    progress,
    slideCount,
    logs,
  };
}
