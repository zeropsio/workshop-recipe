import { useEffect, useRef, type RefObject } from "react";
import type { AnnotatedPath } from "@/lib/network-diagram-types";

const TRACE_DRAW_MS = 600;
const TRACE_PULSE_MS = 1050;
const TRACE_STEP_STAGGER = 525;
const TRACE_FADE_MS = 900;
const TRACE_SPAWN_INTERVAL_MS = 3300;
const TRACE_SPAWN_JITTER_MS = 900;
const TRACE_INITIAL_DELAY_MS = 2250;
const WORKER_SPAWN_INTERVAL_MS = 2000;
const WORKER_SPAWN_JITTER_MS = 400;

type TraceInput = {
  hostRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLElement | null>;
  paths: AnnotatedPath[];
  row1SideServiceIds: string[];
};

function pickWeighted(
  candidates: AnnotatedPath[],
  counts: Map<string, number>,
): AnnotatedPath {
  if (candidates.length === 1) {
    const only = candidates[0];
    const key = `${only.targetNodeId}:${only.targetBarIndex}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return only;
  }

  const weights = candidates.map((candidate) => {
    const key = `${candidate.targetNodeId}:${candidate.targetBarIndex}`;
    const count = counts.get(key) ?? 0;
    return 1 / (count + 1);
  });

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = Math.random() * total;

  for (let i = 0; i < candidates.length; i++) {
    remaining -= weights[i];
    if (remaining <= 0) {
      const pick = candidates[i];
      const key = `${pick.targetNodeId}:${pick.targetBarIndex}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return pick;
    }
  }

  const last = candidates[candidates.length - 1];
  const key = `${last.targetNodeId}:${last.targetBarIndex}`;
  counts.set(key, (counts.get(key) ?? 0) + 1);
  return last;
}

function pickRandomRoute(paths: AnnotatedPath[], counts: Map<string, number>): number[] {
  const route: number[] = [];
  let prevTargetNodeId = "endpoint";

  for (let depth = 0; depth <= 4; depth++) {
    const candidates = paths.filter(
      (path) => path.depth === depth && path.sourceNodeId === prevTargetNodeId && path.active,
    );
    if (!candidates.length) break;

    const pick = pickWeighted(candidates, counts);
    route.push(paths.indexOf(pick));
    prevTargetNodeId = pick.targetNodeId;
  }

  return route;
}

function pickWorkerRoute(
  paths: AnnotatedPath[],
  sideServiceId: string,
  counts: Map<string, number>,
): number[] {
  const route: number[] = [];

  const depth3 = paths.filter(
    (path) =>
      path.depth === 3 &&
      path.sourceNodeId === sideServiceId &&
      path.active,
  );
  if (!depth3.length) return route;

  const pick3 = pickWeighted(depth3, counts);
  route.push(paths.indexOf(pick3));

  const depth4 = paths.filter(
    (path) => path.depth === 4 && path.sourceNodeId === pick3.targetNodeId && path.active,
  );
  if (depth4.length) {
    const pick4 = pickWeighted(depth4, counts);
    route.push(paths.indexOf(pick4));
  }

  return route;
}

function activateTrace(
  route: number[],
  paths: AnnotatedPath[],
  canvas: HTMLElement,
  svgLayer: SVGElement,
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const touchedEls: { el: Element; classes: string[] }[] = [];

  route.forEach((pathIdx, stepIndex) => {
    const path = paths[pathIdx];
    const stepDelay = stepIndex * TRACE_STEP_STAGGER;
    const pathEl = svgLayer.querySelector(`[data-path-idx="${pathIdx}"]`) as SVGPathElement | null;

    if (pathEl) {
      const len = path.cachedLength ?? Math.ceil(pathEl.getTotalLength());
      pathEl.style.setProperty("--path-len", String(len));
      touchedEls.push({
        el: pathEl,
        classes: ["__path-glow--active", "__path-glow--decay"],
      });

      timers.push(
        setTimeout(() => {
          pathEl.classList.add("__path-glow--active");
        }, stepDelay),
      );

      timers.push(
        setTimeout(() => {
          pathEl.classList.remove("__path-glow--active");
          pathEl.classList.add("__path-glow--decay");
        }, stepDelay + TRACE_DRAW_MS + TRACE_PULSE_MS),
      );

      timers.push(
        setTimeout(() => {
          pathEl.classList.remove("__path-glow--decay");
        }, stepDelay + TRACE_DRAW_MS + TRACE_PULSE_MS + TRACE_FADE_MS),
      );
    }

    if (path.targetBarIndex >= 0) {
      const pulseDelay = stepDelay + TRACE_DRAW_MS * 0.85;
      const nodeContainer = canvas.querySelector(`[data-node-id="${path.targetNodeId}"]`);
      const barEl = nodeContainer?.querySelectorAll("[data-bar-icon]")[path.targetBarIndex] as
        | HTMLElement
        | undefined;

      if (barEl) {
        touchedEls.push({ el: barEl, classes: ["__bar-icon--pulse"] });
        timers.push(
          setTimeout(() => {
            barEl.classList.add("__bar-icon--pulse");
          }, pulseDelay),
        );
        timers.push(
          setTimeout(() => {
            barEl.classList.remove("__bar-icon--pulse");
          }, pulseDelay + TRACE_PULSE_MS),
        );
      }
    }
  });

  return () => {
    timers.forEach((timer) => clearTimeout(timer));
    touchedEls.forEach(({ el, classes }) => el.classList.remove(...classes));
  };
}

export function useNetworkDiagramTrace({
  hostRef,
  canvasRef,
  paths,
  row1SideServiceIds,
}: TraceInput): void {
  const pathsRef = useRef(paths);
  const sideIdsRef = useRef(row1SideServiceIds);
  const selectionCountsRef = useRef(new Map<string, number>());
  const traceLoopRunningRef = useRef(false);
  const workerTraceActiveRef = useRef(false);
  const mainTimerRef = useRef(0);
  const workerTimerRef = useRef(0);
  const activeCleanupsRef = useRef(new Set<() => void>());

  pathsRef.current = paths;
  sideIdsRef.current = row1SideServiceIds;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const clearAllTraces = () => {
      activeCleanupsRef.current.forEach((cleanup) => cleanup());
      activeCleanupsRef.current.clear();
      selectionCountsRef.current.clear();
      workerTraceActiveRef.current = false;
    };

    const stopTraceLoop = () => {
      traceLoopRunningRef.current = false;
      window.clearTimeout(mainTimerRef.current);
      window.clearTimeout(workerTimerRef.current);
      clearAllTraces();
    };

    const runTrace = (route: number[]) => {
      const svgLayer = canvas.querySelector(":scope > .__svg-layer") as SVGElement | null;
      if (!route.length || !svgLayer) return;

      const cleanup = activateTrace(route, pathsRef.current, canvas, svgLayer);
      activeCleanupsRef.current.add(cleanup);

      const lifetime =
        route.length * TRACE_STEP_STAGGER + TRACE_DRAW_MS + TRACE_PULSE_MS + TRACE_FADE_MS + 100;
      window.setTimeout(() => {
        activeCleanupsRef.current.delete(cleanup);
        cleanup();
      }, lifetime);
    };

    const spawnMainTrace = () => {
      const currentPaths = pathsRef.current;
      if (!currentPaths.length) return;
      const route = pickRandomRoute(currentPaths, selectionCountsRef.current);
      if (route.length) runTrace(route);
    };

    const spawnWorkerTrace = () => {
      if (workerTraceActiveRef.current) return;

      const currentPaths = pathsRef.current;
      const sideIds = sideIdsRef.current;
      if (!currentPaths.length || !sideIds.length) return;

      const sideServiceId = sideIds[Math.floor(Math.random() * sideIds.length)];
      const route = pickWorkerRoute(currentPaths, sideServiceId, selectionCountsRef.current);
      if (!route.length) return;

      workerTraceActiveRef.current = true;
      runTrace(route);

      const lifetime =
        route.length * TRACE_STEP_STAGGER + TRACE_DRAW_MS + TRACE_PULSE_MS + TRACE_FADE_MS + 100;
      window.setTimeout(() => {
        workerTraceActiveRef.current = false;
      }, lifetime);
    };

    const startTraceLoop = () => {
      if (traceLoopRunningRef.current) return;
      traceLoopRunningRef.current = true;

      const scheduleMain = () => {
        spawnMainTrace();
        mainTimerRef.current = window.setTimeout(
          scheduleMain,
          TRACE_SPAWN_INTERVAL_MS + Math.random() * TRACE_SPAWN_JITTER_MS,
        );
      };
      mainTimerRef.current = window.setTimeout(scheduleMain, TRACE_INITIAL_DELAY_MS);

      if (sideIdsRef.current.length) {
        const scheduleWorker = () => {
          spawnWorkerTrace();
          workerTimerRef.current = window.setTimeout(
            scheduleWorker,
            WORKER_SPAWN_INTERVAL_MS + Math.random() * WORKER_SPAWN_JITTER_MS,
          );
        };
        workerTimerRef.current = window.setTimeout(scheduleWorker, TRACE_INITIAL_DELAY_MS + 600);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startTraceLoop();
        else stopTraceLoop();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(host);

    return () => {
      io.disconnect();
      stopTraceLoop();
    };
  }, [canvasRef, hostRef]);
}
