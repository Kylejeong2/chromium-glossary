"use client";

import type { AppId, DesktopState } from "@/domain/desktop";
import { focusedApp } from "@/domain/desktop";
import type { ReactNode } from "react";

export function Dock({ state, apps, onSelect }: { state: DesktopState; apps: readonly { id: AppId; label: string; icon: ReactNode }[]; onSelect: (app: AppId) => void }) {
  const focused = focusedApp(state);
  return <nav className="os-dock" aria-label="Applications">{apps.map((app) => { const open = state.windows[app.id].status !== "closed"; return <button type="button" key={app.id} className={focused === app.id ? "is-focused" : ""} aria-label={app.label} aria-pressed={focused === app.id} onClick={() => onSelect(app.id)}><span className={`app-glyph app-glyph--${app.id}`}>{app.icon}</span>{open && <i aria-label="Open" />}</button>; })}</nav>;
}
