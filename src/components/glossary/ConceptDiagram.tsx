"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DIAGRAM_FONT, NODE_FONT_SIZE, diagramDensity, layoutDiagram, type PlacedText, type Point } from "@/domain/diagram";
import { diagramGroup, diagramNode, mapValue } from "@/domain/diagram/lookup";
import type { ConceptDiagram as Diagram, DiagramEndpoint } from "@/domain/glossary";

function pathData(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function SvgText({ text }: { text: PlacedText }) {
  const centerX = text.bounds.x + text.bounds.width / 2;
  const firstCenterY = text.bounds.y + (text.bounds.height - text.lines.length * text.lineHeight) / 2 + text.lineHeight / 2;
  return (
    <text textAnchor="middle">
      {text.lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={centerX} y={firstCenterY + index * text.lineHeight} dominantBaseline="central">{line}</tspan>
      ))}
    </text>
  );
}

function markerId(diagramId: string, tone: string): string {
  return `${diagramId}-${tone}-marker`;
}

function endpointName(endpoint: DiagramEndpoint, diagram: Diagram): string {
  return endpoint.kind === "node" ? diagramNode(diagram, endpoint.id).label : diagramGroup(diagram, endpoint.id).label;
}

function diagramAssistiveLines(diagram: Diagram): readonly string[] {
  const concepts = `Concepts: ${diagram.nodes.map((node) => node.label).join(", ")}.`;
  const groups = diagram.groups.map((group) => `${group.label} contains ${group.nodeIds.map((id) => diagramNode(diagram, id).label).join(", ")}.`);
  const relationships = diagram.edges.map((edge) => {
    const direction = edge.direction === "both" ? " in both directions" : edge.direction === "none" ? " without a direction" : "";
    return `${endpointName(edge.from, diagram)} ${edge.label} ${endpointName(edge.to, diagram)}${direction}.`;
  });
  return [diagram.summary, concepts, ...groups, ...relationships];
}

export function ConceptDiagram({ diagram }: { diagram: Diagram }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();
  const [fontStatus, setFontStatus] = useState<"loading" | "ready" | "error">("loading");
  const titleId = `${diagram.id}-title`;
  const descriptionId = `${diagram.id}-description`;
  const assistiveLines = useMemo(() => diagramAssistiveLines(diagram), [diagram]);

  useEffect(() => {
    let active = true;
    const update = () => {
      const nextWidth = Math.floor(frameRef.current?.clientWidth ?? 0);
      if (active && nextWidth >= 280) setWidth((current) => current === nextWidth ? current : nextWidth);
    };
    const observer = new ResizeObserver(update);
    if (frameRef.current) observer.observe(frameRef.current);
    const fontDeclaration = `${NODE_FONT_SIZE}px ${DIAGRAM_FONT}`;
    const markFontError = () => {
      if (!active) return;
      setFontStatus("error");
    };
    void document.fonts.load(fontDeclaration).then((faces) => {
      if (!active) return;
      const loaded = faces.some((face) => face.status === "loaded" && face.family.replace(/["']/g, "") === "GT Standard Mono");
      if (!loaded || !document.fonts.check(fontDeclaration)) {
        markFontError();
        return;
      }
      setFontStatus("ready");
      update();
    }, markFontError);
    update();
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  const density = width ? diagramDensity(width) : undefined;
  const geometry = useMemo(() => width && fontStatus === "ready" ? layoutDiagram(diagram, { width, density: diagramDensity(width) }) : undefined, [diagram, fontStatus, width]);

  return (
    <figure
      className={`concept-diagram concept-diagram--${diagram.intent.pattern}`}
      data-density={density}
      data-font-status={fontStatus}
      data-layout-ready={geometry ? "true" : "false"}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <header><h2 id={titleId}>{diagram.title}</h2></header>
      <div className="diagram-canvas-frame" ref={frameRef}>
        {geometry ? (
          <svg className="diagram-canvas" viewBox={`0 0 ${geometry.width} ${geometry.height}`} width={geometry.width} height={geometry.height} aria-hidden="true" focusable="false">
            <defs>
              {(["neutral", "focus", "negative"] as const).map((tone) => (
                <marker key={tone} id={markerId(diagram.id, tone)} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
                  <path className={`diagram-marker diagram-marker--${tone}`} d="M0 0L8 4L0 8Z" />
                </marker>
              ))}
            </defs>
            {[...geometry.groups.values()].map((placed) => {
              const group = diagramGroup(diagram, placed.id);
              return (
                <g key={placed.id} className={`diagram-group diagram-group--${group.kind} diagram-tone--${group.tone}`} data-diagram-group={placed.id}>
                  <rect x={placed.bounds.x} y={placed.bounds.y} width={placed.bounds.width} height={placed.bounds.height} />
                  <SvgText text={placed.label} />
                </g>
              );
            })}
            {diagram.edges.map((edge) => {
              const routed = mapValue(geometry.edges, edge.id, "diagram edge geometry");
              return (
                <g key={edge.id} className={`diagram-relation diagram-tone--${edge.tone}`} data-diagram-edge={edge.id}>
                  <path
                    d={pathData(routed.points)}
                    markerEnd={edge.direction === "none" ? undefined : `url(#${markerId(diagram.id, edge.tone)})`}
                    markerStart={edge.direction === "both" ? `url(#${markerId(diagram.id, edge.tone)})` : undefined}
                  />
                  <rect className="diagram-relation__label-bg" x={routed.label.bounds.x} y={routed.label.bounds.y} width={routed.label.bounds.width} height={routed.label.bounds.height} />
                  <SvgText text={routed.label} />
                </g>
              );
            })}
            {diagram.nodes.map((node) => {
              const placed = mapValue(geometry.nodes, node.id, "diagram node geometry");
              return (
                <g key={node.id} className={`diagram-unit diagram-unit--${node.shape} diagram-tone--${node.tone}`} data-diagram-node={node.id}>
                  <rect
                    x={placed.bounds.x}
                    y={placed.bounds.y}
                    width={placed.bounds.width}
                    height={placed.bounds.height}
                    rx={node.shape === "action" ? placed.bounds.height / 2 : 0}
                  />
                  <SvgText text={placed.label} />
                </g>
              );
            })}
          </svg>
        ) : fontStatus === "error" ? (
          <div className="diagram-font-error" role="status">Diagram unavailable because its typeface could not be loaded. The relationship summary remains below.</div>
        ) : <div className="diagram-canvas-placeholder" aria-hidden="true" />}
      </div>
      <figcaption>{diagram.caption.text}</figcaption>
      <div id={descriptionId} className="sr-only concept-diagram__description">
        <p>{assistiveLines[0]}</p>
        <ul>{assistiveLines.slice(1).map((line, index) => <li key={`${diagram.id}-description-${index}`}>{line}</li>)}</ul>
      </div>
    </figure>
  );
}
