import { describe, expect, it } from "vitest";
import { COMPACT_DOCK_HEIGHT, TOP_BAR_HEIGHT, clampFrame, createDesktopState, desktopReducer, focusedApp, windowFrame, workspaceFor } from "../src/domain/desktop";

describe("desktop reducer", () => {
  it("starts every app closed in a freeform workspace", () => {
    const state = createDesktopState();
    expect(state.workspace.mode).toBe("freeform");
    expect(Object.values(state.windows).every((window) => window.status === "closed")).toBe(true);
    expect(focusedApp(state)).toBeUndefined();
  });

  it("uses the strict compact width boundary", () => {
    expect(workspaceFor({ width: 759, height: 700 }).mode).toBe("compact");
    expect(workspaceFor({ width: 760, height: 700 }).mode).toBe("freeform");
    expect(workspaceFor({ width: 1200, height: 559 }).mode).toBe("compact");
    expect(workspaceFor({ width: 1200, height: 560 }).mode).toBe("freeform");
  });

  it("opens, focuses, minimizes, restores, and closes idempotently", () => {
    let state = createDesktopState();
    state = desktopReducer(state, { type: "app.open", app: "chromium" });
    state = desktopReducer(state, { type: "app.open", app: "terminal" });
    expect(focusedApp(state)).toBe("terminal");
    state = desktopReducer(state, { type: "window.focus", app: "chromium" });
    expect(desktopReducer(state, { type: "window.focus", app: "chromium" })).toBe(state);
    state = desktopReducer(state, { type: "window.minimize", app: "chromium" });
    expect(state.windows.chromium.status).toBe("minimized");
    state = desktopReducer(state, { type: "window.restore", app: "chromium" });
    expect(focusedApp(state)).toBe("chromium");
    state = desktopReducer(state, { type: "window.close", app: "chromium" });
    expect(state.windows.chromium.status).toBe("closed");
    expect(desktopReducer(state, { type: "window.close", app: "chromium" })).toBe(state);
  });

  it("fully bounds window and icon commits", () => {
    const workspace = workspaceFor({ width: 1200, height: 800 });
    expect(clampFrame({ x: -500, y: 999, width: 900, height: 600 }, workspace)).toEqual({ x: 0, y: 108, width: 900, height: 600 });
    let state = createDesktopState("chromium", { width: 1200, height: 800 });
    state = desktopReducer(state, { type: "window.move", app: "chromium", frame: { x: -100, y: -100, width: 800, height: 500 } });
    expect(windowFrame(state.windows.chromium, state.workspace)).toMatchObject({ x: 0, y: 30 });
    state = desktopReducer(state, { type: "icon.move", app: "trash", position: { x: -30, y: 900 } });
    expect(state.iconPositions.trash).toEqual({ x: 8, y: 700 });
  });

  it("maximizes, restores, and reflows compact without losing the restore frame", () => {
    let state = createDesktopState("chromium", { width: 1200, height: 800 });
    const floating = state.windows.chromium.placement;
    state = desktopReducer(state, { type: "window.maximize-toggle", app: "chromium" });
    expect(state.windows.chromium.placement.kind).toBe("maximized");
    expect(windowFrame(state.windows.chromium, state.workspace)).toEqual(state.workspace.usable);
    state = desktopReducer(state, { type: "window.maximize-toggle", app: "chromium" });
    expect(state.windows.chromium.placement).toEqual(floating);
    state = desktopReducer(state, { type: "workspace.changed", viewport: { width: 390, height: 844 } });
    expect(state.workspace.mode).toBe("compact");
    expect(state.workspace.usable).toEqual({ x: 0, y: TOP_BAR_HEIGHT, width: 390, height: 844 - TOP_BAR_HEIGHT - COMPACT_DOCK_HEIGHT });
    expect(state.windows.chromium.placement.kind).toBe("compact");
    expect(windowFrame(state.windows.chromium, state.workspace)).toEqual(state.workspace.usable);
    expect(desktopReducer(state, { type: "window.move", app: "chromium", frame: { x: 30, y: 30, width: 320, height: 400 } })).toBe(state);
    state = desktopReducer(state, { type: "workspace.changed", viewport: { width: 1200, height: 800 } });
    expect(state.windows.chromium.placement.kind).toBe("floating");
  });
});
