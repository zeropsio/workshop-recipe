# Deck Renderer — GUI recipe research

Canonical app repo: [zeropsio/workshop-recipe](https://github.com/zeropsio/workshop-recipe).
Pipeline: repo-root `zerops.yaml`. Sibling: `zerops-showcase` + `vue-static-hello-world`.

Conference-only projects (`workshop-dev` / `workshop-prod`)
live under `workshop/` in the app repo and are **not** these six GUI envs.

## Setups (`zerops.yaml`)

| Setup | import `zeropsSetup` | Runtime |
|-------|----------------------|---------|
| `frontend` | frontend | `static` (Nginx) |
| `frontend-dev` | frontenddev | `nodejs@22` |
| `api` | api | `nodejs@22` |
| `api-dev` | apidev | `nodejs@22` |
| `worker` | worker | `nodejs@22` + Chromium |
| `worker-dev` | workerdev | `nodejs@22` + Chromium |

Public URLs resolve from `${hostname_zeropsSubdomain}`. Mapped in
`zerops.yaml` — never as `envVariables` on import services.

## Scaling Considerations

| Setup | minRam | minFreeRamGB | Rationale |
|-------|--------|--------------|-----------|
| frontend (`static`) | 0.25 | 0.25 | Nginx SPA |
| frontend-dev | 0.5 | omit | Vite only |
| api | 0.5 | 0.25 | Node + pg + NATS + Valkey + WS |
| worker | 1 | 0.5 | Chromium + fonts |
| zcp (agent only) | 1 | 0.5 | Agent workspace |

| Env | Postgres | Notes |
|-----|----------|-------|
| Agent / remote / local / stage | `oltp-hobby` | Stage cheaper than small prod |
| Small Production | `oltp-staging` | Entry prod, no `minContainers` / no app autoscaling |
| HA Production | `oltp-staging` on `:ha@` | `corePackage: SERIOUS`, `minContainers: 2` |

Worker `minDisk: 2` on HA only (Chromium). No `maxRam` / `maxContainers`.
