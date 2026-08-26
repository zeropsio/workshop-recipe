# Deck Renderer — attendee guide

**From Prompt to Prod: Build and Deploy with ZCP**

You'll build a real multi-service app, deploy it to Zerops, scale it under
load, find out what happens when you do, ship a fix through review, and put
it into production.

You work by *talking to an agent* in ZCP. You are not typing deploy commands
by hand — you describe what you want, the agent does it, and you check the
result. The checks matter more than the prompts.

---

## What you're building

**Deck Renderer** — paste Markdown, workers render each slide to PNG and PDF,
the browser watches the queue live.

| Service | What it does |
|---|---|
| `frontend` | Vite SPA — the editor and live queue |
| `api` | REST + WebSocket, Fastify |
| `worker` | Renders slides with headless Chromium |
| `db` | PostgreSQL — jobs and slides |
| `queue` | NATS — job distribution |
| `cache` | Valkey — progress counters |

Six services. You will not write the app — it already exists. **You write the
deploy configuration**, which is the part that doesn't.

---

## Before you start

1. A **Zerops account** — sign in at [app.zerops.io](https://app.zerops.io).
2. Your **own copy of the repo** — use *Use this template* on the workshop
   repo so you get a repo you control.
3. A **Zerops project** with a **ZCP** service. This is your workspace: the
   agent lives here.

> **You do not need a GitHub token yet.** Deploys to dev go straight into the
> container — no git involved. You'll create a token in Part 4, when you
> actually push something.

---

## Part 1 — Get it running

### 1.1 Clone the repo into your workspace

> **Prompt:** Clone `https://github.com/<you>/<your-repo>` into this workspace.

It's public, so no credential is needed.

### 1.2 Let the agent provision the services

Tell it what you want, in your own words:

> **Prompt:** Import this repo and deploy it into this project. It needs a
> frontend, an API and a worker, plus PostgreSQL, NATS and Valkey. Read
> AGENTS.md first — it describes what each service needs.

The agent reads `AGENTS.md`, works out the topology, and provisions.

**✅ Check:** ask for the service list. You should see six services, all
`ACTIVE`. `db`, `queue` and `cache` come up first — the app can't start
without them.

### 1.3 The part that isn't written for you

There's no `zerops.yaml` in the repo. That file tells Zerops how to build,
deploy and run each service, and **writing it is the exercise**. The agent
will draft it; your job is to understand what it wrote.

> **Prompt:** Walk me through the zerops.yaml you wrote. For each service,
> explain what the build step does and what the runtime needs.

Three things worth pushing on:

- **Why does `worker` need `prepareCommands`?** (What does rendering need
  that a plain Node container doesn't have?)
- **Why does the SPA need its API URL at *build* time**, not run time?
- **Why is NATS wired as four separate variables** instead of one connection
  string?

Each answer is a real Zerops concept. If the agent can't explain one, that's
a good sign it guessed.

### 1.4 Deploy and verify

Three services need deploying, and they do **not** have to go one at a time.
The agent can batch them — the builds then run concurrently instead of
end-to-end, which is roughly three times faster.

> **Prompt:** Deploy all three runtime services in parallel, then verify each
> one and give me the public URLs.

If the agent deploys them sequentially, ask it to use a parallel deploy
instead — it's a good habit for any multi-service project.

**✅ Check:** open the frontend URL. You should get the workshop page, and
*Open Deck Renderer* takes you to the editor.

**✅ Check:** submit the sample deck. Slides should appear, and the PDF
should download. If slides render as empty boxes, the worker is missing
fonts — tell the agent.

---

## Part 2 — Scale it

The worker is CPU-bound: it runs a headless browser and screenshots slides.
It is the obvious thing to scale.

### 2.1 Get a baseline first

Submit a deck of **8–10 slides** and watch the **Render benchmark** panel
under the editor. Write down:

```
slides: ____    duration: ____    ms/slide: ____
```

This number is the whole point of the next step. Don't skip it.

### 2.2 Scale the worker

> **Prompt:** Scale the worker service to 3 containers and confirm all three
> are running.

**✅ Check:** confirm all three are actually running before continuing.

### 2.3 Run the same deck again

Same deck, same size. Compare `ms/slide` against your baseline — the
benchmark panel keeps recent runs so you can read them side by side.

### 2.4 So — did it get faster?

Whatever you observe, sit with it for a moment before asking the agent.
Three questions to hold:

- Three times the workers. Did you get anywhere near three times the speed?
- Is the progress counter telling you something odd?
- If the work *were* being shared evenly, what would you expect to see?

---

## Part 3 — Investigate

Don't ask the agent "what's wrong" yet. Look first — you'll understand the
answer far better if you've seen the evidence.

### Where to look

| Surface | How to reach it | What to look for |
|---|---|---|
| **Worker logs** | ask the agent for `worker` logs | What does each container say it's doing? |
| **Database logs** | ask for `db` logs | Is Postgres rejecting anything? |
| **The job itself** | `GET /api/jobs/<id>` | Does `progress` match `slideCount`? |
| **The `slides` table** | ask the agent to query it | How many rows? Which replica wrote each? |

### Reading the logs

> **Prompt:** Show me the worker logs for job `<id>` across all containers,
> in time order.

That single view is usually enough.

Ask yourself: how many containers claim to be working on this one job?

### Then bring in the agent

Once you have a theory, ask it to confirm or refute — and to show you the
code that explains what you saw. A good prompt is:

> Here's what I'm seeing: [your observation]. Diagnose it from the logs and
> the source, and show me the specific lines responsible.

Push back if it explains without evidence. "Show me the line" is a fair ask.

---

## Part 4 — Ship the fix

Now, and only now, does git appear.

### 4.1 Fix it on dev

> **Prompt:** Apply the fix you proposed, deploy it to dev, and prove it
> worked by re-running the same deck.

**✅ Check:** run your benchmark deck again. Does `ms/slide` finally improve
with 3 workers? Does `progress` match `slideCount`?

If it doesn't, the fix is wrong. Say so and iterate.

### 4.2 Create your token — now you need it

Fine-grained PAT at
[github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens):

- **Repository access:** *Only select repositories* → your repo
- ⚠️ Not *Public repositories* — that option is read-only and cannot push
- **Permissions:** `Contents: Read and write` — **that's all**

That scope is deliberate. It lets the agent push a branch and **stops it
merging anything.** Production is yours to release, not the agent's.

### 4.3 Push and open a PR

> **Prompt:** Commit this on a new branch and push it. Don't merge anything.

It will print a link:

```
remote: Create a pull request for 'fix/...' on GitHub by visiting:
remote:      https://github.com/<you>/<repo>/pull/new/fix/...
```

**You** open that PR. **You** read the diff. **You** merge it.

**✅ Check:** the merge is what deploys production. Confirm the change is
live before you call it done.

---

## Part 5 — Deploy to production

Production is a **separate Zerops project**. Its own network, its own
database, its own credentials. Nothing is shared with dev — that's the point.

### 5.1 Write the production topology

Your repo has no production import yet. Same deal as `zerops.yaml`: the agent
drafts it, you decide whether it's right.

> **Prompt:** Write an import.yaml for a production project running this same
> stack. Managed services should be highly available and the worker pool
> should run several containers. Explain each choice.

Three decisions worth arguing about before you accept it:

- **`corePackage`** — `SERIOUS` gives a dedicated core, better SLA and much
  higher build/egress limits. `LIGHT` is cheaper and allowed. Upgrading later
  costs $10, is irreversible, and briefly drops the project network.
- **`:ha` vs `:single`** on the managed services. `:ha` is a 3-node cluster
  with automatic failover — and it is **immutable**. Changing your mind later
  means deleting the service and its data. Decide now, not after.
- **Worker containers.** Runtimes have no `:ha` flag; for a runtime, "highly
  available" simply *is* the container count.

### 5.2 Merge first

Production builds from your repo, not from your dev containers. So the merge
from Part 4 has to have landed — `main` needs both `zerops.yaml` and your new
import file.

**✅ Check:** view both files on GitHub, on `main`. If they're not there,
production has nothing to build.

### 5.3 Create the project — you, not the agent

```bash
zcli project project-import import.yaml
```

Or in the dashboard: **Projects → Import project**, and paste the file.

This step is deliberately yours. The agent has no credential that can create
a project, and that's what keeps "agent broke production" off the table.

**✅ Check:** all services reach `ACTIVE`. Managed ones come up first.

### 5.4 Prove it

**✅ Check:** open the production frontend and submit a deck. Real slides,
real PDF — from a completely separate stack.

### 5.5 From now on

Merging to `main` rebuilds production. `buildFromGit` clones your repo, runs
the build from `zerops.yaml`, and ships it. No further imports needed.

That's the whole loop: **the agent iterates on dev, you release to
production.**

---

## Quick reference

| Want to | Ask the agent for |
|---|---|
| See all services and their state | the project's service list |
| Read logs | logs for `<hostname>`, errors only, last 15 min |
| Change container count | scale `<hostname>` to N containers |
| Get a public URL | the subdomain for `<hostname>` |
| Run a DB query | to query `db` from inside `api` |

**Rules that will save you time**

- Bind `0.0.0.0`, never `localhost` — binding loopback gives you a 502.
- Never create a `.env` file on Zerops. Empty values shadow injected ones.
- A deploy replaces the container. Anything not deployed is gone.
- Internal traffic between services is `http://`, never `https://`.

---

## If you get stuck

- **502 on the frontend** — usually nothing deployed yet, or the app bound
  to localhost.
- **Worker crashes on start** — it needs a working browser path and the
  database, queue and cache connection strings. Check what it's actually
  been given.
- **Slides render as empty boxes** — fonts missing in the worker image.
- **The agent claims something works** — ask it to prove it. A URL that
  returns 200 and a log line beat a confident sentence.

---

## Your coupon

The workshop page has a coupon worth **$100 in credit** — top up $10 as a
verification payment, enter the code on the payment screen, and you're set.
It's in the *Get your workshop coupon* section of the app you just deployed.

Questions afterwards: **[Zerops Discord](https://discord.gg/zeropsio)**.
