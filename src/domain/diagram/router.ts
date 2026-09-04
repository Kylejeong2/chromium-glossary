import type { ConceptDiagram, DiagramEdge, DiagramEndpoint } from "../glossary";
import { diagramGroup, mapValue } from "./lookup";
import { measureEdgeLabel, measureSupport, supportLabelBox } from "./measure";
import type { GroupPlacement, NodePlacement, PlacedText, Point, Rect, RoutedEdge } from "./types";

type Side = "north" | "east" | "south" | "west";

type RouteResult = Readonly<{
  edges: ReadonlyMap<string, RoutedEdge>;
  failure?: string;
}>;

function inflate(rect: Rect, amount: number): Rect {
  return { x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 };
}

function right(rect: Rect): number {
  return rect.x + rect.width;
}

function bottom(rect: Rect): number {
  return rect.y + rect.height;
}

function intersects(left: Rect, rightRect: Rect, tolerance = 0): boolean {
  return left.x < right(rightRect) - tolerance
    && right(left) > rightRect.x + tolerance
    && left.y < bottom(rightRect) - tolerance
    && bottom(left) > rightRect.y + tolerance;
}

function pointInside(point: Point, rect: Rect): boolean {
  return point.x > rect.x && point.x < right(rect) && point.y > rect.y && point.y < bottom(rect);
}

function segmentIntersectsRect(start: Point, end: Point, rect: Rect): boolean {
  if (start.x === end.x) {
    return start.x > rect.x && start.x < right(rect) && Math.max(start.y, end.y) > rect.y && Math.min(start.y, end.y) < bottom(rect);
  }
  if (start.y === end.y) {
    return start.y > rect.y && start.y < bottom(rect) && Math.max(start.x, end.x) > rect.x && Math.min(start.x, end.x) < right(rect);
  }
  return true;
}

function segmentBounds(start: Point, end: Point, padding: number): Rect {
  if (start.x === end.x) {
    return { x: start.x - padding, y: Math.min(start.y, end.y), width: padding * 2, height: Math.abs(end.y - start.y) };
  }
  return { x: Math.min(start.x, end.x), y: start.y - padding, width: Math.abs(end.x - start.x), height: padding * 2 };
}

function routedPathObstacles(edges: Iterable<RoutedEdge>): readonly Rect[] {
  return [...edges].flatMap((edge) => edge.points.slice(1).map((point, index) => segmentBounds(edge.points[index], point, 3)));
}

function port(rect: Rect, side: Side): Point {
  if (side === "north") return { x: rect.x + rect.width / 2, y: rect.y };
  if (side === "east") return { x: right(rect), y: rect.y + rect.height / 2 };
  if (side === "south") return { x: rect.x + rect.width / 2, y: bottom(rect) };
  return { x: rect.x, y: rect.y + rect.height / 2 };
}

function outside(point: Point, side: Side): Point {
  if (side === "north") return { x: point.x, y: point.y - 16 };
  if (side === "east") return { x: point.x + 16, y: point.y };
  if (side === "south") return { x: point.x, y: point.y + 16 };
  return { x: point.x - 16, y: point.y };
}

function portPairs(from: Rect, to: Rect): readonly (readonly [Side, Side])[] {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  const horizontal: readonly [Side, Side] = dx >= 0 ? ["east", "west"] : ["west", "east"];
  const vertical: readonly [Side, Side] = dy >= 0 ? ["south", "north"] : ["north", "south"];
  const reverseHorizontal: readonly [Side, Side] = dx >= 0 ? ["west", "east"] : ["east", "west"];
  const reverseVertical: readonly [Side, Side] = dy >= 0 ? ["north", "south"] : ["south", "north"];
  return Math.abs(dx) > Math.abs(dy)
    ? [horizontal, vertical, reverseVertical, reverseHorizontal]
    : [vertical, horizontal, reverseHorizontal, reverseVertical];
}

function simplify(points: readonly Point[]): readonly Point[] {
  const deduped = points.filter((point, index) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
  return deduped.filter((point, index) => {
    if (index === 0 || index === deduped.length - 1) return true;
    const before = deduped[index - 1];
    const after = deduped[index + 1];
    return !((before.x === point.x && point.x === after.x) || (before.y === point.y && point.y === after.y));
  });
}

function pathKey(point: Point): string {
  return `${point.x}:${point.y}`;
}

function findPath(start: Point, end: Point, obstacles: readonly Rect[], width: number, height: number): readonly Point[] | undefined {
  const xs = [...new Set([8, width - 8, start.x, end.x, ...obstacles.flatMap((rect) => [rect.x - 8, right(rect) + 8])])]
    .filter((value) => value >= 8 && value <= width - 8)
    .sort((a, b) => a - b);
  const ys = [...new Set([8, height - 8, start.y, end.y, ...obstacles.flatMap((rect) => [rect.y - 8, bottom(rect) + 8])])]
    .filter((value) => value >= 8 && value <= height - 8)
    .sort((a, b) => a - b);
  const points = new Map<string, Point>();
  for (const x of xs) {
    for (const y of ys) {
      const point = { x, y };
      if (!obstacles.some((rect) => pointInside(point, rect)) || pathKey(point) === pathKey(start) || pathKey(point) === pathKey(end)) {
        points.set(pathKey(point), point);
      }
    }
  }
  const startKey = pathKey(start);
  const endKey = pathKey(end);
  points.set(startKey, start);
  points.set(endKey, end);
  const distances = new Map<string, number>([[startKey, 0]]);
  const previous = new Map<string, string>();
  const open = new Set<string>([startKey]);
  while (open.size) {
    const currentKey = [...open].sort((left, rightKey) => {
      const leftPoint = points.get(left)!;
      const rightPoint = points.get(rightKey)!;
      const leftScore = (distances.get(left) ?? Infinity) + Math.abs(leftPoint.x - end.x) + Math.abs(leftPoint.y - end.y);
      const rightScore = (distances.get(rightKey) ?? Infinity) + Math.abs(rightPoint.x - end.x) + Math.abs(rightPoint.y - end.y);
      return leftScore - rightScore || left.localeCompare(rightKey);
    })[0];
    if (currentKey === endKey) break;
    open.delete(currentKey);
    const current = points.get(currentKey)!;
    const xIndex = xs.indexOf(current.x);
    const yIndex = ys.indexOf(current.y);
    const candidates = [
      xIndex > 0 ? { x: xs[xIndex - 1], y: current.y } : undefined,
      xIndex < xs.length - 1 ? { x: xs[xIndex + 1], y: current.y } : undefined,
      yIndex > 0 ? { x: current.x, y: ys[yIndex - 1] } : undefined,
      yIndex < ys.length - 1 ? { x: current.x, y: ys[yIndex + 1] } : undefined,
    ].filter((point): point is Point => Boolean(point));
    for (const candidate of candidates) {
      const candidateKey = pathKey(candidate);
      if (!points.has(candidateKey) || obstacles.some((rect) => segmentIntersectsRect(current, candidate, rect))) continue;
      const distance = (distances.get(currentKey) ?? Infinity) + Math.abs(candidate.x - current.x) + Math.abs(candidate.y - current.y);
      if (distance < (distances.get(candidateKey) ?? Infinity)) {
        distances.set(candidateKey, distance);
        previous.set(candidateKey, currentKey);
        open.add(candidateKey);
      }
    }
  }
  if (!distances.has(endKey)) return undefined;
  const result: Point[] = [];
  let cursor = endKey;
  while (cursor) {
    result.unshift(points.get(cursor)!);
    if (cursor === startKey) break;
    cursor = previous.get(cursor) ?? "";
  }
  return cursor === startKey ? simplify(result) : undefined;
}

function findPathThrough(start: Point, end: Point, waypoint: Point, obstacles: readonly Rect[], width: number, height: number): readonly Point[] | undefined {
  const first = findPath(start, waypoint, obstacles, width, height);
  const second = findPath(waypoint, end, obstacles, width, height);
  return first && second ? simplify([...first, ...second.slice(1)]) : undefined;
}

function findPathThroughLane(start: Point, end: Point, laneY: number, obstacles: readonly Rect[], width: number, height: number): readonly Point[] | undefined {
  const first = findPath(start, { x: start.x, y: laneY }, obstacles, width, height);
  const middle = findPath({ x: start.x, y: laneY }, { x: end.x, y: laneY }, obstacles, width, height);
  const last = findPath({ x: end.x, y: laneY }, end, obstacles, width, height);
  return first && middle && last ? simplify([...first, ...middle.slice(1), ...last.slice(1)]) : undefined;
}

function findPathThroughColumn(start: Point, end: Point, laneX: number, obstacles: readonly Rect[], width: number, height: number): readonly Point[] | undefined {
  const first = findPath(start, { x: laneX, y: start.y }, obstacles, width, height);
  const middle = findPath({ x: laneX, y: start.y }, { x: laneX, y: end.y }, obstacles, width, height);
  const last = findPath({ x: laneX, y: end.y }, end, obstacles, width, height);
  return first && middle && last ? simplify([...first, ...middle.slice(1), ...last.slice(1)]) : undefined;
}

function labelForPath(label: string, points: readonly Point[], obstacles: readonly Rect[], width: number, height: number, boxed: boolean): PlacedText | undefined {
  const measured = boxed ? measureEdgeLabel(label, 152) : measureSupport(label, 152);
  const labelWidth = measured.width;
  const labelHeight = measured.height;
  const segments = points.slice(1).map((point, index) => ({ start: points[index], end: point }))
    .sort((left, rightRect) => {
      const leftLength = Math.abs(left.end.x - left.start.x) + Math.abs(left.end.y - left.start.y);
      const rightLength = Math.abs(rightRect.end.x - rightRect.start.x) + Math.abs(rightRect.end.y - rightRect.start.y);
      return rightLength - leftLength;
    });
  const offsets = [0.5, 0.35, 0.65, 0.2, 0.8];
  for (const segment of segments) {
    const horizontal = segment.start.y === segment.end.y;
    const length = Math.abs((horizontal ? segment.end.x - segment.start.x : segment.end.y - segment.start.y));
    const required = boxed ? (horizontal ? labelWidth : labelHeight) : (horizontal ? measured.width + 8 : measured.height + 8);
    if (length < required) continue;
    for (const offset of offsets) {
      const center = horizontal
        ? { x: segment.start.x + (segment.end.x - segment.start.x) * offset, y: segment.start.y }
        : { x: segment.start.x, y: segment.start.y + (segment.end.y - segment.start.y) * offset };
      const bounds = { x: center.x - labelWidth / 2, y: center.y - labelHeight / 2, width: labelWidth, height: labelHeight };
      if (bounds.x < 4 || bounds.y < 4 || right(bounds) > width - 4 || bottom(bounds) > height - 4) continue;
      if (obstacles.some((rect) => intersects(bounds, rect, 1))) continue;
      return supportLabelBox(measured.lines, bounds);
    }
  }
  return undefined;
}

function endpointRect(endpoint: DiagramEndpoint, nodes: ReadonlyMap<string, NodePlacement>, groups: ReadonlyMap<string, GroupPlacement>): Rect {
  const result = endpoint.kind === "node" ? nodes.get(endpoint.id)?.bounds : groups.get(endpoint.id)?.bounds;
  if (!result) throw new Error(`Missing geometry for ${endpoint.kind} ${endpoint.id}`);
  return result;
}

function boundaryRegionIndexes(diagram: ConceptDiagram): ReadonlyMap<string, number> | undefined {
  if (diagram.intent.pattern !== "boundary") return undefined;
  return new Map(diagram.intent.regionOrder.flatMap((groupId, regionIndex) => {
    const group = diagramGroup(diagram, groupId);
    return [
      [groupId, regionIndex] as const,
      ...group.nodeIds.map((nodeId) => [nodeId, regionIndex] as const),
    ];
  }));
}

function relationOrder(diagram: ConceptDiagram): readonly DiagramEdge[] {
  let closingEdgeId: string | undefined;
  if (diagram.intent.pattern === "cycle") {
    const order = diagram.intent.order;
    const startId = diagram.intent.startId;
    closingEdgeId = diagram.edges.find((edge) => edge.from.id === order.at(-1) && edge.to.id === startId)?.id;
  }
  const edgeIndexes = new Map(diagram.edges.map((edge, index) => [edge.id, index]));
  const boundaryRegions = boundaryRegionIndexes(diagram);
  const comparisonRootId = diagram.intent.pattern === "branch" ? diagram.intent.rootId : undefined;
  const comparisonTargets = comparisonRootId
    ? new Set(diagram.edges.filter((edge) => edge.from.kind === "node" && edge.from.id === comparisonRootId && edge.to.kind === "node").map((edge) => edge.to.id))
    : new Set<string>();
  const comparisonBranch = comparisonTargets.size >= 3;
  const fanInSinkId = diagram.intent.pattern === "fan-in" ? diagram.intent.sinkId : undefined;
  return [...diagram.edges].sort((left, rightEdge) => {
    const leftSpan = boundaryRegions
      ? Math.abs(mapValue(boundaryRegions, left.from.id, "boundary endpoint") - mapValue(boundaryRegions, left.to.id, "boundary endpoint"))
      : 0;
    const rightSpan = boundaryRegions
      ? Math.abs(mapValue(boundaryRegions, rightEdge.from.id, "boundary endpoint") - mapValue(boundaryRegions, rightEdge.to.id, "boundary endpoint"))
      : 0;
    const leftBoundaryPriority = leftSpan > 1 ? 0 : leftSpan === 0 ? 1 : 2;
    const rightBoundaryPriority = rightSpan > 1 ? 0 : rightSpan === 0 ? 1 : 2;
    const leftCrosses = left.from.kind === "group" || left.to.kind === "group" ? 0 : 1;
    const rightCrosses = rightEdge.from.kind === "group" || rightEdge.to.kind === "group" ? 0 : 1;
    const leftCycle = left.id === closingEdgeId ? 0 : 1;
    const rightCycle = rightEdge.id === closingEdgeId ? 0 : 1;
    const leftComparison = comparisonBranch && left.from.kind === "node" && left.from.id !== comparisonRootId && comparisonTargets.has(left.to.id) ? 0 : 1;
    const rightComparison = comparisonBranch && rightEdge.from.kind === "node" && rightEdge.from.id !== comparisonRootId && comparisonTargets.has(rightEdge.to.id) ? 0 : 1;
    const leftFanOutput = fanInSinkId && left.from.kind === "node" && left.from.id === fanInSinkId ? 0 : 1;
    const rightFanOutput = fanInSinkId && rightEdge.from.kind === "node" && rightEdge.from.id === fanInSinkId ? 0 : 1;
    return (fanInSinkId ? leftFanOutput - rightFanOutput : 0)
      || (fanInSinkId ? mapValue(edgeIndexes, rightEdge.id, "diagram edge") - mapValue(edgeIndexes, left.id, "diagram edge") : 0)
      || (comparisonBranch ? leftComparison - rightComparison : 0)
      || (boundaryRegions ? leftBoundaryPriority - rightBoundaryPriority : 0)
      || leftCrosses - rightCrosses
      || leftCycle - rightCycle
      || mapValue(edgeIndexes, left.id, "diagram edge") - mapValue(edgeIndexes, rightEdge.id, "diagram edge")
      || left.id.localeCompare(rightEdge.id);
  });
}

export function routeDiagram(
  diagram: ConceptDiagram,
  nodes: ReadonlyMap<string, NodePlacement>,
  groups: ReadonlyMap<string, GroupPlacement>,
  width: number,
  height: number,
): RouteResult {
  const routed = new Map<string, RoutedEdge>();
  const boundaryRegions = boundaryRegionIndexes(diagram);
  const fixedObstacles = [
    ...[...nodes.values()].map((node) => inflate(node.bounds, 10)),
    ...[...groups.values()].map((group) => inflate(group.label.bounds, 8)),
  ];
  const labelObstacles: Rect[] = [];
  for (const edge of relationOrder(diagram)) {
    let fromRect = endpointRect(edge.from, nodes, groups);
    let toRect = endpointRect(edge.to, nodes, groups);
    if (width >= 560 && diagram.intent.pattern === "containment" && edge.from.kind === "group" && edge.to.kind === "group") {
      const fromGroup = groups.get(edge.from.id)!;
      const toGroup = groups.get(edge.to.id)!;
      fromRect = { x: fromRect.x, y: Math.max(fromRect.y + 48, fromGroup.label.bounds.y + fromGroup.label.bounds.height + 16), width: fromRect.width, height: 1 };
      toRect = { x: toRect.x, y: Math.max(toRect.y + 48, toGroup.label.bounds.y + toGroup.label.bounds.height + 16), width: toRect.width, height: 1 };
    }
    let accepted: RoutedEdge | undefined;
    const boundarySpan = boundaryRegions
      ? Math.abs(mapValue(boundaryRegions, edge.from.id, "boundary endpoint") - mapValue(boundaryRegions, edge.to.id, "boundary endpoint"))
      : 0;
    if (boundaryRegions && boundarySpan > 1 && edge.from.kind === "node" && edge.to.kind === "node") {
      const forward = mapValue(boundaryRegions, edge.to.id, "boundary endpoint") > mapValue(boundaryRegions, edge.from.id, "boundary endpoint");
      const wide = width >= 560;
      const fromSide: Side = wide ? (forward ? "east" : "west") : "east";
      const toSide: Side = wide ? (forward ? "west" : "east") : "east";
      const startPort = port(fromRect, fromSide);
      const endPort = port(toRect, toSide);
      const start = outside(startPort, fromSide);
      const end = outside(endPort, toSide);
      const laneY = Math.max(...[...groups.values()].map((group) => bottom(group.bounds))) + 32;
      const pathObstacles = [...fixedObstacles, ...labelObstacles.map((rect) => inflate(rect, 4))];
      const laneRoute = wide
        ? laneY <= height - 12 ? findPathThroughLane(start, end, laneY, pathObstacles, width, height) : undefined
        : findPathThroughColumn(start, end, width - 8, pathObstacles, width, height);
      if (laneRoute) {
        const points = simplify([startPort, ...laneRoute, endPort]);
        const labelAvoid = [
          ...[...nodes.values()].map((node) => node.bounds),
          ...[...groups.values()].map((group) => inflate(group.label.bounds, 4)),
          ...labelObstacles.map((rect) => inflate(rect, 4)),
          ...routedPathObstacles(routed.values()),
        ];
        const label = labelForPath(edge.label, points, labelAvoid, width, height, true);
        if (label) accepted = { id: edge.id, from: edge.from, to: edge.to, points, label };
      }
      if (!accepted) return { edges: routed, failure: `Could not route ${edge.id} at ${width} by ${height}` };
    }
    if (accepted) {
      routed.set(edge.id, accepted);
      labelObstacles.push(accepted.label.bounds);
      continue;
    }
    for (const [fromSide, toSide] of portPairs(fromRect, toRect)) {
      const startPort = port(fromRect, fromSide);
      const endPort = port(toRect, toSide);
      const start = outside(startPort, fromSide);
      const end = outside(endPort, toSide);
      if (start.x < 8 || start.x > width - 8 || start.y < 8 || start.y > height - 8 || end.x < 8 || end.x > width - 8 || end.y < 8 || end.y > height - 8) continue;
      const pathObstacles = [...fixedObstacles, ...labelObstacles.map((rect) => inflate(rect, 4))];
      const routeCandidates = [
        findPath(start, end, pathObstacles, width, height),
        findPathThrough(start, end, { x: width - 8, y: height - 8 }, pathObstacles, width, height),
        findPathThrough(start, end, { x: 8, y: height - 8 }, pathObstacles, width, height),
        findPathThrough(start, end, { x: width / 2, y: height - 8 }, pathObstacles, width, height),
      ].filter((route): route is readonly Point[] => Boolean(route));
      const labelAvoid = [
        ...[...nodes.values()].map((node) => diagram.intent.pattern === "boundary" ? node.bounds : inflate(node.bounds, 6)),
        ...[...groups.values()].map((group) => inflate(group.label.bounds, 4)),
        ...labelObstacles.map((rect) => inflate(rect, 4)),
        ...routedPathObstacles(routed.values()),
      ];
      for (const route of routeCandidates) {
        const points = simplify([startPort, ...route, endPort]);
        const label = labelForPath(edge.label, points, labelAvoid, width, height, diagram.intent.pattern === "boundary");
        if (!label) continue;
        accepted = { id: edge.id, from: edge.from, to: edge.to, points, label };
        break;
      }
      if (accepted) break;
    }
    if (!accepted) return { edges: routed, failure: `Could not route ${edge.id} at ${width} by ${height}` };
    routed.set(edge.id, accepted);
    labelObstacles.push(accepted.label.bounds);
  }
  return { edges: routed };
}

export const geometryIntersects = intersects;
export const geometryRight = right;
export const geometryBottom = bottom;
export const geometrySegmentIntersectsRect = segmentIntersectsRect;
