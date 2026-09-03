import { describe, expect, it } from "vitest";
import { chromiumGlossary } from "../src/data/chromium-glossary";
import { auditDiagramGeometry, diagramDensity, layoutDiagram } from "../src/domain/diagram";

const widths = [328, 360, 520, 680, 840] as const;
const entries = chromiumGlossary.stages.flatMap((stage) => stage.entries);

describe("diagram geometry", () => {
  for (const entry of entries) {
    for (const width of widths) {
      it(`${entry.slug} passes at ${width}px`, () => {
        const geometry = layoutDiagram(entry.diagram, { width, density: diagramDensity(width) });
        expect(auditDiagramGeometry(entry.diagram, geometry)).toEqual([]);
      });
    }
  }

  it("selects density from diagram width", () => {
    expect(diagramDensity(559)).toBe("compact");
    expect(diagramDensity(560)).toBe("wide");
  });

  it("reports missing geometry without interrupting the audit", () => {
    const entry = entries[0];
    const geometry = layoutDiagram(entry.diagram, { width: 680, density: "wide" });
    const nodes = new Map(geometry.nodes);
    nodes.delete(entry.diagram.nodes[0].id);
    const issues = auditDiagramGeometry(entry.diagram, { ...geometry, nodes });
    expect(issues.some((issue) => issue.code === "node.missing")).toBe(true);
  });
});
