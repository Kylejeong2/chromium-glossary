import { describe, expect, it } from "vitest";
import { createDesktopState, desktopReducer, focusedApp } from "../src/domain/desktop";

describe("desktop reducer", () => {
  it("starts with every app closed", () => {
    const state = createDesktopState();
    expect(Object.values(state.windows).every((window) => window.status === "closed")).toBe(true);
    expect(focusedApp(state)).toBeUndefined();
  });

  it("opens, focuses, minimizes, restores, and closes windows", () => {
    let state = createDesktopState();
    state = desktopReducer(state, { type: "app.open", app: "chromium" });
    expect(focusedApp(state)).toBe("chromium");
    state = desktopReducer(state, { type: "app.open", app: "terminal" });
    expect(focusedApp(state)).toBe("terminal");
    state = desktopReducer(state, { type: "window.focus", app: "chromium" });
    expect(focusedApp(state)).toBe("chromium");
    state = desktopReducer(state, { type: "window.minimize", app: "chromium" });
    expect(state.windows.chromium.status).toBe("minimized");
    expect(focusedApp(state)).toBe("terminal");
    state = desktopReducer(state, { type: "window.restore", app: "chromium" });
    expect(focusedApp(state)).toBe("chromium");
    state = desktopReducer(state, { type: "window.close", app: "chromium" });
    expect(state.windows.chromium.status).toBe("closed");
  });

  it("makes repeated focus idempotent and clamps icon positions", () => {
    let state = createDesktopState("chromium");
    const focused = desktopReducer(state, { type: "window.focus", app: "chromium" });
    expect(focused).toBe(state);
    state = desktopReducer(state, { type: "icon.move", icon: "trash", position: { x: -30, y: 900 }, bounds: { x: 500, y: 600 } });
    expect(state.iconPositions.trash).toEqual({ x: 0, y: 600 });
  });
});
