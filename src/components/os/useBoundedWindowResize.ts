"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { resizeFrame, type Rect, type ResizeEdge, type Workspace } from "@/domain/desktop";

export function useBoundedWindowResize({ frame, workspace, onCommit, disabled = false }: { frame: Rect; workspace: Workspace; onCommit: (frame: Rect) => void; disabled?: boolean }) {
  const [preview, setPreview] = useState<Rect>();
  const start = useRef<{ pointer: { x: number; y: number }; frame: Rect; edge: ResizeEdge } | undefined>(undefined);

  function propsFor(edge: ResizeEdge) {
    return {
      onPointerDown(event: ReactPointerEvent<HTMLSpanElement>) {
        if (disabled || workspace.mode === "compact" || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = { pointer: { x: event.clientX, y: event.clientY }, frame, edge };
      },
      onPointerMove(event: ReactPointerEvent<HTMLSpanElement>) {
        if (!start.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        setPreview(resizeFrame(start.current.frame, start.current.edge, { x: event.clientX - start.current.pointer.x, y: event.clientY - start.current.pointer.y }, workspace));
      },
      onPointerUp(event: ReactPointerEvent<HTMLSpanElement>) {
        if (!start.current) return;
        const finalFrame = resizeFrame(start.current.frame, start.current.edge, { x: event.clientX - start.current.pointer.x, y: event.clientY - start.current.pointer.y }, workspace);
        start.current = undefined;
        setPreview(undefined);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        onCommit(finalFrame);
      },
      onPointerCancel() {
        start.current = undefined;
        setPreview(undefined);
      },
    };
  }

  return { frame: preview ?? frame, propsFor };
}
