import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

type RawDocument = Readonly<{
  stages: readonly Readonly<{
    entries: readonly Readonly<{
      slug: string;
      title: string;
      diagram: Readonly<{ intent: Readonly<{ pattern: string }> }>;
    }>[];
  }>[];
}>;

const outputDirectory = resolve(process.argv[2] ?? "/tmp/chromium-diagram-matrix");
const requestedSlugs = new Set(process.argv.slice(3));
const baseURL = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3847";
const serverURL = new URL(baseURL);
let server: ChildProcess | undefined;

async function reachable() {
  try {
    return (await fetch(baseURL)).ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await reachable()) return;
  server = spawn("npm", ["run", "dev", "--", "--hostname", serverURL.hostname, "--port", serverURL.port || "80"], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "inherit",
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await reachable()) return;
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(`Timed out waiting for ${baseURL}`);
}

async function main() {
  const glossary = JSON.parse(await readFile(resolve("src/data/chromium-glossary.json"), "utf8")) as RawDocument;
  const allEntries = glossary.stages.flatMap((stage) => stage.entries);
  const entries = requestedSlugs.size ? allEntries.filter((entry) => requestedSlugs.has(entry.slug)) : allEntries;
  if (entries.length === 0) throw new Error("No glossary entries matched the requested slugs");
  const modes = [
    { name: "wide", width: 1440, height: 1000 },
    { name: "compact", width: 390, height: 1800 },
  ] as const;
  await ensureServer();
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch();
  const manifest = [];

  try {
    for (const mode of modes) {
      const modeDirectory = resolve(outputDirectory, mode.name);
      await mkdir(modeDirectory, { recursive: true });
      const context = await browser.newContext({ viewport: { width: mode.width, height: mode.height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      const page = await context.newPage();
      for (const [index, entry] of entries.entries()) {
        await page.goto(`${baseURL}/glossary/${entry.slug}`, { waitUntil: "networkidle" });
        await page.locator("nextjs-portal").evaluateAll((portals) => portals.forEach((portal) => portal.remove()));
        const figure = page.locator('.concept-diagram[data-layout-ready="true"]');
        await figure.waitFor({ state: "visible" });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
        });
        const file = `${String(index + 1).padStart(2, "0")}-${entry.slug}.png`;
        await figure.screenshot({ path: resolve(modeDirectory, file), animations: "disabled" });
        const box = await figure.boundingBox();
        manifest.push({ index: index + 1, slug: entry.slug, title: entry.title, pattern: entry.diagram.intent.pattern, mode: mode.name, file: `${mode.name}/${file}`, width: box?.width, height: box?.height });
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server?.kill("SIGTERM");
  }

  await writeFile(resolve(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${outputDirectory}\n`);
}

void main();
