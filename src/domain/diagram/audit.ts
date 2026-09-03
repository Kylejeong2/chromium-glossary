import type { ConceptDiagram } from "../glossary";
import { geometryBottom, geometryIntersects, geometryRight, geometrySegmentIntersectsRect } from "./router";
import type { DiagramGeometry, GeometryIssue, Point, Rect } from "./types";

function center(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function contains(outer: Rect, inner: Rect, tolerance = 0): boolean {
  return inner.x >= outer.x - tolerance
    && inner.y >= outer.y - tolerance
    && geometryRight(inner) <= geometryRight(outer) + tolerance
    && geometryBottom(inner) <= geometryBottom(outer) + tolerance;
}

function add(issues: GeometryIssue[], code: string, detail: string): void {
  issues.push({ code, detail });
}

function patternIssues(diagram: ConceptDiagram, geometry: DiagramGeometry, issues: GeometryIssue[]): void {
  const nodeCenter = (id: string) => center(geometry.nodes.get(id)!.bounds);
  if (diagram.intent.pattern === "linear") {
    const centers = diagram.intent.order.map(nodeCenter);
    if (centers.some((point, index) => index > 0 && point.x === centers[index - 1].x && point.y === centers[index - 1].y)) {
      add(issues, "silhouette.linear", "Ordered linear nodes must occupy distinct positions.");
    }
  }
  if (diagram.intent.pattern === "branch") {
    const rootId = diagram.intent.rootId;
    const targets = diagram.edges.filter((edge) => edge.from.id === rootId && edge.to.kind === "node").map((edge) => nodeCenter(edge.to.id));
    if (targets.length < 2 || new Set(targets.map((point) => `${point.x}:${point.y}`)).size < 2) {
      add(issues, "silhouette.branch", "Branch targets must visibly diverge from the root.");
    }
  }
  if (diagram.intent.pattern === "fan-in") {
    const sinkId = diagram.intent.sinkId;
    const sink = nodeCenter(sinkId);
    const sources = diagram.edges.filter((edge) => edge.to.id === sinkId && edge.from.kind === "node").map((edge) => nodeCenter(edge.from.id));
    if (sources.length < 2 || new Set(sources.map((point) => `${point.x}:${point.y}`)).size < 2 || sources.every((point) => point.y === sink.y && point.x === sink.x)) {
      add(issues, "silhouette.fan-in", "Fan-in sources must remain distinct before the sink.");
    }
  }
  if (diagram.intent.pattern === "fan-out") {
    const sourceId = diagram.intent.sourceId;
    const source = nodeCenter(sourceId);
    const targets = diagram.edges.filter((edge) => edge.from.id === sourceId && edge.to.kind === "node").map((edge) => nodeCenter(edge.to.id));
    if (targets.length < 2 || new Set(targets.map((point) => `${point.x}:${point.y}`)).size < 2 || targets.every((point) => point.y === source.y && point.x === source.x)) {
      add(issues, "silhouette.fan-out", "Fan-out targets must remain distinct after the source.");
    }
  }
  if (diagram.intent.pattern === "containment") {
    for (const group of diagram.groups) {
      const placedGroup = geometry.groups.get(group.id);
      if (!placedGroup) continue;
      for (const nodeId of group.nodeIds) {
        const placedNode = geometry.nodes.get(nodeId);
        if (placedNode && !contains(placedGroup.bounds, placedNode.bounds, 1)) {
          add(issues, "silhouette.containment", `${nodeId} must stay inside ${group.id}.`);
        }
      }
    }
  }
  if (diagram.intent.pattern === "boundary") {
    const regions = diagram.intent.regionOrder.map((id) => geometry.groups.get(id)).filter(Boolean);
    for (let left = 0; left < regions.length; left += 1) {
      for (let right = left + 1; right < regions.length; right += 1) {
        if (geometryIntersects(regions[left]!.bounds, regions[right]!.bounds)) {
          add(issues, "silhouette.boundary", "Boundary regions must remain distinct.");
        }
      }
    }
  }
  if (diagram.intent.pattern === "cycle") {
    const order = diagram.intent.order;
    const startId = diagram.intent.startId;
    const closing = diagram.edges.find((edge) => edge.from.id === order.at(-1) && edge.to.id === startId);
    const route = closing ? geometry.edges.get(closing.id) : undefined;
    if (!route || route.points.length < 2) add(issues, "silhouette.cycle", "The cycle needs a visible closing route.");
  }
  if (diagram.intent.pattern === "state") {
    for (const decisionId of diagram.intent.decisionNodeIds) {
      const targets = diagram.edges.filter((edge) => edge.from.id === decisionId && edge.to.kind === "node").map((edge) => nodeCenter(edge.to.id));
      if (targets.length < 2 || new Set(targets.map((point) => `${point.x}:${point.y}`)).size < 2) {
        add(issues, "silhouette.state", `${decisionId} needs distinct outcome lanes.`);
      }
    }
  }
}

export function auditDiagramGeometry(diagram: ConceptDiagram, geometry: DiagramGeometry): readonly GeometryIssue[] {
  const issues: GeometryIssue[] = [];
  const canvas = { x: 0, y: 0, width: geometry.width, height: geometry.height };
  for (const node of diagram.nodes) {
    const placed = geometry.nodes.get(node.id);
    if (!placed) {
      add(issues, "node.missing", node.id);
      continue;
    }
    if (!contains(canvas, placed.bounds)) add(issues, "node.bounds", node.id);
    if (!contains(placed.bounds, placed.label.bounds)) add(issues, "node.label-clipped", node.id);
  }
  const placedNodes = [...geometry.nodes.values()];
  for (let left = 0; left < placedNodes.length; left += 1) {
    for (let right = left + 1; right < placedNodes.length; right += 1) {
      if (geometryIntersects(placedNodes[left].bounds, placedNodes[right].bounds, 1)) {
        add(issues, "node.overlap", `${placedNodes[left].id} and ${placedNodes[right].id}`);
      }
    }
  }
  for (const group of diagram.groups) {
    const placed = geometry.groups.get(group.id);
    if (!placed) {
      add(issues, "group.missing", group.id);
      continue;
    }
    if (!contains(canvas, placed.bounds)) add(issues, "group.bounds", group.id);
    if (!contains(placed.bounds, placed.label.bounds)) add(issues, "group.label-clipped", group.id);
    for (const node of placedNodes) {
      if (geometryIntersects(placed.label.bounds, node.bounds, 1)) add(issues, "group.label-node", `${group.id} and ${node.id}`);
    }
  }
  const edgeLabels: { id: string; bounds: Rect }[] = [];
  for (const edge of diagram.edges) {
    const routed = geometry.edges.get(edge.id);
    if (!routed) {
      add(issues, "edge.missing", edge.id);
      continue;
    }
    if (routed.from.id !== edge.from.id || routed.from.kind !== edge.from.kind || routed.to.id !== edge.to.id || routed.to.kind !== edge.to.kind) {
      add(issues, "edge.endpoint", edge.id);
    }
    if (!contains(canvas, routed.label.bounds)) add(issues, "edge.label-bounds", edge.id);
    for (const node of placedNodes) {
      const endpoint = (edge.from.kind === "node" && edge.from.id === node.id) || (edge.to.kind === "node" && edge.to.id === node.id);
      if (geometryIntersects(routed.label.bounds, node.bounds, 1)) add(issues, "edge.label-node", `${edge.id} and ${node.id}`);
      if (!endpoint) {
        for (let index = 1; index < routed.points.length; index += 1) {
          if (geometrySegmentIntersectsRect(routed.points[index - 1], routed.points[index], node.bounds)) {
            add(issues, "edge.node-obstruction", `${edge.id} crosses ${node.id}`);
            break;
          }
        }
      }
    }
    for (const group of geometry.groups.values()) {
      if (geometryIntersects(routed.label.bounds, group.label.bounds, 1)) add(issues, "edge.label-group", `${edge.id} and ${group.id}`);
      for (let index = 1; index < routed.points.length; index += 1) {
        if (geometrySegmentIntersectsRect(routed.points[index - 1], routed.points[index], group.label.bounds)) {
          add(issues, "edge.group-label-obstruction", `${edge.id} crosses ${group.id}`);
          break;
        }
      }
    }
    for (const prior of edgeLabels) {
      if (geometryIntersects(routed.label.bounds, prior.bounds, 1)) add(issues, "edge.label-overlap", `${edge.id} and ${prior.id}`);
    }
    for (const point of routed.points) {
      if (point.x < 0 || point.y < 0 || point.x > geometry.width || point.y > geometry.height) add(issues, "edge.bounds", edge.id);
    }
    edgeLabels.push({ id: edge.id, bounds: routed.label.bounds });
  }
  for (const edge of diagram.edges) {
    const routed = geometry.edges.get(edge.id);
    if (!routed) continue;
    for (const label of edgeLabels) {
      if (label.id === edge.id) continue;
      for (let index = 1; index < routed.points.length; index += 1) {
        if (geometrySegmentIntersectsRect(routed.points[index - 1], routed.points[index], label.bounds)) {
          add(issues, "edge.label-obstruction", `${edge.id} crosses ${label.id}`);
          break;
        }
      }
    }
  }
  if (geometry.nodes.size !== diagram.nodes.length || geometry.groups.size !== diagram.groups.length || geometry.edges.size !== diagram.edges.length) {
    add(issues, "geometry.cardinality", diagram.id);
  }
  if (diagram.nodes.every((node) => geometry.nodes.has(node.id))) patternIssues(diagram, geometry, issues);
  return issues;
}
