"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { Recycle, TerminalSquare } from "lucide-react";
import type { GlossaryDocument } from "@/domain/glossary";
import { createDesktopState, desktopReducer, focusedApp, type AppId, type Point, type Rect } from "@/domain/desktop";
import { createHistoryJournal, historyBack, historyForward, observePath, parseLocalAddress, reconcileObservedPath } from "@/application/navigation";
import { ChromeWindow } from "./chrome/ChromeWindow";
import { GlossaryApp } from "./glossary/GlossaryApp";
import { AppLauncher } from "./os/AppLauncher";
import { Dock } from "./os/Dock";
import { LatticeDesktop } from "./os/LatticeDesktop";
import { NativeAppWindow } from "./os/NativeAppWindow";
import { TerminalApp } from "./apps/TerminalApp";
import { TrashApp } from "./apps/TrashApp";

function ChromeIcon() { return <span className="chrome-icon" aria-hidden="true"><i /><b /></span>; }

export function ChromiumGlossary({ document, initialEntry }: { document: GlossaryDocument; initialEntry?: string | null }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(desktopReducer, initialEntry !== undefined ? "chromium" : undefined, createDesktopState);
  const [clock, setClock] = useState("");
  const focused = focusedApp(state);
  const validSlugs = useMemo(() => new Set(document.stages.flatMap((stage) => stage.entries.map((entry) => entry.slug))), [document]);
  const selectedEntry = initialEntry ? document.stages.flatMap((stage) => stage.entries).find((entry) => entry.slug === initialEntry) : undefined;
  const pathname = initialEntry === undefined ? "/" : initialEntry ? `/glossary/${initialEntry}` : "/glossary";
  const [routeHistory, setRouteHistory] = useState(() => createHistoryJournal(pathname));

  useEffect(() => {
    const updateViewport = () => dispatch({ type: "workspace.changed", viewport: { width: window.innerWidth, height: window.innerHeight } });
    const updateClock = () => setClock(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()));
    updateViewport();
    updateClock();
    window.addEventListener("resize", updateViewport);
    const timer = window.setInterval(updateClock, 30_000);
    return () => { window.removeEventListener("resize", updateViewport); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const reconcileBrowserNavigation = () => setRouteHistory((current) => reconcileObservedPath(current, window.location.pathname));
    window.addEventListener("popstate", reconcileBrowserNavigation);
    return () => window.removeEventListener("popstate", reconcileBrowserNavigation);
  }, []);

  const navigatePath = (nextPath: string) => { setRouteHistory((current) => observePath(current, nextPath)); router.push(nextPath); };
  const navigate = (slug: string) => navigatePath(slug ? `/glossary/${slug}` : "/glossary");
  const openApp = (app: AppId) => { dispatch({ type: "app.open", app }); if (app === "chromium" && state.windows.chromium.status === "closed") navigatePath("/glossary"); };
  const selectDock = (app: AppId) => { const target = state.windows[app]; if (target.status === "closed") openApp(app); else dispatch({ type: target.status === "minimized" ? "window.restore" : "window.focus", app }); };
  const close = (app: AppId) => { dispatch({ type: "window.close", app }); if (app === "chromium") router.push("/"); };
  const moveThroughHistory = (direction: "back" | "forward") => {
    const next = direction === "back" ? historyBack(routeHistory) : historyForward(routeHistory);
    if (!next.pathname) return;
    setRouteHistory(next.journal);
    router.push(next.pathname);
  };
  const common = (app: AppId) => ({ workspace: state.workspace, focused: focused === app, onFocus: () => dispatch({ type: "window.focus", app }), onMove: (frame: Rect) => dispatch({ type: "window.move", app, frame }), onMinimize: () => dispatch({ type: "window.minimize", app }), onMaximize: () => dispatch({ type: "window.maximize-toggle", app }), onClose: () => close(app) });
  const icons = useMemo(() => [
    { id: "chromium" as const, label: "Chrome", icon: <ChromeIcon /> },
    { id: "terminal" as const, label: "Terminal", icon: <TerminalSquare /> },
    { id: "trash" as const, label: "Trash", icon: <Recycle /> },
  ], []);
  const canBack = routeHistory.index > 0;
  const canForward = routeHistory.index < routeHistory.entries.length - 1;

  return <LatticeDesktop focused={focused} clock={clock}>
    {icons.map((app) => <AppLauncher key={app.id} label={app.label} position={state.iconPositions[app.id]} icon={app.icon} compact={state.workspace.mode === "compact"} onOpen={() => openApp(app.id)} onMove={(position: Point) => dispatch({ type: "icon.move", app: app.id, position })} />)}
    {state.windows.chromium.status === "visible" && <ChromeWindow key={pathname} window={state.windows.chromium} {...common("chromium")} address={`chromium://glossary${initialEntry ? `/${initialEntry}` : ""}`} canBack={canBack} canForward={canForward} sourceHref={selectedEntry?.primaryDocs[0]?.href ?? "https://chromium.googlesource.com/chromium/src/+/HEAD/docs/README.md"} onBack={() => moveThroughHistory("back")} onForward={() => moveThroughHistory("forward")} onReload={() => window.location.reload()} onAddress={(value) => { const next = parseLocalAddress(value, window.location.origin, validSlugs); if (!next) return false; navigatePath(next); return true; }}><GlossaryApp document={document} selectedSlug={initialEntry ?? undefined} onNavigate={navigate} /></ChromeWindow>}
    {state.windows.terminal.status === "visible" && <NativeAppWindow app="terminal" title="Terminal" window={state.windows.terminal} {...common("terminal")}><TerminalApp onExit={() => close("terminal")} /></NativeAppWindow>}
    {state.windows.trash.status === "visible" && <NativeAppWindow app="trash" title="Trash" window={state.windows.trash} {...common("trash")}><TrashApp onExplain={() => { dispatch({ type: "window.close", app: "trash" }); dispatch({ type: "app.open", app: "chromium" }); navigatePath("/glossary/garbage-collection"); }} /></NativeAppWindow>}
    <Dock state={state} apps={icons} onSelect={selectDock} />
  </LatticeDesktop>;
}
