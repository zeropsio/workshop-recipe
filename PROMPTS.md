# ZCP workshop prompts

Copy-paste these into ZCP during the workshop, in this order. Each prompt is scoped so the agent
can finish in a few minutes without touching unrelated parts of the app. The third one is the
largest — treat it as the stretch goal.

---

## 1. Slide count in the editor

```
In the Deck Renderer app (/app), show a live slide count in the markdown
editor header — e.g. "3 slides" — that updates as the user types. Do not
change API or worker behaviour.

Context: two counters already exist and stay as they are — the "1 / N" pager
above the live preview and the "N draft slides" line in the render panel.
This task adds a third one, visible next to the editor itself. Do not use the
job `slideCount` state — that is rendered-slide progress after submit, not
the live draft count.

1. apps/frontend/src/DeckApp.tsx — the editor pane (left column) has only an
   sr-only <label> today. Add a visible header above the textarea that
   mirrors the "Live preview" header on the right:
   - Title: "Markdown"
   - Count: "${drafts.length} slide" / "slides" (pluralize)
   - tabular-nums + muted text, same weight as the preview pager

2. Reuse the existing `drafts` memo. It already calls `splitSlides(source)`
   from `@deck/shared` (split on a line that is only `---`). Do not write a
   second parser.

3. Verify on /app: the sample deck shows "3 slides"; deleting a `---` divider
   drops the count immediately; an empty editor shows "1 slide"
   (`splitSlides` fallback). The preview pager still matches drafts.length.
```

---

## 2. Dark Zerops theme

```
Switch the workshop frontend from the current light theme to a dark theme:
charcoal backgrounds, Zerops teal accents, light readable text, and the
existing zerops-logo.svg. Layout and copy stay the same. Do not change API
or worker behaviour.

1. apps/frontend/src/styles.css — replace the light :root tokens with dark
   ones (background, foreground, card, popover, secondary, muted, accent,
   border, input; keep primary teal). Update .slide-prose and
   .inventory-prose for light-on-dark. There is no .dark class and no dark:
   variant anywhere in the app — rewriting :root is the whole mechanism, do
   not add a class toggle.

2. Components use semantic tokens (bg-background, bg-card, text-foreground,
   text-muted-foreground, border-border, text-primary), so flipping :root
   covers most of the UI. Two hardcoded palettes are intentional and must
   stay: the white panel behind the QR codes in WorkshopQrCodes.tsx (QR codes
   need a white background to scan) and the white-on-black slide render
   overlay in DeckApp.tsx.

3. Fix the remaining light-only pieces — tokens alone will not reach them:
   - WorkshopHome.tsx / WorkshopPrompts.tsx — the grid overlay lines are
     rgba(26,26,26,0.05); make them white at ~3% opacity
   - components/diagram/network-diagram.css — darken the three light grey
     box backgrounds: .__project (#f0f0f0), .__zone (rgba(232,231,231,0.5))
     and the service card group (#d8d7d7). Also replace the pale teal
     --alt-card-banner-bg (#cbe7e4) used by the project core and L7 balancer
     cards with a dark teal, otherwise their labels are unreadable. Leave
     node icons, strokes and the teal trace as they are
   - download-coupon-image.ts — COLORS for the coupon PNG: dark card on
     charcoal, light text, teal accent kept

4. Verify /, /app, /prompts, and /capabilities look cohesive in dark mode
   with readable text everywhere, including the deployed-stack diagram on
   the homepage and a downloaded coupon image.
```

---

## 3. Basic auth on the deck app

```
Protect the Deck Renderer API with HTTP Basic Auth and make the frontend ask
for credentials when the user opens the deck app (/app). The homepage,
/prompts and /capabilities stay public. Credentials come from env vars —
never hardcode a username or password, and never bake them into the Vite
bundle (no VITE_* secrets). Leave /health open so Zerops readiness and
health checks keep passing. Do not change worker behaviour.

1. apps/api/src/app.ts — Fastify onRequest hook:
   - If WORKSHOP_AUTH_USER or WORKSHOP_AUTH_PASSWORD is unset, skip auth
     (local `npm run dev` and the existing tests stay open)
   - Always allow GET /health
   - Allow /ws (browsers cannot send Basic headers on a WebSocket)
   - Everything else requires Authorization: Basic … matching the env vars
   - On failure: 401 and WWW-Authenticate: Basic realm="Workshop"
   - No CORS change is needed — the existing config already reflects the
     request headers

2. apps/frontend — a small login gate around the deck app only (e.g.
   DeckAuthGate wrapping DeckApp):
   - On open, GET ${VITE_API_URL}/api/queue with no credentials
   - 200 → auth is off, render the app
   - 401 → show a minimal username/password form with back to home button
     built from the existing Card and Button components, inputs styled
     like the Textarea, current theme tokens — match the existing UI,
     no new styling system
   - On submit, retry /api/queue with the Basic header; on 200 store the
     header value in sessionStorage so a refresh does not re-prompt, on 401
     show an error and keep the form

3. apps/frontend/src/DeckApp.tsx — send the stored Authorization header on
   every fetch to the API (queue, jobs, slides, pdf). Do not put it in the
   WebSocket URL.

4. Env vars: do NOT add WORKSHOP_AUTH_USER or WORKSHOP_AUTH_PASSWORD to
   zerops.yaml. A key under run.envVariables (even empty or KEY: ${KEY}) owns
   that key and the platform then rejects a secret of the same name. Set both
   as secret environment variables on the api service you are working
   against (apidev while developing, apistage when you deploy there). A
   running process keeps its boot-time env, so restart the API process after
   setting them.

5. Verify: with the env unset, /app works as today and GET /health is 200.
   With both set, a request without Authorization gets 401 and /health stays
   200; after signing in, the deck app loads and Create slides succeeds; /
   stays reachable without signing in.
```
