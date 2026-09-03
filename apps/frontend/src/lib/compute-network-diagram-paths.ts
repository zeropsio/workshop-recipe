import type {
  AnnotatedPath,
  ContainerSpec,
  NetworkServiceConfig,
} from "@/lib/network-diagram-types";

const RADIUS = 16;
const NEAR_GAP = 27;

function n(v: number): number {
  return Math.round(v * 10) / 10;
}

function branch(exit: [number, number], entry: [number, number], juncY: number): string {
  const [ex, ey] = exit;
  const [nx, ny] = entry;
  const dx = nx - ex;

  if (Math.abs(dx) < 3) {
    const mx = n((ex + nx) / 2);
    return `M${mx},${n(ey)}L${mx},${n(ny)}`;
  }

  const r = Math.min(RADIUS, Math.abs(dx) / 2, Math.abs(juncY - ey) / 2, Math.abs(ny - juncY) / 2);
  const hDir = Math.sign(dx);
  const vDir = Math.sign(ny - juncY) || 1;

  return [
    `M${n(ex)},${n(ey)}`,
    `L${n(ex)},${n(juncY - r)}`,
    `Q${n(ex)},${n(juncY)},${n(ex + r * hDir)},${n(juncY)}`,
    `L${n(nx - r * hDir)},${n(juncY)}`,
    `Q${n(nx)},${n(juncY)},${n(nx)},${n(juncY + r * vDir)}`,
    `L${n(nx)},${n(ny)}`,
  ].join("");
}

export type ComputePathsInput = {
  canvas: HTMLElement;
  scale: number;
  lightweight: boolean;
  infrastructure: { ctrl: ContainerSpec };
  routing: ContainerSpec;
  row1MainServices: NetworkServiceConfig[];
  row1SideServices: NetworkServiceConfig[];
  row2Services: NetworkServiceConfig[];
};

export function computeNetworkDiagramPaths(input: ComputePathsInput): AnnotatedPath[] {
  const {
    canvas,
    scale,
    lightweight,
    infrastructure,
    routing,
    row1MainServices,
    row1SideServices,
    row2Services,
  } = input;

  const canvasRect = canvas.getBoundingClientRect();
  if (canvasRect.width === 0) return [];

  const toNative = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - canvasRect.left) / scale,
      y: (r.top - canvasRect.top) / scale,
      w: r.width / scale,
      h: r.height / scale,
    };
  };

  const topCenter = (el: HTMLElement): [number, number] => {
    const r = toNative(el);
    return [r.x + r.w / 2, r.y];
  };

  const bottomCenter = (el: HTMLElement): [number, number] => {
    const r = toNative(el);
    return [r.x + r.w / 2, r.y + r.h];
  };

  const nodeEl = (id: string): HTMLElement | null =>
    canvas.querySelector(`[data-node-id="${id}"]`);

  interface BarTarget {
    point: [number, number];
    barIndex: number;
    active: boolean;
  }

  const barIconTargets = (nodeId: string, activeCount?: number): BarTarget[] => {
    const el = nodeEl(nodeId);
    if (!el) return [];
    return Array.from(el.querySelectorAll("[data-bar-icon]")).map((icon, idx) => ({
      point: topCenter(icon as HTMLElement),
      barIndex: idx,
      active: activeCount !== undefined ? idx < activeCount : true,
    }));
  };

  const all: AnnotatedPath[] = [];

  // Segment 1: endpoint → ctrl
  const endpointEl = nodeEl("endpoint");
  const ctrlTargets = barIconTargets("ctrl", infrastructure.ctrl.active);
  if (endpointEl && ctrlTargets.length) {
    const exit = bottomCenter(endpointEl);
    const minY = Math.min(...ctrlTargets.map((t) => t.point[1]));
    const juncY = minY - NEAR_GAP;
    for (const target of ctrlTargets) {
      all.push({
        d: branch(exit, target.point, juncY),
        depth: 0,
        sourceNodeId: "endpoint",
        targetNodeId: "ctrl",
        targetBarIndex: target.barIndex,
        active: target.active,
      });
    }
  }

  const ctrlEl = nodeEl("ctrl");
  const infraGroupEl = canvas.querySelector(".__infra-group") as HTMLElement | null;
  const l7El = nodeEl("l7");

  // Segment 2: ctrl → L7 (heavyweight) or ctrl → row1 (lightweight)
  if (!lightweight && ctrlEl && l7El && infraGroupEl) {
    const l7Targets = barIconTargets("l7", routing.active);
    if (l7Targets.length) {
      const ctrlX = bottomCenter(ctrlEl)[0];
      const infraBottomY = bottomCenter(infraGroupEl)[1];
      const exit: [number, number] = [ctrlX, infraBottomY];
      const minY = Math.min(...l7Targets.map((t) => t.point[1]));
      const juncY = minY - NEAR_GAP;
      for (const target of l7Targets) {
        all.push({
          d: branch(exit, target.point, juncY),
          depth: 1,
          sourceNodeId: "ctrl",
          targetNodeId: "l7",
          targetBarIndex: target.barIndex,
          active: target.active,
        });
      }
    }
  } else if (lightweight && infraGroupEl) {
    for (const svc of row1MainServices) {
      const targets = barIconTargets(svc.id, svc.containers.active);
      if (targets.length) {
        const exitX = bottomCenter(infraGroupEl)[0];
        const exitY = bottomCenter(infraGroupEl)[1];
        const exit: [number, number] = [exitX, exitY];
        const minEntryY = Math.min(...targets.map((t) => t.point[1]));
        const juncY = (exitY + minEntryY) / 2;
        for (const target of targets) {
          all.push({
            d: branch(exit, target.point, juncY),
            depth: 2,
            sourceNodeId: "ctrl",
            targetNodeId: svc.id,
            targetBarIndex: target.barIndex,
            active: target.active,
          });
        }
      }
    }
  }

  // Segment 3: L7 → row1 main services
  if (l7El && !lightweight) {
    for (const svc of row1MainServices) {
      const targets = barIconTargets(svc.id, svc.containers.active);
      if (targets.length) {
        const exit = bottomCenter(l7El);
        const minEntryY = Math.min(...targets.map((t) => t.point[1]));
        const juncY = (exit[1] + minEntryY) / 2;
        for (const target of targets) {
          all.push({
            d: branch(exit, target.point, juncY),
            depth: 2,
            sourceNodeId: "l7",
            targetNodeId: svc.id,
            targetBarIndex: target.barIndex,
            active: target.active,
          });
        }
      }
    }
  }

  // Segment 4: row1 → row2
  const STORAGE_OFFSET = 19;
  const COMPOUND_OFFSET = 11;

  const row2SideTargets: (BarTarget & { nodeId: string })[] = [];
  const row2CompoundTargets: (BarTarget & { nodeId: string })[] = [];

  for (const row2Svc of row2Services) {
    if (row2Svc.hasLoadBalancer && row2Svc.loadBalancer) {
      const lbId = `${row2Svc.id}-lb`;
      for (const t of barIconTargets(lbId, row2Svc.loadBalancer.containers.active)) {
        row2CompoundTargets.push({ ...t, nodeId: lbId });
      }
    } else {
      for (const t of barIconTargets(row2Svc.id, row2Svc.containers.active)) {
        row2SideTargets.push({ ...t, nodeId: row2Svc.id });
      }
    }
  }

  const storageEl = nodeEl("storage");
  const storagePt = storageEl ? topCenter(storageEl) : null;

  let sharedMainJuncY = 0;

  const connects = (svc: NetworkServiceConfig, nodeId: string): boolean =>
    !svc.dependsOn || svc.dependsOn.includes(nodeId);

  // Every row-1 runtime, main or side, branches to the row-2 services it depends on, all sharing one rail height so the lines
  // read as a bus. A runtime with an empty dependsOn (the static frontend) draws nothing here.
  const pushRow2Branches = (svc: NetworkServiceConfig, exit: [number, number], juncY: number) => {
    if (storagePt && connects(svc, "storage")) {
      all.push({
        d: branch(exit, storagePt, juncY - STORAGE_OFFSET),
        depth: 3,
        sourceNodeId: svc.id,
        targetNodeId: "storage",
        targetBarIndex: -1,
        active: true,
      });
    }

    for (const target of row2SideTargets) {
      if (!connects(svc, target.nodeId)) continue;
      all.push({
        d: branch(exit, target.point, juncY),
        depth: 3,
        sourceNodeId: svc.id,
        targetNodeId: target.nodeId,
        targetBarIndex: target.barIndex,
        active: target.active,
      });
    }

    for (const target of row2CompoundTargets) {
      const svcId = target.nodeId.replace(/-lb$/, "");
      if (!connects(svc, svcId)) continue;
      all.push({
        d: branch(exit, target.point, juncY + COMPOUND_OFFSET),
        depth: 3,
        sourceNodeId: svc.id,
        targetNodeId: target.nodeId,
        targetBarIndex: target.barIndex,
        active: target.active,
      });
    }
  };

  for (const row1Svc of row1MainServices) {
    const row1El = nodeEl(row1Svc.id);
    if (!row1El) continue;

    const exit = bottomCenter(row1El);

    const sideMinY = row2SideTargets.length
      ? Math.min(...row2SideTargets.map((t) => t.point[1]))
      : row2CompoundTargets.length
        ? Math.min(...row2CompoundTargets.map((t) => t.point[1]))
        : 0;
    const mainJuncY = Math.max(exit[1] + RADIUS, sideMinY - NEAR_GAP);
    sharedMainJuncY = mainJuncY;

    pushRow2Branches(row1Svc, exit, mainJuncY);
  }

  for (const sideSvc of row1SideServices) {
    const sideEl = nodeEl(sideSvc.id);
    if (!sideEl || !sharedMainJuncY) continue;
    pushRow2Branches(sideSvc, bottomCenter(sideEl), sharedMainJuncY);
  }

  // Segment 5: compound LB → managed service
  for (const row2Svc of row2Services) {
    if (row2Svc.hasLoadBalancer && row2Svc.loadBalancer) {
      const lbId = `${row2Svc.id}-lb`;
      const lbEl = nodeEl(lbId);
      const svcTargets = barIconTargets(row2Svc.id, row2Svc.containers.active);
      if (lbEl && svcTargets.length) {
        const exit = bottomCenter(lbEl);
        const minEntryY = Math.min(...svcTargets.map((t) => t.point[1]));
        const juncY = (exit[1] + minEntryY) / 2;
        for (const target of svcTargets) {
          all.push({
            d: branch(exit, target.point, juncY),
            depth: 4,
            sourceNodeId: lbId,
            targetNodeId: row2Svc.id,
            targetBarIndex: target.barIndex,
            active: target.active,
          });
        }
      }
    }
  }

  return all;
}
