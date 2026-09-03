import type { DiagramEdge } from "../glossary";

export type DiagramDensity = "wide" | "compact";

export type DiagramViewport = Readonly<{
  width: number;
  density: DiagramDensity;
}>;

export type Point = Readonly<{ x: number; y: number }>;

export type Rect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type PlacedText = Readonly<{
  bounds: Rect;
  lines: readonly string[];
  fontSize: number;
  lineHeight: number;
}>;

export type PlacedNode = Readonly<{
  id: string;
  bounds: Rect;
  label: PlacedText;
}>;

export type PlacedGroup = Readonly<{
  id: string;
  bounds: Rect;
  label: PlacedText;
}>;

export type RoutedEdge = Readonly<{
  id: string;
  from: DiagramEdge["from"];
  to: DiagramEdge["to"];
  points: readonly Point[];
  label: PlacedText;
}>;

export type DiagramGeometry = Readonly<{
  width: number;
  height: number;
  nodes: ReadonlyMap<string, PlacedNode>;
  groups: ReadonlyMap<string, PlacedGroup>;
  edges: ReadonlyMap<string, RoutedEdge>;
}>;

export type GeometryIssue = Readonly<{
  code: string;
  detail: string;
}>;

export type NodePlacement = Readonly<{
  id: string;
  bounds: Rect;
  label: PlacedText;
}>;

export type GroupPlacement = Readonly<{
  id: string;
  bounds: Rect;
  label: PlacedText;
}>;

export type PatternPlacement = Readonly<{
  height: number;
  nodes: ReadonlyMap<string, NodePlacement>;
  groups: ReadonlyMap<string, GroupPlacement>;
}>;
