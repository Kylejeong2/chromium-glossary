import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "opentype.js";
import { chromiumGlossary } from "../src/data/chromium-glossary";

const fontPath = resolve("public/assets/fonts/GT-Standard-Mono-Regular.otf");
const outputPath = resolve("src/domain/diagram/font-metrics.generated.ts");
const fontBytes = readFileSync(fontPath);
const font = parse(Uint8Array.from(fontBytes).buffer);
const advances = new Map<number, number>();
const labels = chromiumGlossary.stages.flatMap((stage) => stage.entries.flatMap((entry) => [
  ...entry.diagram.nodes.map((node) => node.label),
  ...entry.diagram.edges.map((edge) => edge.label),
  ...entry.diagram.groups.map((group) => group.label),
]));
const fragments = new Set<string>();

for (const label of labels) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 1; end <= words.length; end += 1) fragments.add(words.slice(start, end).join(" "));
  }
  for (const character of label) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || !font.hasChar(character)) throw new Error(`GT Standard Mono cannot render ${JSON.stringify(character)}`);
    const advance = font.charToGlyph(character).advanceWidth;
    if (advance === undefined) throw new Error(`Glyph U+${codePoint.toString(16).toUpperCase()} has no advance width`);
    advances.set(codePoint, advance);
  }
}

for (const fragment of fragments) {
  const additive = [...fragment].reduce((total, character) => {
    const advance = font.charToGlyph(character).advanceWidth;
    if (advance === undefined) throw new Error(`Glyph in ${JSON.stringify(fragment)} has no advance width`);
    return total + advance;
  }, 0);
  const shaped = font.getAdvanceWidth(fragment, font.unitsPerEm, { kerning: true });
  if (Math.abs(additive - shaped) > 0.001) throw new Error(`Shaping changes the advance width of ${JSON.stringify(fragment)}`);
}

const artifact = {
  asset: "/assets/fonts/GT-Standard-Mono-Regular.otf",
  sha256: createHash("sha256").update(fontBytes).digest("hex"),
  family: font.getEnglishName("fontFamily"),
  unitsPerEm: font.unitsPerEm,
  ascender: font.ascender,
  descender: font.descender,
  lineGap: Number(font.tables.hhea.lineGap),
  advances: Object.fromEntries([...advances].sort(([left], [right]) => left - right).map(([codePoint, advance]) => [String(codePoint), advance])),
};
const source = `export const GT_STANDARD_MONO_METRICS = ${JSON.stringify(artifact, null, 2)} as const;\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(outputPath, "utf8");
  if (current !== source) throw new Error("GT Standard Mono metrics are stale. Run npm run refresh:diagram-font-metrics.");
} else {
  writeFileSync(outputPath, source);
}
