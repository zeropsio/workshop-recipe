# Conference projects

GUI recipe (six lifecycle envs): [`../.zerops-recipe/deck-renderer/`](../.zerops-recipe/deck-renderer/).

**Attendees:** deployed frontend **`/`** — workshop homepage; **`/app`** — Deck Renderer.

**Facilitator:** demo notes in [`FACILITATOR.md`](./FACILITATOR.md).

Two Zerops projects, imported by humans — not by the on-stage agent.
Logs are read from each project's own VictoriaLogs URL; there is no separate
log project.

| Folder | Project | What to import |
|--------|---------|----------------|
| `dev/` | `workshop-dev` | `zcp` only. Agent provisions the app. |
| `prod/` | `workshop-prod` | HA topology, no zcp. After the agent's `zerops.yaml` exists. |

See `FACILITATOR.md` for the scale bug and the demo beat.
