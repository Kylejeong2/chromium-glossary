import { expect, test } from "@playwright/test";

async function openLauncher(page: import("@playwright/test").Page, name: string, mobile: boolean) {
  const launcher = page.getByRole("button", { name: `Open ${name}` });
  if (mobile) await launcher.click(); else await launcher.dblclick();
}

test("Chrome launches, navigates, minimizes, restores, and closes", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.locator(".desktop-shell").evaluate((element) => {
    (window as Window & { desktopBeforeLaunch?: Element }).desktopBeforeLaunch = element;
  });
  await openLauncher(page, "Chrome", Boolean(isMobile));
  const browser = page.getByLabel("Chrome browser window");
  await expect(browser).toBeVisible();
  await expect(page).toHaveURL(/\/glossary$/);
  expect(await page.locator(".desktop-shell").evaluate((element) => (window as Window & { desktopBeforeLaunch?: Element }).desktopBeforeLaunch === element)).toBe(true);
  await browser.evaluate((element) => {
    (window as Window & { browserWindowBeforeNavigation?: Element }).browserWindowBeforeNavigation = element;
  });
  await page.getByRole("searchbox", { name: "Search all 50 concepts" }).fill("site isolation");
  await page.getByRole("region", { name: "Search results" }).getByRole("button", { name: /Site Isolation/ }).click();
  await expect(page.getByRole("heading", { name: "Site Isolation", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/glossary\/site-isolation$/);
  expect(await browser.evaluate((element) => (window as Window & { browserWindowBeforeNavigation?: Element }).browserWindowBeforeNavigation === element)).toBe(true);
  await expect(page.getByRole("textbox", { name: "Address" })).toHaveValue("chromium://glossary/site-isolation");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chromium glossary", exact: true })).toBeVisible();
  if (!isMobile) {
    await page.getByRole("button", { name: "Forward", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Site Isolation", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Minimize Chrome" }).click();
  await expect(page.getByLabel("Chrome browser window")).toBeHidden();
  await page.getByRole("button", { name: "Chrome", exact: true }).click();
  await expect(page.getByLabel("Chrome browser window")).toBeVisible();
  await page.getByRole("button", { name: "Close Chrome" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("freeform Chrome resizes, zooms, and enters full screen without losing its route", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "compact windows intentionally do not drag");
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Open Chrome" });
  const launcherBefore = await launcher.boundingBox();
  if (!launcherBefore) throw new Error("Launcher geometry unavailable");
  await page.mouse.move(launcherBefore.x + 30, launcherBefore.y + 30);
  await page.mouse.down();
  await page.mouse.move(launcherBefore.x - 110, launcherBefore.y + 90, { steps: 5 });
  await page.mouse.up();
  expect((await launcher.boundingBox())?.x).toBeLessThan(launcherBefore.x - 20);
  await page.getByRole("button", { name: "Chrome", exact: true }).click();
  await expect(page).toHaveURL(/\/glossary$/);
  const browser = page.getByLabel("Chrome browser window");
  await expect(browser).toBeVisible();
  const before = await browser.boundingBox();
  const strip = page.locator(".chrome-tabstrip");
  await expect(strip).toBeVisible();
  const box = await strip.boundingBox();
  if (!before || !box) throw new Error("Chrome geometry unavailable");
  await page.mouse.move(box.x + box.width * .7, box.y + 16);
  await page.mouse.down();
  await page.mouse.move(4, 4, { steps: 6 });
  await page.mouse.up();
  const after = await browser.boundingBox();
  expect(after?.x).toBeGreaterThanOrEqual(0);
  expect(after?.y).toBeGreaterThanOrEqual(30);
  expect((after?.x ?? 0) + (after?.width ?? 0)).toBeLessThanOrEqual(1440);
  await page.locator(".journey-stage").getByRole("button", { name: /Chromium vs. Google Chrome/ }).click();
  await expect(page).toHaveURL(/chromium-vs-chrome$/);
  await expect.poll(async () => (await browser.boundingBox())?.x).toBeCloseTo(after?.x ?? 0, 0);
  const resize = page.locator(".chrome-window .window-resize-handle.is-se");
  const resizeBox = await resize.boundingBox();
  const beforeResize = await browser.boundingBox();
  if (!resizeBox || !beforeResize) throw new Error("Resize geometry unavailable");
  await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeBox.x + 92, resizeBox.y + 54, { steps: 5 });
  await page.mouse.up();
  const afterResize = await browser.boundingBox();
  expect(afterResize!.width).toBeGreaterThan(beforeResize.width + 40);
  expect(afterResize!.height).toBeGreaterThan(beforeResize.height + 20);
  await page.locator(".chrome-drag-space").dblclick();
  await expect(browser).toHaveClass(/is-maximized/);
  await page.getByRole("button", { name: "Enter Chrome full screen" }).click();
  await expect(browser).toHaveClass(/is-fullscreen/);
  expect(await browser.boundingBox()).toEqual({ x: 0, y: 0, ...page.viewportSize()! });
  await expect(page).toHaveURL(/chromium-vs-chrome$/);
  await page.keyboard.press("Escape");
  await expect(browser).toHaveClass(/is-maximized/);
});

test("Terminal has command history and Trash opens recovered Chromium concepts", async ({ page, isMobile }) => {
  await page.goto("/");
  await openLauncher(page, "Terminal", Boolean(isMobile));
  await expect(page.getByLabel("Terminal window")).toBeVisible();
  const prompt = page.getByLabel("chromium@mac ~ %");
  await prompt.fill("careers");
  await prompt.press("Enter");
  await expect(page.getByRole("link", { name: "Open Browserbase careers" })).toHaveAttribute("href", "https://www.browserbase.com/careers");
  await prompt.press("ArrowUp");
  await expect(prompt).toHaveValue("careers");
  await page.getByRole("button", { name: "Close Terminal" }).click();
  await openLauncher(page, "Trash", Boolean(isMobile));
  await page.getByRole("option", { name: /detached-dom-tree\.log/ }).dblclick();
  await expect(page).toHaveURL(/\/glossary\/garbage-collection$/);
  await expect(page.getByRole("heading", { name: "Garbage Collection (Oilpan + V8)", exact: true })).toBeVisible();
});

test("Chrome omnibox supports local addresses and reports invalid ones", async ({ page }) => {
  await page.goto("/glossary");
  const address = page.getByRole("textbox", { name: "Address" });
  await address.fill("chromium://glossary/site-isolation");
  await address.press("Enter");
  await expect(page).toHaveURL(/site-isolation$/);
  await page.getByRole("button", { name: "Reload", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/site-isolation$/);
  await expect(page.getByRole("heading", { name: "Site Isolation", exact: true })).toBeVisible();
  await address.fill("https://example.com");
  await address.press("Enter");
  await expect(page.locator("#address-error")).toContainText("local glossary address");
});

test("learning stages are URL-backed and search stays global", async ({ page }) => {
  await page.goto("/glossary?stage=process-boundaries");
  await expect(page.getByRole("heading", { name: "Map the process model" })).toBeVisible();
  await expect(page.locator(".journey-stage")).toHaveCount(1);
  await page.reload();
  await expect(page).toHaveURL(/stage=process-boundaries/);
  await page.getByRole("searchbox", { name: "Search all 50 concepts" }).fill("rasterization");
  const results = page.getByRole("region", { name: "Search results" });
  await expect(results.getByRole("button", { name: /Rasterization/ })).toBeVisible();
  await results.getByRole("button", { name: /Rasterization/ }).click();
  await expect(page).toHaveURL(/\/glossary\/rasterization$/);
});

test("Chrome menu closes when another app receives focus", async ({ page }) => {
  await page.goto("/glossary");
  const more = page.getByRole("button", { name: "Customize and control Chrome" });
  await more.click();
  await expect(page.locator(".chrome-menu")).toBeVisible();
  await page.getByRole("button", { name: "Terminal", exact: true }).click();
  await expect(page.getByLabel("Terminal window")).toBeVisible();
  await expect(page.locator(".chrome-menu")).toBeHidden();
  await page.getByRole("button", { name: "Chrome", exact: true }).click();
  await expect(page.getByLabel("Chrome browser window")).toHaveClass(/is-focused/);
  await expect(page.locator(".chrome-menu")).toBeHidden();
  await expect(more).toHaveAttribute("aria-expanded", "false");
});

test("Chrome menu clears when keyboard focus leaves the browser", async ({ page }) => {
  await page.goto("/glossary");
  const more = page.getByRole("button", { name: "Customize and control Chrome" });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".chrome-menu")).toBeVisible();

  await page.getByRole("button", { name: "Show browser details" }).focus();
  await page.getByRole("button", { name: "Open Trash" }).focus();
  await expect(page.getByRole("button", { name: "Open Trash" })).toBeFocused();
  await expect(page.locator(".chrome-menu")).toBeHidden();
  await expect(more).toHaveAttribute("aria-expanded", "false");

  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Trash window")).toBeVisible();
  await page.getByRole("button", { name: "Chrome", exact: true }).click();
  await expect(page.locator(".chrome-menu")).toBeHidden();
});

test("macOS application menus execute useful commands", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "desktop application menus collapse in compact mode");
  await page.goto("/glossary/worker");
  const browser = page.getByLabel("Chrome browser window");
  await browser.evaluate((element) => { (window as Window & { menuBrowser?: Element }).menuBrowser = element; });

  await page.getByRole("menuitem", { name: "Chromium", exact: true }).click();
  await page.getByRole("menuitem", { name: "About Chromium", exact: true }).click();
  await expect(page.locator(".chrome-about")).toBeVisible();
  await page.getByRole("button", { name: "Close browser details" }).click();

  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await page.getByRole("menuitem", { name: "Find in glossary", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Search all 50 concepts" })).toBeFocused();

  await page.getByRole("menuitem", { name: "View", exact: true }).click();
  await page.getByRole("menuitem", { name: "Reload Chromium", exact: true }).click();
  await expect.poll(async () => browser.evaluate((element) => (window as Window & { menuBrowser?: Element }).menuBrowser === element)).toBe(true);

  await page.getByRole("menuitem", { name: "Window", exact: true }).click();
  await page.getByRole("menuitem", { name: "Enter Full Screen", exact: true }).click();
  await expect(browser).toHaveClass(/is-fullscreen/);
  await page.keyboard.press("Escape");

  await page.getByRole("menuitem", { name: "Help", exact: true }).click();
  await page.getByRole("menuitem", { name: "Keyboard shortcuts", exact: true }).click();
  await expect(page.locator(".chrome-about")).toBeVisible();

  await page.getByRole("menuitem", { name: "File", exact: true }).click();
  await page.getByRole("menuitem", { name: "Open Terminal", exact: true }).click();
  await expect(page.getByLabel("Terminal window")).toBeVisible();
});
