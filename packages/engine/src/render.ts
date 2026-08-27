import { existsSync } from "node:fs";
import { PDFDocument, rgb } from "pdf-lib";
import MarkdownIt from "markdown-it";
import type { Page } from "playwright";
import { slideHtml } from "@deck/shared";

const markdown = new MarkdownIt({ html: false, linkify: false });

const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;
const SLIDE_BG = rgb(20 / 255, 17 / 255, 14 / 255);

// Opaque 1×1 RGB (#14110e). The old stub was 1×1 RGBA and looked white
// when upscaled into a PDF page.
export const STUB_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c631011e403000070003499c8d26e0000000049454e44ae426082",
  "hex",
);

export type RenderDriver = "stub" | "chromium";

const CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--font-render-hinting=none",
];

function spin(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    Math.sqrt(Date.now());
  }
}

function pngDimensions(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function assertSlidePng(png: Buffer): void {
  const { width, height } = pngDimensions(png);
  if (width < 100 || height < 100) {
    throw new Error(
      `render produced ${width}x${height} png — expected a full slide capture`,
    );
  }
}

export function renderSlideHtml(source: string, index: number, total: number): string {
  return slideHtml(markdown.render(source), index, total);
}

async function launchChromium() {
  const { chromium } = await import("playwright");
  const executablePath = process.env.CHROMIUM_PATH;
  if (!executablePath || !existsSync(executablePath)) {
    throw new Error(
      `CHROMIUM_PATH is missing or not found (${executablePath ?? "unset"})`,
    );
  }
  return chromium.launch({
    executablePath,
    headless: true,
    args: CHROMIUM_ARGS,
  });
}

// Runs inside the browser via page.evaluate, so `document` exists at runtime
// but not in this package's Node lib. Type-only declaration; erased at compile.
declare const document: { fonts: { ready: Promise<unknown> } };

async function captureSlide(page: Page, html: string): Promise<Buffer> {
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.locator(".slide").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  const png = Buffer.from(await page.screenshot({ type: "png" }));
  assertSlidePng(png);
  return png;
}

export async function renderAllSlides(
  slides: string[],
  driver: RenderDriver,
  spinMs: number,
): Promise<Buffer[]> {
  if (driver !== "chromium") {
    return slides.map(() => {
      if (spinMs > 0) spin(spinMs);
      return STUB_PNG;
    });
  }

  const browser = await launchChromium();
  try {
    const page = await browser.newPage({
      viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
    });
    const pngs: Buffer[] = [];
    for (const [index, source] of slides.entries()) {
      if (spinMs > 0) spin(spinMs);
      pngs.push(
        await captureSlide(
          page,
          renderSlideHtml(source, index, slides.length),
        ),
      );
    }
    return pngs;
  } finally {
    await browser.close();
  }
}

export async function renderSlidePng(
  source: string,
  index: number,
  total: number,
  driver: RenderDriver,
  spinMs: number,
): Promise<Buffer> {
  const [png] = await renderAllSlides([source], driver, spinMs);
  if (!png) throw new Error("render produced no slide");
  return png;
}

export async function slidesToPdf(pngs: Buffer[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (const png of pngs) {
    const page = doc.addPage([SLIDE_WIDTH, SLIDE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      color: SLIDE_BG,
    });
    const image = await doc.embedPng(png);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
    });
  }
  return Buffer.from(await doc.save());
}
