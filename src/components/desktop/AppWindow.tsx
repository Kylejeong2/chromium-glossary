"use client";

import type { ReactNode } from "react";
import { Minus, X } from "lucide-react";

type AppWindowProps = {
  title: string;
  app: "chromium" | "terminal" | "trash";
  z: number;
  focused: boolean;
  children: ReactNode;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
};

export function AppWindow({ title, app, z, focused, children, onFocus, onMinimize, onClose }: AppWindowProps) {
  return (
    <section
      className={`app-window app-window--${app}${focused ? " is-focused" : ""}`}
      style={{ zIndex: z + 10 }}
      aria-label={`${title} window`}
      onPointerDown={onFocus}
    >
      <div className="window-chrome">
        <div className="window-controls" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="tab-tick tab-tick--one" aria-hidden="true" />
        <span className="tab-tick tab-tick--two" aria-hidden="true" />
        <strong className="window-title">{title}</strong>
        <div className="window-actions">
          <button type="button" aria-label={`Minimize ${title}`} onClick={(event) => { event.stopPropagation(); onMinimize(); }}><Minus size={16} /></button>
          <button type="button" aria-label={`Close ${title}`} onClick={(event) => { event.stopPropagation(); onClose(); }}><X size={16} /></button>
        </div>
      </div>
      <div className="window-viewport">{children}</div>
    </section>
  );
}
