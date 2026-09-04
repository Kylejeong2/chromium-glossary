import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("package lock portability", () => {
  it("resolves registry dependencies from the public npm registry", () => {
    const lockfile = readFileSync("package-lock.json", "utf8");
    const resolvedUrls = [...lockfile.matchAll(/"resolved": "(https:[^"]+)"/g)].map((match) => match[1]);

    expect(resolvedUrls.length).toBeGreaterThan(0);
    expect(new Set(resolvedUrls.map((resolved) => new URL(resolved).hostname))).toEqual(new Set(["registry.npmjs.org"]));
  });
});
