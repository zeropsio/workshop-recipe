# Deck Renderer — Zerops recipe

See the [root README](../README.md).

## Recipe metadata

- **Name:** Deck Renderer
- **Shape:** app — fork this repo and deploy your own copy
- **Environments:** `AI Agent` · `Remote (CDE)` · `Local` · `Stage` · `Small Production` · `HA Production` — the dev-lifecycle ladder from an agent workspace through entry prod to HA

## Tagline

<!-- #ZEROPS_EXTRACT_START:intro# -->
Markdown-to-slide pipeline on [Zerops](https://zerops.io): a [React](https://react.dev) + [Vite](https://vite.dev) SPA, a Node API with WebSocket progress, and Chromium workers behind [NATS](https://nats.io), with PostgreSQL and Valkey. Horizontal worker scale is the workshop demo — submit markdown, watch the queue, download PNG/PDF slides.
<!-- #ZEROPS_EXTRACT_END:intro# -->

[![Deploy on Zerops](https://github.com/zeropsio/recipe-shared-assets/blob/main/deploy-button/light/deploy-button.svg)](https://app.zerops.io/recipes/detail?github=https://github.com/zeropsio/workshop-recipe)

## Overview

<!-- #ZEROPS_EXTRACT_START:overview# -->
Six services on one private network: a static **frontend** (workshop homepage + Deck Renderer SPA), a Node **api** (REST + WebSocket job progress), **worker** containers that render slides with headless Chrome, plus managed **PostgreSQL**, **NATS**, and **Valkey**.

Pipeline config lives in repo-root [`zerops.yaml`](../zerops.yaml). Each environment folder here ships an `import.yaml` that provisions the matching topology and points `buildFromGit` at this repository.

Pick the folder that matches how you work:

| Environment | Folder | Use when |
|-------------|--------|----------|
| AI Agent | [`0 — AI Agent`](./0%20—%20AI%20Agent/) | ZCP workspace + dev/stage pairs for coding agents |
| Remote (CDE) | [`1 — Remote (CDE)`](./1%20—%20Remote%20(CDE)/) | SSH into dev hostnames on Zerops |
| Local | [`2 — Local`](./2%20—%20Local/) | Laptop SPA/API against platform db/queue/cache/worker |
| Stage | [`3 — Stage`](./3%20—%20Stage/) | Single-container rehearsal tier |
| Small Production | [`4 — Small Production`](./4%20—%20Small%20Production/) | Entry prod (~5 users) |
| HA Production | [`5 — Highly-available Production`](./5%20—%20Highly-available%20Production/) | Two app containers + HA data stores |
<!-- #ZEROPS_EXTRACT_END:overview# -->

## Features

<!-- #ZEROPS_EXTRACT_START:features# -->
- **Workshop homepage** — resources diagram, ZCP prompts, and coupon banner at `/`
- **Deck Renderer SPA** — markdown editor and live render progress at `/app`
- **Worker scale story** — add worker containers and compare render times
- **Monorepo pipeline** — one `zerops.yaml`, one setup per role (`frontend`, `frontend-stage`, `frontend-dev`, `api`, `api-dev`, `worker`, `worker-dev`, plus `zcp` for the agent workspace)
- **No Dockerfile** — Node 22 + static Nginx + `prepareCommands` for Chrome on the worker
<!-- #ZEROPS_EXTRACT_END:features# -->

## First-run setup

<!-- #ZEROPS_EXTRACT_START:first-run# -->
1. Import the environment you need from the matching folder (`import.yaml` via GUI or zCLI).
2. Wait for **db**, **cache**, and **queue** (priority 10) before **api** and **worker** finish booting.
3. Deploy **api** before **frontend** on a fresh project so `${api_zeropsSubdomain}` includes the HTTP port in the SPA build.
4. Open the **frontend** subdomain — workshop home at `/`, app at `/app`.
5. Paste markdown, submit a job, and watch progress over WebSocket. Scale **worker** to speed up large decks.

Local proof without Zerops: `npm install && npm test && npm run dev` (in-memory store + stub renderer).
<!-- #ZEROPS_EXTRACT_END:first-run# -->

## Knowledge base

<!-- #ZEROPS_EXTRACT_START:knowledge# -->
### Architecture

| Hostname | Setup | Role |
|----------|-------|------|
| `frontend` (prod envs) / `frontendstage` / `frontenddev` | `frontend` / `frontend-stage` / `frontend-dev` | Vite SPA → static build; dev runs Vite by hand |
| `api` (prod envs) / `apistage` / `apidev` | `api` / `api` / `api-dev` | REST + `/ws` progress |
| `worker` (prod envs) / `workerstage` / `workerdev` | `worker` / `worker` / `worker-dev` | Chromium slide capture |
| `db` | — | PostgreSQL job metadata |
| `queue` | — | NATS subject `deck.jobs` |
| `cache` | — | Valkey progress counters |
| `zcp` | — | AI Agent workspace only |

Cross-service URLs use `${hostname_zeropsSubdomain}` in `zerops.yaml` — never hardcode regions or subdomains in import files.

### Environment variables

Managed connections (`DATABASE_URL`, `NATS_*`, `VALKEY_URL`) resolve from service hostnames in `zerops.yaml`. The SPA bakes `VITE_API_URL` at build time from `${api_zeropsSubdomain}` (`${apistage_zeropsSubdomain}` on `frontend-stage`, `${apidev_zeropsSubdomain}` on `frontend-dev`). In the AI Agent and Remote envs the `*dev` hostnames are workspaces and the `*stage` hostnames are the deploy target; bare `api` / `frontend` / `worker` exist only in the Stage, Local, and Production envs.

Each `import.yaml` also sets `VITE_WORKSHOP_ENV` in the frontend service vault (`ai-agent`, `remote-cde`, `local`, `stage`, `small-production`, `highly-available-production`). The Vite build lifts it with `${RUNTIME_VITE_WORKSHOP_ENV}` and the homepage uses it to draw the topology of the environment it was deployed from, derived from these import files at build time.

### Troubleshooting

- **Blank slides / 1×1 PNG** — worker missing Chrome or `RENDER_DRIVER=chromium`; redeploy **worker** after `prepareCommands` changes.
- **SPA calls wrong API** — redeploy **frontend** after **api** has a declared HTTP port; `${api_zeropsSubdomain}` is portless until the first api deploy.
- **Jobs stuck** — check **queue**, **cache**, and **worker** logs; confirm NATS subject `deck.jobs` and worker subscription.
<!-- #ZEROPS_EXTRACT_END:knowledge# -->
