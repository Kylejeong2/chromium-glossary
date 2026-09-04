import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assets = [
  "public/assets/icons/chromium.svg",
  "public/assets/icons/terminal.png",
  "public/assets/icons/trash.png",
  "public/assets/wallpapers/zoom-loom-05.jpg",
  "public/assets/fonts/InterVariable.woff2",
  "public/assets/fonts/GT-Standard-Mono-Regular.otf",
];

type CssRule = Readonly<{ selectors: readonly string[]; declarations: string }>;

function cssRules(css: string): readonly CssRule[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((match) => ({ selectors: match[1].split(",").map((selector) => selector.trim()), declarations: match[2] }))
    .filter((rule) => rule.selectors.every((selector) => !selector.startsWith("@")));
}

function isRooted(selector: string, root: string): boolean {
  if (!selector.startsWith(root)) return false;
  const boundary = selector[root.length];
  if (boundary && !/[.#:\[\s>+~]/.test(boundary)) return false;

  let parentheses = 0;
  let brackets = 0;
  let quote = "";
  for (let index = root.length; index < selector.length; index += 1) {
    const character = selector[index];
    if (quote) {
      if (character === quote && selector[index - 1] !== "\\") quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "(") parentheses += 1;
    if (character === ")") parentheses -= 1;
    if (character === "[") brackets += 1;
    if (character === "]") brackets -= 1;
    if (parentheses !== 0 || brackets !== 0) continue;
    if (character === "+" || character === "~") return false;
    if (character === ">") return true;
    if (/\s/.test(character)) {
      const next = selector.slice(index).trimStart()[0];
      return next !== "+" && next !== "~";
    }
  }
  return true;
}

function isDiagramRooted(selector: string): boolean { return isRooted(selector, ".concept-diagram"); }
function isTechnicalFontRooted(selector: string): boolean { return isDiagramRooted(selector) || isRooted(selector, ".terminal-app"); }

function scopeViolations(css: string, declaration: RegExp): readonly string[] {
  return cssRules(css)
    .filter((rule) => declaration.test(rule.declarations))
    .flatMap((rule) => rule.selectors.filter((selector) => !isDiagramRooted(selector)));
}

function fontScopeViolations(css: string): readonly string[] {
  return cssRules(css)
    .filter((rule) => /font-family:\s*"GT Standard Mono"/.test(rule.declarations))
    .flatMap((rule) => rule.selectors.filter((selector) => !isTechnicalFontRooted(selector)));
}

describe("visual asset provenance", () => {
  it("ships every declared asset with revision-pinned provenance", () => {
    const manifest = readFileSync("public/assets/ASSET_SOURCES.md", "utf8");
    for (const asset of assets) {
      expect(existsSync(asset), asset).toBe(true);
      expect(manifest).toContain(asset.replace("public/assets/", ""));
    }
    const records = manifest.split(/^## /m).slice(1);
    expect(records).toHaveLength(5);
    for (const record of records) {
      expect(record).toMatch(/^- Files?: `[^`]+`/m);
      expect(record).toMatch(/^- (?:Source|Terminal source): (?:https:\/\/|Generated with OpenAI image generation|User-provided file)/m);
      expect(record).toMatch(/^- (?:Revision|Release): `(?:[a-f0-9]{40}|[^`]+)`/m);
      expect(record).toMatch(/^- License: .+/m);
      expect(record).toMatch(/^- Modification: .+/m);
      expect(record).toMatch(/^- Use: .+/m);
    }
    expect(manifest).toContain("SIL Open Font License 1.1");
    expect(manifest).toContain("Creative Commons Attribution-ShareAlike 4.0");
    expect(manifest).toContain("Chromium BSD-style license");
  });

  it("scopes GT Standard Mono to diagrams and Terminal and keeps Inter everywhere else", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const families = [...css.matchAll(/font-family:\s*([^;]+);/g)].map((match) => match[1].trim().split(",")[0]);
    expect(new Set(families)).toEqual(new Set(["\"Inter Variable\"", "\"GT Standard Mono\""]));
    expect(css).toMatch(/\.concept-diagram, \.concept-diagram \* \{ font-family: "GT Standard Mono"/);
    expect(css).toMatch(/\.terminal-app, \.terminal-app \* \{ font-family: "GT Standard Mono"/);
    expect(fontScopeViolations(css)).toEqual([]);
  });

  it("keeps Browserbase diagram tokens inside concept diagrams only", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/\.glossary-app\s*{\s*--glossary-interaction:\s*var\(--chrome-blue\);/);
    expect(css).not.toContain("--glossary-accent");
    expect(css).toContain("#46639f");
    expect(css).toContain("#f0f4f8");
    expect(css).toContain("#ff4500");
    expect(scopeViolations(css, /#46639f|#f0f4f8|#ff4500/i)).toEqual([]);
  });

  it("rejects duplicate font declarations and selectors that target outside the diagram root", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(fontScopeViolations(`${css}\nbody { font-family: "GT Standard Mono"; }`)).toEqual(["body"]);
    expect(scopeViolations(`${css}\n.not-concept-diagram { color: #46639f; }`, /#46639f|#f0f4f8|#ff4500/i)).toEqual([".not-concept-diagram"]);
    expect(scopeViolations(`${css}\n.concept-diagram-copy { color: #46639f; }`, /#46639f|#f0f4f8|#ff4500/i)).toEqual([".concept-diagram-copy"]);
    expect(scopeViolations(`${css}\n.concept-diagram + .entry-references { color: #ff4500; }`, /#46639f|#f0f4f8|#ff4500/i)).toEqual([".concept-diagram + .entry-references"]);
    expect(scopeViolations(`${css}\n.concept-diagram:hover ~ .entry-references { color: #f0f4f8; }`, /#46639f|#f0f4f8|#ff4500/i)).toEqual([".concept-diagram:hover ~ .entry-references"]);
  });
});
