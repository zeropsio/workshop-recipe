import { runReplicas } from "@deck/engine";

const replicas = Number(process.env.REPLICAS ?? 5);

async function main(): Promise<void> {
  const result = await runReplicas(replicas);

  console.log(`replicas=${result.replicas}`);
  console.log(`acquired=${result.acquired}`);
  console.log(`conflicts=${result.conflicts}`);
  console.log(`progress=${result.progress} (slide count is ${result.slideCount})`);
  for (const line of result.logs) console.log(line);

}

void main();
