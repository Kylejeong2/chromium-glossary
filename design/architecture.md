# Chromium glossary native UI architecture

This document implements `specs/chromium-glossary.product-spec.md` revision 2. It replaces the former Browserbase visual system with Lattice OS and an integrated Chrome window.

## Product shape

The experience has four layers:

1. Next.js routes choose whether the desktop, glossary index, or a glossary entry opens first.
2. A desktop session coordinates window lifecycle, route effects, and compound app outcomes.
3. Lattice OS renders the native desktop, app launchers, dock, and bounded windows.
4. Chrome hosts the glossary application. The glossary owns search, stages, entries, diagrams, and sources.

The route and the validated glossary remain authoritative. The OS does not own glossary content. Chrome does not own concept search.

## Caller view

Routes keep one public client entry point:

```tsx
<ChromiumGlossary document={chromiumGlossary} />
<ChromiumGlossary document={chromiumGlossary} initialEntry={null} />
<ChromiumGlossary document={chromiumGlossary} initialEntry="site-isolation" />
```

The composition root sends product intents through one session:

```tsx
const session = useGlossaryDesktopSession({ document, initialEntry });

return (
  <LatticeDesktop snapshot={session.snapshot} send={session.send}>
    <ChromeWindow window={session.snapshot.desktop.windows.chromium} onIntent={session.send}>
      <GlossaryApp
        document={document}
        selectedSlug={session.snapshot.selectedSlug}
        onNavigate={(slug) => session.send({ type: "glossary.navigate", slug })}
      />
    </ChromeWindow>
  </LatticeDesktop>
);
```

The pointer controller keeps the drag preview local and commits one bounded frame:

```tsx
const drag = useBoundedWindowDrag({
  frame: window.frame,
  workspace: snapshot.desktop.workspace,
  onCommit: (frame) => send({ type: "window.move", app, frame }),
});
```

## Visual contract

Lattice OS is a fictional touch-native desktop. It borrows direct manipulation, generous hit areas, rounded app tiles, restrained translucent system material, and a centered dock from iOS and iPadOS. It does not reproduce Apple branding or the prior Browserbase design.

- The wallpaper uses CSS and SVG arcs over a quiet neutral field. The finished interface has no Three.js dependency.
- The interface uses the system sans-serif stack. Terminal and code use the system monospace stack.
- A compact status shelf shows the OS name, focused app, local time, and honest system status.
- Three launchers open Chrome, Terminal, and Trash. The dock always contains the same three apps and shows open and focused state.
- Native Terminal and Trash windows share one frame. Chrome has its own frame.
- Focus changes depth and title contrast. Content contrast does not change.
- Motion acknowledges launch, focus, minimize, restore, and dock activity. Reduced motion removes travel and overshoot.

Chrome uses one integrated frame. It has no outer native titlebar. Its tab strip includes the window controls, one real tab, and its close control. The toolbar contains Back, Forward, Reload, the omnibox, the active primary-source action, and an overflow menu. Unsupported multi-tab, profile, extension, and account features do not appear.

The web page starts below Chrome's toolbar. Its header contains the glossary title, concept search, and Chromium documentation link. Search never uses the omnibox.

## Core types

```ts
export type AppId = "chromium" | "terminal" | "trash";

export type Point = Readonly<{ x: number; y: number }>;
export type Size = Readonly<{ width: number; height: number }>;
export type Rect = Readonly<Point & Size>;

export type Workspace = Readonly<{
  viewport: Size;
  usable: Rect;
  mode: "freeform" | "compact";
}>;

export type WindowPlacement =
  | Readonly<{ kind: "floating"; frame: Rect }>
  | Readonly<{ kind: "maximized"; restoreFrame: Rect }>
  | Readonly<{ kind: "compact"; restoreFrame: Rect }>;

export type ManagedWindow = Readonly<{
  status: "closed" | "visible" | "minimized";
  placement: WindowPlacement;
  z: number | null;
}>;

export type DesktopState = Readonly<{
  workspace: Workspace;
  windows: Readonly<Record<AppId, ManagedWindow>>;
  iconPositions: Readonly<Record<AppId, Point>>;
  nextZ: number;
}>;

export type DesktopIntent =
  | Readonly<{ type: "app.open"; app: AppId }>
  | Readonly<{ type: "window.focus"; app: AppId }>
  | Readonly<{ type: "window.minimize"; app: AppId }>
  | Readonly<{ type: "window.restore"; app: AppId }>
  | Readonly<{ type: "window.close"; app: AppId }>
  | Readonly<{ type: "window.move"; app: AppId; frame: Rect }>
  | Readonly<{ type: "window.maximize-toggle"; app: AppId }>
  | Readonly<{ type: "icon.move"; app: AppId; position: Point }>
  | Readonly<{ type: "glossary.navigate"; slug?: string }>
  | Readonly<{ type: "chrome.back" | "chrome.forward" | "chrome.reload" }>
  | Readonly<{ type: "chrome.address-submit"; value: string }>
  | Readonly<{ type: "trash.explain-gc" }>;
```

The session exposes a snapshot and `send`. Pathname and viewport observations remain private adapter inputs. Query and active stage remain local to `GlossaryApp` because they do not coordinate the OS, route, or Chrome.

## Window geometry

The desktop reducer owns committed lifecycle, focus, z-order, and geometry. The drag hook owns only the transient pointer preview.

- `freeform` applies when the usable workspace can fit Chrome at a readable width.
- A floating window stays completely within `workspace.usable`.
- The titlebar or empty tab-strip region starts a drag. Controls, tabs, fields, links, and content do not.
- Pointer capture keeps one active pointer until release, cancellation, or lost capture.
- The reducer receives one final frame after a drag.
- Double-clicking a drag area toggles maximize.
- A keyboard move command uses Arrow keys, Shift with an Arrow key, Enter, and Escape.
- Repeated focus, close, minimize, and identical move intents return unchanged state when possible.
- Compact mode ignores freeform movement and renders the focused app full screen. Returning to freeform restores a constrained floating frame.
- Arbitrary resizing is out of scope.

## Chrome behavior

| Control | Behavior |
| --- | --- |
| Back | Uses observed in-app route history and waits for pathname reconciliation. |
| Forward | Uses the observed forward entry and waits for pathname reconciliation. |
| Reload | Performs a real document reload while preserving the current URL. |
| Omnibox | Displays and accepts only the glossary index, a known glossary slug, or the same local origin. Invalid input stays in place and receives an inline explanation. |
| Tab close | Closes Chrome and returns to `/`. |
| Primary source | Opens the entry's first primary source, or the Chromium docs index from glossary home. |
| Overflow | Offers only working actions such as Reload, Copy address, and Chromium docs. |

The route is the source of truth for the selected entry. The history journal exists only to tell Chrome whether Back and Forward are available. It does not override the observed route.

## App quirks

- Terminal preserves `help`, `about`, `careers`, `clear`, and `exit`. Its copy may use Browserbase's voice. Its visual system remains neutral.
- Trash explains garbage collection. Its action closes Trash, opens or restores Chrome, and navigates to `garbage-collection` as one outcome.
- The dock gives immediate launch, focus, and open-state feedback.
- Chrome, Terminal, Trash, and desktop launchers can move in freeform mode.
- No fake notifications, sound effects, games, or dead browser controls ship.

## Component map

```text
src/components/ChromiumGlossary.tsx
src/application/useGlossaryDesktopSession.ts
src/application/navigation.ts

src/components/os/LatticeDesktop.tsx
src/components/os/AppLauncher.tsx
src/components/os/NativeAppWindow.tsx
src/components/os/Dock.tsx
src/components/os/useBoundedWindowDrag.ts

src/components/chrome/ChromeWindow.tsx
src/components/chrome/ChromeTabStrip.tsx
src/components/chrome/ChromeToolbar.tsx
src/components/chrome/Omnibox.tsx

src/components/glossary/GlossaryApp.tsx
src/components/glossary/GlossaryToolbar.tsx
src/components/glossary/JourneyRail.tsx
src/components/glossary/JourneyIndex.tsx
src/components/glossary/EntryArticle.tsx
src/components/glossary/ConceptDiagram.tsx

src/components/apps/TerminalApp.tsx
src/components/apps/TrashApp.tsx
src/domain/desktop.ts
src/domain/glossary.ts
src/domain/terminal.ts
```

Small files may stay combined when splitting them adds a forwarding layer. These paths describe ownership, not a required file count.

## Removal and migration

1. Extend and test desktop geometry before replacing visible components.
2. Split Chrome from the glossary application.
3. Build the Lattice desktop, dedicated Chrome frame, and native app frame against the tested state model.
4. Move Terminal and Trash into the native frame.
5. Replace the global stylesheet and system font setup.
6. Remove `ComputerScene`, `AppWindow`, `DesktopIcon`, and `GlossaryBrowser` after callers migrate.
7. Remove Three.js, GT fonts, `/public/brand`, Browserbase visual tokens, and obsolete CSS after `rg` proves that no consumer remains.
8. Update browser tests for drag bounds, Chrome controls, quirks, compact mode, direct routes, and accessibility.

## Verification boundary

The final gate includes these checks:

- Desktop unit tests cover bounded frames, maximize and restore, compact reflow, idempotent lifecycle, and icon movement.
- Navigation tests cover public paths, local omnibox input, route history, direct loads, and invalid input.
- Playwright covers launch, search, entry navigation, window drag, minimize, restore, close, Chrome Back, Forward, Reload, Terminal, Trash, dock state, and compact mode.
- Axe checks the desktop, Chrome, one direct entry, Terminal, Trash, and open Chrome menus at desktop and mobile sizes.
- The content verifier still proves seven stages, 50 unique entries, valid relationships, required fields, source links, and all four diagram kinds.
- Live review compares the integrated frame with the dated current Chrome reference and checks the whole desktop at desktop and mobile sizes.

## Synthesis decision

Candidate B is the base. It scored 29 out of 30 against Candidate A's 26 out of 30. Candidate B won on honest Chrome controls, fully bounded geometry, one deep session interface, and explicit mobile behavior.

The synthesis adds Candidate A's keyboard window movement, injected real reload behavior, and rule that routing never waits for animation. It keeps query and stage state inside `GlossaryApp` and keeps pathname and viewport events private.

The design rejects Candidate A's duplicate session methods, permanently disabled new-tab control, exact-term omnibox shortcut, partially off-screen window policy, and extra clock interaction. It also rejects generic window variants, a multi-tab engine, state persistence, extra apps, and decorative WebGL.

## Tradeoffs

- The design uses a dedicated Chrome frame and a separate native frame to avoid double browser chrome.
- The design models one real tab and omits unsupported multi-tab controls.
- The design commits geometry once per drag to keep the reducer authoritative without making pointer movement feel delayed.
- The design supports fixed sizes and maximize, but not arbitrary resizing.
- The design uses a small observed history journal so Chrome never claims unrelated browser history.
- The design drops Three.js because the native desktop no longer needs a decorative runtime.
