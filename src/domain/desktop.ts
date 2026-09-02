export type AppId = "chromium" | "terminal" | "trash";

export type WindowState =
  | Readonly<{ status: "closed" }>
  | Readonly<{ status: "visible"; z: number }>
  | Readonly<{ status: "minimized"; z: number }>;

export type Point = Readonly<{ x: number; y: number }>;

export type DesktopState = Readonly<{
  windows: Readonly<Record<AppId, WindowState>>;
  iconPositions: Readonly<Record<AppId, Point>>;
  nextZ: number;
}>;

export type DesktopAction =
  | Readonly<{ type: "app.open"; app: AppId }>
  | Readonly<{ type: "window.focus"; app: AppId }>
  | Readonly<{ type: "window.minimize"; app: AppId }>
  | Readonly<{ type: "window.restore"; app: AppId }>
  | Readonly<{ type: "window.close"; app: AppId }>
  | Readonly<{ type: "icon.move"; icon: AppId; position: Point; bounds: Point }>;

export const DEFAULT_ICON_POSITIONS: Record<AppId, Point> = {
  chromium: { x: 28, y: 74 },
  terminal: { x: 28, y: 184 },
  trash: { x: 28, y: 294 },
};

export function createDesktopState(openApp?: AppId): DesktopState {
  return {
    windows: {
      chromium: openApp === "chromium" ? { status: "visible", z: 1 } : { status: "closed" },
      terminal: openApp === "terminal" ? { status: "visible", z: 1 } : { status: "closed" },
      trash: openApp === "trash" ? { status: "visible", z: 1 } : { status: "closed" },
    },
    iconPositions: DEFAULT_ICON_POSITIONS,
    nextZ: openApp ? 2 : 1,
  };
}

export function focusedApp(state: DesktopState): AppId | undefined {
  return (Object.entries(state.windows) as [AppId, WindowState][])
    .filter(([, window]) => window.status === "visible")
    .sort(([, a], [, b]) => (b.status === "visible" ? b.z : 0) - (a.status === "visible" ? a.z : 0))[0]?.[0];
}

export function desktopReducer(state: DesktopState, action: DesktopAction): DesktopState {
  if (action.type === "icon.move") {
    return {
      ...state,
      iconPositions: {
        ...state.iconPositions,
        [action.icon]: {
          x: Math.max(0, Math.min(action.bounds.x, action.position.x)),
          y: Math.max(42, Math.min(action.bounds.y, action.position.y)),
        },
      },
    };
  }
  if (action.type === "window.close") {
    return { ...state, windows: { ...state.windows, [action.app]: { status: "closed" } } };
  }
  if (action.type === "window.minimize") {
    const current = state.windows[action.app];
    if (current.status !== "visible") return state;
    return { ...state, windows: { ...state.windows, [action.app]: { status: "minimized", z: current.z } } };
  }
  if (action.type === "window.restore" || action.type === "window.focus" || action.type === "app.open") {
    const current = state.windows[action.app];
    if (action.type === "window.focus" && current.status !== "visible") return state;
    if (current.status === "visible" && focusedApp(state) === action.app) return state;
    return {
      ...state,
      windows: { ...state.windows, [action.app]: { status: "visible", z: state.nextZ } },
      nextZ: state.nextZ + 1,
    };
  }
  return state;
}
