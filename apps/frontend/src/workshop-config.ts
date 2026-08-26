export const WORKSHOP = {
  title: "From Prompt to Prod: Build and Deploy with ZCP",
  tagline: "Build and Deploy with ZCP",
  description:
    "You built a real app with an AI coding agent and took it from prompt to deployment with ZCP — a multi-service stack on Zerops, scaled and debugged while keeping production under control.",
  coupon: {
    code: "CYC2026",
    verificationPaymentUsd: 10,
    defaultBonusUsd: 50,
    workshopBonusUsd: 100,
    defaultTotalUsd: 75,
    workshopTotalUsd: 125,
  },
  repo: "https://github.com/zeropsio/workshop-recipe",
  appName: "Deck Renderer",
} as const;

export const LINKS = {
  zerops: "https://zerops.io",
  app: "https://app.zerops.io",
  /** Credit & Spend — top-up and coupon entry after signup. */
  payment: "https://app.zerops.io/dashboard/finances",
  paymentDocs: "https://docs.zerops.io/company/payment",
  docs: "https://docs.zerops.io",
  recipeDocs: "https://docs.zerops.io/recipes",
  discord: "https://discord.gg/zeropsio",
  github: "https://github.com/zeropsio",
} as const;

export const AGENDA = [
  {
    step: "01",
    title: "Prompted",
    body: "Described the Deck Renderer — markdown in, PNG/PDF slides out — and had the agent scaffold the monorepo in ZCP.",
  },
  {
    step: "02",
    title: "Built",
    body: "Frontend, API, and workers with PostgreSQL, NATS, and Valkey. The agent provisioned services on Zerops as you went.",
  },
  {
    step: "03",
    title: "Recipe",
    body: "Authored the Zerops recipe — import.yaml and zerops.yaml — so the app deploys with one click. You wrote it live; nothing pre-published.",
  },
  {
    step: "04",
    title: "Deployed",
    body: "Ran your pipeline, shipped to dev, then production. Scaled workers and watched the queue in the browser.",
  },
  {
    step: "05",
    title: "Debugged",
    body: "Queried logs by hostname. Kept production credentials out of the agent's hands.",
  },
] as const;

export const STACK = [
  { name: "frontend", role: "Vite SPA" },
  { name: "api", role: "REST + WebSocket" },
  { name: "worker", role: "Chromium renders" },
  { name: "db", role: "PostgreSQL" },
  { name: "queue", role: "NATS jobs" },
  { name: "cache", role: "Valkey progress" },
] as const;
