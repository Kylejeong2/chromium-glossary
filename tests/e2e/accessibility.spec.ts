import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("primary desktop and glossary surfaces have no detectable accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open Chromium" })).toBeVisible();
  const desktopResults = await new AxeBuilder({ page }).analyze();
  expect(desktopResults.violations).toEqual([]);

  await page.goto("/glossary");
  await expect(page.getByRole("heading", { name: "The Chromium glossary" })).toBeVisible();
  const glossaryResults = await new AxeBuilder({ page }).analyze();
  expect(glossaryResults.violations).toEqual([]);
});
