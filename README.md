# Deck Renderer

<!-- #ZEROPS_EXTRACT_START:intro# -->
Workshop app for [Zerops](https://zerops.io): submit markdown, workers render
each section to PNG/PDF, and the browser shows live queue depth. Topology is
SPA + API + worker + Postgres + NATS + Valkey. Deploy from [`.zerops-recipe/`](.zerops-recipe/)
(one environment per folder + repo-root `zerops.yaml`).
<!-- #ZEROPS_EXTRACT_END:intro# -->

[![Deploy on Zerops](https://github.com/zeropsio/recipe-shared-assets/blob/main/deploy-button/light/deploy-button.svg)](https://app.zerops.io/recipes/detail?github=https://github.com/zeropsio/workshop-recipe)

Environments (via [`.zerops-recipe/`](.zerops-recipe/)):

- **AI Agent** — [deploy](https://app.zerops.io/recipes/detail?github=https://github.com/zeropsio/workshop-recipe&environment=ai-agent)
- **Remote (CDE)** — [deploy](https://app.zerops.io/recipes/detail?github=https://github.com/zeropsio/workshop-recipe&environment=remote-cde)
- **Local** — [deploy](https://app.zerops.io/recipes/detail?github=https://github.com/zeropsio/workshop-recipe&environment=local)
- **Stage** — [deploy](https://app.zerops.io/recipes/detail?github=https://github.com/zeropsio/workshop-recipe&environment=stage)
- **Small Production** — [deploy](https://app.zerops.io/recipes/detail?github=https://github.com/zeropsio/workshop-recipe&environment=small-production)
- **Highly-available Production** — [deploy](https://app.zerops.io/recipes/detail?github=https://github.com/zeropsio/workshop-recipe&environment=highly-available-production)

<!-- #ZEROPS_EXTRACT_START:integration-guide# -->
## Run locally

```bash
npm install
npm test
npm run build
npm run dev
```

Open `http://localhost:5173`. The API listens on `:3000` with an in-memory
store and a stub renderer when `DATABASE_URL` / `NATS_URL` / `VALKEY_URL` are
unset.

On Zerops the SPA needs its API origin at build time, and the API and worker
both need the database, queue, and cache connections. The worker additionally needs a headless browser and fonts
installed in its runtime. See `AGENTS.md` for what each process reads.

Slides are split on a line that is only `---`.
<!-- #ZEROPS_EXTRACT_END:integration-guide# -->

## Layout

```
apps/frontend   Vite + React SPA
apps/api        REST + WebSocket
apps/worker     render process
packages/shared types, slide split
packages/engine jobs, lock, render, adapters
.zerops-recipe/ deploy manifests (six lifecycle environments)
```

Regression: `npm test`. That suite is the proof a change did not break the app.

Need help? [Zerops Discord](https://discord.gg/zeropsio).
