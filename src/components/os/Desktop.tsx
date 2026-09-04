"use client";

import { BatteryFull, Search, SlidersHorizontal, Volume2, Wifi } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AppId } from "@/domain/desktop";

export type DesktopMenuCommand =
  | "about" | "hide" | "quit"
  | "open-glossary" | "open-terminal" | "close-window"
  | "find" | "copy-address"
  | "reload" | "browser-details"
  | "new-terminal-session" | "clear-terminal" | "empty-trash" | "restore-trash"
  | "minimize" | "zoom" | "fullscreen"
  | "documentation" | "keyboard-help";

type MenuItem = Readonly<{ label: string; command: DesktopMenuCommand; shortcut?: string; disabled?: boolean }>;

function menuModel(focused?: AppId, fullscreen = false): readonly Readonly<{ label: string; items: readonly MenuItem[] }>[] {
  const appName = focused === "chromium" ? "Chromium" : focused === "terminal" ? "Terminal" : focused === "trash" ? "Trash" : "Finder";
  const noWindow = focused === undefined;
  const fileItems: readonly MenuItem[] = focused === "terminal"
    ? [{ label: "New Tab", command: "new-terminal-session", shortcut: "⌘T" }, { label: "Close Window", command: "close-window", shortcut: "⌘W" }]
    : focused === "trash"
      ? [{ label: "Empty Trash", command: "empty-trash" }, { label: "Close Window", command: "close-window", shortcut: "⌘W" }]
      : [{ label: "Open Chromium glossary", command: "open-glossary", shortcut: "⌘O" }, { label: "Open Terminal", command: "open-terminal", shortcut: "⌘T" }, { label: "Close Window", command: "close-window", shortcut: "⌘W", disabled: noWindow }];
  const editItems: readonly MenuItem[] = focused === "terminal"
    ? [{ label: "Clear Screen", command: "clear-terminal", shortcut: "⌘K" }, { label: "Find in glossary", command: "find" }]
    : focused === "trash"
      ? [{ label: "Restore demo files", command: "restore-trash" }, { label: "Find in glossary", command: "find", shortcut: "⌘K" }]
      : [{ label: "Find in glossary", command: "find", shortcut: "⌘K" }, { label: "Copy browser address", command: "copy-address", shortcut: "⌘C" }];
  const viewItems: readonly MenuItem[] = focused === "terminal"
    ? [{ label: "New session", command: "new-terminal-session" }, { label: "Open Chromium glossary", command: "open-glossary" }]
    : focused === "trash"
      ? [{ label: "Show recovered files", command: "restore-trash" }, { label: "Open Chromium glossary", command: "open-glossary" }]
      : [{ label: "Reload Chromium", command: "reload", shortcut: "⌘R" }, { label: "Show browser details", command: "browser-details" }];
  return [
    { label: appName, items: [
      { label: `About ${appName}`, command: "about" },
      { label: `Hide ${appName}`, command: "hide", shortcut: "⌘H", disabled: noWindow },
      { label: `Quit ${appName}`, command: "quit", shortcut: "⌘Q", disabled: noWindow },
    ] },
    { label: "File", items: fileItems },
    { label: "Edit", items: editItems },
    { label: "View", items: viewItems },
    { label: "Window", items: [
      { label: "Minimize", command: "minimize", shortcut: "⌘M", disabled: noWindow },
      { label: "Zoom", command: "zoom", disabled: noWindow || fullscreen },
      { label: fullscreen ? "Exit Full Screen" : "Enter Full Screen", command: "fullscreen", shortcut: "⌃⌘F", disabled: noWindow },
    ] },
    { label: "Help", items: [
      { label: "Chromium documentation", command: "documentation" },
      { label: "Keyboard shortcuts", command: "keyboard-help" },
    ] },
  ];
}

function StatusShelf({ focused, fullscreen, onCommand }: { focused?: AppId; fullscreen: boolean; onCommand: (command: DesktopMenuCommand) => void }) {
  const [clock, setClock] = useState("");
  const [openMenu, setOpenMenu] = useState<string>();
  const [controlsOpen, setControlsOpen] = useState(false);
  const [wifi, setWifi] = useState(true);
  const [sound, setSound] = useState(true);
  const shelf = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!shelf.current?.contains(event.target as Node)) { setOpenMenu(undefined); setControlsOpen(false); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpenMenu(undefined); setControlsOpen(false); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);
  const menus = menuModel(focused, fullscreen);
  return <header ref={shelf} className="status-shelf">
    <nav className="desktop-menu" aria-label="Application menus" role="menubar">
      <span className="desktop-menu__mark" role="none" />
      {menus.map((menu) => <div className="desktop-menu__group" role="none" key={menu.label}>
        <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={openMenu === menu.label} onClick={() => { setControlsOpen(false); setOpenMenu((current) => current === menu.label ? undefined : menu.label); }}>{menu.label}</button>
        {openMenu === menu.label && <div className="desktop-menu__panel" role="menu">{menu.items.map((item) => <button key={item.command} type="button" role="menuitem" aria-label={item.label} disabled={item.disabled} onClick={() => { setOpenMenu(undefined); onCommand(item.command); }}><span>{item.label}</span>{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>)}</div>}
      </div>)}
    </nav>
    <div className="system-status" aria-label="System status">
      <Wifi aria-label={wifi ? "Wi-Fi connected" : "Wi-Fi off"} />
      <Volume2 aria-label={sound ? "Volume on" : "Volume muted"} />
      <BatteryFull aria-label="Battery 100 percent" />
      <button type="button" aria-label="Search concepts" onClick={() => onCommand("find")}><Search /></button>
      <button type="button" aria-label="Control Center" aria-expanded={controlsOpen} onClick={() => { setOpenMenu(undefined); setControlsOpen((open) => !open); }}><SlidersHorizontal /></button>
      <time>{clock}</time>
      {controlsOpen && <div className="control-center" aria-label="Control Center"><button type="button" aria-pressed={wifi} onClick={() => setWifi((value) => !value)}><Wifi /><span>Wi-Fi<small>{wifi ? "Connected" : "Off"}</small></span></button><button type="button" aria-pressed={sound} onClick={() => setSound((value) => !value)}><Volume2 /><span>Sound<small>{sound ? "On" : "Muted"}</small></span></button></div>}
    </div>
  </header>;
}

function DesktopWidgets() {
  const [date] = useState(() => new Date());
  const day = String(date.getDate());
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  return <aside className="desktop-widgets" aria-label="Desktop widgets">
    <section><span>Chromium</span><strong>50</strong><small>concepts mapped</small></section>
    <section><span suppressHydrationWarning>{weekday}</span><strong suppressHydrationWarning>{day}</strong><small>A fresh start</small></section>
  </aside>;
}

export function Desktop({ focused, fullscreen = false, onCommand, children }: { focused?: AppId; fullscreen?: boolean; onCommand: (command: DesktopMenuCommand) => void; children: ReactNode }) {
  return <main className={`desktop-shell ${fullscreen ? "is-fullscreen" : ""}`}>
    <h1 className="sr-only">Desktop</h1>
    <StatusShelf focused={focused} fullscreen={fullscreen} onCommand={onCommand} />
    <DesktopWidgets />
    <span className="sr-only" aria-live="polite">{focused ? `${focused} active` : "Desktop ready"}</span>
    {children}
  </main>;
}
