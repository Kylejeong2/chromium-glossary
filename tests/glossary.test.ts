import { describe, expect, it } from "vitest";
import { chromiumGlossary } from "../src/data/chromium-glossary";
import { createCatalog, validateGlossary } from "../src/domain/glossary";

describe("chromium glossary document", () => {
  it("contains seven stages and exactly fifty valid entries", () => {
    const entries = chromiumGlossary.stages.flatMap((stage) => stage.entries);
    expect(chromiumGlossary.stages).toHaveLength(7);
    expect(entries).toHaveLength(50);
    expect(new Set(entries.map((entry) => entry.slug))).toHaveLength(50);
    expect(validateGlossary(chromiumGlossary)).toEqual([]);
    expect(() => JSON.stringify(chromiumGlossary)).not.toThrow();
  });

  it("ranks title matches ahead of definition matches", () => {
    const results = createCatalog(chromiumGlossary).query({ text: "renderer" });
    expect(results[0].slug).toBe("renderer-process");
    expect(results.some((entry) => entry.slug === "browser-process")).toBe(true);
  });

  it("filters search by learning stage", () => {
    const results = createCatalog(chromiumGlossary).query({ text: "process", stage: "process-boundaries" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((entry) => entry.order >= 6 && entry.order <= 15)).toBe(true);
  });

  it("traverses the authored journey", () => {
    const catalog = createCatalog(chromiumGlossary);
    expect(catalog.navigation("content-layer").previous?.slug).toBe("chromium-vs-chrome");
    expect(catalog.navigation("content-layer").next?.slug).toBe("browser-ui-views");
    expect(catalog.navigation("chromium-vs-chrome").previous).toBeUndefined();
    expect(catalog.navigation("tracing").next).toBeUndefined();
  });
});
