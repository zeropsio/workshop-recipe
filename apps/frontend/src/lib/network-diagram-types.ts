/** Network topology diagram types — mirrors websites `network-diagram.model.ts`. */

export type ContainerSpec = {
  active: number;
  standby: number;
};

export type NetworkServiceCategory =
  | "http-runtime"
  | "side-runtime"
  | "tcp-runtime"
  | "managed";

export type NetworkServiceConfig = {
  id: string;
  label: string;
  category: NetworkServiceCategory;
  containers: ContainerSpec;
  techIcon?: string;
  /** Row-2 service ids this runtime connects to. Undefined means every row-2 service (the generic marketing diagram). */
  dependsOn?: string[];
  hasLoadBalancer?: boolean;
  loadBalancer?: {
    label?: string;
    containers: ContainerSpec;
  };
};

export type NetworkDiagramConfig = {
  endpoint: string;
  lightweight: boolean;
  infrastructure: {
    ctrl: ContainerSpec;
    stats: ContainerSpec;
    logger: ContainerSpec;
  };
  routing: ContainerSpec;
  services: NetworkServiceConfig[];
  storage?: {
    label?: string;
    sublabel?: string;
  };
};

export type AnnotatedPath = {
  d: string;
  depth: number;
  sourceNodeId: string;
  targetNodeId: string;
  targetBarIndex: number;
  active: boolean;
  renderMode?: "both" | "base-only" | "glow-only";
  cachedLength?: number;
};
