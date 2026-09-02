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
  await expect(page.getByRole("heading", { name: "The Chromium glossary" })).toBeVisible();
  await expectAccessible(page);
  await page.goto("/glossary/site-isolation");
  await expect(page.getByRole("heading", { name: "Site Isolation" })).toBeVisible();
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
