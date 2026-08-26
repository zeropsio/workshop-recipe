import {
  ArrowRight,
  Bot,
  Bug,
  Layers,
  Rocket,
  Scale,
  Terminal,
  Ticket,
} from "lucide-react";
import { SiteLogo } from "@/SiteLogo";
import { CouponBanner } from "@/CouponBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AGENDA, LINKS, STACK, WORKSHOP } from "@/workshop-config";

const PILLS = [
  { label: "AI coding agent", Icon: Bot },
  { label: "ZCP workspace", Icon: Terminal },
  { label: "Multi-service app", Icon: Layers },
  { label: "Scale & observe", Icon: Scale },
  { label: "Production control", Icon: Bug },
] as const;

type WorkshopHomeProps = {
  onOpenApp?: () => void;
};

export function WorkshopHome({ onOpenApp }: WorkshopHomeProps) {
  return (
    <div className="relative min-h-svh overflow-x-hidden bg-[#12141a] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(94,234,212,0.18),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />

      <header className="relative z-10 border-b border-white/10 bg-[#12141a]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:max-w-5xl">
          <a href={LINKS.zerops} target="_blank" rel="noreferrer" className="text-white">
            <SiteLogo />
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button size="sm" asChild={!onOpenApp} onClick={onOpenApp}>
              {onOpenApp ? (
                <>
                  Open app
                  <ArrowRight />
                </>
              ) : (
                <a href="/app">
                  Open app
                  <ArrowRight />
                </a>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:max-w-5xl lg:pt-20">
          <Badge
            variant="secondary"
            className="mb-5 border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10"
          >
            <Rocket className="size-3" />
            Zerops workshop
          </Badge>

          <h1 className="max-w-4xl text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            From Prompt to Prod:{" "}
            <span className="bg-gradient-to-r from-primary via-teal-200 to-primary bg-clip-text text-transparent">
              Build and Deploy with ZCP
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:mt-6 sm:text-lg">
            {WORKSHOP.description}
          </p>

          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button
              size="lg"
              className="h-[3.25rem] w-full px-8 text-base font-semibold shadow-[0_0_50px_-10px_rgba(94,234,212,0.65)] transition-shadow hover:shadow-[0_0_60px_-8px_rgba(94,234,212,0.8)] sm:w-auto"
              asChild={!onOpenApp}
              onClick={onOpenApp}
            >
              {onOpenApp ? (
                <>
                  Open Deck Renderer
                  <ArrowRight />
                </>
              ) : (
                <a href="/app">
                  Open Deck Renderer
                  <ArrowRight />
                </a>
              )}
            </Button>
            <a
              href="#coupon"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              <Ticket className="size-4" aria-hidden="true" />
              Get your workshop coupon
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-2">
            {PILLS.map(({ label, Icon }) => (
              <li key={label}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                  <Icon className="size-3.5 text-primary" />
                  {label}
                </span>
              </li>
            ))}
          </ul>

        </section>

        <section className="border-y border-white/10 bg-[#0f1115]/80 px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl lg:max-w-5xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  What you did
                </h2>
                <p className="mt-2 max-w-xl text-sm text-zinc-400 sm:text-base">
                  You built the app and wrote the Zerops recipe yourself — no pre-published
                  recipe to import. The agent helped you do both in ZCP.
                </p>
              </div>
              <p className="text-sm text-zinc-500">Markdown → workers → PNG/PDF</p>
            </div>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {AGENDA.map(({ step, title, body }) => (
                <li key={step}>
                  <Card className="h-full border-white/10 bg-[#161922]/80 shadow-none">
                    <CardHeader className="space-y-3 pb-2">
                      <span className="font-mono text-xs text-primary">{step}</span>
                      <CardTitle className="text-base text-white">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-zinc-400">{body}</CardDescription>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl lg:max-w-5xl">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              The stack you deployed
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
              Six services on Zerops — frontend, API, worker, PostgreSQL, NATS, and Valkey —
              wired up by your agent and captured in the recipe you authored.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {STACK.map(({ name, role }) => (
                <div
                  key={name}
                  className="rounded-lg border border-white/10 bg-[#161922]/60 px-4 py-3"
                >
                  <p className="font-mono text-sm text-primary">{name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="coupon"
          className="scroll-mt-20 px-4 pb-14 sm:px-6 sm:pb-16"
        >
          <div className="mx-auto max-w-6xl lg:max-w-5xl">
            <CouponBanner embedded />
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:justify-between lg:max-w-5xl">
          <a href={LINKS.zerops} target="_blank" rel="noreferrer" className="text-white">
            <SiteLogo />
          </a>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Product</p>
              <a className="block text-zinc-400 hover:text-white" href={LINKS.zerops}>
                zerops.io
              </a>
              <a className="block text-zinc-400 hover:text-white" href={LINKS.app}>
                App
              </a>
              <a className="block text-zinc-400 hover:text-white" href={LINKS.docs}>
                Docs
              </a>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Community</p>
              <a className="block text-zinc-400 hover:text-white" href={LINKS.discord}>
                Discord
              </a>
              <a className="block text-zinc-400 hover:text-white" href={LINKS.github}>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
