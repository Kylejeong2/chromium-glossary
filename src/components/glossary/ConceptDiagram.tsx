"use client";

import type { ConceptDiagram as Diagram } from "@/domain/glossary";

type PositionedNode = { id: string; label: string; x: number; y: number };

function positions(diagram: Diagram): PositionedNode[] {
  const count = diagram.nodes.length;
  return diagram.nodes.map((node, index) => {
    if (diagram.kind === "cycle") {
      const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
      return { ...node, x: 300 + Math.cos(angle) * 190, y: 150 + Math.sin(angle) * 92 };
    }
    if (diagram.kind === "hierarchy") {
      if (index === 0) return { ...node, x: 300, y: 48 };
      const childCount = count - 1;
      return { ...node, x: 90 + ((index - 1) * 420) / Math.max(1, childCount - 1), y: 205 };
    }
    if (diagram.kind === "boundary") {
      return { ...node, x: index % 2 === 0 ? 140 : 460, y: 62 + Math.floor(index / 2) * 118 };
    }
    return { ...node, x: 70 + (index * 460) / Math.max(1, count - 1), y: 148 };
  });
}

function relatedEdge(diagram: Diagram, index: number, nodes: PositionedNode[]) {
  const edge = diagram.edges[index];
  return {
    edge,
    from: nodes.find((node) => node.id === edge.from) ?? nodes[0],
    to: nodes.find((node) => node.id === edge.to) ?? nodes[Math.min(index + 1, nodes.length - 1)],
  };
}

export function ConceptDiagram({ diagram }: { diagram: Diagram }) {
  const markerId = `arrow-${diagram.kind}-${diagram.nodes[0].id.replace(/[^a-z0-9-]/gi, "-")}`;
  const nodes = positions(diagram);
  return (
    <figure className={`concept-diagram concept-diagram--${diagram.kind}`}>
      <svg viewBox="0 0 600 300" role="img" aria-label={`${diagram.kind} concept diagram. ${diagram.description}`}>
        <desc>{diagram.description}</desc>
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker>
        </defs>
        {diagram.kind === "boundary" && <line className="diagram-boundary" x1="300" y1="18" x2="300" y2="280" />}
        {diagram.edges.map((_, index) => {
          const { edge, from, to } = relatedEdge(diagram, index, nodes);
          const x1 = from.x + (to.x > from.x ? 76 : to.x < from.x ? -76 : 0);
          const x2 = to.x + (from.x > to.x ? 76 : from.x < to.x ? -76 : 0);
          const y1 = from.y + (to.y > from.y ? 25 : to.y < from.y ? -25 : 0);
          const y2 = to.y + (from.y > to.y ? 25 : from.y < to.y ? -25 : 0);
          return (
            <g key={`${edge.from}-${edge.to}-${index}`}>
              <line className="diagram-edge" x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={`url(#${markerId})`} />
              <text className="diagram-edge__label" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7}>{edge.label}</text>
            </g>
          );
        })}
        {nodes.map((node, index) => (
          <g key={node.id} className={index === 0 ? "diagram-node diagram-node--active" : "diagram-node"}>
            <rect x={node.x - 76} y={node.y - 25} width="152" height="50" />
            <text x={node.x} y={node.y + 4}>{node.label}</text>
          </g>
        ))}
      </svg>
      <figcaption>Conceptual, not exhaustive. Follow the source links for implementation details.</figcaption>
    </figure>
  );
}
