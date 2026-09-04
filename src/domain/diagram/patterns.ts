import type { ConceptDiagram, DiagramPattern } from "../glossary";
import { diagramGroup, diagramNode } from "./lookup";
import { align, measureNode, measureSupport, minimumNodeWidth, nodeLabel, supportLabel } from "./measure";
import type { DiagramViewport, GroupPlacement, NodePlacement, PatternPlacement, Rect } from "./types";

const INSET = 24;
const COMPACT_INSET = 16;
const GAP_X = 32;
const GAP_Y = 64;
const GROUP_HEADER = 56;
const GROUP_PADDING = 16;

type MutablePlacement = {
  nodes: Map<string, NodePlacement>;
  groups: Map<string, GroupPlacement>;
};

type PatternLayouter = (diagram: ConceptDiagram, viewport: DiagramViewport) => PatternPlacement;
type NodeAlignment = "start" | "center" | "end";

function makePlacement(): MutablePlacement {
  return { nodes: new Map(), groups: new Map() };
}

function addNode(
  placement: MutablePlacement,
  diagram: ConceptDiagram,
  id: string,
  x: number,
  y: number,
  slotWidth: number,
  viewport: DiagramViewport,
): NodePlacement {
  const node = diagramNode(diagram, id);
  const measured = measureNode(node.label, slotWidth, viewport.density);
  const bounds = { x: align(x, 4), y: align(y), width: measured.width, height: measured.height };
  const result = { id, bounds, label: nodeLabel(measured.lines, bounds) };
  placement.nodes.set(id, result);
  return result;
}

function addGroup(placement: MutablePlacement, diagram: ConceptDiagram, id: string, bounds: Rect): GroupPlacement {
  const group = diagramGroup(diagram, id);
  const measured = measureSupport(group.label, Math.max(56, bounds.width - GROUP_PADDING * 2));
  const labelBounds = {
    x: bounds.x + GROUP_PADDING,
    y: bounds.y + 8,
    width: Math.min(measured.width, bounds.width - GROUP_PADDING * 2),
    height: measured.height,
  };
  const result = { id, bounds, label: supportLabel(measured.lines, labelBounds) };
  placement.groups.set(id, result);
  return result;
}

function row(
  placement: MutablePlacement,
  diagram: ConceptDiagram,
  ids: readonly string[],
  y: number,
  left: number,
  width: number,
  viewport: DiagramViewport,
  gap = GAP_X,
): number {
  if (ids.length === 0) return y;
  const slot = Math.max(96, (width - gap * Math.max(0, ids.length - 1)) / ids.length);
  let tallest = 0;
  ids.forEach((id, index) => {
    const measured = measureNode(diagramNode(diagram, id).label, slot, viewport.density);
    tallest = Math.max(tallest, measured.height);
    const slotX = left + index * (slot + gap);
    addNode(placement, diagram, id, slotX + (slot - measured.width) / 2, y, measured.width, viewport);
  });
  return y + tallest;
}

function column(
  placement: MutablePlacement,
  diagram: ConceptDiagram,
  ids: readonly string[],
  y: number,
  left: number,
  width: number,
  viewport: DiagramViewport,
  gap = GAP_Y,
): number {
  let cursor = y;
  for (const id of ids) {
    const measured = measureNode(diagramNode(diagram, id).label, width, viewport.density);
    addNode(placement, diagram, id, left + (width - measured.width) / 2, cursor, measured.width, viewport);
    cursor += measured.height + gap;
  }
  return ids.length === 0 ? y : cursor - gap;
}

function compactRows(diagram: ConceptDiagram, ids: readonly string[], inner: number, gap: number): readonly (readonly string[])[] {
  const rows: string[][] = [];
  for (let index = 0; index < ids.length;) {
    const pair = ids.slice(index, index + 2);
    const laneWidth = (inner - gap) / 2;
    const pairFits = pair.length === 2 && pair.every((id) => minimumNodeWidth(diagramNode(diagram, id).label) - 7 <= laneWidth);
    rows.push(pairFits ? pair : [ids[index]]);
    index += pairFits ? 2 : 1;
  }
  return rows;
}

function finish(placement: MutablePlacement, height: number): PatternPlacement {
  return { height: align(height), nodes: placement.nodes, groups: placement.groups };
}

function graphLevels(diagram: ConceptDiagram): readonly string[][] {
  const incoming = new Map(diagram.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(diagram.nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of diagram.edges) {
    if (edge.from.kind !== "node" || edge.to.kind !== "node") continue;
    incoming.set(edge.to.id, (incoming.get(edge.to.id) ?? 0) + 1);
    outgoing.get(edge.from.id)?.push(edge.to.id);
  }
  const sources = diagram.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
  const queue = (sources.length ? sources : [diagram.nodes[0]?.id]).filter(Boolean).map((id) => ({ id, depth: 0 }));
  const depths = new Map<string, number>();
  while (queue.length) {
    const current = queue.shift()!;
    if (depths.has(current.id)) continue;
    depths.set(current.id, current.depth);
    for (const target of outgoing.get(current.id) ?? []) queue.push({ id: target, depth: current.depth + 1 });
  }
  diagram.nodes.forEach((node) => {
    if (!depths.has(node.id)) depths.set(node.id, Math.max(0, ...depths.values()) + 1);
  });
  const levelNumbers = [...new Set(depths.values())].sort((a, b) => a - b);
  return levelNumbers.map((depth) => diagram.nodes.filter((node) => depths.get(node.id) === depth).map((node) => node.id));
}

function graphDepths(diagram: ConceptDiagram): ReadonlyMap<string, number> {
  const incoming = new Map(diagram.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(diagram.nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of diagram.edges) {
    if (edge.from.kind !== "node" || edge.to.kind !== "node") continue;
    incoming.set(edge.to.id, (incoming.get(edge.to.id) ?? 0) + 1);
    outgoing.get(edge.from.id)?.push(edge.to.id);
  }
  const depths = new Map(diagram.nodes.map((node) => [node.id, 0]));
  const queue = diagram.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    visited.add(id);
    for (const target of outgoing.get(id) ?? []) {
      depths.set(target, Math.max(depths.get(target) ?? 0, (depths.get(id) ?? 0) + 1));
      incoming.set(target, (incoming.get(target) ?? 1) - 1);
      if (incoming.get(target) === 0) queue.push(target);
    }
  }
  diagram.nodes.filter((node) => !visited.has(node.id)).forEach((node, index) => depths.set(node.id, Math.max(...depths.values()) + index + 1));
  return depths;
}

function inducedLevels(diagram: ConceptDiagram, ids: readonly string[]): readonly string[][] {
  const members = new Set(ids);
  const incoming = new Map(ids.map((id) => [id, 0]));
  const outgoing = new Map(ids.map((id) => [id, [] as string[]]));
  for (const edge of diagram.edges) {
    if (edge.from.kind !== "node" || edge.to.kind !== "node" || !members.has(edge.from.id) || !members.has(edge.to.id)) continue;
    incoming.set(edge.to.id, (incoming.get(edge.to.id) ?? 0) + 1);
    outgoing.get(edge.from.id)?.push(edge.to.id);
  }
  const depths = new Map<string, number>();
  const queue = ids.filter((id) => (incoming.get(id) ?? 0) === 0).map((id) => ({ id, depth: 0 }));
  while (queue.length) {
    const current = queue.shift()!;
    depths.set(current.id, Math.max(depths.get(current.id) ?? 0, current.depth));
    for (const target of outgoing.get(current.id) ?? []) queue.push({ id: target, depth: current.depth + 1 });
  }
  ids.forEach((id) => {
    if (!depths.has(id)) depths.set(id, Math.max(0, ...depths.values()) + 1);
  });
  return [...new Set(depths.values())].sort((left, right) => left - right).map((depth) => ids.filter((id) => depths.get(id) === depth));
}

function boundaryExternalSpan(diagram: ConceptDiagram, nodeId: string): number {
  if (diagram.intent.pattern !== "boundary") return 0;
  const regionByNode = new Map(diagram.intent.regionOrder.flatMap((groupId, regionIndex) => diagramGroup(diagram, groupId).nodeIds.map((id) => [id, regionIndex] as const)));
  const origin = regionByNode.get(nodeId);
  if (origin === undefined) throw new Error(`Boundary node ${nodeId} has no region`);
  return Math.max(0, ...diagram.edges.flatMap((edge) => {
    if (edge.from.kind === "node" && edge.from.id === nodeId && edge.to.kind === "node") {
      const target = regionByNode.get(edge.to.id);
      if (target === undefined) throw new Error(`Boundary node ${edge.to.id} has no region`);
      return [Math.abs(origin - target)];
    }
    if (edge.to.kind === "node" && edge.to.id === nodeId && edge.from.kind === "node") {
      const source = regionByNode.get(edge.from.id);
      if (source === undefined) throw new Error(`Boundary node ${edge.from.id} has no region`);
      return [Math.abs(origin - source)];
    }
    return [];
  }));
}

function regionRows(diagram: ConceptDiagram, ids: readonly string[], width: number, prioritizeOuterRoutes = false): readonly (readonly string[])[] {
  return inducedLevels(diagram, ids).flatMap((level) => {
    const minimumWidth = level.reduce((sum, id) => sum + minimumNodeWidth(diagramNode(diagram, id).label), 0) + Math.max(0, level.length - 1) * 12;
    const sharesTarget = ids.some((targetId) => level.every((sourceId) => diagram.edges.some((edge) => edge.from.kind === "node" && edge.from.id === sourceId && edge.to.kind === "node" && edge.to.id === targetId)));
    if (minimumWidth <= width && (level.length === 1 || sharesTarget)) return [level];
    const ordered = prioritizeOuterRoutes ? [...level].sort((left, right) => boundaryExternalSpan(diagram, right) - boundaryExternalSpan(diagram, left)) : level;
    return ordered.map((id) => [id]);
  });
}

function regionRowSizes(diagram: ConceptDiagram, rows: readonly (readonly string[])[], width: number, viewport: DiagramViewport) {
  return rows.map((ids) => {
    const gap = ids.length > 1 ? 12 : 0;
    const slot = (width - gap * Math.max(0, ids.length - 1)) / Math.max(1, ids.length);
    const items = ids.map((id) => measureNode(diagramNode(diagram, id).label, slot, viewport.density));
    return { ids, gap, slot, items, height: Math.max(0, ...items.map((item) => item.height)) };
  });
}

function placeRegionRows(
  placement: MutablePlacement,
  diagram: ConceptDiagram,
  rows: ReturnType<typeof regionRowSizes>,
  x: number,
  y: number,
  viewport: DiagramViewport,
  laneHeights?: readonly number[],
  rowGap = 24,
  alignments?: ReadonlyMap<string, NodeAlignment>,
): void {
  let cursorY = y;
  rows.forEach((rowData, rowIndex) => {
    const laneHeight = laneHeights?.[rowIndex] ?? rowData.height;
    rowData.ids.forEach((id, index) => {
      const item = rowData.items[index];
      const slotX = x + index * (rowData.slot + rowData.gap);
      const alignment = alignments?.get(id) ?? "center";
      const nodeX = alignment === "start" ? slotX : alignment === "end" ? slotX + rowData.slot - item.width : slotX + (rowData.slot - item.width) / 2;
      addNode(placement, diagram, id, nodeX, cursorY + (laneHeight - item.height) / 2, item.width, viewport);
    });
    cursorY += laneHeight + rowGap;
  });
}

function desiredRegionWidth(diagram: ConceptDiagram, groupId: string): number {
  const group = diagramGroup(diagram, groupId);
  const rows = inducedLevels(diagram, group.nodeIds);
  const nodeDemand = Math.max(...rows.map((ids) => ids.reduce((sum, id) => sum + minimumNodeWidth(diagramNode(diagram, id).label), 0) + Math.max(0, ids.length - 1) * 12));
  const labelDemand = measureSupport(group.label, 220).width;
  return align(Math.max(144, nodeDemand + 24, labelDemand + 24));
}

function compactBoundaryAlignments(diagram: ConceptDiagram, groupId: string): ReadonlyMap<string, NodeAlignment> {
  const group = diagramGroup(diagram, groupId);
  const members = new Set(group.nodeIds);
  const alignments = new Map<string, NodeAlignment>();
  for (const edge of diagram.edges) {
    if (edge.from.kind !== "node" || edge.to.kind !== "node" || !members.has(edge.from.id) || !members.has(edge.to.id)) continue;
    const targetHasExternalInput = diagram.edges.some((candidate) => candidate.to.kind === "node" && candidate.to.id === edge.to.id && (candidate.from.kind !== "node" || !members.has(candidate.from.id)));
    if (targetHasExternalInput) alignments.set(edge.from.id, "end");
  }
  return alignments;
}

function layoutLinear(diagram: ConceptDiagram, viewport: DiagramViewport): PatternPlacement {
  if (diagram.intent.pattern !== "linear") throw new Error("Linear layout received another pattern");
  const intent = diagram.intent;
  const placement = makePlacement();
  const inset = viewport.density === "compact" ? COMPACT_INSET : INSET;
  const inner = viewport.width - inset * 2;
  const support = diagram.nodes.filter((node) => !intent.order.includes(node.id)).map((node) => node.id);
  let y = inset;
  if (support.length) {
    y = row(placement, diagram, support, y, inset, inner, viewport, 24) + 48;
  }
  if (viewport.density === "compact") {
    const bottom = column(placement, diagram, intent.order, y, inset, inner, viewport);
    return finish(placement, bottom + inset);
  }
  const relationGap = Math.min(176, Math.max(96, ...diagram.edges.map((edge) => measureSupport(edge.label, 220).width + 32)));
  const natural = intent.order.map((id) => measureNode(diagramNode(diagram, id).label, 208, "wide"));
  const oneRowWidth = natural.reduce((sum, item) => sum + item.width, 0) + relationGap * Math.max(0, natural.length - 1);
  if (oneRowWidth <= inner) {
    let x = inset + (inner - oneRowWidth) / 2;
    let tallest = 0;
    intent.order.forEach((id, index) => {
      const item = natural[index];
      addNode(placement, diagram, id, x, y, item.width, viewport);
      x += item.width + relationGap;
      tallest = Math.max(tallest, item.height);
    });
    return finish(placement, y + tallest + inset);
  }
  const split = Math.ceil(intent.order.length / 2);
  const first = intent.order.slice(0, split);
  const second = intent.order.slice(split).reverse();
  const fittedGap = (ids: readonly string[]) => {
    if (ids.length < 2) return relationGap;
    const slotFloor = Math.max(...ids.map((id) => minimumNodeWidth(diagramNode(diagram, id).label) - 7));
    return Math.min(relationGap, Math.max(40, (inner - slotFloor * ids.length) / (ids.length - 1)));
  };
  const firstBottom = row(placement, diagram, first, y, inset, inner, viewport, fittedGap(first));
  const secondBottom = row(placement, diagram, second, firstBottom + 96, inset, inner, viewport, fittedGap(second));
  return finish(placement, secondBottom + inset);
}

function layoutBranch(diagram: ConceptDiagram, viewport: DiagramViewport): PatternPlacement {
  if (diagram.intent.pattern !== "branch") throw new Error("Branch layout received another pattern");
  const intent = diagram.intent;
  const placement = makePlacement();
  const inset = viewport.density === "compact" ? COMPACT_INSET : INSET;
  const inner = viewport.width - inset * 2;
  const rootTargets = diagram.edges
    .filter((edge) => edge.from.kind === "node" && edge.from.id === intent.rootId && edge.to.kind === "node")
    .map((edge) => edge.to.id);
  const rootTargetSet = new Set(rootTargets);
  const contextPairs = diagram.nodes
    .filter((node) => node.id !== intent.rootId && !rootTargetSet.has(node.id))
    .map((node) => {
      const target = diagram.edges.find((edge) => edge.from.kind === "node" && edge.from.id === node.id && edge.to.kind === "node" && rootTargetSet.has(edge.to.id));
      return target?.to.kind === "node" ? { contextId: node.id, targetId: target.to.id } : undefined;
    })
    .filter((pair): pair is { contextId: string; targetId: string } => Boolean(pair));
  const comparison = rootTargets.length >= 3
    && contextPairs.length === rootTargets.length
    && rootTargets.every((targetId) => contextPairs.some((pair) => pair.targetId === targetId));
  if (comparison) {
    const rootMeasure = measureNode(diagramNode(diagram, intent.rootId).label, Math.min(224, inner), viewport.density);
    const root = addNode(placement, diagram, intent.rootId, inset + (inner - rootMeasure.width) / 2, inset, rootMeasure.width, viewport);
    if (viewport.density === "wide") {
      const targetY = root.bounds.y + root.bounds.height + 104;
      const targetBottom = row(placement, diagram, rootTargets, targetY, inset, inner, viewport, 24);
      const contexts = rootTargets.map((targetId) => contextPairs.find((pair) => pair.targetId === targetId)!.contextId);
      const contextBottom = row(placement, diagram, contexts, targetBottom + 80, inset, inner, viewport, 24);
      return finish(placement, contextBottom + inset);
    }
    const gap = 72;
    const slot = (inner - gap) / 2;
    let y = root.bounds.y + root.bounds.height + 96;
    for (const targetId of rootTargets) {
      const contextId = contextPairs.find((pair) => pair.targetId === targetId)!.contextId;
      const target = addNode(placement, diagram, targetId, inset, y, slot, viewport);
      const context = addNode(placement, diagram, contextId, inset + slot + gap, y, slot, viewport);
      y += Math.max(target.bounds.height, context.bounds.height) + 96;
    }
    return finish(placement, y - 96 + inset);
  }
  const levels = graphLevels(diagram);
  let y = inset;
  for (const ids of levels) {
    if (viewport.density === "compact" && ids.length > 2) {
      for (const [index, id] of ids.entries()) {
        const laneWidth = Math.min(152, inner * .48);
        const left = index % 2 === 0 ? inset : viewport.width - inset - laneWidth;
        const item = addNode(placement, diagram, id, left, y, laneWidth, viewport);
        y += item.bounds.height + 32;
      }
      y += 32;
    } else {
      y = row(placement, diagram, ids, y, inset, inner, viewport, viewport.density === "compact" ? 16 : 40) + GAP_Y;
    }
  }
  return finish(placement, y - GAP_Y + inset);
}

function layoutFanIn(diagram: ConceptDiagram, viewport: DiagramViewport): PatternPlacement {
  if (diagram.intent.pattern !== "fan-in") throw new Error("Fan-in layout received another pattern");
  const placement = makePlacement();
  const inset = viewport.density === "compact" ? COMPACT_INSET : INSET;
  const inner = viewport.width - inset * 2;
  const sink = diagram.intent.sinkId;
  const sources = diagram.nodes.filter((node) => diagram.edges.some((edge) => edge.from.kind === "node" && edge.from.id === node.id && edge.to.kind === "node" && edge.to.id === sink)).map((node) => node.id);
  const rest = diagram.nodes.filter((node) => node.id !== sink && !sources.includes(node.id)).map((node) => node.id);
  if (viewport.density === "compact") {
    const laneGap = 24;
    const laneWidth = (inner - laneGap) / 2;
    let y = inset;
    for (const pair of compactRows(diagram, sources, inner, laneGap)) {
      let rowHeight = 0;
      pair.forEach((id, columnIndex) => {
        const slotWidth = pair.length === 1 ? inner : laneWidth;
        const measured = measureNode(diagramNode(diagram, id).label, slotWidth, viewport.density);
        const slotX = pair.length === 1 ? inset + (inner - measured.width) / 2 : inset + columnIndex * (laneWidth + laneGap);
        const item = addNode(placement, diagram, id, slotX, y, slotWidth, viewport);
        rowHeight = Math.max(rowHeight, item.bounds.height);
      });
      y += rowHeight + 64;
    }
    y += 24;
    const sinkNode = addNode(placement, diagram, sink, inset + inner * .18, y, inner * .64, viewport);
    y += sinkNode.bounds.height + 64;
    const bottom = column(placement, diagram, rest, y, inset, inner, viewport, 40);
    return finish(placement, Math.max(y, bottom) + inset);
  }
  const lane = (inner - 96) / 2;
  const sourcesBottom = column(placement, diagram, sources, inset, inset, lane, viewport, 40);
  const sourceTop = Math.min(...[...placement.nodes.values()].map((node) => node.bounds.y));
  const sinkMeasure = measureNode(diagramNode(diagram, sink).label, lane, viewport.density);
  const sinkY = sourceTop + (sourcesBottom - sourceTop - sinkMeasure.height) / 2;
  const sinkNode = addNode(placement, diagram, sink, inset + lane + 96 + (lane - sinkMeasure.width) / 2, sinkY, sinkMeasure.width, viewport);
  const restBottom = column(placement, diagram, rest, sinkNode.bounds.y + sinkNode.bounds.height + 56, inset + lane + 96, lane, viewport, 40);
  return finish(placement, Math.max(sourcesBottom, restBottom, sinkNode.bounds.y + sinkNode.bounds.height) + inset);
}

function layoutFanOut(diagram: ConceptDiagram, viewport: DiagramViewport): PatternPlacement {
  if (diagram.intent.pattern !== "fan-out") throw new Error("Fan-out layout received another pattern");
  const placement = makePlacement();
  const inset = viewport.density === "compact" ? COMPACT_INSET : INSET;
  const inner = viewport.width - inset * 2;
  const source = diagram.intent.sourceId;
  const targets = diagram.nodes.filter((node) => diagram.edges.some((edge) => edge.from.kind === "node" && edge.from.id === source && edge.to.kind === "node" && edge.to.id === node.id)).map((node) => node.id);
  const rest = diagram.nodes.filter((node) => node.id !== source && !targets.includes(node.id)).map((node) => node.id);
  if (viewport.density === "compact") {
    const sourceMeasure = measureNode(diagramNode(diagram, source).label, inner * .7, viewport.density);
    const sourceNode = addNode(placement, diagram, source, inset + (inner - sourceMeasure.width) / 2, inset, sourceMeasure.width, viewport);
    let y = sourceNode.bounds.y + sourceNode.bounds.height + 104;
    const laneGap = 24;
    const laneWidth = (inner - laneGap) / 2;
    if (targets.length > 3) {
      const staggeredWidth = Math.min(184, inner * .62);
      targets.forEach((id, index) => {
        const x = index % 2 === 0 ? inset : viewport.width - inset - staggeredWidth;
        const item = addNode(placement, diagram, id, x, y, staggeredWidth, viewport);
        y += item.bounds.height + 40;
      });
    } else {
      for (const pair of compactRows(diagram, targets, inner, laneGap)) {
        let rowHeight = 0;
        pair.forEach((id, columnIndex) => {
          const slotWidth = pair.length === 1 ? inner : laneWidth;
          const measured = measureNode(diagramNode(diagram, id).label, slotWidth, viewport.density);
          const slotX = pair.length === 1 ? inset + (inner - measured.width) / 2 : inset + columnIndex * (laneWidth + laneGap);
          const item = addNode(placement, diagram, id, slotX, y, slotWidth, viewport);
          rowHeight = Math.max(rowHeight, item.bounds.height);
        });
        y += rowHeight + 64;
      }
    }
    y += 16;
    const bottom = column(placement, diagram, rest, y, inset, inner, viewport, 40);
    return finish(placement, Math.max(y, bottom) + inset);
  }
  const lane = (inner - 96) / 2;
  const targetsBottom = column(placement, diagram, targets, inset, inset + lane + 96, lane, viewport, 40);
  const targetTop = Math.min(...[...placement.nodes.values()].map((node) => node.bounds.y));
  const sourceMeasure = measureNode(diagramNode(diagram, source).label, lane, viewport.density);
  const sourceY = targetTop + (targetsBottom - targetTop - sourceMeasure.height) / 2;
  const sourceNode = addNode(placement, diagram, source, inset + (lane - sourceMeasure.width) / 2, sourceY, sourceMeasure.width, viewport);
  const restBottom = column(placement, diagram, rest, sourceNode.bounds.y + sourceNode.bounds.height + 56, inset, lane, viewport, 40);
  return finish(placement, Math.max(targetsBottom, restBottom, sourceNode.bounds.y + sourceNode.bounds.height) + inset);
}

function layoutContainment(diagram: ConceptDiagram, viewport: DiagramViewport): PatternPlacement {
  if (diagram.intent.pattern !== "containment") throw new Error("Containment layout received another pattern");
  const placement = makePlacement();
  const inset = viewport.density === "compact" ? COMPACT_INSET : INSET;
  const inner = viewport.width - inset * 2;
  const groupIds = diagram.intent.groupOrder;
  const shared = new Set(diagram.intent.sharedNodeIds ?? []);
  const grouped = new Set(diagram.groups.flatMap((group) => group.nodeIds));
  const external = diagram.nodes.filter((node) => !grouped.has(node.id)).map((node) => node.id);
  if (groupIds.length === 2 && shared.size > 0) {
    if (viewport.density === "compact") {
      const uniqueByGroup = groupIds.map((id) => diagramGroup(diagram, id).nodeIds.filter((nodeId) => !shared.has(nodeId)));
      const firstSizes = uniqueByGroup[0].map((id) => measureNode(diagramNode(diagram, id).label, inner - 32, viewport.density));
      const secondSizes = uniqueByGroup[1].map((id) => measureNode(diagramNode(diagram, id).label, inner - 32, viewport.density));
      const sharedHeight = Math.max(...[...shared].map((id) => measureNode(diagramNode(diagram, id).label, inner - 48, viewport.density).height));
      const overlap = align(GROUP_HEADER + sharedHeight + 40);
      const firstHeight = align(GROUP_HEADER + firstSizes.reduce((sum, item) => sum + item.height, 0) + Math.max(0, firstSizes.length - 1) * 24 + overlap);
      const secondHeight = align(GROUP_HEADER + secondSizes.reduce((sum, item) => sum + item.height, 0) + Math.max(0, secondSizes.length - 1) * 24 + overlap);
      const firstY = inset;
      const secondY = firstY + firstHeight - overlap;
      addGroup(placement, diagram, groupIds[0], { x: inset, y: firstY, width: inner, height: firstHeight });
      addGroup(placement, diagram, groupIds[1], { x: inset, y: secondY, width: inner, height: secondHeight });
      let firstNodeY = firstY + GROUP_HEADER;
      uniqueByGroup[0].forEach((id, index) => {
        const item = firstSizes[index];
        addNode(placement, diagram, id, inset + (inner - item.width) / 2, firstNodeY, item.width, viewport);
        firstNodeY += item.height + 24;
      });
      let sharedY = secondY + GROUP_HEADER + 24;
      for (const id of shared) {
        const item = addNode(placement, diagram, id, inset + 24, sharedY, inner - 48, viewport);
        sharedY += item.bounds.height + 16;
      }
      let secondNodeY = secondY + GROUP_HEADER + overlap;
      uniqueByGroup[1].forEach((id, index) => {
        const item = secondSizes[index];
        addNode(placement, diagram, id, inset + (inner - item.width) / 2, secondNodeY, item.width, viewport);
        secondNodeY += item.height + 24;
      });
      const bottom = secondY + secondHeight;
      const externalBottom = column(placement, diagram, external, bottom + 64, inset, inner, viewport, 40);
      return finish(placement, Math.max(bottom, externalBottom) + inset);
    }
    const sharedMeasures = [...shared].map((id) => measureNode(diagramNode(diagram, id).label, 208, viewport.density));
    const sharedWidth = Math.max(...sharedMeasures.map((item) => item.width));
    const sharedHeight = Math.max(...sharedMeasures.map((item) => item.height));
    const overlap = align(Math.min(Math.max(sharedWidth + 32, 176), inner * .4));
    const groupWidth = (inner + overlap) / 2;
    const membersByGroup = groupIds.map((id) => diagramGroup(diagram, id).nodeIds.filter((nodeId) => !shared.has(nodeId)));
    const memberWidth = groupWidth - overlap - GROUP_PADDING - 8;
    const memberHeights = membersByGroup.map((ids) => Math.max(...ids.map((id) => measureNode(diagramNode(diagram, id).label, memberWidth, viewport.density).height)));
    const tallestMember = Math.max(...memberHeights);
    const height = align(GROUP_HEADER + tallestMember + 80 + sharedHeight + 32);
    const firstX = inset;
    const secondX = inset + groupWidth - overlap;
    addGroup(placement, diagram, groupIds[0], { x: firstX, y: inset, width: groupWidth, height });
    addGroup(placement, diagram, groupIds[1], { x: secondX, y: inset, width: groupWidth, height });
    membersByGroup.forEach((ids, groupIndex) => {
      const x = groupIndex === 0 ? firstX + GROUP_PADDING : secondX + overlap + 8;
      const width = groupWidth - overlap - GROUP_PADDING - 8;
      let y = inset + GROUP_HEADER;
      for (const id of ids) {
        const item = addNode(placement, diagram, id, x, y, width, viewport);
        y += item.bounds.height + 24;
      }
    });
    let sharedY = inset + GROUP_HEADER + tallestMember + 80;
    for (const id of shared) {
      const item = addNode(placement, diagram, id, inset + inner / 2 - overlap / 2 + 8, sharedY, overlap - 16, viewport);
      sharedY += item.bounds.height + 16;
    }
    const bottom = inset + height;
    const externalBottom = column(placement, diagram, external, bottom + 64, inset, inner, viewport, 40);
    return finish(placement, Math.max(bottom, externalBottom) + inset);
  }

  const sideBySide = viewport.density === "wide" && groupIds.length > 1;
  const interGroupRelations = diagram.edges.filter((edge) => edge.from.kind === "group" && edge.to.kind === "group");
  const gap = sideBySide
    ? Math.min(176, Math.max(48, ...interGroupRelations.map((edge) => measureSupport(edge.label, 220).width + 32)))
    : 32;
  const groupWidth = sideBySide ? (inner - gap * (groupIds.length - 1)) / groupIds.length : inner;
  if (viewport.density === "compact" && groupIds.length === 1) {
    const group = diagramGroup(diagram, groupIds[0]);
    const members = group.nodeIds;
    const contentWidth = inner - GROUP_PADDING * 2;
    const hasIncomingGroupEdge = diagram.edges.some((edge) => edge.to.kind === "group" && edge.to.id === group.id);
    const hasInternalRelations = diagram.edges.some((edge) => edge.from.kind === "node" && edge.to.kind === "node" && members.includes(edge.from.id) && members.includes(edge.to.id));
    const peerWidth = members.reduce((sum, id) => sum + minimumNodeWidth(diagramNode(diagram, id).label), 0) + Math.max(0, members.length - 1) * 12;
    const rows = !hasInternalRelations && peerWidth <= contentWidth ? [members] : regionRows(diagram, members, contentWidth);
    const rowSizes = regionRowSizes(diagram, rows, contentWidth, viewport);
    const rowGap = hasInternalRelations ? 64 : 32;
    const groupHeight = align(GROUP_HEADER + rowSizes.reduce((sum, rowData) => sum + rowData.height, 0) + Math.max(0, rowSizes.length - 1) * rowGap + GROUP_PADDING);
    let groupY = inset;
    let externalBottom = inset;
    if (external.length && hasIncomingGroupEdge) {
      externalBottom = column(placement, diagram, external, inset, inset, inner, viewport, 40);
      groupY = externalBottom + 80;
    }
    addGroup(placement, diagram, group.id, { x: inset, y: groupY, width: inner, height: groupHeight });
    placeRegionRows(placement, diagram, rowSizes, inset + GROUP_PADDING, groupY + GROUP_HEADER, viewport, undefined, rowGap);
    if (external.length && !hasIncomingGroupEdge) {
      const externalPeerWidth = external.reduce((sum, id) => sum + minimumNodeWidth(diagramNode(diagram, id).label), 0) + Math.max(0, external.length - 1) * 24;
      externalBottom = externalPeerWidth <= inner
        ? row(placement, diagram, external, groupY + groupHeight + 80, inset, inner, viewport, 24)
        : column(placement, diagram, external, groupY + groupHeight + 80, inset, inner, viewport, 40);
    }
    return finish(placement, Math.max(groupY + groupHeight, externalBottom) + inset);
  }
  if (viewport.density === "wide" && groupIds.length === 1) {
    const group = diagramGroup(diagram, groupIds[0]);
    const members = group.nodeIds;
    const hasIncomingGroupEdge = diagram.edges.some((edge) => edge.to.kind === "group" && edge.to.id === group.id);
    const groupRelations = diagram.edges.filter((edge) => edge.from.id === group.id || edge.to.id === group.id);
    const externalGap = external.length
      ? Math.min(136, Math.max(72, ...groupRelations.map((edge) => measureSupport(edge.label, 220).width + 32)))
      : 0;
    const externalWidth = external.length
      ? Math.max(...external.map((id) => minimumNodeWidth(diagramNode(diagram, id).label)))
      : 0;
    const groupWidth = external.length ? inner - externalGap - externalWidth : Math.min(inner, 640);
    const groupX = external.length && hasIncomingGroupEdge ? inset + externalWidth + externalGap : inset + (external.length ? 0 : (inner - groupWidth) / 2);
    const externalX = hasIncomingGroupEdge ? inset : groupX + groupWidth + externalGap;
    const contentWidth = groupWidth - GROUP_PADDING * 2;
    const hasInternalRelations = diagram.edges.some((edge) => edge.from.kind === "node" && edge.to.kind === "node" && members.includes(edge.from.id) && members.includes(edge.to.id));
    const peerWidth = members.reduce((sum, id) => sum + minimumNodeWidth(diagramNode(diagram, id).label), 0) + Math.max(0, members.length - 1) * 12;
    const rows = !hasInternalRelations && peerWidth <= contentWidth ? [members] : regionRows(diagram, members, contentWidth);
    const rowSizes = regionRowSizes(diagram, rows, contentWidth, viewport);
    const rowGap = hasInternalRelations ? 64 : 32;
    const groupHeight = align(GROUP_HEADER + rowSizes.reduce((sum, rowData) => sum + rowData.height, 0) + Math.max(0, rowSizes.length - 1) * rowGap + GROUP_PADDING);
    addGroup(placement, diagram, group.id, { x: groupX, y: inset, width: groupWidth, height: groupHeight });
    placeRegionRows(placement, diagram, rowSizes, groupX + GROUP_PADDING, inset + GROUP_HEADER, viewport, undefined, rowGap);
    const externalBottom = column(placement, diagram, external, inset + GROUP_HEADER, externalX, externalWidth, viewport, 48);
    return finish(placement, Math.max(inset + groupHeight, externalBottom) + inset);
  }

  let cursorY = inset;
  let maxBottom = inset;
  groupIds.forEach((groupId, index) => {
    const group = diagramGroup(diagram, groupId);
    const members = group.nodeIds.filter((id) => !placement.nodes.has(id));
    const nodeWidth = groupWidth - GROUP_PADDING * 2;
    const nodeSizes = members.map((id) => measureNode(diagramNode(diagram, id).label, nodeWidth, viewport.density));
    const groupHeight = align(GROUP_HEADER + nodeSizes.reduce((sum, item) => sum + item.height, 0) + Math.max(0, members.length - 1) * 24 + GROUP_PADDING);
    const x = sideBySide ? inset + index * (groupWidth + gap) : inset;
    const y = sideBySide ? inset : cursorY;
    addGroup(placement, diagram, groupId, { x, y, width: groupWidth, height: groupHeight });
    let nodeY = y + GROUP_HEADER;
    members.forEach((id, memberIndex) => {
      const item = nodeSizes[memberIndex];
      addNode(placement, diagram, id, x + (groupWidth - item.width) / 2, nodeY, item.width, viewport);
      nodeY += item.height + 24;
    });
    maxBottom = Math.max(maxBottom, y + groupHeight);
    if (!sideBySide) cursorY = y + groupHeight + gap;
  });
  const externalBottom = column(placement, diagram, external, maxBottom + 64, inset, inner, viewport, 40);
  return finish(placement, Math.max(maxBottom, externalBottom) + inset);
}

function layoutBoundary(diagram: ConceptDiagram, viewport: DiagramViewport): PatternPlacement {
  if (diagram.intent.pattern !== "boundary") throw new Error("Boundary layout received another pattern");
  const placement = makePlacement();
  const inset = viewport.density === "compact" ? COMPACT_INSET : INSET;
  const inner = viewport.width - inset * 2;
  const regions = diagram.intent.regionOrder.map((id) => diagramGroup(diagram, id));
  if (viewport.density === "wide") {
    const gap = 16;
    const available = inner - gap * (regions.length - 1);
    const desiredWidths = regions.map((region) => desiredRegionWidth(diagram, region.id));
    const desiredTotal = desiredWidths.reduce((sum, regionWidth) => sum + regionWidth, 0);
    const regionWidths = desiredTotal <= available
      ? desiredWidths.map((regionWidth) => regionWidth + (available - desiredTotal) / regions.length)
      : regions.map(() => available / regions.length);
    const depths = graphDepths(diagram);
    const levelCount = Math.max(...depths.values()) + 1;
    const rows = regions.map((region, regionIndex) => Array.from({ length: levelCount }, (_, depth) => {
      const ids = region.nodeIds.filter((id) => depths.get(id) === depth);
      const sizes = ids.map((id) => measureNode(diagramNode(diagram, id).label, regionWidths[regionIndex] - 24, viewport.density));
      return { ids, sizes, height: sizes.reduce((sum, size) => sum + size.height, 0) + Math.max(0, sizes.length - 1) * 16 };
    }));
    const laneHeights = Array.from({ length: levelCount }, (_, depth) => Math.max(0, ...rows.map((regionRows) => regionRows[depth].height)));
    const height = align(GROUP_HEADER + laneHeights.reduce((sum, laneHeight) => sum + laneHeight, 0) + Math.max(0, laneHeights.length - 1) * 32 + 16);
    let x = inset;
    regions.forEach((region, index) => {
      const regionWidth = regionWidths[index];
      addGroup(placement, diagram, region.id, { x, y: inset, width: regionWidth, height });
      let laneY = inset + GROUP_HEADER;
      rows[index].forEach((rowData, depth) => {
        let nodeY = laneY + (laneHeights[depth] - rowData.height) / 2;
        rowData.ids.forEach((id, nodeIndex) => {
          const size = rowData.sizes[nodeIndex];
          addNode(placement, diagram, id, x + (regionWidth - size.width) / 2, nodeY, size.width, viewport);
          nodeY += size.height + 16;
        });
        laneY += laneHeights[depth] + 32;
      });
      x += regionWidth + gap;
    });
    return finish(placement, inset + height + inset);
  }
  let y = inset;
  for (const region of regions) {
    const nodeWidth = inner - 32;
    const rows = regionRowSizes(diagram, regionRows(diagram, region.nodeIds, nodeWidth, true), nodeWidth, viewport);
    const rowGap = 40;
    const height = align(GROUP_HEADER + rows.reduce((sum, rowData) => sum + rowData.height, 0) + Math.max(0, rows.length - 1) * rowGap + 16);
    addGroup(placement, diagram, region.id, { x: inset, y, width: inner, height });
    placeRegionRows(placement, diagram, rows, inset + 16, y + GROUP_HEADER, viewport, undefined, rowGap, compactBoundaryAlignments(diagram, region.id));
    y += height + 80;
  }
  return finish(placement, y - 80 + inset);
}

function layoutCycle(diagram: ConceptDiagram, viewport: DiagramViewport): PatternPlacement {
  if (diagram.intent.pattern !== "cycle") throw new Error("Cycle layout received another pattern");
  const placement = makePlacement();
  const inset = viewport.density === "compact" ? COMPACT_INSET : INSET;
  const inner = viewport.width - inset * 2;
  const ids = diagram.intent.order;
  if (viewport.density === "compact") {
    const laneWidth = Math.min(144, (inner - 16) / 2);
    const topLeft = addNode(placement, diagram, ids[0], inset, inset, laneWidth, viewport);
    const topRight = addNode(placement, diagram, ids[1], viewport.width - inset - laneWidth, inset, laneWidth, viewport);
    const bottomY = inset + Math.max(topLeft.bounds.height, topRight.bounds.height) + 144;
    addNode(placement, diagram, ids[2], viewport.width - inset - laneWidth, bottomY, laneWidth, viewport);
    const bottomLeft = addNode(placement, diagram, ids[3], inset, bottomY, laneWidth, viewport);
    return finish(placement, bottomLeft.bounds.y + bottomLeft.bounds.height + inset);
  }
  const laneWidth = Math.min(200, (inner - 80) / 2);
  const topLeft = addNode(placement, diagram, ids[0], inset, inset, laneWidth, viewport);
  const topRight = addNode(placement, diagram, ids[1], viewport.width - inset - laneWidth, inset, laneWidth, viewport);
  const bottomY = inset + Math.max(topLeft.bounds.height, topRight.bounds.height) + 128;
  addNode(placement, diagram, ids[2], viewport.width - inset - laneWidth, bottomY, laneWidth, viewport);
  const bottomLeft = addNode(placement, diagram, ids[3], inset, bottomY, laneWidth, viewport);
  return finish(placement, bottomLeft.bounds.y + bottomLeft.bounds.height + inset);
}

function layoutState(diagram: ConceptDiagram, viewport: DiagramViewport): PatternPlacement {
  if (diagram.intent.pattern !== "state") throw new Error("State layout received another pattern");
  const placement = makePlacement();
  const inset = viewport.density === "compact" ? COMPACT_INSET : INSET;
  const inner = viewport.width - inset * 2;
  const levels = graphLevels(diagram);
  let y = inset;
  for (const ids of levels) {
    if (viewport.density === "compact" && ids.length > 1) {
      const laneGap = 24;
      const laneWidth = (inner - laneGap) / 2;
      const stateRows = compactRows(diagram, ids, inner, laneGap);
      const staggerSingles = stateRows.length > 1 && stateRows.every((stateRow) => stateRow.length === 1);
      for (const [rowIndex, stateRow] of stateRows.entries()) {
        let rowHeight = 0;
        stateRow.forEach((id, columnIndex) => {
          const slotWidth = staggerSingles ? Math.min(208, inner * .72) : stateRow.length === 1 ? inner : laneWidth;
          const measured = measureNode(diagramNode(diagram, id).label, slotWidth, viewport.density);
          const x = staggerSingles
            ? rowIndex % 2 === 0 ? inset : viewport.width - inset - measured.width
            : stateRow.length === 1 ? inset + (inner - measured.width) / 2 : inset + columnIndex * (laneWidth + laneGap);
          const item = addNode(placement, diagram, id, x, y, slotWidth, viewport);
          rowHeight = Math.max(rowHeight, item.bounds.height);
        });
        y += rowHeight + 64;
      }
      y += 32;
    } else {
      y = row(placement, diagram, ids, y, inset, inner, viewport, viewport.density === "compact" ? 16 : 40) + (viewport.density === "compact" ? 96 : 64);
    }
  }
  return finish(placement, y - (viewport.density === "compact" ? 96 : 64) + inset);
}

export const patternLayoutRegistry = {
  linear: layoutLinear,
  branch: layoutBranch,
  "fan-in": layoutFanIn,
  "fan-out": layoutFanOut,
  containment: layoutContainment,
  boundary: layoutBoundary,
  cycle: layoutCycle,
  state: layoutState,
} satisfies Record<DiagramPattern, PatternLayouter>;
