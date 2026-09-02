"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { Point } from "@/domain/desktop";

export function AppLauncher({ label, position, icon, compact, onOpen, onMove }: { label: string; position: Point; icon: ReactNode; compact: boolean; onOpen: () => void; onMove: (point: Point) => void }) {
  const [preview, setPreview] = useState<Point>();
  const start = useRef<{ pointer: Point; position: Point; moved: boolean } | undefined>(undefined);
  function down(event: ReactPointerEvent<HTMLButtonElement>) {
    if (compact || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { pointer: { x: event.clientX, y: event.clientY }, position, moved: false };
  }
  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!start.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = { x: start.current.position.x + event.clientX - start.current.pointer.x, y: start.current.position.y + event.clientY - start.current.pointer.y };
    if (Math.abs(point.x - position.x) + Math.abs(point.y - position.y) > 5) start.current.moved = true;
    setPreview(point);
  }
  function up(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    const moved = start.current.moved;
    start.current = undefined;
    if (preview) onMove(preview);
    setPreview(undefined);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!moved && event.pointerType === "touch") onOpen();
  }
  const point = preview ?? position;
  return <button type="button" className="os-launcher" style={{ left: point.x, top: point.y }} aria-label={`Open ${label}`} onClick={compact ? onOpen : undefined} onDoubleClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(); }} onPointerDown={down} onPointerMove={move} onPointerUp={up}><span className={`app-glyph app-glyph--${label.toLowerCase()}`}>{icon}</span><span>{label}</span></button>;
}
