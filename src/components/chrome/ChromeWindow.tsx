"use client";

import { ArrowLeft, ArrowRight, ChevronDown, ExternalLink, MoreVertical, RefreshCw, Square, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { windowFrame, type ManagedWindow, type Rect, type Workspace } from "@/domain/desktop";
import { useBoundedWindowDrag } from "@/components/os/useBoundedWindowDrag";

function ChromeMark() {
  return <span className="chrome-mark" aria-hidden="true"><i /><b /></span>;
}

type ChromeWindowProps = {
  window: ManagedWindow;
  workspace: Workspace;
  focused: boolean;
  address: string;
  canBack: boolean;
  canForward: boolean;
  sourceHref: string;
  children: ReactNode;
  onFocus: () => void;
  onMove: (frame: Rect) => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onAddress: (value: string) => boolean;
};

export function ChromeWindow(props: ChromeWindowProps) {
  const { window, workspace, focused, address, canBack, canForward, sourceHref, children, onFocus, onMove, onMinimize, onMaximize, onClose, onBack, onForward, onReload, onAddress } = props;
  const geometry = windowFrame(window, workspace);
  const drag = useBoundedWindowDrag({ frame: geometry, workspace, onCommit: onMove });
  const [value, setValue] = useState(address);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [about, setAbout] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(onAddress(value) ? "" : "Use a local glossary address or a known concept slug.");
  }

  return <section className={`chrome-window ${focused ? "is-focused" : ""}`} style={{ left: drag.frame.x, top: drag.frame.y, width: drag.frame.width, height: drag.frame.height, zIndex: (window.z ?? 1) + 20 }} aria-label="Chrome browser window" onPointerDown={onFocus}>
    <header className="chrome-tabstrip" {...drag.dragProps} onDoubleClick={onMaximize}>
      <div className="chrome-window-buttons">
        <button type="button" onClick={onClose} aria-label="Close Chrome"><X /></button>
        <button type="button" onClick={onMinimize} aria-label="Minimize Chrome">−</button>
        <button type="button" onClick={onMaximize} aria-label={`${window.placement.kind === "maximized" ? "Restore" : "Maximize"} Chrome`}><Square /></button>
      </div>
      <div className="chrome-tab"><ChromeMark /><span>Chromium Glossary</span><button type="button" onClick={onClose} aria-label="Close Chromium Glossary tab"><X /></button></div>
      <button type="button" className="tab-search" aria-label="Show browser details" onClick={() => setAbout((open) => !open)}><ChevronDown /></button>
    </header>
    <div className="chrome-toolbar">
      <div className="chrome-nav">
        <button type="button" disabled={!canBack} onClick={onBack} aria-label="Back"><ArrowLeft /></button>
        <button type="button" disabled={!canForward} onClick={onForward} aria-label="Forward"><ArrowRight /></button>
        <button type="button" onClick={onReload} aria-label="Reload"><RefreshCw /></button>
      </div>
      <form onSubmit={submit} className={error ? "has-error" : ""}>
        <span aria-hidden="true">◉</span>
        <label htmlFor="chrome-address" className="sr-only">Address</label>
        <input id="chrome-address" value={value} onChange={(event) => setValue(event.target.value)} onFocus={(event) => event.currentTarget.select()} aria-describedby={error ? "address-error" : undefined} />
      </form>
      <a className="chrome-source" href={sourceHref} target="_blank" rel="noreferrer" aria-label="Open primary Chromium source"><ExternalLink /></a>
      <button type="button" className="chrome-more" aria-label="Customize and control Chrome" aria-expanded={menu} onClick={() => setMenu((open) => !open)}><MoreVertical /></button>
      {menu && <div className="chrome-menu"><button type="button" onClick={onReload}>Reload</button><button type="button" onClick={() => { void navigator.clipboard?.writeText(address); setMenu(false); }}>Copy address</button><button type="button" onClick={() => { setAbout(true); setMenu(false); }}>About this build</button><a href="https://chromium.googlesource.com/chromium/src/+/HEAD/docs/README.md" target="_blank" rel="noreferrer">Chromium docs</a></div>}
    </div>
    {error && <p id="address-error" className="address-error" role="alert">{error}</p>}
    {about && <div className="chrome-about"><ChromeMark /><p><strong>Chrome, explained.</strong><br />50 concepts. 7 stages. Created independently by Browserbase, not official Chromium documentation.</p><button type="button" onClick={() => setAbout(false)} aria-label="Close browser details"><X /></button></div>}
    <div className="chrome-page">{children}</div>
  </section>;
}
