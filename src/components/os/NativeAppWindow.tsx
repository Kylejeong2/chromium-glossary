"use client";

import Image from "next/image";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { windowFrame, type AppId, type ManagedWindow, type Workspace } from "@/domain/desktop";
import { useBoundedWindowDrag } from "./useBoundedWindowDrag";
import { useBoundedWindowResize } from "./useBoundedWindowResize";
import { WindowResizeHandles } from "./WindowResizeHandles";

export function NativeAppWindow({ app, title, window, workspace, focused, children, onFocus, onMove, onResize, onMinimize, onMaximize, onFullscreen, onClose }: { app: AppId; title: string; window: ManagedWindow; workspace: Workspace; focused: boolean; children: ReactNode; onFocus: () => void; onMove: (frame: ReturnType<typeof windowFrame>) => void; onResize: (frame: ReturnType<typeof windowFrame>) => void; onMinimize: () => void; onMaximize: () => void; onFullscreen: () => void; onClose: () => void }) {
  const geometry = windowFrame(window, workspace);
  const floating = window.placement.kind === "floating";
  const drag = useBoundedWindowDrag({ frame: geometry, workspace, onCommit: onMove, disabled: !floating });
  const resize = useBoundedWindowResize({ frame: geometry, workspace, onCommit: onResize, disabled: !floating });
  const frame = resize.frame === geometry ? drag.frame : resize.frame;
  const controlName = app === "terminal" ? "Terminal" : title;
  return <section className={`native-window ${focused ? "is-focused" : ""} ${window.placement.kind === "maximized" ? "is-maximized" : ""} ${window.placement.kind === "fullscreen" ? "is-fullscreen" : ""}`} style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, zIndex: (window.z ?? 1) + 20 }} aria-label={`${app === "terminal" ? "Terminal" : title} window`} onPointerDown={onFocus}>
    <header className="native-titlebar" {...drag.dragProps} onDoubleClick={onMaximize}><span className="native-titlebar__mark"><Image src={app === "terminal" ? "/assets/icons/terminal.png" : "/assets/icons/trash.png"} alt="" width={24} height={24} /></span><strong>{title}</strong><div className="native-window-controls"><button type="button" onClick={onClose} aria-label={`Close ${controlName}`}><X /></button><button type="button" onClick={onMinimize} aria-label={`Minimize ${controlName}`}><Minus /></button><button type="button" onClick={onFullscreen} aria-label={`${window.placement.kind === "fullscreen" ? "Exit" : "Enter"} ${controlName} full screen`}>{window.placement.kind === "fullscreen" ? <Minimize2 /> : <Maximize2 />}</button></div></header>
    <div className="native-window-content">{children}</div>
    {floating && <WindowResizeHandles propsFor={resize.propsFor} />}
  </section>;
}
