import { describe, expect, it } from "vitest";
import rawEvidenceLock from "../evidence/chromium-evidence-lock.json";
import { chromiumGlossary } from "../src/data/chromium-glossary";
import { validateEvidenceLock } from "../src/domain/evidence-lock";
import { validateGlossary, type GlossaryDocument } from "../src/domain/glossary";

type MutableDocument = {
  stages: Array<{
    entries: Array<{
      sources: Array<{ locator: { kind: string; value?: string } }>;
      codePaths: Array<{ path: string; reviewedUrl: string; publicUrl: string; status: string }>;
    }>;
  }>;
};

type MutableLock = {
  sources: Array<{ sourceId: string; status: string }>;
  codePaths: Array<{ key: string; path: string; status: string }>;
};

const mutableDocument = () => structuredClone(chromiumGlossary) as unknown as MutableDocument;
const mutableLock = () => structuredClone(rawEvidenceLock) as unknown as MutableLock;

describe("recorded evidence lock", () => {
  it("matches every reviewed source and code path", () => {
    expect(validateEvidenceLock(chromiumGlossary, rawEvidenceLock)).toEqual([]);
  });

  it("rejects an arbitrary source locator", () => {
    const document = mutableDocument();
    document.stages[0].entries[0].sources[0].locator = { kind: "heading", value: "THIS HEADING DOES NOT EXIST" };
    expect(validateEvidenceLock(document as unknown as GlossaryDocument, rawEvidenceLock).map((issue) => issue.code)).toContain("evidence-lock.source-mismatch");
  });

  it("rejects missing, mismatched, and rate-limited lock records", () => {
    const missing = mutableLock();
    missing.sources.shift();
    expect(validateEvidenceLock(chromiumGlossary, missing).map((issue) => issue.code)).toContain("evidence-lock.source-missing");

    const mismatched = mutableLock();
    mismatched.codePaths[0].path = "//does/not/exist";
    expect(validateEvidenceLock(chromiumGlossary, mismatched).map((issue) => issue.code)).toContain("evidence-lock.path-mismatch");

    const inconclusive = mutableLock();
    inconclusive.sources[0].status = "rate-limited";
    inconclusive.codePaths[0].status = "rate-limited";
    const issues = validateEvidenceLock(chromiumGlossary, inconclusive).map((issue) => issue.code);
    expect(issues).toContain("evidence-lock.source-unverified");
    expect(issues).toContain("evidence-lock.path-unverified");
  });

  it("rejects a nonexistent code path disguised as rate-limited", () => {
    const document = mutableDocument();
    document.stages[0].entries[0].codePaths[0] = {
      ...document.stages[0].entries[0].codePaths[0],
      path: "//does/not/exist",
      reviewedUrl: "https://chromium.googlesource.com/chromium/src/+/b54c8973710f800b2b73d1f496db11a2a344340b/does/not/exist",
      publicUrl: "https://chromium.googlesource.com/chromium/src/+/HEAD/does/not/exist",
      status: "rate-limited",
    };
    expect(validateGlossary(document).map((issue) => issue.code)).toContain("path.invalid");
    expect(validateEvidenceLock(document as unknown as GlossaryDocument, rawEvidenceLock).map((issue) => issue.code)).toContain("evidence-lock.path-missing");
  });
});
