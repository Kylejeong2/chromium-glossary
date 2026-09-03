import { spawn, type ChildProcess } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";

type Capture = Readonly<{
  name: string;
  path: string;
  width: number;
  height: number;
  prepare?: (page: Page) => Promise<void>;
}>;

const outputDirectory = resolve(process.argv[2] ?? "/tmp/chromium-beauty-after");
const baseURL = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3847";
const serverURL = new URL(baseURL);
let server: ChildProcess | undefined;

async function reachable() {
  try {
    const response = await fetch(baseURL);
    return response.ok;
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

async function settle(page: Page) {
  const diagram = page.locator(".concept-diagram");
  if (await diagram.count()) await diagram.waitFor({ state: "visible" });
  if (await diagram.count()) await page.locator('.concept-diagram[data-layout-ready="true"]').waitFor({ state: "visible" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  });
}

async function showDiagram(page: Page) {
  await page.locator('.concept-diagram[data-layout-ready="true"]').evaluate((element) => element.scrollIntoView({ block: "start" }));
}

const captures: readonly Capture[] = [
  { name: "01-desktop-1440x900.png", path: "/", width: 1440, height: 900 },
  { name: "02-index-1440x900.png", path: "/glossary", width: 1440, height: 900 },
  { name: "03-entry-1440x900.png", path: "/glossary/multi-process-architecture", width: 1440, height: 900 },
  {
    name: "04-layered-1440x900.png",
    path: "/glossary",
    width: 1440,
    height: 900,
    prepare: async (page) => {
      await page.getByRole("button", { name: "Terminal", exact: true }).click();
      await page.getByRole("button", { name: "Trash", exact: true }).click();
    },
  },
  { name: "05-entry-390x844.png", path: "/glossary/multi-process-architecture", width: 390, height: 844 },
  { name: "06-entry-844x390.png", path: "/glossary/multi-process-architecture", width: 844, height: 390 },
  { name: "07-index-1200x540.png", path: "/glossary", width: 1200, height: 540 },
  { name: "08-linear-1440x900.png", path: "/glossary/navigation", width: 1440, height: 900, prepare: showDiagram },
  { name: "09-branch-390x844.png", path: "/glossary/frame-tree", width: 390, height: 844, prepare: showDiagram },
  { name: "10-fan-in-390x844.png", path: "/glossary/tracing", width: 390, height: 844, prepare: showDiagram },
  { name: "11-fan-out-1440x900.png", path: "/glossary/webcontents", width: 1440, height: 900, prepare: showDiagram },
  { name: "12-containment-1440x900.png", path: "/glossary/origin-and-site", width: 1440, height: 900, prepare: showDiagram },
  { name: "13-boundary-390x844.png", path: "/glossary/sandbox", width: 390, height: 844, prepare: showDiagram },
  { name: "14-cycle-390x844.png", path: "/glossary/beginframe", width: 390, height: 844, prepare: showDiagram },
  { name: "15-state-1440x900.png", path: "/glossary/navigation-throttle", width: 1440, height: 900, prepare: showDiagram },
  { name: "16-short-wide-1200x540.png", path: "/glossary/navigation", width: 1200, height: 540, prepare: showDiagram },
  {
    name: "17-search-1440x900.png",
    path: "/glossary",
    width: 1440,
    height: 900,
    prepare: async (page) => page.getByRole("searchbox", { name: "Search all 50 concepts" }).fill("process"),
  },
];

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  await ensureServer();
  const browser = await chromium.launch();

  try {
    for (const capture of captures) {
      const context = await browser.newContext({ viewport: { width: capture.width, height: capture.height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(`${baseURL}${capture.path}`, { waitUntil: "networkidle" });
      await page.locator("nextjs-portal").evaluateAll((portals) => portals.forEach((portal) => portal.remove()));
      if (capture.prepare) await capture.prepare(page);
      await settle(page);
      await page.screenshot({ path: resolve(outputDirectory, capture.name), animations: "disabled" });
      await context.close();
    }
  } finally {
    await browser.close();
    server?.kill("SIGTERM");
  }

  process.stdout.write(`${outputDirectory}\n`);
}

void main();
