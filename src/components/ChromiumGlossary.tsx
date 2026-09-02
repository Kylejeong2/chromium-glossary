"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorUp, TerminalSquare, Trash2 } from "lucide-react";
import type { GlossaryDocument } from "@/domain/glossary";
import { createDesktopState, desktopReducer, focusedApp, type AppId, type Point } from "@/domain/desktop";
import { AppWindow } from "./desktop/AppWindow";
import { ComputerScene } from "./desktop/ComputerScene";
import { DesktopIcon } from "./desktop/DesktopIcon";
import { Terminal } from "./desktop/Terminal";
import { GlossaryBrowser } from "./glossary/GlossaryBrowser";

function ChromiumMark() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#fff" stroke="#5a78af" strokeWidth="2"/><path d="M32 32 57 18A29 29 0 0 0 8 16Z" fill="#ff4500"/><path d="m32 32 1 29a29 29 0 0 0 24-43Z" fill="#c4d600"/><path d="m32 32-24-16a29 29 0 0 0 25 45Z" fill="#00b0ff"/><circle cx="32" cy="32" r="12" fill="#fff" stroke="#000" strokeWidth="2"/><circle cx="32" cy="32" r="7" fill="#5a78af"/></svg>;
}

export function ChromiumGlossary({ document, initialEntry }: { document: GlossaryDocument; initialEntry?: string | null }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(desktopReducer, initialEntry !== undefined ? "chromium" : undefined, createDesktopState);
  const [selectedSlug, setSelectedSlug] = useState(initialEntry ?? undefined);
  const [clock, setClock] = useState("");
  const desktopRef = useRef<HTMLDivElement>(null);
  const focused = focusedApp(state);

  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const openApp = (app: AppId) => {
    dispatch({ type: "app.open", app });
    if (app === "chromium" && state.windows.chromium.status === "closed") router.push("/glossary");
  };

  const moveIcon = (app: AppId, position: Point) => {
    const rect = desktopRef.current?.getBoundingClientRect();
    dispatch({ type: "icon.move", icon: app, position, bounds: { x: Math.max(0, (rect?.width ?? 900) - 112), y: Math.max(80, (rect?.height ?? 700) - 152) } });
  };

  const apps = useMemo(() => [
    { id: "chromium" as const, label: "Chromium", graphic: <ChromiumMark /> },
    { id: "terminal" as const, label: "Terminal", graphic: <span className="terminal-mark"><span>&gt;_</span></span> },
    { id: "trash" as const, label: "Trash", graphic: <Trash2 size={46} strokeWidth={1.5} /> },
  ], []);

  return (
    <main className="desktop" ref={desktopRef}>
      <ComputerScene />
      <div className="desktop-screen" aria-label="Browserbase desktop">
        <header className="desktop-menubar"><strong>Browserbase OS</strong><span>Chromium learning machine</span><time>{clock}</time></header>
        <p className="desktop-hint">Double-click Chromium to begin. Touch once or press Enter.</p>
        {apps.map((app) => <DesktopIcon key={app.id} label={app.label} position={state.iconPositions[app.id]} graphic={app.graphic} onOpen={() => openApp(app.id)} onMove={(position) => moveIcon(app.id, position)} />)}
        {state.windows.chromium.status === "visible" && <AppWindow title="Chromium glossary" app="chromium" z={state.windows.chromium.z} focused={focused === "chromium"} onFocus={() => dispatch({ type: "window.focus", app: "chromium" })} onMinimize={() => dispatch({ type: "window.minimize", app: "chromium" })} onClose={() => { dispatch({ type: "window.close", app: "chromium" }); setSelectedSlug(undefined); router.push("/"); }}><GlossaryBrowser document={document} selectedSlug={selectedSlug} onNavigate={(slug) => { setSelectedSlug(slug || undefined); router.push(slug ? `/glossary/${slug}` : "/glossary"); }} /></AppWindow>}
        {state.windows.terminal.status === "visible" && <AppWindow title="Browserbase terminal" app="terminal" z={state.windows.terminal.z} focused={focused === "terminal"} onFocus={() => dispatch({ type: "window.focus", app: "terminal" })} onMinimize={() => dispatch({ type: "window.minimize", app: "terminal" })} onClose={() => dispatch({ type: "window.close", app: "terminal" })}><Terminal onExit={() => dispatch({ type: "window.close", app: "terminal" })} /></AppWindow>}
        {state.windows.trash.status === "visible" && <AppWindow title="Trash" app="trash" z={state.windows.trash.z} focused={focused === "trash"} onFocus={() => dispatch({ type: "window.focus", app: "trash" })} onMinimize={() => dispatch({ type: "window.minimize", app: "trash" })} onClose={() => dispatch({ type: "window.close", app: "trash" })}><div className="trash-window"><Trash2 size={54} strokeWidth={1.25} aria-hidden="true"/><h2>Nothing to delete</h2><p>Chromium handles a different kind of garbage. Its collector finds objects JavaScript can no longer reach.</p><button type="button" onClick={() => { dispatch({ type: "window.close", app: "trash" }); dispatch({ type: "app.open", app: "chromium" }); setSelectedSlug("garbage-collection"); router.push("/glossary/garbage-collection"); }}>Open garbage collection</button></div></AppWindow>}
        <nav className="taskbar" aria-label="Open applications">
          {apps.filter((app) => state.windows[app.id].status !== "closed").map((app) => {
            const windowState = state.windows[app.id];
            return <button type="button" key={app.id} className={focused === app.id ? "is-active" : ""} onClick={() => dispatch({ type: windowState.status === "minimized" ? "window.restore" : "window.focus", app: app.id })}>{app.id === "chromium" ? <MonitorUp size={16} /> : app.id === "terminal" ? <TerminalSquare size={16} /> : <Trash2 size={16} />}{app.label}</button>;
          })}
        </nav>
      </div>
    </main>
  );
}
