import { expect, test } from "@playwright/test";

async function openLauncher(page: import("@playwright/test").Page, name: string, mobile: boolean) {
  const launcher = page.getByRole("button", { name: `Open ${name}` });
  if (mobile) await launcher.click(); else await launcher.dblclick();
}

test("Chrome launches, navigates, minimizes, restores, and closes", async ({ page, isMobile }) => {
  await page.goto("/");
  await openLauncher(page, "Chrome", Boolean(isMobile));
  await expect(page.getByLabel("Chrome browser window")).toBeVisible();
  await expect(page).toHaveURL(/\/glossary$/);
  await page.getByRole("searchbox", { name: "Search all 50 concepts" }).fill("site isolation");
  await page.getByRole("button", { name: /Site Isolation/ }).click();
  await expect(page.getByRole("heading", { name: "Site Isolation" })).toBeVisible();
  await expect(page).toHaveURL(/\/glossary\/site-isolation$/);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The Chromium glossary" })).toBeVisible();
  if (!isMobile) {
    await page.getByRole("button", { name: "Forward", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Site Isolation" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Minimize Chrome" }).click();
  await expect(page.getByLabel("Chrome browser window")).toBeHidden();
  await page.getByRole("button", { name: "Chrome", exact: true }).click();
  await expect(page.getByLabel("Chrome browser window")).toBeVisible();
  await page.getByRole("button", { name: "Close Chrome" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("freeform Chrome stays bounded after dragging and maximizes", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "compact windows intentionally do not drag");
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Open Chrome" });
  const launcherBefore = await launcher.boundingBox();
  if (!launcherBefore) throw new Error("Launcher geometry unavailable");
  await page.mouse.move(launcherBefore.x + 30, launcherBefore.y + 30);
  await page.mouse.down();
  await page.mouse.move(launcherBefore.x + 150, launcherBefore.y + 120, { steps: 5 });
  await page.mouse.up();
  expect((await launcher.boundingBox())?.x).toBeGreaterThan(launcherBefore.x + 50);
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
  expect(after?.y).toBeGreaterThanOrEqual(42);
  expect((after?.x ?? 0) + (after?.width ?? 0)).toBeLessThanOrEqual(1440);
  await page.getByRole("button", { name: /Chromium vs. Google Chrome/ }).click();
  await expect(page).toHaveURL(/chromium-vs-chrome$/);
  expect((await browser.boundingBox())?.x).toBe(after?.x);
  await page.getByRole("button", { name: "Maximize Chrome" }).click();
  await expect(page.getByRole("button", { name: "Restore Chrome" })).toBeVisible();
});

test("Terminal exposes the careers command and Trash opens garbage collection", async ({ page, isMobile }) => {
  await page.goto("/");
  await openLauncher(page, "Terminal", Boolean(isMobile));
  await expect(page.getByLabel("Terminal window")).toBeVisible();
  await page.getByLabel("guest@browserbase %").fill("careers");
  await page.getByLabel("guest@browserbase %").press("Enter");
  await expect(page.getByRole("link", { name: "Open Browserbase careers" })).toHaveAttribute("href", "https://www.browserbase.com/careers");
  await page.getByRole("button", { name: "Close Terminal" }).click();
  await openLauncher(page, "Trash", Boolean(isMobile));
  await page.getByRole("button", { name: "Explore garbage collection" }).click();
  await expect(page).toHaveURL(/\/glossary\/garbage-collection$/);
  await expect(page.getByRole("heading", { name: "Garbage Collection" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Site Isolation" })).toBeVisible();
  await address.fill("https://example.com");
  await address.press("Enter");
  await expect(page.locator("#address-error")).toContainText("local glossary address");
});
