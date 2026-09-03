import type { ReactNode } from "react";
import { WorkshopNav } from "@/components/WorkshopNav";
import { SiteLogo } from "@/SiteLogo";
import { CouponBanner } from "@/CouponBanner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeployedStackDiagram } from "@/components/DeployedStackDiagram";
import { WorkshopPillars } from "@/components/WorkshopPillars";
import { WorkshopQrCodes } from "@/components/WorkshopQrCodes";
import { undrawnServices, workshopEnvToNetworkDiagram } from "@/lib/recipe-to-network-diagram";
import { resolveWorkshopEnv } from "@/lib/workshop-envs";
import { AGENDA, LINKS, WORKSHOP } from "@/workshop-config";

const SECTION = "px-4 py-16 sm:px-6 lg:py-20";
const CONTAINER = "mx-auto max-w-6xl lg:max-w-5xl";
const SECTION_TITLE = "text-2xl font-semibold tracking-tight text-foreground sm:text-[1.625rem]";
const SECTION_DESC = "mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground";
const SECTION_BODY = "mt-8";

function SectionHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h2 className={SECTION_TITLE}>{title}</h2>
        <div className={`${SECTION_DESC} space-y-2`}>
          {typeof description === "string" ? <p>{description}</p> : description}
        </div>
      </div>
      {aside ? <p className="shrink-0 text-sm text-muted-foreground">{aside}</p> : null}
    </div>
  );
}

type WorkshopHomeProps = {
  onOpenApp?: () => void;
  onOpenPrompts?: () => void;
  onOpenCapabilities?: () => void;
};

export function WorkshopHome({ onOpenApp, onOpenPrompts, onOpenCapabilities }: WorkshopHomeProps) {
  const { env, resolved } = resolveWorkshopEnv();
  const endpoint = `HTTPS://${window.location.host.toUpperCase()}`;
  const networkDiagram = env ? workshopEnvToNetworkDiagram(env, endpoint) : null;
  const undrawn = env ? undrawnServices(env).map((service) => service.name) : [];

  return (
    <div className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(2,179,164,0.12),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(26,26,26,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,26,26,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />

      <WorkshopNav
        current="home"
        onOpenApp={onOpenApp}
        onOpenPrompts={onOpenPrompts}
      />

      <main className="relative z-10">
        <section className={`${CONTAINER} px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:pt-20`}>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
              {WORKSHOP.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{WORKSHOP.tagline}</p>
          </div>

          <WorkshopQrCodes className="mt-12 sm:mt-14" onOpenLearn={onOpenCapabilities} />
        </section>

        <section className={`border-b border-border bg-muted/60 ${SECTION}`}>
          <div className={CONTAINER}>
            <SectionHeader
              title="Your Deck Renderer on Zerops"
              description={
                <>
                  {env ? (
                    <p>
                      The <strong>{env.title}</strong> environment as its import.yaml defines it — public endpoint,
                      project core, L7 balancer, and every service the recipe created. Container counts are the
                      import-time minimums, not live values: scaling done later in ZCP or the GUI is not reflected
                      here.
                    </p>
                  ) : (
                    <p>
                      This build was made from a tree without <code>.zerops-recipe</code>, so there is no topology to
                      draw. The static frontend built from the repository shows it.
                    </p>
                  )}
                  {env && !resolved ? (
                    <p>
                      This build has no <code>VITE_WORKSHOP_ENV</code>, so the Stage topology is shown.
                    </p>
                  ) : null}
                  {undrawn.length > 0 ? (
                    <p>
                      Not drawn: {undrawn.join(", ")} — workspace containers the agent or a developer works in, not
                      part of the served app.
                    </p>
                  ) : null}
                </>
              }
            />
            <div className={`${SECTION_BODY} overflow-x-auto rounded-2xl bg-muted px-3 py-8 sm:px-6`}>
              {networkDiagram ? <DeployedStackDiagram config={networkDiagram} /> : null}
            </div>
          </div>
        </section>

        <section className={`border-y border-border bg-muted/60 ${SECTION}`}>
          <div className={CONTAINER}>
            <SectionHeader
              title="What you did"
              description="You used the Zerops recipe to deploy the stack, debugged on the platform, then extended the app in ZCP with predefined prompts."
              aside="Markdown → workers → PNG/PDF"
            />

            <ol className={`${SECTION_BODY} grid gap-4 sm:grid-cols-2 lg:grid-cols-4`}>
              {AGENDA.map(({ step, title, body }) => (
                <li key={step}>
                  <Card className="h-full border-border bg-card shadow-none">
                    <CardHeader className="space-y-3 pb-2">
                      <span className="font-mono text-xs text-primary">{step}</span>
                      <CardTitle className="text-base text-foreground">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-muted-foreground">{body}</CardDescription>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="coupon" className={`scroll-mt-20 border-b border-border ${SECTION}`}>
          <div className={CONTAINER}>
            <CouponBanner embedded />
          </div>
        </section>

        <section className={`border-b border-border bg-muted/60 ${SECTION}`}>
          <div className={CONTAINER}>
            <WorkshopPillars />
          </div>
        </section>

      </main>

      <footer className={`relative z-10 border-t border-border ${SECTION} pb-12 pt-10`}>
        <div className={`${CONTAINER} flex flex-col gap-8 sm:flex-row sm:justify-between`}>
          <a href={LINKS.zerops} target="_blank" rel="noreferrer" className="text-foreground">
            <SiteLogo />
          </a>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Product</p>
              <a
                className="block text-muted-foreground hover:text-foreground"
                href={LINKS.zerops}
                target="_blank"
                rel="noreferrer"
              >
                zerops.io
              </a>
              <a
                className="block text-muted-foreground hover:text-foreground"
                href={LINKS.app}
                target="_blank"
                rel="noreferrer"
              >
                App
              </a>
              <a
                className="block text-muted-foreground hover:text-foreground"
                href={LINKS.docs}
                target="_blank"
                rel="noreferrer"
              >
                Docs
              </a>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Community</p>
              <a
                className="block text-muted-foreground hover:text-foreground"
                href={LINKS.discord}
                target="_blank"
                rel="noreferrer"
              >
                Discord
              </a>
              <a
                className="block text-muted-foreground hover:text-foreground"
                href={LINKS.github}
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
