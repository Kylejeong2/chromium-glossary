import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function expectAccessible(page: import("@playwright/test").Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

test("desktop, Chrome, and direct entry have no detectable accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open Chrome" })).toBeVisible();
  await expectAccessible(page);
  await page.goto("/glossary");
  await expect(page.getByRole("heading", { name: "Chromium glossary", exact: true })).toBeVisible();
  await expectAccessible(page);
  await page.goto("/glossary/site-isolation");
  await expect(page.getByRole("heading", { name: "Site Isolation", exact: true })).toBeVisible();
  await expectAccessible(page);
});

test("native apps and open Chrome menu have no detectable accessibility violations", async ({ page, isMobile }) => {
  await page.goto("/");
  const terminal = page.getByRole("button", { name: "Open Terminal" });
  if (isMobile) await terminal.click(); else await terminal.dblclick();
  await expect(page.getByLabel("Terminal window")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Close Terminal" }).click();
  const trash = page.getByRole("button", { name: "Open Trash" });
  if (isMobile) await trash.click(); else await trash.dblclick();
  await expect(page.getByLabel("Trash window")).toBeVisible();
  await expectAccessible(page);
  await page.goto("/glossary");
  await page.getByRole("button", { name: "Customize and control Chrome" }).click();
  await expectAccessible(page);
});

test("entry remains accessible at 200 percent zoom", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "desktop zoom exercises the narrow reflow path");
  await page.goto("/glossary/navigation-throttle");
  await expect(page.locator('.concept-diagram[data-layout-ready="true"]')).toBeVisible();
  await page.evaluate(() => { document.body.style.zoom = "2"; });
  await expect(page.locator('.concept-diagram[data-layout-ready="true"]')).toBeVisible();
  await expectAccessible(page);
});
