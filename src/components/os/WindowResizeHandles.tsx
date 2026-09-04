import type { ResizeEdge } from "@/domain/desktop";
import type { HTMLAttributes } from "react";

const EDGES: readonly ResizeEdge[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

export function WindowResizeHandles({ propsFor }: { propsFor: (edge: ResizeEdge) => HTMLAttributes<HTMLSpanElement> }) {
  return <>{EDGES.map((edge) => <span key={edge} className={`window-resize-handle is-${edge}`} aria-hidden="true" {...propsFor(edge)} />)}</>;
}
