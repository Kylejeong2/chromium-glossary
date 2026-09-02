import { describe, expect, it } from "vitest";
import { parseGlossaryPath } from "../src/domain/glossary";

describe("glossary routes", () => {
  it("parses desktop, index, and entry locations", () => {
    expect(parseGlossaryPath("/")).toEqual({ open: false });
    expect(parseGlossaryPath("/glossary")).toEqual({ open: true });
    expect(parseGlossaryPath("/glossary/site-isolation")).toEqual({ open: true, slug: "site-isolation" });
    expect(parseGlossaryPath("/other")).toEqual({ open: false });
  });
});
