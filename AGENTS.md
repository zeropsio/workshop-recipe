# workshop-recipe (Deck Renderer)

Markdown in, PNG/PDF slides out. The SPA submits a deck; the API records the
job and publishes work; workers render; Postgres stores results; Valkey carries
progress; the browser watches the queue over a WebSocket.

Deploy configuration is a repo-root `zerops.yaml` that you write. No Dockerfile.
Import manifests for six lifecycle environments live in [`.zerops-recipe/`](.zerops-recipe/) (one `import.yaml` per folder).

## Services the code expects

| Hostname | Process | Needs |
|----------|---------|--------|
| `frontend` | Vite SPA (`apps/frontend`) | Public HTTP, `VITE_API_URL` and `VITE_WORKSHOP_ENV` at build (the latter comes from the frontend service vault set by `import.yaml`) |
| `api` | `apps/api` | Public HTTP + WebSocket, `PORT`, `HOST`, `DATABASE_URL`, `NATS_*`, `VALKEY_URL` |
| `worker` | `apps/worker` | No public HTTP. Chromium + fonts. Same connection strings. `RENDER_DRIVER=chromium` |
| `db` | PostgreSQL | Migrations on API/worker boot |
| `queue` | NATS | Subject `deck.jobs` |
| `cache` | Valkey | Progress counters + pub/sub `deck:progress` |

Bind all interfaces (`HOST=::` on Zerops, `0.0.0.0` locally), never localhost. The API accepts any origin, so no CORS env is needed. Do not create `.env` files on Zerops — they shadow injected vars.

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

- Worker `prepareCommands` install Google Chrome + fonts on Ubuntu (`chromium` is a snap there). `CHROMIUM_PATH` is `/usr/bin/google-chrome-stable`.
- NATS is `NATS_HOST` / `NATS_PORT` / `NATS_USER` / `NATS_PASSWORD` — not a single connection string (colons in generated passwords).
- The `*-dev` setups share db, cache, and queue with stage but run in their own namespace: Postgres schema `DECK_DB_SCHEMA` in database `DB_NAME` (created on boot with `DB_ADMIN_USER` / `DB_ADMIN_PASSWORD`, the `db_superUser` pair, since the connection string carries no database path), Valkey database 1 via the `/1` suffix on `VALKEY_URL`, and `NATS_SUBJECT`. Leave all of them unset on stage and prod.
- Favicon and mark: `apps/frontend/public/zerops-logo.svg` (transparent; from zeropsio/recipe-shared-assets).

## Bug scope — deployment only

Inspect and fix **deployment-layer** bugs; leave application behaviour alone unless the
user asks for it. Deployment-layer = anything that stops the code the user wrote from
building, starting, or being reachable on Zerops: ports and `httpSupport`, bind address
(`0.0.0.0` vs localhost), `deployFiles` / `documentRoot` paths, `start` commands,
`prepareCommands` and missing runtime packages, env-var wiring and `${host_var}` refs,
build-vs-run phase mistakes, health/readiness checks, subdomain and routing.

NOT yours by default: business logic, algorithms, UI/UX, styling, copy, test failures
unrelated to deploy, refactors, dependency upgrades, "while I'm in here" cleanups. Seeing
one in passing is fine — SAY it in a sentence, don't fix it. A red test or a wrong-looking
function is a report, not a work item.

Boundary case: an app-code change is in scope when it is the only way to make the deploy
work (e.g. the app hardcodes a port the platform can't route). Name the constraint, make
the smallest change that clears it, and say what you changed and why.

## Env vars — reference, don't hardcode

Never bake a hostname, port, URL, connection string, or credential into `zerops.yaml` or
app code as a literal. Wire it as a `${hostname_KEY}` reference and let the platform
resolve it at deploy time. This holds in `run.envVariables` AND `build.envVariables` —
cross-service refs resolve in both (verified: a build-time `VITE_API_URL:
${api_zeropsSubdomain}` lands resolved in the bundle, no `${...}` literal left).

A hardcoded value is correct in exactly one project and silently wrong in every other one
— the same yaml promoted to a prod project keeps pointing at dev. That is the failure mode
this rule exists to prevent, not a style preference.

Sanctioned literals (no env exists for them): runtime→runtime internal HTTP, written
`http://<hostname>:<port>` — plain http, private network, never https. And per-setup mode
flags (`NODE_ENV: production`).

Never self-shadow — `KEY: ${KEY}` and `db_hostname: ${db_hostname}` resolve to the literal
string `${...}` and fail at connect time. Destination name must differ from the source ref.

**`zeropsSubdomain` timing trap:** `${host_zeropsSubdomain}` resolves to
`https://{host}-{subdomainHost}-{port}` and the `-{port}` component only exists once that
service has a declared HTTP port — i.e. after its first deploy. A build-time consumer
(baked-in SPA config) that builds before its API has ever deployed gets the portless form,
which routes to nothing. On a first launch into an empty project, deploy the producer,
enable its subdomain, then re-release the consumer.

