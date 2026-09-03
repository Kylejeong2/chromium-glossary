import { expect, test } from "@playwright/test";
import { chromiumGlossary } from "../../src/data/chromium-glossary";
import { NODE_FONT_SIZE, SUPPORT_FONT_SIZE, diagramTextWidth } from "../../src/domain/diagram";
import type { ConceptDiagram, DiagramEndpoint, DiagramIntent } from "../../src/domain/glossary";

const widths = [328, 360, 520, 680, 840] as const;
const BROWSER_TEXT_METRIC_ABSOLUTE_TOLERANCE = 0.02;
const BROWSER_TEXT_METRIC_RELATIVE_TOLERANCE = 0.001;
const entries = chromiumGlossary.stages.flatMap((stage) => stage.entries);

type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
type AuthoredDiagram = Readonly<{
  nodes: readonly Readonly<{ id: string; label: string }>[];
  groups: readonly Readonly<{ id: string; label: string; nodeIds: readonly string[] }>[];
  edges: readonly Readonly<{ id: string; label: string; from: DiagramEndpoint; to: DiagramEndpoint }>[];
  intent: DiagramIntent;
}>;

function authoredExpectation(diagram: ConceptDiagram): AuthoredDiagram {
  return {
    nodes: diagram.nodes.map(({ id, label }) => ({ id, label })),
    groups: diagram.groups.map(({ id, label, nodeIds }) => ({ id, label, nodeIds })),
    edges: diagram.edges.map(({ id, label, from, to }) => ({ id, label, from, to })),
    intent: diagram.intent,
  };
}

function entryBySlug(slug: string) {
  const entry = entries.find((candidate) => candidate.slug === slug);
  if (!entry) throw new Error(`Missing glossary entry ${slug}`);
  return entry;
}

async function setDiagramWidth(page: import("@playwright/test").Page, width: number) {
  const figure = page.locator(".concept-diagram");
  await figure.evaluate((element, nextWidth) => {
    element.setAttribute("style", `width:${nextWidth}px;max-width:none;padding-inline:0;overflow:visible`);
    const frame = element.querySelector<HTMLElement>(".diagram-canvas-frame");
    if (!frame) throw new Error("Diagram frame is missing");
    frame.style.width = "100%";
  }, width);
  await expect.poll(() => figure.locator(".diagram-canvas-frame").evaluate((element) => element.clientWidth)).toBe(width);
  await expect.poll(() => figure.locator("svg").evaluate((svg) => (svg as SVGSVGElement).viewBox.baseVal.width)).toBe(width);
  await expect(figure).toHaveAttribute("data-density", width < 560 ? "compact" : "wide");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function renderedIssues(
  page: import("@playwright/test").Page,
  expectation: AuthoredDiagram,
) {
  return page.locator(".diagram-canvas").evaluate((svg, authored) => {
    const root = svg as SVGSVGElement;
    type Label = Readonly<{ id: string; kind: "node" | "group" | "edge"; bounds: Rect }>;
    type RenderedUnit = Readonly<{ id: string; bounds: Rect; text: Rect; label: string }>;
    type RenderedEdge = Readonly<{ id: string; path: SVGPathElement; label: Rect; text: Rect; labelText: string }>;
    const issues: string[] = [];
    const bounds = (element: SVGGraphicsElement): Rect => {
      const value = element.getBBox();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    };
    const right = (rect: Rect) => rect.x + rect.width;
    const bottom = (rect: Rect) => rect.y + rect.height;
    const contains = (outer: Rect, inner: Rect, tolerance = 0.75) => inner.x >= outer.x - tolerance
      && inner.y >= outer.y - tolerance
      && right(inner) <= right(outer) + tolerance
      && bottom(inner) <= bottom(outer) + tolerance;
    const intersects = (left: Rect, rightRect: Rect, tolerance = 0.75) => left.x < right(rightRect) - tolerance
      && right(left) > rightRect.x + tolerance
      && left.y < bottom(rightRect) - tolerance
      && bottom(left) > rightRect.y + tolerance;
    const renderedLabel = (element: SVGTextElement) => [...element.querySelectorAll("tspan")]
      .map((line) => line.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const normalizedLabel = (value: string) => value.replace(/\s+/g, " ").trim();
    const center = (rect: Rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
    const distinctAxis = (values: readonly number[]) => new Set(values.map((value) => Math.round(value * 10))).size;
    const touches = (rect: Rect, point: DOMPoint, tolerance = 1) => {
      const withinX = point.x >= rect.x - tolerance && point.x <= right(rect) + tolerance;
      const withinY = point.y >= rect.y - tolerance && point.y <= bottom(rect) + tolerance;
      const onVertical = Math.abs(point.x - rect.x) <= tolerance || Math.abs(point.x - right(rect)) <= tolerance;
      const onHorizontal = Math.abs(point.y - rect.y) <= tolerance || Math.abs(point.y - bottom(rect)) <= tolerance;
      return (withinY && onVertical) || (withinX && onHorizontal);
    };
    const pathIntersects = (path: SVGPathElement, rect: Rect) => {
      const length = path.getTotalLength();
      for (let offset = 0; offset <= length; offset += 0.5) {
        const point = path.getPointAtLength(offset);
        if (point.x > rect.x + 0.5 && point.x < right(rect) - 0.5 && point.y > rect.y + 0.5 && point.y < bottom(rect) - 0.5) return true;
      }
      return false;
    };
    const auditIds = (kind: "node" | "group" | "edge", actual: readonly string[], expected: readonly string[]) => {
      const actualCounts = new Map<string, number>();
      actual.forEach((id) => actualCounts.set(id, (actualCounts.get(id) ?? 0) + 1));
      for (const [id, count] of actualCounts) if (count > 1) issues.push(`${kind}.duplicate:${id}`);
      for (const id of expected) if (!actualCounts.has(id)) issues.push(`${kind}.missing:${id}`);
      const expectedIds = new Set(expected);
      for (const id of actualCounts.keys()) if (!expectedIds.has(id)) issues.push(`${kind}.unexpected:${id}`);
      if (actual.length !== expected.length) issues.push(`${kind}.cardinality:${actual.length}:${expected.length}`);
    };
    const graphLevels = () => {
      const incoming = new Map(authored.nodes.map((node) => [node.id, 0]));
      const outgoing = new Map(authored.nodes.map((node) => [node.id, [] as string[]]));
      for (const edge of authored.edges) {
        if (edge.from.kind !== "node" || edge.to.kind !== "node") continue;
        incoming.set(edge.to.id, (incoming.get(edge.to.id) ?? 0) + 1);
        outgoing.get(edge.from.id)?.push(edge.to.id);
      }
      const sources = authored.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
      const firstNode = authored.nodes[0]?.id;
      const queue: { id: string; depth: number }[] = (sources.length ? sources : firstNode ? [firstNode] : []).map((id) => ({ id, depth: 0 }));
      const depths = new Map<string, number>();
      while (queue.length) {
        const current = queue.shift();
        if (!current || depths.has(current.id)) continue;
        depths.set(current.id, current.depth);
        for (const target of outgoing.get(current.id) ?? []) queue.push({ id: target, depth: current.depth + 1 });
      }
      for (const node of authored.nodes) {
        if (!depths.has(node.id)) depths.set(node.id, Math.max(0, ...depths.values()) + 1);
      }
      return [...new Set(depths.values())].sort((left, rightValue) => left - rightValue).map((depth) => authored.nodes.filter((node) => depths.get(node.id) === depth).map((node) => node.id));
    };
    const viewBox = root.viewBox.baseVal;
    const canvas = { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height };
    const readUnits = (selector: ".diagram-unit" | ".diagram-group", identity: "diagramNode" | "diagramGroup", kind: "node" | "group") => {
      const result: RenderedUnit[] = [];
      for (const group of root.querySelectorAll<SVGGElement>(selector)) {
        const id = group.dataset[identity];
        const rect = group.querySelector<SVGRectElement>(":scope > rect");
        const text = group.querySelector<SVGTextElement>(":scope > text");
        if (!id) issues.push(`${kind}.identity`);
        if (!rect) issues.push(`${kind}.rect:${id ?? "missing-id"}`);
        if (!text) issues.push(`${kind}.text-element:${id ?? "missing-id"}`);
        if (id && rect && text) result.push({ id, bounds: bounds(rect), text: bounds(text), label: renderedLabel(text) });
      }
      return result;
    };
    const nodes = readUnits(".diagram-unit", "diagramNode", "node");
    const groups = readUnits(".diagram-group", "diagramGroup", "group");
    const edges: RenderedEdge[] = [];
    for (const group of root.querySelectorAll<SVGGElement>(".diagram-relation")) {
      const id = group.dataset.diagramEdge;
      const path = group.querySelector<SVGPathElement>(":scope > path");
      const label = group.querySelector<SVGRectElement>(":scope > .diagram-relation__label-bg");
      const text = group.querySelector<SVGTextElement>(":scope > text");
      if (!id) issues.push("edge.identity");
      if (!path) issues.push(`edge.path:${id ?? "missing-id"}`);
      if (!label) issues.push(`edge.label-element:${id ?? "missing-id"}`);
      if (!text) issues.push(`edge.text-element:${id ?? "missing-id"}`);
      if (id && path && label && text) edges.push({ id, path, label: bounds(label), text: bounds(text), labelText: renderedLabel(text) });
    }
    auditIds("node", nodes.map((node) => node.id), authored.nodes.map((node) => node.id));
    auditIds("group", groups.map((group) => group.id), authored.groups.map((group) => group.id));
    auditIds("edge", edges.map((edge) => edge.id), authored.edges.map((edge) => edge.id));
    const authoredNodes = new Map(authored.nodes.map((node) => [node.id, node]));
    const authoredGroups = new Map(authored.groups.map((group) => [group.id, group]));
    const authoredEdges = new Map(authored.edges.map((edge) => [edge.id, edge]));
    const renderedNodes = new Map(nodes.map((node) => [node.id, node]));
    const renderedGroups = new Map(groups.map((group) => [group.id, group]));
    const renderedEdges = new Map(edges.map((edge) => [edge.id, edge]));
    const labels: Label[] = [
      ...nodes.map((node) => ({ id: node.id, kind: "node" as const, bounds: node.text })),
      ...groups.map((group) => ({ id: group.id, kind: "group" as const, bounds: group.text })),
      ...edges.map((edge) => ({ id: edge.id, kind: "edge" as const, bounds: edge.label })),
    ];

    for (const node of nodes) {
      if (!contains(canvas, node.bounds)) issues.push(`node.bounds:${node.id}`);
      if (!contains(node.bounds, node.text)) issues.push(`node.text:${node.id}`);
      if (normalizedLabel(authoredNodes.get(node.id)?.label ?? "") !== node.label) issues.push(`node.label:${node.id}`);
    }
    for (let left = 0; left < nodes.length; left += 1) {
      for (let rightIndex = left + 1; rightIndex < nodes.length; rightIndex += 1) {
        if (intersects(nodes[left].bounds, nodes[rightIndex].bounds)) issues.push(`node.overlap:${nodes[left].id}:${nodes[rightIndex].id}`);
      }
    }
    for (const group of groups) {
      if (!contains(canvas, group.bounds)) issues.push(`group.bounds:${group.id}`);
      if (!contains(group.bounds, group.text)) issues.push(`group.text:${group.id}`);
      if (normalizedLabel(authoredGroups.get(group.id)?.label ?? "") !== group.label) issues.push(`group.label:${group.id}`);
    }
    for (const edge of edges) {
      if (!contains(canvas, bounds(edge.path))) issues.push(`edge.bounds:${edge.id}`);
      if (!contains(canvas, edge.label)) issues.push(`edge.label.bounds:${edge.id}`);
      if (!contains(edge.label, edge.text)) issues.push(`edge.label.text:${edge.id}`);
      if (normalizedLabel(authoredEdges.get(edge.id)?.label ?? "") !== edge.labelText) issues.push(`edge.label:${edge.id}`);
      const expectedEdge = authoredEdges.get(edge.id);
      if (!expectedEdge) continue;
      const endpointBounds = (endpoint: DiagramEndpoint) => endpoint.kind === "node" ? renderedNodes.get(endpoint.id)?.bounds : renderedGroups.get(endpoint.id)?.bounds;
      const from = endpointBounds(expectedEdge.from);
      const to = endpointBounds(expectedEdge.to);
      const length = edge.path.getTotalLength();
      if (!(length > 0)) issues.push(`edge.length:${edge.id}`);
      if (from && !touches(from, edge.path.getPointAtLength(0))) issues.push(`edge.from:${edge.id}:${expectedEdge.from.kind}:${expectedEdge.from.id}`);
      if (to && !touches(to, edge.path.getPointAtLength(length))) issues.push(`edge.to:${edge.id}:${expectedEdge.to.kind}:${expectedEdge.to.id}`);
    }
    for (let left = 0; left < labels.length; left += 1) {
      for (let rightIndex = left + 1; rightIndex < labels.length; rightIndex += 1) {
        if (intersects(labels[left].bounds, labels[rightIndex].bounds)) issues.push(`label.overlap:${labels[left].kind}:${labels[left].id}:${labels[rightIndex].kind}:${labels[rightIndex].id}`);
      }
    }
    for (const label of labels) {
      if (!contains(canvas, label.bounds)) issues.push(`label.bounds:${label.kind}:${label.id}`);
      for (const node of nodes) {
        if (label.kind === "node" && label.id === node.id) continue;
        if (intersects(label.bounds, node.bounds)) issues.push(`label.node:${label.kind}:${label.id}:${node.id}`);
      }
    }
    for (const edge of edges) {
      const authoredEdge = authoredEdges.get(edge.id);
      if (!authoredEdge) {
        issues.push(`edge.authored:${edge.id}`);
        continue;
      }
      for (const node of nodes) {
        const endpoint = (authoredEdge.from.kind === "node" && authoredEdge.from.id === node.id)
          || (authoredEdge.to.kind === "node" && authoredEdge.to.id === node.id);
        if (!endpoint && pathIntersects(edge.path, node.bounds)) issues.push(`route.node:${edge.id}:${node.id}`);
      }
      for (const group of groups) {
        if (pathIntersects(edge.path, group.text)) issues.push(`route.group-label:${edge.id}:${group.id}`);
      }
      for (const other of edges) {
        if (other.id !== edge.id && pathIntersects(edge.path, other.label)) issues.push(`route.edge-label:${edge.id}:${other.id}`);
      }
    }

    const nodeCenters = (ids: readonly string[]) => ids.map((id) => renderedNodes.get(id)).filter((node): node is RenderedUnit => Boolean(node)).map((node) => center(node.bounds));
    const pattern = authored.intent;
    const compact = canvas.width < 560;
    if (pattern.pattern === "linear") {
      const ordered = pattern.order.map((id) => renderedNodes.get(id)).filter((node): node is RenderedUnit => Boolean(node));
      if (ordered.length === pattern.order.length) {
        if (compact && ordered.some((node, index) => index > 0 && node.bounds.y <= ordered[index - 1].bounds.y)) issues.push("silhouette.linear.compact-order");
        if (!compact) {
          const rowStarts = ordered.reduce<number[]>((starts, node, index) => index === 0 || Math.abs(node.bounds.y - ordered[index - 1].bounds.y) > 1 ? [...starts, index] : starts, []);
          const rows = rowStarts.map((start, index) => ordered.slice(start, rowStarts[index + 1] ?? ordered.length));
          const rowOrder = rows.length === 1
            ? rows[0].every((node, index) => index === 0 || node.bounds.x > rows[0][index - 1].bounds.x)
            : rows.length === 2
              && rows[0].every((node, index) => index === 0 || node.bounds.x > rows[0][index - 1].bounds.x)
              && rows[1].every((node, index) => index === 0 || node.bounds.x < rows[1][index - 1].bounds.x)
              && rows[1][0].bounds.y > rows[0][0].bounds.y;
          if (!rowOrder) issues.push("silhouette.linear.wide-order");
        }
      }
    }
    if (pattern.pattern === "branch") {
      const rootNode = renderedNodes.get(pattern.rootId);
      const targetIds = authored.edges.filter((edge) => edge.from.kind === "node" && edge.from.id === pattern.rootId && edge.to.kind === "node").map((edge) => edge.to.id);
      const targets = nodeCenters(targetIds);
      if (rootNode && targets.length === targetIds.length) {
        const rootCenter = center(rootNode.bounds);
        if (targets.length < 2 || distinctAxis(targets.map((point) => point.x)) < 2 || targets.some((point) => point.y <= rootCenter.y)) issues.push("silhouette.branch");
      }
    }
    if (pattern.pattern === "fan-in") {
      const sinkNode = renderedNodes.get(pattern.sinkId);
      const sourceIds = authored.edges.filter((edge) => edge.to.kind === "node" && edge.to.id === pattern.sinkId && edge.from.kind === "node").map((edge) => edge.from.id);
      const sources = nodeCenters(sourceIds);
      if (sinkNode && sources.length === sourceIds.length) {
        const sink = center(sinkNode.bounds);
        const ordered = compact ? sources.every((point) => point.y < sink.y) : sources.every((point) => point.x < sink.x);
        const lanes = distinctAxis(sources.map((point) => compact ? point.x : point.y));
        if (sources.length < 2 || lanes < 2 || !ordered) issues.push(`silhouette.fan-in.${compact ? "compact" : "wide"}`);
      }
    }
    if (pattern.pattern === "fan-out") {
      const sourceNode = renderedNodes.get(pattern.sourceId);
      const targetIds = authored.edges.filter((edge) => edge.from.kind === "node" && edge.from.id === pattern.sourceId && edge.to.kind === "node").map((edge) => edge.to.id);
      const targets = nodeCenters(targetIds);
      if (sourceNode && targets.length === targetIds.length) {
        const source = center(sourceNode.bounds);
        const ordered = compact ? targets.every((point) => point.y > source.y) : targets.every((point) => point.x > source.x);
        const lanes = distinctAxis(targets.map((point) => compact ? point.x : point.y));
        if (targets.length < 2 || lanes < 2 || !ordered) issues.push(`silhouette.fan-out.${compact ? "compact" : "wide"}`);
      }
    }
    if (pattern.pattern === "containment") {
      for (const authoredGroup of authored.groups) {
        const group = renderedGroups.get(authoredGroup.id);
        if (!group) continue;
        for (const nodeId of authoredGroup.nodeIds) {
          const node = renderedNodes.get(nodeId);
          if (node && !contains(group.bounds, node.bounds, 1)) issues.push(`silhouette.containment.member:${authoredGroup.id}:${nodeId}`);
        }
      }
      const orderedGroups = pattern.groupOrder.map((id) => renderedGroups.get(id)).filter((group): group is RenderedUnit => Boolean(group));
      if (orderedGroups.length === pattern.groupOrder.length && orderedGroups.length > 1) {
        const groupCenters = orderedGroups.map((group) => center(group.bounds));
        if (groupCenters.some((point, index) => index > 0 && (compact ? point.y <= groupCenters[index - 1].y : point.x <= groupCenters[index - 1].x))) issues.push(`silhouette.containment.${compact ? "compact" : "wide"}-order`);
      }
    }
    if (pattern.pattern === "boundary") {
      const regions = pattern.regionOrder.map((id) => renderedGroups.get(id)).filter((group): group is RenderedUnit => Boolean(group));
      for (const authoredGroup of authored.groups) {
        const region = renderedGroups.get(authoredGroup.id);
        if (!region) continue;
        for (const nodeId of authoredGroup.nodeIds) {
          const node = renderedNodes.get(nodeId);
          if (node && !contains(region.bounds, node.bounds, 1)) issues.push(`silhouette.boundary.member:${authoredGroup.id}:${nodeId}`);
        }
      }
      for (let leftIndex = 0; leftIndex < regions.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < regions.length; rightIndex += 1) {
          if (intersects(regions[leftIndex].bounds, regions[rightIndex].bounds)) issues.push(`silhouette.boundary.overlap:${regions[leftIndex].id}:${regions[rightIndex].id}`);
        }
      }
      if (regions.length === pattern.regionOrder.length) {
        const regionCenters = regions.map((region) => center(region.bounds));
        if (regionCenters.some((point, index) => index > 0 && (compact ? point.y <= regionCenters[index - 1].y : point.x <= regionCenters[index - 1].x))) issues.push(`silhouette.boundary.${compact ? "compact" : "wide"}-order`);
      }
    }
    if (pattern.pattern === "cycle") {
      const ordered = pattern.order.map((id) => renderedNodes.get(id)).filter((node): node is RenderedUnit => Boolean(node));
      if (ordered.length === pattern.order.length) {
        const centers = ordered.map((node) => center(node.bounds));
        if (compact) {
          if (centers.some((point, index) => index > 0 && point.y <= centers[index - 1].y)) issues.push("silhouette.cycle.compact-order");
          if (centers.some((point, index) => index > 0 && (point.x - canvas.width / 2) * (centers[index - 1].x - canvas.width / 2) >= 0)) issues.push("silhouette.cycle.compact-alternation");
        } else if (ordered.length === 4) {
          const [topLeft, topRight, bottomRight, bottomLeft] = ordered;
          if (!(topLeft.bounds.x < topRight.bounds.x && bottomLeft.bounds.x < bottomRight.bounds.x && topLeft.bounds.y === topRight.bounds.y && bottomLeft.bounds.y === bottomRight.bounds.y && bottomLeft.bounds.y > topLeft.bounds.y)) issues.push("silhouette.cycle.wide-loop");
        }
      }
      const closing = authored.edges.find((edge) => edge.from.id === pattern.order.at(-1) && edge.to.id === pattern.startId);
      if (!closing || !renderedEdges.has(closing.id)) issues.push("silhouette.cycle.closure");
    }
    if (pattern.pattern === "state") {
      const levels = graphLevels();
      let priorBottom = Number.NEGATIVE_INFINITY;
      levels.forEach((ids, levelIndex) => {
        const units = ids.map((id) => renderedNodes.get(id)).filter((node): node is RenderedUnit => Boolean(node));
        if (units.length !== ids.length) return;
        const minTop = Math.min(...units.map((unit) => unit.bounds.y));
        if (minTop <= priorBottom) issues.push(`silhouette.state.primary-path:${levelIndex}`);
        if (compact) {
          if (units.some((unit, index) => index > 0 && unit.bounds.y <= units[index - 1].bounds.y)) issues.push(`silhouette.state.level-order:${levelIndex}`);
          if (units.length > 1) {
            const laneStarts = units.map((unit) => unit.bounds.x);
            const alternates = laneStarts.every((value, index) => index === 0 || Math.abs(value - laneStarts[index - 1]) > 1)
              && laneStarts.every((value, index) => index < 2 || Math.abs(value - laneStarts[index - 2]) <= 1);
            if (distinctAxis(laneStarts) < 2 || !alternates) issues.push(`silhouette.state.branch-lane:${levelIndex}`);
          }
        } else {
          if (units.some((unit) => Math.abs(unit.bounds.y - units[0].bounds.y) > 1)) issues.push(`silhouette.state.level-row:${levelIndex}`);
          if (units.some((unit, index) => index > 0 && unit.bounds.x <= units[index - 1].bounds.x)) issues.push(`silhouette.state.level-order:${levelIndex}`);
        }
        priorBottom = Math.max(...units.map((unit) => bottom(unit.bounds)));
      });
      for (const decisionId of pattern.decisionNodeIds) {
        const decisionNode = renderedNodes.get(decisionId);
        const targetIds = authored.edges.filter((edge) => edge.from.kind === "node" && edge.from.id === decisionId && edge.to.kind === "node").map((edge) => edge.to.id);
        const targets = nodeCenters(targetIds);
        if (decisionNode && targets.length === targetIds.length) {
          const decision = center(decisionNode.bounds);
          if (targets.length < 2 || distinctAxis(targets.map((point) => point.x)) < 2 || targets.some((point) => point.y <= decision.y)) issues.push(`silhouette.state.decision:${decisionId}`);
        }
      }
      const incoming = new Map<string, typeof authored.edges>();
      for (const edge of authored.edges) {
        if (edge.from.kind !== "node" || edge.to.kind !== "node") continue;
        incoming.set(edge.to.id, [...(incoming.get(edge.to.id) ?? []), edge]);
      }
      for (const [targetId, incomingEdges] of incoming) {
        if (new Set(incomingEdges.map((edge) => edge.from.id)).size < 2) continue;
        const target = renderedNodes.get(targetId);
        if (!target) continue;
        const connected = incomingEdges.every((authoredEdge) => {
          const route = renderedEdges.get(authoredEdge.id);
          const source = renderedNodes.get(authoredEdge.from.id);
          if (!route || !source) return false;
          const length = route.path.getTotalLength();
          return length > 0 && touches(source.bounds, route.path.getPointAtLength(0)) && touches(target.bounds, route.path.getPointAtLength(length));
        });
        if (!connected) issues.push(`silhouette.state.rejoin:${targetId}`);
      }
    }
    return issues;
  }, expectation);
}

test("font artifact matches Chromium SVG text advances", async ({ page }) => {
  await page.goto("/glossary/navigation");
  await expect(page.locator(".concept-diagram")).toHaveAttribute("data-font-status", "ready");
  const labels = entries.flatMap((entry) => [
    ...entry.diagram.nodes.map((node) => ({ text: node.label, fontSize: NODE_FONT_SIZE })),
    ...entry.diagram.edges.map((edge) => ({ text: edge.label, fontSize: SUPPORT_FONT_SIZE })),
    ...entry.diagram.groups.map((group) => ({ text: group.label, fontSize: SUPPORT_FONT_SIZE })),
  ]);
  const fragments = labels.flatMap((label) => {
    const words = label.text.trim().split(/\s+/).filter(Boolean);
    return words.flatMap((_, start) => words.slice(start).map((__, offset) => ({ text: words.slice(start, start + offset + 1).join(" "), fontSize: label.fontSize })));
  });
  const samples = [...new Map(fragments.map((sample) => [`${sample.fontSize}:${sample.text}`, sample])).values()].map((sample) => ({
    ...sample,
    expected: diagramTextWidth(sample.text, sample.fontSize),
  }));
  const actual = await page.locator(".concept-diagram").evaluate((figure, inputs) => {
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.style.position = "absolute";
    svg.style.visibility = "hidden";
    figure.append(svg);
    const results = inputs.map((input) => {
      const text = document.createElementNS(namespace, "text");
      text.setAttribute("font-size", String(input.fontSize));
      text.textContent = input.text;
      svg.append(text);
      return text.getComputedTextLength();
    });
    svg.remove();
    return results;
  }, samples);
  samples.forEach((sample, index) => {
    const tolerance = Math.max(BROWSER_TEXT_METRIC_ABSOLUTE_TOLERANCE, sample.expected * BROWSER_TEXT_METRIC_RELATIVE_TOLERANCE);
    expect(Math.abs(actual[index] - sample.expected), sample.text).toBeLessThan(tolerance);
  });
});

test("font failure preserves the textual relationship instead of rendering mismatched geometry", async ({ page }) => {
  await page.route("**/assets/fonts/GT-Standard-Mono-Regular.otf", (route) => route.abort("failed"));
  await page.goto("/glossary/navigation");
  const figure = page.locator(".concept-diagram");
  await expect(figure).toHaveAttribute("data-font-status", "error");
  await expect(figure.locator(".diagram-font-error")).toBeVisible();
  await expect(figure.locator("svg")).toHaveCount(0);
  await expect(figure.locator("figcaption")).toBeVisible();
});

test("rendered silhouette audit rejects reordered chains, state lanes, and disconnected rejoins", async ({ page }) => {
  const linearEntry = entryBySlug("content-layer");
  if (linearEntry.diagram.intent.pattern !== "linear") throw new Error("Content Layer must remain a linear diagram");
  await page.goto(`/glossary/${linearEntry.slug}`);
  await expect(page.locator(".concept-diagram")).toHaveAttribute("data-font-status", "ready");
  await setDiagramWidth(page, 840);
  const linearExpectation = authoredExpectation(linearEntry.diagram);
  const reversedLinear: AuthoredDiagram = { ...linearExpectation, intent: { ...linearEntry.diagram.intent, order: [...linearEntry.diagram.intent.order].reverse() } };
  expect(await renderedIssues(page, reversedLinear)).toContain("silhouette.linear.wide-order");

  const stateEntry = entryBySlug("render-frame-host");
  if (stateEntry.diagram.intent.pattern !== "state") throw new Error("RenderFrameHost must remain a state diagram");
  await page.goto(`/glossary/${stateEntry.slug}`);
  await expect(page.locator(".concept-diagram")).toHaveAttribute("data-font-status", "ready");
  await setDiagramWidth(page, 840);
  const stateExpectation = authoredExpectation(stateEntry.diagram);
  expect(await renderedIssues(page, { ...stateExpectation, nodes: [...stateExpectation.nodes].reverse() })).toContain("silhouette.state.level-order:1");
  await page.locator('[data-diagram-edge="commit-new"] > path').evaluate((path) => path.setAttribute("d", "M0 0L1 1"));
  expect(await renderedIssues(page, stateExpectation)).toContain("silhouette.state.rejoin:new-host");
});

for (const entry of entries) {
  test(`${entry.slug} has valid rendered geometry at all AC-18 widths`, async ({ page }) => {
    await page.goto(`/glossary/${entry.slug}`);
    const figure = page.locator(".concept-diagram");
    await expect(figure).toHaveAttribute("data-font-status", "ready");
    const expectation = authoredExpectation(entry.diagram);
    for (const width of widths) {
      await setDiagramWidth(page, width);
      expect(await renderedIssues(page, expectation), `${entry.slug} at ${width}px`).toEqual([]);
    }
  });
}
