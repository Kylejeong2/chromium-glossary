"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createCatalog, type GlossaryDocument } from "@/domain/glossary";
import { createDesktopState, desktopReducer, focusedApp, type AppId, type Point, type Rect } from "@/domain/desktop";
import { createHistoryJournal, historyBack, historyForward, observePath, parseLocalAddress, reconcileObservedPath } from "@/application/navigation";
import { ChromeWindow, type ChromeWindowHandle } from "./chrome/ChromeWindow";
import { GlossaryApp, type GlossaryAppHandle } from "./glossary/GlossaryApp";
import { AppLauncher } from "./os/AppLauncher";
import { Dock } from "./os/Dock";
import { Desktop, type DesktopMenuCommand } from "./os/Desktop";
import { NativeAppWindow } from "./os/NativeAppWindow";
import { TerminalApp, type TerminalAppHandle } from "./apps/TerminalApp";
import { TrashApp, type TrashAppHandle } from "./apps/TrashApp";

function AppIcon({ src }: { src: string }) { return <Image src={src} alt="" width={256} height={256} priority />; }

function runWhenReady<T>(ref: Readonly<{ current: T | null }>, action: (value: T) => void, attempts = 4) {
  if (ref.current) { action(ref.current); return; }
  if (attempts > 0) window.requestAnimationFrame(() => runWhenReady(ref, action, attempts - 1));
}

export function ChromiumGlossary({ document, initialEntry, initialStage }: { document: GlossaryDocument; initialEntry?: string | null; initialStage?: string }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(desktopReducer, initialEntry !== undefined ? "chromium" : undefined, createDesktopState);
  const focused = focusedApp(state);
  const focusedPlacement = focused ? state.windows[focused].placement.kind : undefined;
  const catalog = useMemo(() => createCatalog(document), [document]);
  const validSlugs = useMemo(() => new Set(catalog.entries.map((entry) => entry.slug)), [catalog]);
  const validStages = useMemo(() => new Set(catalog.stages.map((stage) => stage.id)), [catalog]);
  const selectedEntry = initialEntry ? catalog.entry(initialEntry) : undefined;
  const [tabTitle, setTabTitle] = useState(selectedEntry?.term ?? "Chromium glossary");
  const pathname = initialEntry === undefined ? "/" : initialEntry ? `/glossary/${initialEntry}` : "/glossary";
  const routePath = initialStage && !initialEntry ? `${pathname}?stage=${encodeURIComponent(initialStage)}` : pathname;
  const [routeHistory, setRouteHistory] = useState(() => createHistoryJournal(routePath));
  const chromeRef = useRef<ChromeWindowHandle>(null);
  const glossaryRef = useRef<GlossaryAppHandle>(null);
  const terminalRef = useRef<TerminalAppHandle>(null);
  const trashRef = useRef<TrashAppHandle>(null);

  useEffect(() => {
    let frame = 0;
    const commitViewport = () => dispatch({ type: "workspace.changed", viewport: { width: window.innerWidth, height: window.innerHeight } });
    const scheduleViewport = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(commitViewport);
    };
    commitViewport();
    window.addEventListener("resize", scheduleViewport);
    return () => {
      window.removeEventListener("resize", scheduleViewport);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const exitFullScreen = (event: KeyboardEvent) => {
      if (event.key === "Escape" && focused && focusedPlacement === "fullscreen") dispatch({ type: "window.fullscreen-toggle", app: focused });
    };
    window.addEventListener("keydown", exitFullScreen);
    return () => window.removeEventListener("keydown", exitFullScreen);
  }, [focused, focusedPlacement]);

  useEffect(() => {
    const reconcileBrowserNavigation = () => setRouteHistory((current) => reconcileObservedPath(current, `${window.location.pathname}${window.location.search}`));
    window.addEventListener("popstate", reconcileBrowserNavigation);
    return () => window.removeEventListener("popstate", reconcileBrowserNavigation);
  }, []);

  const navigatePath = (nextPath: string) => { setRouteHistory((current) => observePath(current, nextPath)); router.push(nextPath); };
  const navigate = (slug: string) => navigatePath(slug ? `/glossary/${slug}` : "/glossary");
  const selectStage = (stage?: string) => navigatePath(stage ? `/glossary?stage=${encodeURIComponent(stage)}` : "/glossary");
  const openApp = (app: AppId) => { dispatch({ type: "app.open", app }); if (app === "chromium" && state.windows.chromium.status === "closed") navigatePath("/glossary"); };
  const selectDock = (app: AppId) => { const target = state.windows[app]; if (target.status === "closed") openApp(app); else dispatch({ type: target.status === "minimized" ? "window.restore" : "window.focus", app }); };
  const close = (app: AppId) => { dispatch({ type: "window.close", app }); if (app === "chromium") router.push("/"); };
  const moveThroughHistory = (direction: "back" | "forward") => {
    const next = direction === "back" ? historyBack(routeHistory) : historyForward(routeHistory);
    if (!next.pathname) return;
    setRouteHistory(next.journal);
    router.push(next.pathname);
  };
  const common = (app: AppId) => ({ workspace: state.workspace, focused: focused === app, onFocus: () => dispatch({ type: "window.focus", app }), onMove: (frame: Rect) => dispatch({ type: "window.move", app, frame }), onResize: (frame: Rect) => dispatch({ type: "window.resize", app, frame }), onMinimize: () => dispatch({ type: "window.minimize", app }), onMaximize: () => dispatch({ type: "window.maximize-toggle", app }), onFullscreen: () => dispatch({ type: "window.fullscreen-toggle", app }), onClose: () => close(app) });
  const icons = useMemo(() => [
    { id: "chromium" as const, label: "Chromium", icon: <AppIcon src="/assets/icons/chromium.svg" /> },
    { id: "terminal" as const, label: "Terminal", icon: <AppIcon src="/assets/icons/terminal.png" /> },
    { id: "trash" as const, label: "Trash", icon: <AppIcon src="/assets/icons/trash.png" /> },
  ], []);
  const canBack = routeHistory.index > 0;
  const canForward = routeHistory.index < routeHistory.entries.length - 1;
  const fullscreen = focusedPlacement === "fullscreen";
  const handleMenuCommand = (command: DesktopMenuCommand) => {
    if (command === "open-glossary") return openApp("chromium");
    if (command === "open-terminal") return openApp("terminal");
    if (command === "close-window" || command === "quit") { if (focused) close(focused); return; }
    if (command === "hide" || command === "minimize") { if (focused) dispatch({ type: "window.minimize", app: focused }); return; }
    if (command === "zoom") { if (focused) dispatch({ type: "window.maximize-toggle", app: focused }); return; }
    if (command === "fullscreen") { if (focused) dispatch({ type: "window.fullscreen-toggle", app: focused }); return; }
    if (command === "find") { openApp("chromium"); runWhenReady(glossaryRef, (app) => app.focusSearch()); return; }
    if (command === "copy-address") { void navigator.clipboard?.writeText(`chromium://glossary${initialEntry ? `/${initialEntry}` : initialStage ? `?stage=${initialStage}` : ""}`); return; }
    if (command === "reload") { openApp("chromium"); router.refresh(); return; }
    if (command === "new-terminal-session" || command === "clear-terminal") { openApp("terminal"); runWhenReady(terminalRef, (app) => app.run(command === "new-terminal-session" ? "new-session" : "clear")); return; }
    if (command === "empty-trash" || command === "restore-trash") { openApp("trash"); runWhenReady(trashRef, (app) => app.run(command === "empty-trash" ? "empty" : "restore")); return; }
    if (command === "about") {
      if (focused === "terminal") terminalRef.current?.run("about");
      else if (focused === "trash") trashRef.current?.run("about");
      else { openApp("chromium"); runWhenReady(chromeRef, (app) => app.showDetails()); }
      return;
    }
    if (command === "browser-details" || command === "keyboard-help") { openApp("chromium"); runWhenReady(chromeRef, (app) => app.showDetails()); return; }
    if (command === "documentation") window.open("https://chromium.googlesource.com/chromium/src/+/HEAD/docs/README.md", "_blank", "noopener,noreferrer");
  };

  return <Desktop focused={focused} fullscreen={fullscreen} onCommand={handleMenuCommand}>
    {icons.map((app) => <AppLauncher key={app.id} label={app.label} position={state.iconPositions[app.id]} icon={app.icon} compact={state.workspace.mode === "compact"} onOpen={() => openApp(app.id)} onMove={(position: Point) => dispatch({ type: "icon.move", app: app.id, position })} />)}
    {state.windows.chromium.status === "visible" && <ChromeWindow ref={chromeRef} window={state.windows.chromium} {...common("chromium")} address={`chromium://glossary${initialEntry ? `/${initialEntry}` : initialStage ? `?stage=${initialStage}` : ""}`} canBack={canBack} canForward={canForward} sourceHref={selectedEntry?.sources[0]?.publicUrl ?? "https://chromium.googlesource.com/chromium/src/+/HEAD/docs/README.md"} tabTitle={tabTitle} onBack={() => moveThroughHistory("back")} onForward={() => moveThroughHistory("forward")} onReload={() => router.refresh()} onAddress={(value) => { const next = parseLocalAddress(value, window.location.origin, validSlugs, validStages); if (!next) return false; navigatePath(next); return true; }}><GlossaryApp ref={glossaryRef} catalog={catalog} selectedSlug={initialEntry ?? undefined} selectedStage={initialStage} onNavigate={navigate} onSelectStage={selectStage} onTitleChange={setTabTitle} /></ChromeWindow>}
    {state.windows.terminal.status === "visible" && <NativeAppWindow app="terminal" title="chromium - zsh - 80x24" window={state.windows.terminal} {...common("terminal")}><TerminalApp ref={terminalRef} onExit={() => close("terminal")} onOpenGlossary={() => { dispatch({ type: "app.open", app: "chromium" }); navigatePath("/glossary"); }} /></NativeAppWindow>}
    {state.windows.trash.status === "visible" && <NativeAppWindow app="trash" title="Trash" window={state.windows.trash} {...common("trash")}><TrashApp ref={trashRef} onOpenConcept={(slug) => { dispatch({ type: "app.open", app: "chromium" }); navigatePath(`/glossary/${slug}`); }} /></NativeAppWindow>}
    <Dock state={state} apps={icons} onSelect={selectDock} />
  </Desktop>;
}
