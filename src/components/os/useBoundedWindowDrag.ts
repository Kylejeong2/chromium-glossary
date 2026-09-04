"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { clampFrame, type Rect, type Workspace } from "@/domain/desktop";

export function useBoundedWindowDrag({ frame, workspace, onCommit, disabled = false }: { frame: Rect; workspace: Workspace; onCommit: (frame: Rect) => void; disabled?: boolean }) {
  const [preview, setPreview] = useState<Rect>();
  const start = useRef<{ pointer: { x: number; y: number }; frame: Rect } | undefined>(undefined);
  const dragDisabled = disabled || workspace.mode === "compact";
  return {
    frame: preview ?? frame,
    dragProps: {
      onPointerDown(event: ReactPointerEvent<HTMLElement>) {
        if (dragDisabled || event.button !== 0 || (event.target as HTMLElement).closest("button,a,input,[role=tab]")) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = { pointer: { x: event.clientX, y: event.clientY }, frame };
      },
      onPointerMove(event: ReactPointerEvent<HTMLElement>) {
        if (!start.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        setPreview(clampFrame({ ...start.current.frame, x: start.current.frame.x + event.clientX - start.current.pointer.x, y: start.current.frame.y + event.clientY - start.current.pointer.y }, workspace));
      },
      onPointerUp(event: ReactPointerEvent<HTMLElement>) {
        if (!start.current) return;
        const finalFrame = preview ?? frame;
        start.current = undefined;
        setPreview(undefined);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        onCommit(finalFrame);
      },
      onPointerCancel() { start.current = undefined; setPreview(undefined); },
    },
  };
}
