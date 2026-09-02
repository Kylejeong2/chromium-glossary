import { expect, test } from "@playwright/test";

test("Chromium supports launch, search, entry navigation, minimize, restore, and close", async ({ page, isMobile }) => {
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Open Chromium" });
  if (isMobile) await launcher.tap();
  else await launcher.dblclick();
  await expect(page.getByLabel("Chromium glossary window")).toBeVisible();
  await expect(page).toHaveURL(/\/glossary$/);

  await page.getByRole("searchbox", { name: "Search all 50 concepts" }).fill("site isolation");
  await expect(page.getByRole("button", { name: /Site Isolation/ })).toBeVisible();
  await page.getByRole("button", { name: /Site Isolation/ }).click();
  await expect(page.getByRole("heading", { name: "Site Isolation" })).toBeVisible();
  await expect(page).toHaveURL(/\/glossary\/site-isolation$/);

  await page.getByRole("button", { name: "Minimize Chromium glossary" }).click();
  await expect(page.getByLabel("Chromium glossary window")).toBeHidden();
  await page.getByRole("button", { name: "Chromium", exact: true }).click();
  await expect(page.getByLabel("Chromium glossary window")).toBeVisible();
  await page.getByRole("button", { name: "Close Chromium glossary" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Chromium glossary window")).toBeHidden();
});

test("terminal exposes the Browserbase careers command", async ({ page, isMobile }) => {
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Open Terminal" });
  if (isMobile) await launcher.tap();
  else await launcher.dblclick();
  await expect(page.getByLabel("Browserbase terminal window")).toBeVisible();
  await page.getByLabel("guest@browserbase $").fill("careers");
  await page.getByLabel("guest@browserbase $").press("Enter");
  await expect(page.getByRole("link", { name: "Open Browserbase careers" })).toHaveAttribute("href", "https://www.browserbase.com/careers");
});
