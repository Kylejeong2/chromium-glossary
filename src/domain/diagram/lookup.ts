import type { ConceptDiagram, DiagramGroup, DiagramNode } from "../glossary";

export function diagramNode(diagram: ConceptDiagram, id: string): DiagramNode {
  const node = diagram.nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown diagram node ${id}`);
  return node;
}

export function diagramGroup(diagram: ConceptDiagram, id: string): DiagramGroup {
  const group = diagram.groups.find((candidate) => candidate.id === id);
  if (!group) throw new Error(`Unknown diagram group ${id}`);
  return group;
}

export function mapValue<K, V>(map: ReadonlyMap<K, V>, key: K, kind: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Unknown ${kind} ${String(key)}`);
  return value;
}
