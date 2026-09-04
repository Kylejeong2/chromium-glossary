import type { DiagramDensity, PlacedText, Rect } from "./types";
import { GT_STANDARD_MONO_METRICS } from "./font-metrics.generated";

export const DIAGRAM_FONT = '"GT Standard Mono"';
export const NODE_FONT_SIZE = 14;
const NODE_LINE_HEIGHT = 18;
export const SUPPORT_FONT_SIZE = 12;
const SUPPORT_LINE_HEIGHT = 15;
const GLYPH_ADVANCES: Readonly<Record<string, number>> = GT_STANDARD_MONO_METRICS.advances;

export function align(value: number, grid = 8): number {
  return Math.ceil(value / grid) * grid;
}

export function diagramTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) throw new Error("Diagram text contains an empty character");
    const advance = GLYPH_ADVANCES[String(codePoint)];
    if (advance === undefined) throw new Error(`GT Standard Mono has no glyph for U+${codePoint.toString(16).toUpperCase()}`);
    units += advance;
  }
  return units * fontSize / GT_STANDARD_MONO_METRICS.unitsPerEm;
}

export function minimumNodeWidth(label: string): number {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const narrowestThreeLineWrap = Math.min(
    ...partitions(words, Math.min(3, words.length)).map((lines) => Math.max(...lines.map((line) => diagramTextWidth(line, NODE_FONT_SIZE)))),
  );
  return align(Math.max(112, narrowestThreeLineWrap + 40));
}

function partitions(words: readonly string[], maxLines: number): readonly string[][] {
  if (words.length === 0) return [[""]];
  const results: string[][] = [];
  const visit = (start: number, lines: string[]) => {
    if (start === words.length) {
      results.push(lines);
      return;
    }
    if (lines.length === maxLines) return;
    for (let end = start + 1; end <= words.length; end += 1) {
      visit(end, [...lines, words.slice(start, end).join(" ")]);
    }
  };
  visit(0, []);
  return results;
}

function wrapMonospace(text: string, maxWidth: number, fontSize: number, maxLines = 3): readonly string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text];
  const candidates = partitions(words, Math.min(maxLines, words.length))
    .filter((lines) => lines.every((line) => diagramTextWidth(line, fontSize) <= maxWidth))
    .sort((left, right) => {
      const leftWidest = Math.max(...left.map((line) => diagramTextWidth(line, fontSize)));
      const rightWidest = Math.max(...right.map((line) => diagramTextWidth(line, fontSize)));
      return left.length - right.length || leftWidest - rightWidest;
    });
  if (candidates[0]) return candidates[0];
  return [text];
}

function placeText(lines: readonly string[], rect: Rect, fontSize: number, lineHeight: number): PlacedText {
  const width = Math.max(...lines.map((line) => diagramTextWidth(line, fontSize)));
  const height = lines.length * lineHeight;
  return {
    bounds: {
      x: rect.x + (rect.width - width) / 2,
      y: rect.y + (rect.height - height) / 2,
      width,
      height,
    },
    lines,
    fontSize,
    lineHeight,
  };
}

export function measureNode(label: string, slotWidth: number, density: DiagramDensity): Readonly<{ width: number; height: number; lines: readonly string[] }> {
  const safeSlot = Math.max(112, align(slotWidth));
  const widestWord = Math.max(...label.trim().split(/\s+/).filter(Boolean).map((word) => diagramTextWidth(word, NODE_FONT_SIZE)));
  const maxTextWidth = Math.max(72, Math.min(density === "compact" ? 216 : 184, safeSlot - 40), Math.min(safeSlot - 16, widestWord));
  const lines = wrapMonospace(label, maxTextWidth, NODE_FONT_SIZE);
  const textWidth = Math.max(...lines.map((line) => diagramTextWidth(line, NODE_FONT_SIZE)));
  return {
    width: Math.min(safeSlot, align(Math.max(112, textWidth + 40))),
    height: align(Math.max(56, lines.length * NODE_LINE_HEIGHT + 24)),
    lines,
  };
}

export function nodeLabel(lines: readonly string[], bounds: Rect): PlacedText {
  return placeText(lines, bounds, NODE_FONT_SIZE, NODE_LINE_HEIGHT);
}

export function measureSupport(label: string, maxWidth: number): Readonly<{ width: number; height: number; lines: readonly string[] }> {
  const lines = wrapMonospace(label, Math.max(56, maxWidth), SUPPORT_FONT_SIZE);
  return {
    width: align(Math.max(48, Math.max(...lines.map((line) => diagramTextWidth(line, SUPPORT_FONT_SIZE))) + 16)),
    height: align(lines.length * SUPPORT_LINE_HEIGHT + 8),
    lines,
  };
}

export function measureEdgeLabel(label: string, maxWidth: number): Readonly<{ width: number; height: number; lines: readonly string[] }> {
  const lines = wrapMonospace(label, Math.max(56, maxWidth), SUPPORT_FONT_SIZE);
  return {
    width: align(Math.max(40, Math.max(...lines.map((line) => diagramTextWidth(line, SUPPORT_FONT_SIZE))) + 4)),
    height: align(lines.length * SUPPORT_LINE_HEIGHT + 4),
    lines,
  };
}

export function supportLabel(lines: readonly string[], bounds: Rect): PlacedText {
  return placeText(lines, bounds, SUPPORT_FONT_SIZE, SUPPORT_LINE_HEIGHT);
}

export function supportLabelBox(lines: readonly string[], bounds: Rect): PlacedText {
  return { bounds, lines, fontSize: SUPPORT_FONT_SIZE, lineHeight: SUPPORT_LINE_HEIGHT };
}
