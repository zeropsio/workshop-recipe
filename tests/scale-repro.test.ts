import { describe, expect, it } from "vitest";
import { runScaleRepro } from "@deck/engine";

describe("multi-replica rendering", () => {
  it("characterizes replica behaviour at the prod floor (3 replicas)", async () => {
    const result = await runScaleRepro(3);
    expect(result.acquired).toBeGreaterThan(1);
    expect(result.progress).toBeGreaterThan(result.slideCount);
  });

  it("characterizes replica behaviour at the dev demo scale (5 replicas)", async () => {
    const result = await runScaleRepro(5);
    expect(result.acquired).toBeGreaterThan(1);
    expect(result.progress).toBeGreaterThan(result.slideCount);
  });
});
