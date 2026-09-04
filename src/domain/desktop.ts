export type AppId = "chromium" | "terminal" | "trash";
export type Point = Readonly<{ x: number; y: number }>;
type Size = Readonly<{ width: number; height: number }>;
export type Rect = Readonly<Point & Size>;
export type Workspace = Readonly<{ viewport: Size; usable: Rect; mode: "freeform" | "compact" }>;
export type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
type WindowPlacement =
  | Readonly<{ kind: "floating"; frame: Rect }>
  | Readonly<{ kind: "maximized" | "compact"; restoreFrame: Rect }>
  | Readonly<{ kind: "fullscreen"; restoreFrame: Rect; restoreKind: "floating" | "maximized" }>;
export type ManagedWindow = Readonly<{ status: "closed" | "visible" | "minimized"; placement: WindowPlacement; z: number | null }>;
export type DesktopState = Readonly<{ workspace: Workspace; windows: Readonly<Record<AppId, ManagedWindow>>; iconPositions: Readonly<Record<AppId, Point>>; nextZ: number }>;
type DesktopIntent =
  | Readonly<{ type: "workspace.changed"; viewport: Size }>
  | Readonly<{ type: "app.open" | "window.focus" | "window.minimize" | "window.restore" | "window.close" | "window.maximize-toggle" | "window.fullscreen-toggle"; app: AppId }>
  | Readonly<{ type: "window.move"; app: AppId; frame: Rect }>
  | Readonly<{ type: "window.resize"; app: AppId; frame: Rect }>
  | Readonly<{ type: "icon.move"; app: AppId; position: Point }>;

const COMPACT_BREAKPOINT = 760;
export const TOP_BAR_HEIGHT = 30;
const DESKTOP_EDGE_INSET = 8;
const DESKTOP_DOCK_CLEARANCE = 92;
export const COMPACT_DOCK_HEIGHT = 56;

export function workspaceFor(viewport: Size): Workspace {
  const compact = viewport.width < COMPACT_BREAKPOINT || viewport.height < 560;
  return { viewport, mode: compact ? "compact" : "freeform", usable: compact
    ? { x: 0, y: TOP_BAR_HEIGHT, width: viewport.width, height: Math.max(0, viewport.height - TOP_BAR_HEIGHT - COMPACT_DOCK_HEIGHT) }
    : { x: 0, y: TOP_BAR_HEIGHT, width: viewport.width, height: Math.max(0, viewport.height - TOP_BAR_HEIGHT - DESKTOP_DOCK_CLEARANCE) } };
}

function initialFrame(app: AppId, workspace: Workspace): Rect {
  const desired = app === "chromium"
    ? { width: workspace.usable.width * .86, height: workspace.usable.height - 34 }
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

export function resizeFrame(frame: Rect, edge: ResizeEdge, delta: Point, workspace: Workspace): Rect {
  const bounds = workspace.usable;
  const minimumWidth = Math.min(320, bounds.width);
  const minimumHeight = Math.min(240, bounds.height);
  let left = frame.x;
  let right = frame.x + frame.width;
  let top = frame.y;
  let bottom = frame.y + frame.height;
  if (edge.includes("w")) left = Math.min(Math.max(bounds.x, left + delta.x), right - minimumWidth);
  if (edge.includes("e")) right = Math.max(Math.min(bounds.x + bounds.width, right + delta.x), left + minimumWidth);
  if (edge.includes("n")) top = Math.min(Math.max(bounds.y, top + delta.y), bottom - minimumHeight);
  if (edge.includes("s")) bottom = Math.max(Math.min(bounds.y + bounds.height, bottom + delta.y), top + minimumHeight);
  return { x: left, y: top, width: right - left, height: bottom - top };
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
  return { workspace, windows: { chromium: make("chromium"), terminal: make("terminal"), trash: make("trash") }, iconPositions: { chromium: { x: viewport.width - 92, y: 52 }, terminal: { x: viewport.width - 92, y: 148 }, trash: { x: viewport.width - 92, y: 244 } }, nextZ: openApp ? 2 : 1 };
}

export function focusedApp(state: DesktopState): AppId | undefined {
  let focused: AppId | undefined;
  let highestZ = -1;
  for (const app of Object.keys(state.windows) as AppId[]) {
    const window = state.windows[app];
    if (window.status === "visible" && (window.z ?? -1) > highestZ) {
      focused = app;
      highestZ = window.z ?? -1;
    }
  }
  return focused;
}

function updateWindow(state: DesktopState, app: AppId, window: ManagedWindow): DesktopState {
  return { ...state, windows: { ...state.windows, [app]: window } };
}

function sameFrame(left: Rect, right: Rect): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
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
      if (window.placement.kind === "fullscreen") return [app, { ...window, placement: { ...window.placement, restoreFrame: frame } }];
      return [app, { ...window, placement: window.placement.kind === "maximized" ? { kind: "maximized", restoreFrame: frame } : { kind: "floating", frame } }];
    })) as Record<AppId, ManagedWindow>;
    const widthDelta = workspace.viewport.width - state.workspace.viewport.width;
    const iconPositions = Object.fromEntries((Object.entries(state.iconPositions) as [AppId, Point][]).map(([app, point]) => [app, {
      x: Math.max(DESKTOP_EDGE_INSET, Math.min(workspace.viewport.width - 100, point.x + widthDelta)),
      y: Math.max(TOP_BAR_HEIGHT + 12, Math.min(workspace.viewport.height - 92, point.y)),
    }])) as Record<AppId, Point>;
    return { ...state, workspace, windows, iconPositions };
  }
  if (intent.type === "icon.move") {
    if (state.workspace.mode === "compact") return state;
    const position = { x: Math.max(DESKTOP_EDGE_INSET, Math.min(state.workspace.viewport.width - 100, intent.position.x)), y: Math.max(TOP_BAR_HEIGHT + 12, Math.min(state.workspace.viewport.height - 100, intent.position.y)) };
    if (position.x === state.iconPositions[intent.app].x && position.y === state.iconPositions[intent.app].y) return state;
    return { ...state, iconPositions: { ...state.iconPositions, [intent.app]: position } };
  }
  const current = state.windows[intent.app];
  if (intent.type === "window.close") return current.status === "closed" ? state : updateWindow(state, intent.app, { ...current, status: "closed", z: null });
  if (intent.type === "window.minimize") return current.status !== "visible" ? state : updateWindow(state, intent.app, { ...current, status: "minimized" });
  if (intent.type === "window.move" || intent.type === "window.resize") {
    if (current.status !== "visible" || current.placement.kind !== "floating" || state.workspace.mode === "compact") return state;
    const frame = clampFrame(intent.frame, state.workspace);
    if (sameFrame(frame, current.placement.frame)) return state;
    return updateWindow(state, intent.app, { ...current, placement: { kind: "floating", frame } });
  }
  if (intent.type === "window.maximize-toggle") {
    if (current.status !== "visible" || state.workspace.mode === "compact" || current.placement.kind === "fullscreen") return state;
    const placement: WindowPlacement = current.placement.kind === "maximized" ? { kind: "floating", frame: clampFrame(current.placement.restoreFrame, state.workspace) } : { kind: "maximized", restoreFrame: current.placement.kind === "floating" ? current.placement.frame : current.placement.restoreFrame };
    return updateWindow(state, intent.app, { ...current, placement });
  }
  if (intent.type === "window.fullscreen-toggle") {
    if (current.status !== "visible" || state.workspace.mode === "compact") return state;
    const placement: WindowPlacement = current.placement.kind === "fullscreen"
      ? current.placement.restoreKind === "maximized"
        ? { kind: "maximized", restoreFrame: clampFrame(current.placement.restoreFrame, state.workspace) }
        : { kind: "floating", frame: clampFrame(current.placement.restoreFrame, state.workspace) }
      : { kind: "fullscreen", restoreFrame: current.placement.kind === "floating" ? current.placement.frame : current.placement.restoreFrame, restoreKind: current.placement.kind === "maximized" ? "maximized" : "floating" };
    return updateWindow(state, intent.app, { ...current, placement });
  }
  if (intent.type === "window.focus" && (current.status !== "visible" || focusedApp(state) === intent.app)) return state;
  if (intent.type === "app.open" && current.status === "visible" && focusedApp(state) === intent.app) return state;
  const opened = { ...current, status: "visible" as const, z: state.nextZ };
  return { ...updateWindow(state, intent.app, opened), nextZ: state.nextZ + 1 };
}

export function windowFrame(window: ManagedWindow, workspace: Workspace): Rect {
  if (window.placement.kind === "fullscreen") return { x: 0, y: 0, width: workspace.viewport.width, height: workspace.viewport.height };
  if (workspace.mode === "compact" || window.placement.kind !== "floating") return workspace.usable;
  return window.placement.frame;
}
