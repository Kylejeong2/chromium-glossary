"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useRef } from "react";
import type { Point } from "@/domain/desktop";

type DesktopIconProps = {
  label: string;
  position: Point;
  graphic: ReactNode;
  onOpen: () => void;
  onMove: (position: Point) => void;
};

export function DesktopIcon({ label, position, graphic, onOpen, onMove }: DesktopIconProps) {
  const drag = useRef<{ pointerId: number; origin: Point; start: Point; moved: boolean } | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, origin: position, start: { x: event.clientX, y: event.clientY }, moved: false };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.start.x;
    const dy = event.clientY - active.start.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) active.moved = true;
    if (active.moved) onMove({ x: active.origin.x + dx, y: active.origin.y + dy });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (event.pointerType === "touch" && !active.moved) onOpen();
    drag.current = null;
  }

  return (
    <button
      type="button"
      className="desktop-icon"
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      aria-label={`Open ${label}`}
      onDoubleClick={onOpen}
      onClick={(event) => {
        if (event.detail === 0) onOpen();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { drag.current = null; }}
    >
      <span className="desktop-icon__graphic" aria-hidden="true">{graphic}</span>
      <span className="desktop-icon__label">{label}</span>
    </button>
  );
}
