import { describe, expect, it } from "vitest";
import { parseGlossaryPath } from "../src/domain/glossary";
import { createHistoryJournal, historyBack, historyForward, observePath, parseLocalAddress, reconcileObservedPath } from "../src/application/navigation";

describe("glossary routes", () => {
  it("parses desktop, index, and entry locations", () => {
    expect(parseGlossaryPath("/")).toEqual({ open: false });
    expect(parseGlossaryPath("/glossary")).toEqual({ open: true });
    expect(parseGlossaryPath("/glossary/site-isolation")).toEqual({ open: true, slug: "site-isolation" });
    expect(parseGlossaryPath("/other")).toEqual({ open: false });
  });
});

describe("Chrome navigation", () => {
  it("tracks observed local history and supports back and forward", () => { let journal = createHistoryJournal("/glossary"); journal = observePath(journal, "/glossary/site-isolation"); const back = historyBack(journal); expect(back.pathname).toBe("/glossary"); expect(historyForward(back.journal).pathname).toBe("/glossary/site-isolation"); });
  it("reconciles browser history without duplicating adjacent routes", () => { let journal = observePath(createHistoryJournal("/glossary"), "/glossary/site-isolation"); journal = reconcileObservedPath(journal, "/glossary"); expect(journal).toEqual({ entries: ["/glossary", "/glossary/site-isolation"], index: 0 }); expect(reconcileObservedPath(journal, "/glossary/site-isolation").index).toBe(1); });
  it("accepts only the glossary and known local slugs", () => { const slugs = new Set(["site-isolation"]); expect(parseLocalAddress("chromium://glossary", "https://example.test", slugs)).toBe("/glossary"); expect(parseLocalAddress("chromium://glossary/site-isolation", "https://example.test", slugs)).toBe("/glossary/site-isolation"); expect(parseLocalAddress("https://example.test/glossary/site-isolation", "https://example.test", slugs)).toBe("/glossary/site-isolation"); expect(parseLocalAddress("https://google.com", "https://example.test", slugs)).toBeUndefined(); expect(parseLocalAddress("chromium://glossary/missing", "https://example.test", slugs)).toBeUndefined(); });
});
