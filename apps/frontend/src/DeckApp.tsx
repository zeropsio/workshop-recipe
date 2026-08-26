import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ImageDown,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import MarkdownIt from "markdown-it";
import { splitSlides, type JobEvent, type SubmitJobResponse } from "@deck/shared";
import { SAMPLE_DECK } from "./sample";
import { SiteLogo } from "@/SiteLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LINKS } from "@/workshop-config";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

const markdown = new MarkdownIt({ html: false, linkify: false });

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)} s`;
  const m = Math.floor(s / 60);
  return `${m}m ${(s - m * 60).toFixed(1)}s`;
}

function wsUrl(): string {
  const url = new URL(API);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  return url.toString();
}

type DeckAppProps = {
  onHome?: () => void;
};

export function DeckApp({ onHome }: DeckAppProps) {
  const [source, setSource] = useState(SAMPLE_DECK);
  const [depth, setDepth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("Idle — submit a deck.");
  const [failed, setFailed] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPngs, setExportingPngs] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [renderPreviewOpen, setRenderPreviewOpen] = useState(false);
  const [renderSlideIndex, setRenderSlideIndex] = useState(0);

  // Render benchmark — wall clock from submit to job.done, kept per run so
  // successive runs (e.g. after scaling workers) can be compared directly.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [runs, setRuns] = useState<
    { at: number; slides: number; ms: number }[]
  >([]);

  const drafts = useMemo(() => splitSlides(source), [source]);
  const preview = drafts[Math.min(previewIndex, drafts.length - 1)] ?? "";

  useEffect(() => {
    if (previewIndex > drafts.length - 1) setPreviewIndex(Math.max(0, drafts.length - 1));
  }, [drafts.length, previewIndex]);

  // Tick the live timer while a render is in flight.
  useEffect(() => {
    if (!busy || startedAt === null) return;
    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);
    return () => window.clearInterval(tick);
  }, [busy, startedAt]);

  useEffect(() => {
    const socket = new WebSocket(wsUrl());
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as JobEvent;
      if (msg.type === "queue.depth") {
        setDepth(msg.depth);
        return;
      }
      if (msg.type === "job.accepted") {
        setDepth(msg.queueDepth);
        setJobId(msg.jobId);
        setSlideCount(msg.slideCount);
        setProgress(0);
        setDone(false);
        setFailed(false);
        setNote(`Accepted ${msg.jobId.slice(0, 8)}…`);
        return;
      }
      if (msg.type === "job.progress") {
        setJobId(msg.jobId);
        setSlideCount(msg.total);
        setProgress(msg.current);
        setNote(`Slide ${msg.current} / ${msg.total}`);
        return;
      }
      if (msg.type === "job.done") {
        setJobId(msg.jobId);
        setDone(true);
        setBusy(false);
        setFailed(false);
        setNote("Render complete.");
        void refreshDepth();
      }
    };
    return () => socket.close();
  }, []);

  // Freeze the clock and record the run. Guarded on startedAt so the
  // websocket and the poll fallback cannot both record the same job.
  useEffect(() => {
    if (!done || startedAt === null) return;
    const ms = Date.now() - startedAt;
    setElapsedMs(ms);
    setRuns((prev) =>
      [{ at: Date.now(), slides: slideCount, ms }, ...prev].slice(0, 5),
    );
    setStartedAt(null);
  }, [done, startedAt, slideCount]);

  useEffect(() => {
    if (!busy || !jobId || done || failed) return;
    const poll = window.setInterval(() => {
      void (async () => {
        const res = await fetch(`${API}/api/jobs/${jobId}`);
        if (!res.ok) return;
        const body = (await res.json()) as {
          status: string;
          slideCount: number;
          progress?: number;
        };
        if (body.progress !== undefined) {
          setProgress(body.progress);
          setSlideCount(body.slideCount);
          setNote(`Slide ${body.progress} / ${body.slideCount}`);
        }
        if (body.status === "done") {
          setDone(true);
          setBusy(false);
          setNote("Render complete.");
          void refreshDepth();
        }
        if (body.status === "failed") {
          setFailed(true);
          setBusy(false);
          setNote("Render failed.");
        }
      })();
    }, 2000);
    return () => window.clearInterval(poll);
  }, [busy, jobId, done, failed]);

  useEffect(() => {
    void refreshDepth();
  }, []);

  useEffect(() => {
    if (!renderPreviewOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRenderPreviewOpen(false);
      if (event.key === "ArrowLeft") {
        setRenderSlideIndex((index) => Math.max(0, index - 1));
      }
      if (event.key === "ArrowRight") {
        setRenderSlideIndex((index) => Math.min(slideCount - 1, index + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [renderPreviewOpen, slideCount]);

  useEffect(() => {
    if (renderSlideIndex > slideCount - 1) {
      setRenderSlideIndex(Math.max(0, slideCount - 1));
    }
  }, [renderSlideIndex, slideCount]);

  const ratio = useMemo(() => {
    if (!slideCount) return 0;
    return Math.min(100, Math.round((progress / slideCount) * 100));
  }, [progress, slideCount]);

  const phase = failed
    ? "failed"
    : done
      ? "complete"
      : busy
        ? "rendering"
        : "idle";

  async function refreshDepth() {
    const res = await fetch(`${API}/api/queue`);
    const body = (await res.json()) as { depth: number };
    setDepth(body.depth);
  }

  async function submit() {
    setBusy(true);
    setDone(false);
    setFailed(false);
    setProgress(0);
    setElapsedMs(0);
    setStartedAt(Date.now());
    setNote("Submitting…");
    const res = await fetch(`${API}/api/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: source }),
    });
    const body = (await res.json()) as SubmitJobResponse;
    if (!res.ok) {
      setBusy(false);
      setFailed(true);
      setNote("Submit failed.");
      return;
    }
    setJobId(body.id);
    setSlideCount(body.slideCount);
    setDepth(body.queueDepth);
    setNote(`Queued ${body.id.slice(0, 8)}…`);
  }

  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadPdf() {
    if (!jobId || exportingPdf || exportingPngs) return;
    setExportingPdf(true);
    try {
      const res = await fetch(`${API}/api/jobs/${jobId}/pdf`);
      if (!res.ok) throw new Error("pdf export failed");
      saveBlob(await res.blob(), `${jobId.slice(0, 8)}.pdf`);
    } catch {
      setNote("PDF export failed.");
    } finally {
      setExportingPdf(false);
    }
  }

  async function downloadPngs() {
    if (!jobId || !slideCount || exportingPdf || exportingPngs) return;
    setExportingPngs(true);
    try {
      for (let index = 0; index < slideCount; index += 1) {
        const res = await fetch(
          `${API}/api/jobs/${jobId}/slides/${index}?download=1`,
        );
        if (!res.ok) throw new Error("png export failed");
        saveBlob(
          await res.blob(),
          `slide-${String(index + 1).padStart(2, "0")}.png`,
        );
        if (index < slideCount - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 200));
        }
      }
    } catch {
      setNote("PNG export failed.");
    } finally {
      setExportingPngs(false);
    }
  }

  function slideImageUrl(id: string, index: number) {
    return `${API}/api/jobs/${id}/slides/${index}`;
  }

  function openRenderPreview(index = 0) {
    setRenderSlideIndex(index);
    setRenderPreviewOpen(true);
  }

  return (
    <div className="min-h-svh overflow-x-hidden bg-[#1b1d21]">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white text-zinc-950">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:max-w-[1200px]">
          {onHome ? (
            <button
              type="button"
              onClick={onHome}
              className="flex items-center gap-2.5 text-zinc-950"
            >
              <SiteLogo markClassName="size-8" />
            </button>
          ) : (
            <a href="/" className="flex items-center gap-2.5 text-zinc-950">
              <SiteLogo markClassName="size-8" />
            </a>
          )}
          {onHome ? (
            <button
              type="button"
              onClick={onHome}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
            >
              Workshop
            </button>
          ) : (
            <a
              href="/"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
            >
              Workshop
            </a>
          )}
        </div>
      </header>

      <section className="px-4 pb-4 pt-8 text-center sm:px-6 sm:pb-6 sm:pt-14 lg:pt-16">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Turn your Markdown into a slide deck
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-400 sm:mt-3 sm:text-base">
          Workers on Zerops render each section to PNG and PDF. The queue in
          this tab is live because the work is not.
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:pb-16 sm:px-6 lg:max-w-[1200px]">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111317] shadow-2xl sm:rounded-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400 sm:gap-3">
              <span className="text-xs sm:text-sm">Markdown → slides</span>
              <span className="hidden h-4 w-px bg-white/10 md:block" />
              <span className="hidden items-center gap-1.5 md:flex">
                <Layers className="size-3.5 text-primary" />
                <span className="tabular-nums text-primary">{depth}</span>
                in flight
              </span>
              <Badge
                variant={
                  phase === "failed"
                    ? "destructive"
                    : phase === "complete"
                      ? "default"
                      : "secondary"
                }
                className="text-xs"
              >
                {phase}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {done && jobId ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="col-span-2 sm:col-span-1"
                    onClick={() => openRenderPreview(0)}
                  >
                    <Eye />
                    Preview
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exportingPdf || exportingPngs}
                    onClick={() => void downloadPdf()}
                  >
                    {exportingPdf ? <Loader2 className="animate-spin" /> : <Download />}
                    <span className="sm:hidden">PDF</span>
                    <span className="hidden sm:inline">Download PDF</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exportingPdf || exportingPngs}
                    onClick={() => void downloadPngs()}
                  >
                    {exportingPngs ? <Loader2 className="animate-spin" /> : <ImageDown />}
                    <span className="sm:hidden">{slideCount === 1 ? "PNG" : "PNGs"}</span>
                    <span className="hidden sm:inline">
                      {slideCount === 1 ? "Download PNG" : "Download PNGs"}
                    </span>
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSource(SAMPLE_DECK);
                  setPreviewIndex(0);
                }}
              >
                <RotateCcw />
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn(!done || !jobId ? "col-span-2 sm:col-span-1" : undefined)}
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? <Loader2 className="animate-spin" /> : <Play />}
                Create slides
              </Button>
            </div>
          </div>

          <div>
            <div className="grid min-h-[min(60dvh,30rem)] md:grid-cols-2">
                <div className="flex min-h-[min(40dvh,20rem)] flex-col border-b border-white/10 md:min-h-[min(80dvh,34rem)] md:border-b-0 md:border-r md:border-white/10">
                  <label className="sr-only" htmlFor="deck">
                    Markdown deck
                  </label>
                  <Textarea
                    id="deck"
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    spellCheck={false}
                    placeholder="Paste or type Markdown here."
                    className="min-h-[min(40dvh,20rem)] flex-1 resize-none rounded-none border-0 bg-transparent px-4 py-3 font-mono text-xs leading-relaxed shadow-none focus-visible:ring-0 sm:px-5 sm:py-4 sm:text-[13px] md:min-h-[min(80dvh,34rem)]"
                  />
                </div>

                <aside className="flex min-h-[min(40dvh,20rem)] flex-col p-3 sm:p-4 md:min-h-[min(80dvh,34rem)]">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">Live preview</h3>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 sm:size-7"
                        disabled={previewIndex === 0}
                        onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                      >
                        <ChevronLeft />
                      </Button>
                      <span className="min-w-10 text-center text-xs tabular-nums text-zinc-500 sm:min-w-12">
                        {previewIndex + 1} / {drafts.length}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 sm:size-7"
                        disabled={previewIndex >= drafts.length - 1}
                        onClick={() =>
                          setPreviewIndex((i) => Math.min(drafts.length - 1, i + 1))
                        }
                      >
                        <ChevronRight />
                      </Button>
                    </div>
                  </div>
                  <div className="slide-prose mt-2 min-h-0 flex-1 overflow-auto rounded-md border border-white/10 bg-black/40 p-4 sm:mt-3 sm:p-6">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: markdown.render(preview),
                      }}
                    />
                  </div>
                </aside>
            </div>

            <aside className="border-t border-white/10 p-4 text-sm leading-relaxed text-zinc-300 sm:p-6">
                <h2 className="text-base font-semibold text-white">
                  Markdown → presentation
                </h2>
                <p className="mt-2 text-zinc-400">{note}</p>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {slideCount
                        ? `${progress} / ${slideCount} rendered`
                        : `${drafts.length} draft slide${drafts.length === 1 ? "" : "s"}`}
                    </span>
                    <span className="tabular-nums">{ratio}%</span>
                  </div>
                  <Progress value={ratio} />
                </div>

                <div className="mt-5 rounded-md border border-white/10 bg-black/30 p-3 sm:p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                      Render benchmark
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600">
                      submit → done
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <span className="font-mono text-2xl tabular-nums text-white">
                      {formatDuration(elapsedMs)}
                    </span>
                    {slideCount > 0 && elapsedMs > 0 ? (
                      <span className="font-mono text-xs tabular-nums text-zinc-400">
                        {(elapsedMs / slideCount).toFixed(0)} ms/slide
                        <span className="mx-2 text-zinc-700">·</span>
                        {(slideCount / (elapsedMs / 1000)).toFixed(2)} slides/s
                      </span>
                    ) : null}
                    {busy ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                        running
                      </span>
                    ) : null}
                  </div>

                  {runs.length > 0 ? (
                    <div className="mt-3 border-t border-white/10 pt-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                        Recent runs
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {runs.map((run) => (
                          <li
                            key={run.at}
                            className="flex items-baseline justify-between gap-3 font-mono text-xs tabular-nums text-zinc-400"
                          >
                            <span>{run.slides} slides</span>
                            <span className="h-px flex-1 self-center bg-white/5" />
                            <span className="text-zinc-200">{formatDuration(run.ms)}</span>
                            <span className="w-20 text-right text-zinc-500">
                              {(run.ms / run.slides).toFixed(0)} ms/slide
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                        Scale <code className="text-zinc-400">worker</code> and run again —
                        compare ms/slide to see whether the extra containers actually
                        helped.
                      </p>
                    </div>
                  ) : null}
                </div>

                <h3 className="mt-6 font-semibold text-white">Separate slides</h3>
                <p className="mt-1 text-zinc-400">
                  Use a line that is only <code className="text-primary">---</code>{" "}
                  between slides. The worker renders what you typed — no outbound
                  fetches.
                </p>
                <pre className="mt-3 overflow-x-auto rounded-md bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200">
                  {`# Title slide\n\n---\n\n## Second slide`}
                </pre>

                <h3 className="mt-6 font-semibold text-white">Markdown syntax</h3>
                <div className="-mx-1 overflow-x-auto px-1">
                  <table className="mt-2 w-full min-w-[16rem] text-left text-xs">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="py-1 font-medium">Markdown</th>
                      <th className="py-1 font-medium">Output</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    <tr className="border-t border-white/10">
                      <td className="py-1.5 font-mono"># Heading 1</td>
                      <td>Title</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="py-1.5 font-mono">## Heading 2</td>
                      <td>Section</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="py-1.5 font-mono">**bold**</td>
                      <td>
                        <strong>bold</strong>
                      </td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="py-1.5 font-mono">`code`</td>
                      <td>
                        <code>code</code>
                      </td>
                    </tr>
                  </tbody>
                  </table>
                </div>

                {done && jobId ? (
                  <div className="mt-6 space-y-3">
                    <p className="text-zinc-400">
                      Rendered output — use Preview in the toolbar for full size, then download.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {Array.from({ length: slideCount }, (_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => openRenderPreview(index)}
                          className="overflow-hidden rounded-md border border-white/10 transition hover:border-primary/50"
                        >
                          <img
                            alt={`Slide ${index + 1}`}
                            src={slideImageUrl(jobId, index)}
                            className="aspect-video w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
            </aside>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#14161a] px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 sm:gap-10 md:grid-cols-2 lg:max-w-[1200px]">
          <div>
            <h2 className="text-lg font-semibold text-white sm:text-xl">About this tool</h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-zinc-400">
              Paste Markdown, split slides on <code className="text-zinc-200">---</code>,
              and send the job to workers running on{" "}
              <a
                href={LINKS.zerops}
                className="text-primary underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Zerops
              </a>
              . The API accepts the job on HTTP 200; progress arrives here over a
              WebSocket.
            </p>
          </div>
          <ol className="space-y-3 text-sm text-zinc-300">
            <li>
              <span className="font-medium text-white">1. Write slides</span>
              <p className="text-zinc-400">Markdown in the editor with live preview beside it.</p>
            </li>
            <li>
              <span className="font-medium text-white">2. Create the deck</span>
              <p className="text-zinc-400">
                Workers render each section to PNG, then a PDF.
              </p>
            </li>
            <li>
              <span className="font-medium text-white">3. Preview & export</span>
              <p className="text-zinc-400">Preview rendered slides, then download PNG or PDF.</p>
            </li>
          </ol>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:justify-between lg:max-w-[1200px]">
          {onHome ? (
            <button type="button" onClick={onHome} className="flex items-center gap-2 text-white">
              <SiteLogo />
            </button>
          ) : (
            <a href="/" className="flex items-center gap-2 text-white">
              <SiteLogo />
            </a>
          )}
          <div className="grid grid-cols-2 gap-6 text-sm sm:gap-8">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Product</p>
              <a className="block text-zinc-300 hover:text-white" href={LINKS.zerops}>
                zerops.io
              </a>
              <a className="block text-zinc-300 hover:text-white" href={LINKS.app}>
                App
              </a>
              <a className="block text-zinc-300 hover:text-white" href={LINKS.docs}>
                Docs
              </a>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Community</p>
              <a className="block text-zinc-300 hover:text-white" href={LINKS.discord}>
                Discord
              </a>
              <a className="block text-zinc-300 hover:text-white" href={LINKS.github}>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      {renderPreviewOpen && jobId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/90 p-0 sm:items-center sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Rendered slide preview"
          onClick={() => setRenderPreviewOpen(false)}
        >
          <div
            className="flex max-h-[100dvh] w-full max-w-5xl flex-col gap-3 overflow-y-auto rounded-t-xl bg-[#111317] p-4 sm:gap-4 sm:rounded-none sm:bg-transparent sm:p-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white">
              <p className="text-sm font-medium">
                Slide{" "}
                <span className="tabular-nums text-zinc-300">
                  {renderSlideIndex + 1} / {slideCount}
                </span>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-white hover:bg-white/10 sm:size-8"
                onClick={() => setRenderPreviewOpen(false)}
              >
                <X />
                <span className="sr-only">Close preview</span>
              </Button>
            </div>

            <img
              alt={`Slide ${renderSlideIndex + 1}`}
              src={slideImageUrl(jobId, renderSlideIndex)}
              className="max-h-[50dvh] w-full rounded-lg border border-white/10 object-contain sm:max-h-[65vh] lg:max-h-[70vh]"
            />

            <div className="flex items-center justify-between gap-2 sm:justify-center sm:gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0 border-white/20 bg-black/40 text-white hover:bg-white/10 sm:size-9"
                disabled={renderSlideIndex === 0}
                onClick={() =>
                  setRenderSlideIndex((index) => Math.max(0, index - 1))
                }
              >
                <ChevronLeft />
                <span className="sr-only">Previous slide</span>
              </Button>

              <p className="text-center text-xs text-zinc-500 sm:hidden">
                Swipe or use arrows · tap outside to close
              </p>
              <p className="hidden text-center text-xs text-zinc-500 sm:block">
                Arrow keys to navigate · Esc to close
              </p>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0 border-white/20 bg-black/40 text-white hover:bg-white/10 sm:size-9"
                disabled={renderSlideIndex >= slideCount - 1}
                onClick={() =>
                  setRenderSlideIndex((index) =>
                    Math.min(slideCount - 1, index + 1),
                  )
                }
              >
                <ChevronRight />
                <span className="sr-only">Next slide</span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
