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

  it("aligns worker models with the context that creates or wakes them", () => {
    const entry = entries.find((candidate) => candidate.slug === "worker")!;
    const geometry = layoutDiagram(entry.diagram, { width: 680, density: "wide" });
    for (const [model, context] of [["dedicated", "document"], ["shared", "clients"], ["service", "events"]] as const) {
      const modelBounds = geometry.nodes.get(model)!.bounds;
      const contextBounds = geometry.nodes.get(context)!.bounds;
      expect(modelBounds.x + modelBounds.width / 2).toBe(contextBounds.x + contextBounds.width / 2);
    }
  });

  it("keeps compact container peers and cycle rows visually grouped", () => {
    const renderer = entries.find((candidate) => candidate.slug === "renderer-process")!;
    const rendererGeometry = layoutDiagram(renderer.diagram, { width: 360, density: "compact" });
    expect(rendererGeometry.nodes.get("blink")!.bounds.y).toBe(rendererGeometry.nodes.get("v8")!.bounds.y);

    const lifecycle = entries.find((candidate) => candidate.slug === "document-lifecycle")!;
    const lifecycleGeometry = layoutDiagram(lifecycle.diagram, { width: 360, density: "compact" });
    expect(lifecycleGeometry.nodes.get("style")!.bounds.y).toBe(lifecycleGeometry.nodes.get("layout")!.bounds.y);
    expect(lifecycleGeometry.nodes.get("prepaint")!.bounds.y).toBe(lifecycleGeometry.nodes.get("paint")!.bounds.y);
  });

  it("keeps long linear labels inside their measured nodes", () => {
    const entry = entries.find((candidate) => candidate.slug === "network-service")!;
    const geometry = layoutDiagram(entry.diagram, { width: 680, density: "wide" });
    expect(geometry.nodes.get("clients")!.label.lines).toEqual(["Browser and", "renderer", "clients"]);
    expect(auditDiagramGeometry(entry.diagram, geometry)).toEqual([]);
  });
});
