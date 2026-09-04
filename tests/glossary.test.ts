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

  it("orders the curriculum from browser foundations to observable output", () => {
    expect(chromiumGlossary.stages.map((stage) => stage.title)).toEqual([
      "Meet the browser",
      "Map the process model",
      "Understand trust boundaries",
      "Follow a navigation",
      "Run the document",
      "Render the pixels",
      "Trace the system",
    ]);
    const slugs = chromiumGlossary.stages.flatMap((stage) => stage.entries.map((entry) => entry.slug));
    expect(slugs.indexOf("site-isolation")).toBeLessThan(slugs.indexOf("navigation"));
    expect(slugs.indexOf("v8")).toBeLessThan(slugs.indexOf("style-recalculation"));
    const copy = structuredClone(chromiumGlossary) as unknown as { stages: Array<{ entries: unknown[] }> };
    copy.stages[1].entries.reverse();
    expect(validateGlossary(copy).map((issue) => issue.code)).toContain("curriculum.order");
  });

  it("ranks title matches ahead of mechanism matches", () => {
    const results = createCatalog(chromiumGlossary).search("renderer");
    expect(results[0].slug).toBe("renderer-process");
    expect(results.some((entry) => entry.slug === "browser-process")).toBe(true);
  });

  it("searches globally regardless of the selected learning stage", () => {
    const results = createCatalog(chromiumGlossary).search("process");
    expect(results.some((entry) => entry.order >= 6 && entry.order <= 15)).toBe(true);
    expect(results.some((entry) => entry.order > 15)).toBe(true);
  });

  it("indexes the deeper explanations", () => {
    const results = createCatalog(chromiumGlossary).search("purpose-built sandbox");
    expect(results[0]?.slug).toBe("service-process");
  });

  it("gives every entry source-backed long-form depth", () => {
    const entries = chromiumGlossary.stages.flatMap((stage) => stage.entries);
    for (const entry of entries) {
      expect(entry.details.length, entry.slug).toBeGreaterThanOrEqual(2);
      expect(entry.details.every((section) => section.claims.length >= 2), entry.slug).toBe(true);
      expect(entry.details.flatMap((section) => section.claims).every((claim) => claim.evidence.length > 0), entry.slug).toBe(true);
      const words = [entry.lede.text, ...entry.explanation.map((claim) => claim.text), ...entry.details.flatMap((section) => section.claims.map((claim) => claim.text))].join(" ").split(/\s+/).length;
      expect(words, entry.slug).toBeGreaterThanOrEqual(100);
    }
  });

  it("rejects inferred or dangling diagram topology", () => {
    const copy = structuredClone(chromiumGlossary) as unknown as { stages: Array<{ entries: Array<{ diagram: { edges: Array<{ to: { kind: string; id: string } }> } }> }> };
    copy.stages[0].entries[0].diagram.edges[0].to = { kind: "node", id: "node-1" };
    expect(validateGlossary(copy).map((issue) => issue.code)).toContain("diagram.endpoint");
  });

  it("requires every boundary node to belong to exactly one ordered region", () => {
    const copy = structuredClone(chromiumGlossary) as unknown as {
      stages: Array<{ entries: Array<{ diagram: { intent: { pattern: string }; groups: Array<{ nodeIds: string[] }> } }> }>;
    };
    const entry = copy.stages.flatMap((stage) => stage.entries).find((candidate) => candidate.diagram.intent.pattern === "boundary");
    if (!entry) throw new Error("Expected a boundary diagram fixture");
    entry.diagram.groups[0].nodeIds = entry.diagram.groups[0].nodeIds.slice(1);
    expect(validateGlossary(copy).map((issue) => issue.code)).toContain("diagram.boundary.membership");
  });

  it("keeps unsafe concepts out of the focus tone", () => {
    const copy = structuredClone(chromiumGlossary) as unknown as { stages: Array<{ entries: Array<{ diagram: { nodes: Array<{ label: string; tone: string }> } }> }> };
    copy.stages[5].entries[0].diagram.nodes[0] = { ...copy.stages[5].entries[0].diagram.nodes[0], label: "Unsafe implementation", tone: "focus" };
    expect(validateGlossary(copy).map((issue) => issue.code)).toContain("diagram.negative-focus");
  });

  it("keeps unsafe groups out of the focus tone", () => {
    const copy = structuredClone(chromiumGlossary) as unknown as { stages: Array<{ entries: Array<{ diagram: { groups: Array<{ label: string; tone: string }> } }> }> };
    copy.stages[1].entries[0].diagram.groups[0] = { ...copy.stages[1].entries[0].diagram.groups[0], label: "Unsafe product boundary", tone: "focus" };
    expect(validateGlossary(copy).map((issue) => issue.code)).toContain("diagram.negative-focus");
  });

  it("traverses the authored journey", () => {
    const catalog = createCatalog(chromiumGlossary);
    expect(catalog.navigation("content-layer").previous?.slug).toBe("chromium-vs-chrome");
    expect(catalog.navigation("content-layer").next?.slug).toBe("browser-ui-views");
    expect(catalog.navigation("chromium-vs-chrome").previous).toBeUndefined();
    expect(catalog.navigation("tracing").next).toBeUndefined();
  });
});
