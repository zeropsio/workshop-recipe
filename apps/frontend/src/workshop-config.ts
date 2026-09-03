export const WORKSHOP = {
  title: "Zerops AI workshop",
  tagline: "Cloud platform for developers and their coding agents",
  description:
    "You deployed a real multi-service app on Zerops with the recipe, then extended and debugged it in ZCP — frontend, API, workers, PostgreSQL, NATS, and Valkey, with production kept under control.",
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
  /** Public short host for floor QR codes — attach this custom domain to frontend. */
  shortHost: "cyc.zerops.io",
} as const;

/** One-click recipe import — AI Agent environment. */
export const RECIPE_DEPLOY_URL =
  "https://app.zerops.io/recipes/detail?github=https://github.com/zeropsio/workshop-recipe&environment=ai-agent";

/** Floor QR short URL — /deploy on the workshop custom domain redirects to the recipe. */
export const RECIPE_DEPLOY_SHORT_URL = `https://${WORKSHOP.shortHost}/deploy`;

export const LINKS = {
  zerops: "https://zerops.io",
  app: "https://app.zerops.io",
  recipes: "https://app.zerops.io/recipes",
  recipeDeploy: RECIPE_DEPLOY_URL,
  /** Credit & Spend — top-up and coupon entry after signup. */
  payment: "https://app.zerops.io/dashboard/finances",
  paymentDocs: "https://docs.zerops.io/company/payment",
  docs: "https://docs.zerops.io",
  recipeDocs: "https://docs.zerops.io/recipes",
  discord: "https://discord.gg/zeropsio",
  github: "https://github.com/zeropsio",
  capabilityGist: "https://gist.github.com/fxck/abb186df2df39e672063baa6273c7de1",
} as const;

/** Workshop floor QR targets — build track vs capability inventory. */
export const WORKSHOP_QR_CODES = [
  {
    id: "build",
    title: "Build with us",
    description: "Deck Renderer recipe — deploy and follow along in ZCP.",
    href: RECIPE_DEPLOY_SHORT_URL,
    urlLabel: RECIPE_DEPLOY_SHORT_URL.replace(/^https:\/\//, ""),
    chatLinks: false,
  },
  {
    id: "learn",
    title: "Learn about Zerops",
    description: "What the platform ships today, and what is on the roadmap.",
    href: "/capabilities",
    urlLabel: "Capability inventory",
    chatLinks: true,
  },
] as const;

const ASK_INVENTORY =
  "Please read this Zerops platform capability inventory and help me understand what Zerops can do today and what is planned:\n\n";

export function capabilityMarkdownUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/capabilities.md`;
}

export function openInChatGptUrl(docUrl: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(`${ASK_INVENTORY}${docUrl}`)}`;
}

export function openInClaudeUrl(docUrl: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(`${ASK_INVENTORY}${docUrl}`)}`;
}

/** Promo link — coupon code is URL-safe base64 without padding. */
export function couponPromoUrl(code: string): string {
  const encoded = btoa(code).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `https://app.zerops.io/promo/${encoded}`;
}

export const AGENDA = [
  {
    step: "01",
    title: "Used the recipe",
    body: "Imported the Deck Renderer from `.zerops-recipe/` and deployed the full stack — frontend, API, worker, PostgreSQL, NATS, and Valkey.",
  },
  {
    step: "02",
    title: "Deployed",
    body: "Ran pipelines, opened the app, scaled workers, and watched markdown flow through the queue to PNG/PDF slides.",
  },
  {
    step: "03",
    title: "Debugged",
    body: "Queried logs by hostname, traced jobs across services, and kept production credentials out of the agent's hands.",
  },
  {
    step: "04",
    title: "Used ZCP prompts",
    body: "Extended the app with three predefined ZCP prompts: live slide count, dark theme, and basic auth on the deck app.",
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

/** Four pillars — companion to presentation summary slide 3 (mirrors frontend-legacy selling-points layout). */
export const ZEROPS_PILLARS = [
  {
    title: "Advanced affordable PaaS",
    bullets: [
      "Containers, managed databases, object storage, and private networking — all in one project.",
      "L3/L7 balancers, env vars, logs, metrics, autoscaling, and SSL out of the box.",
      "Minute-based pricing with no seat fees — scale from solo dev to production traffic.",
    ],
  },
  {
    title: "Full lifecycle — remote dev to HA prod",
    bullets: [
      "Identical infrastructure from local or remote development through staging to highly available production.",
      "You or your coding agent work on the same hostnames, pipeline, and managed services.",
      "No more “but it works on my machine” — only resource sizing differs between environments.",
    ],
  },
  {
    title: "Bring your own agent subscription",
    bullets: [
      "Use Claude Code, Codex, Antigravity, or Grok on the subscription you already pay for.",
      "ZCP teaches your agent the platform — deploy, logs, scale, env vars — without reselling tokens.",
      "Roughly 15× cheaper than platforms that bundle and mark up LLM access.",
    ],
  },
  {
    title: "Any tech stack — legacy becomes AI-ready",
    bullets: [
      "Node, Python, Go, PHP, Rust, static sites, VMs — deploy what you already run.",
      "A real database, queue, and deploy pipeline mean any app on Zerops is agent-operable.",
      "Drop a legacy monolith in and ZCP can extend, debug, and ship it like a greenfield stack.",
    ],
  },
] as const;
