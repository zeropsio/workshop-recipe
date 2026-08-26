# workshop-recipe (Deck Renderer)

Markdown in, PNG/PDF slides out. The SPA submits a deck; the API records the
job and publishes work; workers render; Postgres stores results; Valkey carries
progress; the browser watches the queue over a WebSocket.

Deploy configuration is a repo-root `zerops.yaml` that you write. No Dockerfile.

## Services the code expects

| Hostname | Process | Needs |
|----------|---------|--------|
| `frontend` | Vite SPA (`apps/frontend`) | Public HTTP, `VITE_API_URL` at build |
| `api` | `apps/api` | Public HTTP + WebSocket, `PORT`, `APP_URL` (CORS), `DATABASE_URL`, `NATS_URL`, `VALKEY_URL` |
| `worker` | `apps/worker` | No public HTTP. Chromium + fonts. Same connection strings. `RENDER_DRIVER=chromium` |
| `db` | PostgreSQL | Migrations on API/worker boot |
| `queue` | NATS | Subject `deck.jobs` |
| `cache` | Valkey | Progress counters + pub/sub `deck:progress` |

Bind `0.0.0.0`. Do not create `.env` files on Zerops — they shadow injected vars.

## Local

```bash
npm install
npm test
npm run build
npm run dev
```

`npm run dev` starts the API (in-memory store + inline stub worker) on `:3000`
and the Vite SPA on `:5173`. Connection strings are optional locally.

## Commands

| Where | Command |
|-------|---------|
| API | `npm run dev -w @deck/api` / `npm run start -w @deck/api` |
| Worker | `npm run start -w @deck/worker` |
| Frontend | `npm run dev -w @deck/frontend` |
| In-container rebuild | `npm run build` |
| Proof | `npm test` |

**Platform operations go through `zcp` MCP tools. Do not shell out to `zcli`.**

## Notes

- Worker render is CPU-bound. Horizontal scale on `worker` is the meaningful lever.
- Worker `prepareCommands` install Google Chrome + fonts on Ubuntu (`chromium` is a snap there). `CHROMIUM_PATH` is `/usr/bin/google-chrome-stable`.
- NATS is `NATS_HOST` / `NATS_PORT` / `NATS_USER` / `NATS_PASSWORD` — not a single connection string (colons in generated passwords).
- `LOG_QUERY_URL` / `LOG_QUERY_TOKEN` belong on the `zcp` service only. They reach a **different project** over HTTPS.
- Favicon and mark: `apps/frontend/public/zerops-logo.svg` (transparent; from zeropsio/recipe-shared-assets).
