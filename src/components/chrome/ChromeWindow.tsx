"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ChevronDown, ExternalLink, Maximize2, Minimize2, Minus, MoreVertical, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type FormEvent, type ReactNode } from "react";
import { windowFrame, type ManagedWindow, type Rect, type Workspace } from "@/domain/desktop";
import { useBoundedWindowDrag } from "@/components/os/useBoundedWindowDrag";
import { useBoundedWindowResize } from "@/components/os/useBoundedWindowResize";
import { WindowResizeHandles } from "@/components/os/WindowResizeHandles";

function ChromiumMark({ size = 18 }: { size?: number }) { return <Image src="/assets/icons/chromium.svg" alt="" width={size} height={size} />; }

type ChromeWindowProps = {
  window: ManagedWindow;
  workspace: Workspace;
  focused: boolean;
  address: string;
  canBack: boolean;
  canForward: boolean;
  sourceHref: string;
  tabTitle: string;
  children: ReactNode;
  onFocus: () => void;
  onMove: (frame: Rect) => void;
  onResize: (frame: Rect) => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFullscreen: () => void;
  onClose: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onAddress: (value: string) => boolean;
};

export type ChromeWindowHandle = Readonly<{ showDetails: () => void }>;

export const ChromeWindow = forwardRef<ChromeWindowHandle, ChromeWindowProps>(function ChromeWindow(props, ref) {
  const { window, workspace, focused, address, canBack, canForward, sourceHref, tabTitle, children, onFocus, onMove, onResize, onMinimize, onMaximize, onFullscreen, onClose, onBack, onForward, onReload, onAddress } = props;
  const geometry = windowFrame(window, workspace);
  const floating = window.placement.kind === "floating";
  const drag = useBoundedWindowDrag({ frame: geometry, workspace, onCommit: onMove, disabled: !floating });
  const resize = useBoundedWindowResize({ frame: geometry, workspace, onCommit: onResize, disabled: !floating });
  const frame = resize.frame === geometry ? drag.frame : resize.frame;
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [about, setAbout] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);
  const addressInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addressInput.current) addressInput.current.value = address;
  }, [address]);

  useImperativeHandle(ref, () => ({ showDetails: () => setAbout(true) }), []);

  useEffect(() => {
    if (!menu) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuButton.current?.contains(target) && !menuPanel.current?.contains(target)) setMenu(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menu]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (onAddress(addressInput.current?.value ?? address)) {
      setError("");
    } else {
      setError("Use a local glossary address or a known concept slug.");
    }
  }

  return <section className={`chrome-window ${focused ? "is-focused" : ""} ${window.placement.kind === "compact" ? "is-compact" : ""} ${window.placement.kind === "maximized" ? "is-maximized" : ""} ${window.placement.kind === "fullscreen" ? "is-fullscreen" : ""}`} style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, zIndex: (window.z ?? 1) + 20 }} aria-label="Chrome browser window" onPointerDown={onFocus} onBlurCapture={(event) => { if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) setMenu(false); }}>
    <header className="chrome-tabstrip" {...drag.dragProps} onDoubleClick={onMaximize}>
      <div className="chrome-window-buttons">
        <button type="button" title="Close" onClick={onClose} aria-label="Close Chrome"><X /></button>
        <button type="button" title="Minimize" onClick={onMinimize} aria-label="Minimize Chrome"><Minus /></button>
        <button type="button" title={window.placement.kind === "fullscreen" ? "Exit full screen" : "Enter full screen"} onClick={onFullscreen} aria-label={`${window.placement.kind === "fullscreen" ? "Exit" : "Enter"} Chrome full screen`}>{window.placement.kind === "fullscreen" ? <Minimize2 /> : <Maximize2 />}</button>
      </div>
      <button type="button" className="tab-search" aria-label="Show browser details" title="Browser details" aria-expanded={about} onClick={() => setAbout((open) => !open)}><ChevronDown /></button>
      <div className="chrome-tab"><ChromiumMark /><span>{tabTitle}</span><button type="button" title="Close tab" onClick={onClose} aria-label="Close Chromium Glossary tab"><X /></button></div>
      <div className="chrome-drag-space" aria-hidden="true" />
    </header>
    <div className="chrome-toolbar">
      <div className="chrome-nav">
        <button type="button" title="Back" disabled={!canBack} onClick={onBack} aria-label="Back"><ArrowLeft /></button>
        <button type="button" title="Forward" disabled={!canForward} onClick={onForward} aria-label="Forward"><ArrowRight /></button>
        <button type="button" title="Reload" onClick={onReload} aria-label="Reload"><RefreshCw /></button>
      </div>
      <form onSubmit={submit} className={error ? "has-error" : ""}>
        <SlidersHorizontal aria-hidden="true" />
        <label htmlFor="chrome-address" className="sr-only">Address</label>
        <input ref={addressInput} id="chrome-address" defaultValue={address} onChange={() => setError("")} onFocus={(event) => event.currentTarget.select()} onBlur={() => setError("")} aria-describedby={error ? "address-error" : undefined} />
      </form>
      <a className="chrome-source" title="Open primary source" href={sourceHref} target="_blank" rel="noreferrer" aria-label="Open primary Chromium source"><ExternalLink /></a>
      <button ref={menuButton} type="button" className="chrome-more" title="Customize and control Chromium" aria-label="Customize and control Chrome" aria-expanded={menu && focused} onClick={() => setMenu((open) => !open)}><MoreVertical /></button>
      {menu && focused && <div ref={menuPanel} className="chrome-menu"><button type="button" onClick={onReload}>Reload</button><button type="button" onClick={() => { void navigator.clipboard?.writeText(address); setMenu(false); }}>Copy address</button><button type="button" onClick={() => { setAbout(true); setMenu(false); }}>About this build</button><a href="https://chromium.googlesource.com/chromium/src/+/HEAD/docs/README.md" target="_blank" rel="noreferrer">Chromium docs</a></div>}
    </div>
    {error && <p id="address-error" className="address-error" role="alert">{error}</p>}
    {about && <div className="chrome-about"><ChromiumMark size={30} /><p><strong>Chromium, explained.</strong><br />50 concepts across 7 stages. Press ⌘K to search, double-click the title bar to zoom, and press Escape to leave full screen. Created independently by Browserbase.</p><button type="button" onClick={() => setAbout(false)} aria-label="Close browser details"><X /></button></div>}
    <div className="chrome-page">{children}</div>
    {floating && <WindowResizeHandles propsFor={resize.propsFor} />}
  </section>;
});
