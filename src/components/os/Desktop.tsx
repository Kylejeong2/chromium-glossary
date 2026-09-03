"use client";

import { BatteryFull, Search, SlidersHorizontal, Volume2, Wifi } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

function StatusShelf({ focused }: { focused?: string }) {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return <header className="status-shelf">
    <div className="desktop-menu"><span className="desktop-menu__mark" aria-hidden="true" /><strong>{focused === "chromium" ? "Chromium" : focused === "terminal" ? "Terminal" : focused === "trash" ? "Trash" : "Finder"}</strong><span>File</span><span>Edit</span><span>View</span><span>Window</span><span>Help</span></div>
    <div className="system-status" aria-label="System status"><Wifi aria-label="Wi-Fi connected" /><Volume2 aria-label="Volume on" /><BatteryFull aria-label="Battery 100 percent" /><Search aria-label="Spotlight Search" /><SlidersHorizontal aria-label="Control Center" /><time>{clock}</time></div>
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

export function Desktop({ focused, children }: { focused?: string; children: ReactNode }) {
  return <main className="desktop-shell">
    <h1 className="sr-only">Desktop</h1>
    <StatusShelf focused={focused} />
    <DesktopWidgets />
    <span className="sr-only" aria-live="polite">{focused ? `${focused} active` : "Desktop ready"}</span>
    {children}
  </main>;
}
