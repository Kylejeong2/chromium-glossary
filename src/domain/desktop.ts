export type AppId = "chromium" | "terminal" | "trash";
export type Point = Readonly<{ x: number; y: number }>;
export type Size = Readonly<{ width: number; height: number }>;
export type Rect = Readonly<Point & Size>;
export type Workspace = Readonly<{ viewport: Size; usable: Rect; mode: "freeform" | "compact" }>;
export type WindowPlacement = Readonly<{ kind: "floating"; frame: Rect }> | Readonly<{ kind: "maximized" | "compact"; restoreFrame: Rect }>;
export type ManagedWindow = Readonly<{ status: "closed" | "visible" | "minimized"; placement: WindowPlacement; z: number | null }>;
export type DesktopState = Readonly<{ workspace: Workspace; windows: Readonly<Record<AppId, ManagedWindow>>; iconPositions: Readonly<Record<AppId, Point>>; nextZ: number }>;
export type DesktopIntent =
  | Readonly<{ type: "workspace.changed"; viewport: Size }>
  | Readonly<{ type: "app.open" | "window.focus" | "window.minimize" | "window.restore" | "window.close" | "window.maximize-toggle"; app: AppId }>
  | Readonly<{ type: "window.move"; app: AppId; frame: Rect }>
  | Readonly<{ type: "icon.move"; app: AppId; position: Point }>;

export const COMPACT_BREAKPOINT = 700;
const SHELF_HEIGHT = 42;
const DOCK_RESERVE = 94;

export function workspaceFor(viewport: Size): Workspace {
  const compact = viewport.width < COMPACT_BREAKPOINT || viewport.height < 560;
  return { viewport, mode: compact ? "compact" : "freeform", usable: compact
    ? { x: 0, y: SHELF_HEIGHT, width: viewport.width, height: Math.max(0, viewport.height - SHELF_HEIGHT) }
    : { x: 12, y: SHELF_HEIGHT + 10, width: Math.max(0, viewport.width - 24), height: Math.max(0, viewport.height - SHELF_HEIGHT - DOCK_RESERVE) } };
}

function initialFrame(app: AppId, workspace: Workspace): Rect {
  const desired = app === "chromium"
    ? { width: Math.min(1280, workspace.usable.width * .84), height: workspace.usable.height * .9 }
    : app === "terminal"
      ? { width: Math.min(660, workspace.usable.width * .68), height: Math.min(460, workspace.usable.height * .72) }
      : { width: Math.min(480, workspace.usable.width * .5), height: Math.min(400, workspace.usable.height * .66) };
  return clampFrame({ x: workspace.usable.x + (workspace.usable.width - desired.width) / 2 + (app === "terminal" ? 28 : app === "trash" ? 54 : 0), y: workspace.usable.y + (workspace.usable.height - desired.height) / 2 + (app === "terminal" ? 18 : app === "trash" ? 32 : 0), ...desired }, workspace);
}

export function clampFrame(frame: Rect, workspace: Workspace): Rect {
  const width = Math.min(Math.max(320, frame.width), workspace.usable.width);
  const height = Math.min(Math.max(240, frame.height), workspace.usable.height);
  return { x: Math.min(Math.max(frame.x, workspace.usable.x), workspace.usable.x + workspace.usable.width - width), y: Math.min(Math.max(frame.y, workspace.usable.y), workspace.usable.y + workspace.usable.height - height), width, height };
}

function placementFor(app: AppId, workspace: Workspace): WindowPlacement {
  const frame = clampFrame(initialFrame(app, workspace), workspace);
  return workspace.mode === "compact" ? { kind: "compact", restoreFrame: frame } : { kind: "floating", frame };
}

function reflowFrame(frame: Rect, from: Workspace, to: Workspace): Rect {
  const scaleX = to.usable.width / Math.max(1, from.usable.width);
  const scaleY = to.usable.height / Math.max(1, from.usable.height);
  return clampFrame({
    x: to.usable.x + (frame.x - from.usable.x) * scaleX,
    y: to.usable.y + (frame.y - from.usable.y) * scaleY,
    width: frame.width * scaleX,
    height: frame.height * scaleY,
  }, to);
}

export function createDesktopState(openApp?: AppId, viewport: Size = { width: 1280, height: 800 }): DesktopState {
  const workspace = workspaceFor(viewport);
  const make = (app: AppId): ManagedWindow => ({ status: openApp === app ? "visible" : "closed", placement: placementFor(app, workspace), z: openApp === app ? 1 : null });
  return { workspace, windows: { chromium: make("chromium"), terminal: make("terminal"), trash: make("trash") }, iconPositions: { chromium: { x: 30, y: 92 }, terminal: { x: 30, y: 210 }, trash: { x: 30, y: 328 } }, nextZ: openApp ? 2 : 1 };
}

export function focusedApp(state: DesktopState): AppId | undefined {
  return (Object.entries(state.windows) as [AppId, ManagedWindow][]).filter(([, window]) => window.status === "visible").sort(([, a], [, b]) => (b.z ?? 0) - (a.z ?? 0))[0]?.[0];
}

function updateWindow(state: DesktopState, app: AppId, window: ManagedWindow): DesktopState {
  return { ...state, windows: { ...state.windows, [app]: window } };
}

export function desktopReducer(state: DesktopState, intent: DesktopIntent): DesktopState {
  if (intent.type === "workspace.changed") {
    const workspace = workspaceFor(intent.viewport);
    if (workspace.viewport.width === state.workspace.viewport.width && workspace.viewport.height === state.workspace.viewport.height) return state;
    const windows = Object.fromEntries((Object.entries(state.windows) as [AppId, ManagedWindow][]).map(([app, window]) => {
      const oldFrame = window.placement.kind === "floating" ? window.placement.frame : window.placement.restoreFrame;
      if (workspace.mode === "compact") return [app, { ...window, placement: { kind: "compact", restoreFrame: oldFrame } }];
      if (state.workspace.mode === "compact") return [app, { ...window, placement: { kind: "floating", frame: clampFrame(oldFrame, workspace) } }];
      const frame = reflowFrame(oldFrame, state.workspace, workspace);
      return [app, { ...window, placement: window.placement.kind === "maximized" ? { kind: "maximized", restoreFrame: frame } : { kind: "floating", frame } }];
    })) as Record<AppId, ManagedWindow>;
    return { ...state, workspace, windows };
  }
  if (intent.type === "icon.move") {
    if (state.workspace.mode === "compact") return state;
    const position = { x: Math.max(12, Math.min(state.workspace.viewport.width - 92, intent.position.x)), y: Math.max(SHELF_HEIGHT + 12, Math.min(state.workspace.viewport.height - 164, intent.position.y)) };
    if (position.x === state.iconPositions[intent.app].x && position.y === state.iconPositions[intent.app].y) return state;
    return { ...state, iconPositions: { ...state.iconPositions, [intent.app]: position } };
  }
  const current = state.windows[intent.app];
  if (intent.type === "window.close") return current.status === "closed" ? state : updateWindow(state, intent.app, { ...current, status: "closed", z: null });
  if (intent.type === "window.minimize") return current.status !== "visible" ? state : updateWindow(state, intent.app, { ...current, status: "minimized" });
  if (intent.type === "window.move") {
    if (current.status !== "visible" || current.placement.kind !== "floating" || state.workspace.mode === "compact") return state;
    const frame = clampFrame(intent.frame, state.workspace);
    if (JSON.stringify(frame) === JSON.stringify(current.placement.frame)) return state;
    return updateWindow(state, intent.app, { ...current, placement: { kind: "floating", frame } });
  }
  if (intent.type === "window.maximize-toggle") {
    if (current.status !== "visible" || state.workspace.mode === "compact") return state;
    const placement: WindowPlacement = current.placement.kind === "maximized" ? { kind: "floating", frame: clampFrame(current.placement.restoreFrame, state.workspace) } : { kind: "maximized", restoreFrame: current.placement.kind === "floating" ? current.placement.frame : current.placement.restoreFrame };
    return updateWindow(state, intent.app, { ...current, placement });
  }
  if (intent.type === "window.focus" && (current.status !== "visible" || focusedApp(state) === intent.app)) return state;
  if (intent.type === "app.open" && current.status === "visible" && focusedApp(state) === intent.app) return state;
  const opened = { ...current, status: "visible" as const, z: state.nextZ };
  return { ...updateWindow(state, intent.app, opened), nextZ: state.nextZ + 1 };
}

export function windowFrame(window: ManagedWindow, workspace: Workspace): Rect {
  if (workspace.mode === "compact" || window.placement.kind !== "floating") return workspace.usable;
  return window.placement.frame;
}
