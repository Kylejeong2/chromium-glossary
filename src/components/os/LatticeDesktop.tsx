"use client";

import type { ReactNode } from "react";

export function LatticeDesktop({ focused, clock, children }: { focused?: string; clock: string; children: ReactNode }) {
  return <main className="lattice-desktop">
    <h1 className="sr-only">Lattice desktop</h1>
    <div className="wallpaper-shape wallpaper-shape--one" />
    <div className="wallpaper-shape wallpaper-shape--two" />
    <header className="status-shelf">
      <strong>Lattice</strong>
      <span>{focused ? `${focused} active` : "Ready"}</span>
      <div><span className="wifi" aria-label="Wi-Fi connected">⌁</span><span aria-label="Battery 100 percent">▰</span><time>{clock}</time></div>
    </header>
    <p className="desktop-instruction">Double-click an app to open it. Drag anything that feels movable.</p>
    {children}
  </main>;
}
