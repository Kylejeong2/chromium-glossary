import type { ConceptDiagram } from "../glossary";
import { patternLayoutRegistry } from "./patterns";
import { routeDiagram } from "./router";
import type { DiagramDensity, DiagramGeometry, DiagramViewport, PlacedGroup, PlacedNode } from "./types";

const DIAGRAM_COMPACT_BREAKPOINT = 560;
const ROUTING_CANVAS_GROWTH = { attempts: 18, step: 64 } as const;

export function diagramDensity(width: number): DiagramDensity {
  return width < DIAGRAM_COMPACT_BREAKPOINT ? "compact" : "wide";
}

function normalizeViewport(viewport: DiagramViewport): DiagramViewport {
  const width = Math.max(280, Math.floor(viewport.width));
  return { width, density: viewport.density };
}

export function layoutDiagram(diagram: ConceptDiagram, viewport: DiagramViewport): DiagramGeometry {
  const normalized = normalizeViewport(viewport);
  const layouter = patternLayoutRegistry[diagram.intent.pattern];
  const placement = layouter(diagram, normalized);
  const nodes = new Map<string, PlacedNode>(placement.nodes);
  const groups = new Map<string, PlacedGroup>(placement.groups);
  let height = placement.height;
  let routed = routeDiagram(diagram, placement.nodes, placement.groups, normalized.width, height);
  for (let attempt = 1; routed.failure && attempt < ROUTING_CANVAS_GROWTH.attempts; attempt += 1) {
    height = placement.height + attempt * ROUTING_CANVAS_GROWTH.step;
    routed = routeDiagram(diagram, placement.nodes, placement.groups, normalized.width, height);
  }
  if (routed.failure) throw new Error(`Unable to route ${diagram.id} at ${normalized.width}px: ${routed.failure}`);
  return { width: normalized.width, height, nodes, groups, edges: routed.edges };
}
