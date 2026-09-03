import { expect, test } from "@playwright/test";

async function waitForDiagram(page: import("@playwright/test").Page) {
  await expect(page.locator('.concept-diagram[data-layout-ready="true"]')).toBeVisible();
}

test("shell and Chromium frame preserve measured geometry", async ({ page, isMobile }) => {
  await page.goto("/glossary");
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator(".status-shelf")).toHaveCSS("height", "30px");
  if (!isMobile) {
    const dockElement = page.locator(".os-dock");
    await expect(dockElement).toBeVisible();
    const dock = await dockElement.boundingBox();
    expect(dock).not.toBeNull();
    expect(dock!.height).toBe(77);
    expect(dock!.y).toBe(page.viewportSize()!.height - 89);
    expect(dock!.x + dock!.width / 2).toBeCloseTo(page.viewportSize()!.width / 2, 0);
  } else {
    await expect(page.locator(".os-dock")).toHaveCSS("height", "56px");
    const browserWindow = page.getByLabel("Chrome browser window");
    await expect(browserWindow).toBeVisible();
    const browser = await browserWindow.boundingBox();
    const dock = await page.locator(".os-dock").boundingBox();
    expect(browser).not.toBeNull();
    expect(dock).not.toBeNull();
    expect(browser!.y + browser!.height).toBeLessThanOrEqual(dock!.y);
    expect(browser!.height).toBe(page.viewportSize()!.height - 30 - 56);
  }
  await expect(page.locator(".chrome-tabstrip")).toHaveCSS("height", "41px");
  await expect(page.locator(".chrome-tab")).toHaveCSS("height", "35px");
  await expect(page.locator(".chrome-toolbar")).toHaveCSS("height", "46px");
  await expect(page.locator(".chrome-toolbar form")).toHaveCSS("height", "34px");

  const tab = await page.locator(".chrome-tab").boundingBox();
  const controls = await page.locator(".chrome-window-buttons").boundingBox();
  expect(tab).not.toBeNull();
  expect(controls).not.toBeNull();
  expect(controls!.x + controls!.width).toBeLessThanOrEqual(tab!.x);
});

test("diagram typography is scoped independently from the surrounding interface", async ({ page }) => {
  await page.goto("/glossary/multi-process-architecture");
  await page.evaluate(() => document.fonts.ready);
  await waitForDiagram(page);
  await expect(page.locator(".entry-header h1")).toHaveCSS("font-family", /Inter Variable/);
  await expect(page.locator(".concept-diagram .diagram-unit text").first()).toHaveCSS("font-family", /GT Standard Mono/);
  await expect(page.locator(".concept-diagram .diagram-unit text").first()).toHaveCSS("font-size", "13px");
  await expect(page.locator(".concept-diagram .diagram-relation text").first()).toHaveCSS("font-size", "12px");
  await expect(page.locator(".definition-section p").first()).toHaveCSS("font-family", /Inter Variable/);
  expect((await page.request.get("/assets/fonts/InterVariable.woff2")).ok()).toBe(true);
  expect((await page.request.get("/assets/fonts/GT-Standard-Mono-Regular.otf")).ok()).toBe(true);
});

test("Chrome-native glossary surfaces keep the product title on the index only", async ({ page, isMobile }) => {
  await page.goto("/glossary");
  const app = page.locator(".glossary-app");
  await expect(app).toHaveAttribute("data-view", "index");
  await expect(page.getByRole("heading", { name: "Chromium glossary", exact: true })).toBeVisible();
  await expect(app).toHaveCSS("background-color", "rgb(248, 250, 253)");
  await expect(page.locator(".glossary-toolbar")).toHaveCSS("height", "56px");
  await expect(page.locator(".journey-stage").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".journey-stage").first()).toHaveCSS("border-radius", "8px");
  await expect(page.locator(".journey-stage header p").first()).toHaveCSS("font-size", "14px");
  await expect(page.locator(".journey-stage li strong").first()).toHaveCSS("font-size", "15px");
  await expect(page.locator(".journey-rail > button.is-active")).toHaveCSS("background-color", "rgb(211, 227, 253)");
  if (!isMobile) {
    await expect(page.locator(".journey-rail")).toHaveCSS("width", "266px");
    const contentWidth = await page.locator(".journey-index").evaluate((element) => element.getBoundingClientRect().width);
    expect(contentWidth).toBeLessThanOrEqual(680.5);
  }
  await expect(page.locator(".chrome-tab > span")).toHaveText("Chromium glossary");

  await page.goto("/glossary?stage=process-boundaries");
  await expect(app).toHaveAttribute("data-view", "index");
  await expect(app.getByText("Chromium glossary", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Chromium glossary home" })).toBeAttached();
  await expect(page.getByRole("heading", { name: "Cross process boundaries", exact: true })).toBeVisible();
  await expect(page.locator(".chrome-tab > span")).toHaveText("Cross process boundaries");

  await page.goto("/glossary/site-isolation");
  await expect(app).toHaveAttribute("data-view", "entry");
  await expect(app.getByText("Chromium glossary", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Chromium glossary home" })).toBeAttached();
  await expect(page.locator(".chrome-tab > span")).toHaveText("Site Isolation");
  await expect(page).toHaveTitle("Site Isolation");
  await expect(page.locator(".entry-header")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".entry-header")).toHaveCSS("border-radius", "8px");
  await expect(page.locator(".entry-header")).toHaveCSS("font-family", /Inter Variable/);
  await waitForDiagram(page);
  await expect(page.locator(".concept-diagram .diagram-unit rect").first()).toHaveCSS("stroke", "rgb(70, 99, 159)");

  await page.goto("/glossary");
  await page.getByRole("searchbox", { name: "Search all 50 concepts" }).fill("site isolation");
  await expect(app).toHaveAttribute("data-view", "search");
  await expect(app.getByText("Chromium glossary", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Search results", exact: true })).toBeVisible();
  await expect(page.locator(".chrome-tab > span")).toHaveText("Search results");
  await expect(page.locator(".search-results ol")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("all eight authored diagram patterns fit without horizontal scrolling", async ({ page }) => {
  const examples = [
    ["navigation", "linear"],
    ["frame-tree", "branch"],
    ["tracing", "fan-in"],
    ["webcontents", "fan-out"],
    ["siteinstance", "containment"],
    ["sandbox", "boundary"],
    ["document-lifecycle", "cycle"],
    ["navigation-throttle", "state"],
  ] as const;
  for (const [slug, pattern] of examples) {
    await page.goto(`/glossary/${slug}`);
    const figure = page.locator(`.concept-diagram--${pattern}`);
    await expect(figure).toHaveAttribute("data-layout-ready", "true");
    const canvas = figure.locator(".diagram-canvas");
    await expect(figure).toBeVisible();
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveCount(1);
    const [figureBox, canvasBox] = await Promise.all([figure.boundingBox(), canvas.boundingBox()]);
    expect(figureBox, slug).not.toBeNull();
    expect(canvasBox, slug).not.toBeNull();
    expect(canvasBox!.x, slug).toBeGreaterThanOrEqual(figureBox!.x);
    expect(canvasBox!.x + canvasBox!.width, slug).toBeLessThanOrEqual(figureBox!.x + figureBox!.width + 1);
    await expect(canvas.locator(".diagram-unit text").first()).toHaveCSS("font-size", "13px");
  }
});

test("authentic local assets are present and the grouped navigator adapts", async ({ page, isMobile }) => {
  for (const asset of [
    "/assets/icons/chromium.svg",
    "/assets/icons/terminal.png",
    "/assets/icons/trash.png",
    "/assets/wallpapers/glass-ribbons-gold.jpg",
    "/assets/fonts/GT-Standard-Mono-Regular.otf",
    "/assets/ASSET_SOURCES.md",
  ]) expect((await page.request.get(asset)).ok(), asset).toBe(true);

  await page.goto("/glossary/multi-process-architecture");
  await waitForDiagram(page);
  await expect(page.getByRole("navigation", { name: "Chromium concepts" })).toBeAttached();
  await expect(page.locator(".journey-rail__stage", { hasText: "Cross process boundaries" })).toHaveAttribute("aria-current", "step");
  const diagram = page.locator(".concept-diagram");
  await expect(diagram).toBeVisible();
  if (isMobile) {
    const toggle = page.getByRole("button", { name: "Open concept navigation" });
    const rail = page.locator(".journey-rail");
    await expect(toggle).toBeVisible();
    await expect(rail).toHaveCSS("visibility", "hidden");
    await expect(rail).toHaveCSS("pointer-events", "none");
    await expect(diagram).toHaveAttribute("data-density", "compact");
    const canvasBox = await page.locator(".diagram-canvas").boundingBox();
    const figureBox = await diagram.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(figureBox).not.toBeNull();
    expect(canvasBox!.x).toBeGreaterThanOrEqual(figureBox!.x);
    expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(figureBox!.x + figureBox!.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await toggle.click();
    await expect(rail).toHaveClass(/is-open/);
    await expect(rail).toHaveCSS("visibility", "visible");
  } else {
    await expect(page.getByRole("button", { name: "Open concept navigation" })).toBeHidden();
    await expect(page.locator(".journey-rail")).toHaveCSS("width", "266px");
  }
});

test("diagram assistive text uses the complete authored Site Isolation labels", async ({ page }) => {
  await page.goto("/glossary/site-isolation");
  const description = page.locator("#diagram-site-isolation-description");
  await expect(description.locator("p, li")).toHaveText([
    "Browser enforcement mediates communication between renderer regions locked to different sites.",
    "Concepts: Site A renderer, Browser enforcement, Site B renderer, Remote frame.",
    "Site A process contains Site A renderer, Remote frame.",
    "Trusted browser contains Browser enforcement.",
    "Site B process contains Site B renderer.",
    "Site A renderer requests Browser enforcement in both directions.",
    "Site B renderer requests Browser enforcement in both directions.",
    "Remote frame represents Site B renderer.",
  ]);
  await expect(description).not.toContainText(/site-a-region|browser-policy|site-b-region|remote-frame/);
});

test("short-wide compact Chrome collapses and deactivates the closed rail", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "uses an explicit short-wide viewport");
  await page.setViewportSize({ width: 1200, height: 540 });
  await page.goto("/glossary/multi-process-architecture");
  await page.evaluate(() => document.fonts.ready);
  await waitForDiagram(page);

  const browser = page.getByLabel("Chrome browser window");
  const toggle = page.getByRole("button", { name: "Open concept navigation" });
  const rail = page.locator(".journey-rail");
  await expect(browser).toHaveClass(/is-compact/);
  await expect(toggle).toBeVisible();
  await expect(rail).toHaveCSS("visibility", "hidden");
  await expect(rail).toHaveCSS("pointer-events", "none");
  expect(await rail.locator("button").first().evaluate((button) => {
    button.focus();
    return document.activeElement === button;
  })).toBe(false);
  await expect(page.getByTestId("browser-content")).toHaveCSS("overflow-y", "auto");
  await expect(page.locator(".concept-diagram")).toHaveAttribute("data-density", "wide");
  const title = await page.getByRole("heading", { name: "Multi-process Architecture", exact: true }).boundingBox();
  const content = await page.getByTestId("browser-content").boundingBox();
  expect(title).not.toBeNull();
  expect(content).not.toBeNull();
  expect(title!.y + title!.height).toBeLessThanOrEqual(content!.y + content!.height);
  await toggle.click();
  await expect(rail).toHaveCSS("visibility", "visible");
  await expect(rail).toHaveCSS("pointer-events", "auto");
});

test("glossary reading order and text floors hold in every shell mode", async ({ page }) => {
  await page.goto("/glossary/navigation-throttle");
  await waitForDiagram(page);
  const order = await page.locator(".entry-article").evaluate((article) => {
    const mechanism = article.querySelector(".definition-section");
    const figure = article.querySelector(".concept-diagram");
    return Boolean(mechanism && figure && (mechanism.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(order).toBe(true);
  await expect(page.locator(".definition-section p").first()).toHaveCSS("font-size", "17px");
  await expect(page.locator(".entry-header p")).toHaveCSS("font-size", "19px");
  await expect(page.locator(".back-to-index")).toHaveCSS("font-size", "13px");
  await expect(page.locator(".reference-panel code").first()).toHaveCSS("font-size", "12px");
  await expect(page.locator(".reference-panel a").first()).toHaveCSS("font-size", "13px");
  await expect(page.locator(".related-section button").first()).toHaveCSS("font-size", "13px");
});

test("200 percent zoom keeps the reading flow and diagram inside the page", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "desktop zoom exercises the narrow reflow path");
  await page.goto("/glossary/sandbox");
  await waitForDiagram(page);
  await page.evaluate(() => { document.body.style.zoom = "2"; });
  await expect(page.locator('.concept-diagram[data-layout-ready="true"]')).toBeVisible();
  const overflow = await page.getByTestId("browser-content").evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const [figure, canvas] = await Promise.all([
    page.locator(".concept-diagram").boundingBox(),
    page.locator(".diagram-canvas").boundingBox(),
  ]);
  expect(figure).not.toBeNull();
  expect(canvas).not.toBeNull();
  expect(canvas!.x).toBeGreaterThanOrEqual(figure!.x);
  expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(figure!.x + figure!.width + 1);
});

test("compact CSS and desktop geometry agree at the width and height boundaries", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "uses explicit boundary viewports");

  await page.setViewportSize({ width: 759, height: 700 });
  await page.goto("/glossary");
  await expect(page.getByLabel("Chrome browser window")).toHaveClass(/is-compact/);
  await expect(page.getByLabel("Chrome browser window")).toHaveCSS("border-radius", "0px");

  await page.setViewportSize({ width: 760, height: 700 });
  await expect(page.getByLabel("Chrome browser window")).not.toHaveClass(/is-compact/);
  await expect(page.getByLabel("Chrome browser window")).toHaveCSS("border-radius", "14px");

  await page.setViewportSize({ width: 1200, height: 559 });
  await expect(page.getByLabel("Chrome browser window")).toHaveClass(/is-compact/);
  await expect(page.getByLabel("Chrome browser window")).toHaveCSS("border-radius", "0px");

  await page.setViewportSize({ width: 1200, height: 560 });
  await expect(page.getByLabel("Chrome browser window")).not.toHaveClass(/is-compact/);
  await expect(page.getByLabel("Chrome browser window")).toHaveCSS("border-radius", "14px");
});
