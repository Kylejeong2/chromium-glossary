"use client";

import { Minus, Square, X } from "lucide-react";
import type { ReactNode } from "react";
import { windowFrame, type AppId, type ManagedWindow, type Workspace } from "@/domain/desktop";
import { useBoundedWindowDrag } from "./useBoundedWindowDrag";

export function NativeAppWindow({ app, title, window, workspace, focused, children, onFocus, onMove, onMinimize, onMaximize, onClose }: { app: AppId; title: string; window: ManagedWindow; workspace: Workspace; focused: boolean; children: ReactNode; onFocus: () => void; onMove: (frame: ReturnType<typeof windowFrame>) => void; onMinimize: () => void; onMaximize: () => void; onClose: () => void }) {
  const geometry = windowFrame(window, workspace);
  const drag = useBoundedWindowDrag({ frame: geometry, workspace, onCommit: onMove });
  return <section className={`native-window ${focused ? "is-focused" : ""}`} style={{ left: drag.frame.x, top: drag.frame.y, width: drag.frame.width, height: drag.frame.height, zIndex: (window.z ?? 1) + 20 }} aria-label={`${title} window`} onPointerDown={onFocus}>
    <header className="native-titlebar" {...drag.dragProps} onDoubleClick={onMaximize}><span className="native-titlebar__mark">{app === "terminal" ? ">_" : "♻"}</span><strong>{title}</strong><div className="native-window-controls"><button type="button" onClick={onMinimize} aria-label={`Minimize ${title}`}><Minus /></button><button type="button" onClick={onMaximize} aria-label={`${window.placement.kind === "maximized" ? "Restore" : "Maximize"} ${title}`}><Square /></button><button type="button" onClick={onClose} aria-label={`Close ${title}`}><X /></button></div></header>
    <div className="native-window-content">{children}</div>
  </section>;
}
