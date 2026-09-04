# Chromium glossary fidelity architecture

This document implements `specs/chromium-glossary.product-spec.md` revision 9. It pairs a macOS-inspired glass desktop with a current Chrome frame and a Chrome-native Chromium glossary.

## Product shape

The experience has four boundaries:

1. Next.js routes decide whether the desktop, glossary index, or a glossary entry opens first.
2. `ChromiumGlossary` coordinates the desktop reducer, observed route history, viewport, and compound app outcomes.
3. The OS layer renders the menu bar, widgets, launchers, glass dock, native windows, and bounded pointer interaction.
4. Chrome hosts the glossary application. The glossary owns query, stages, entries, diagrams, sources, and content-aware navigation.

The route and validated glossary document remain authoritative. The OS does not own glossary content. Chrome does not own concept search. Transient browser popovers remain local to the Chrome frame.

## Caller view

Routes keep one public client entry point:

```tsx
<ChromiumGlossary document={chromiumGlossary} />
<ChromiumGlossary document={chromiumGlossary} initialEntry={null} />
<ChromiumGlossary document={chromiumGlossary} initialEntry="site-isolation" />
```

The composition root uses the reducer directly and converts UI events into domain intents:

```tsx
const [desktop, dispatch] = useReducer(
  desktopReducer,
  initialEntry !== undefined ? "chromium" : undefined,
  createDesktopState,
);

<ChromeWindow
  window={desktop.windows.chromium}
  workspace={desktop.workspace}
  onMove={(frame) => dispatch({ type: "window.move", app: "chromium", frame })}
>
  <GlossaryApp catalog={catalog} selectedSlug={initialEntry ?? undefined} />
</ChromeWindow>
```

The drag controller owns its pointer preview and commits one bounded frame:

```tsx
const drag = useBoundedWindowDrag({
  frame: windowFrame(window, workspace),
  workspace,
  onCommit: onMove,
});
```

## Three-layer visual contract

### macOS-inspired glass shell

- The user-provided blue and orange Zoom Loom wallpaper is served locally and fills the viewport with `cover` cropping.
- A fixed 30-pixel translucent menu bar places the active app and familiar menu labels at the start and honest system status at the end.
- A centered 77-pixel glass dock contains the three real apps, a decorative launchpad tile, and clear open and focus state.
- Chromium, Terminal, and Trash shortcuts occupy an upper-right desktop grid. Pointer users select with one click and launch with two; touch and keyboard users launch directly.
- Two quiet glass widgets make the empty desktop feel inhabited without introducing fake applications.
- Native windows use translucent title bars, left-side traffic-light controls, and a recoverable drag surface.

### Current Chrome in the simulated desktop

- Chrome is one client-side-decorated window. It is not wrapped in another native title bar.
- Source-derived non-touch geometry is the baseline: 41-pixel tab strip, 35-pixel active tab, 46-pixel toolbar, 34-pixel controls, and 34-pixel omnibox.
- The selected tab is a detached rounded rectangle that uses the toolbar fill and visually joins the white toolbar.
- The far-left strip owns macOS-style close, minimize, and maximize or restore controls.
- Back, Forward, Reload, Address, tab close, tab details, and More expose only states and actions they actually support.
- The official open-source Chromium mark replaces the CSS approximation.
- Browserbase red never appears in the Chrome frame. Chrome blue is reserved for native browser focus behavior.

### Chromium glossary webpage

- The webpage remains visibly separate below browser chrome.
- Its content language follows current Chrome Settings and Chrome Material conventions: Chrome blue interactions, pale `#f8fafd` and white surfaces, an exact 56-pixel content toolbar, 8-pixel cards, 20-pixel section insets, restrained elevation, and 48-to-64-pixel rows.
- A 266-pixel icon navigator is present when the Chrome content container is wide enough. It collapses based on container width, not only viewport width.
- Index, entry, and search content use the Chromium-defined 96-percent centered card rule with a 680-pixel maximum.
- Entry reading surfaces remain unpatterned and use a readable measure. Source paths, docs, related concepts, and previous or next navigation stay close to their context.
- Every entry moves from a concise lede to mechanism copy, then two or three tailored explanatory sections before the diagram. Each section is part of the validated glossary document, carries claim-level evidence, and contributes to global search.
- Browserbase Grey 900 `#46639f`, Grey 200 `#f0f4f8`, and red `#ff4500` are scoped to custom diagrams under `.concept-diagram`; red marks only a sourced positive focus or active path.
- Official Chromium diagrams appear only on semantically matching entries with alt text, caption, source, intrinsic dimensions, and a narrow-screen policy.

## Typography and assets

Self-hosted Inter Variable supplies shell labels, browser chrome, article copy, code paths, and controls. Self-hosted GT Standard Mono is scoped to `.concept-diagram` labels and `.terminal-app`; diagram labels use its generated metrics to drive deterministic geometry. Browserbase diagram colors and geometry remain confined to `.concept-diagram`.

All external assets are copied locally. `public/assets/ASSET_SOURCES.md` records the exact upstream URL, revision or release, license, modification, and use for the font, wallpaper, product mark, OS icons, and any documentation diagram. Images may not be copied from screenshots, search thumbnails, or unverified hotlinks.

## Core desktop model

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
  | Readonly<{ kind: "maximized" | "compact"; restoreFrame: Rect }>
  | Readonly<{ kind: "fullscreen"; restoreFrame: Rect; restoreKind: "floating" | "maximized" }>;

export type ManagedWindow = Readonly<{
  status: "closed" | "visible" | "minimized";
  placement: WindowPlacement;
  z: number | null;
}>;
```

The reducer remains the authority for visibility, focus, z-order, committed geometry, maximize or restore, compact reflow, and desktop shortcut positions. Browser menus, navigator disclosure, search query, and active stage are presentation state and do not enter this reducer.

## Window geometry

- The system menu bar consumes the first 30 vertical pixels.
- A 92-pixel lower band is reserved for the centered dock in freeform mode. Floating and maximized windows never cover it.
- A floating Chromium window starts at roughly 86 percent of the available viewport width and 90 percent of the usable height, centered in the dock-adjusted workspace.
- A floating frame remains completely inside `workspace.usable`.
- The empty tab-strip region or native titlebar starts a drag. Controls, tabs, fields, links, and content do not.
- Pointer capture owns one drag until release, cancellation, or lost capture. The reducer receives the bounded final frame.
- Double-clicking a valid drag surface toggles maximize.
- Compact mode applies below the shared width or height threshold, ignores freeform movement, and fills the usable area below the panel. Returning to freeform restores a clamped floating frame.
- CSS and reducer compact conditions must agree for both width and height. Arbitrary resizing remains out of scope.

## Chrome behavior

| Control | Behavior |
| --- | --- |
| Back | Moves through the observed in-app route journal when a prior route exists. |
| Forward | Moves through the journal when a forward route exists. |
| Reload | Performs a real document reload at the current route. |
| Address | Displays and accepts the glossary index, a known glossary slug, or the same local origin. Invalid input remains visible with a specific explanation. |
| Tab close | Closes Chromium and returns to `/`. |
| Tab details | Opens the existing build or About disclosure for the one real tab. |
| More | Contains only implemented actions such as Reload, Copy address, source, Chromium docs, and About. |
| Window controls | Minimize, maximize or restore, and close dispatch existing desktop intents. |

The route is authoritative for the selected entry. The local history journal only models the Back and Forward affordances for routes observed inside this simulation.

## Responsive policy

### Wide desktop

- The 30-pixel menu bar, centered 77-pixel dock, shortcuts, widgets, and floating windows remain visible.
- Chrome opens below the menu bar and above the dock with enough wallpaper visible to preserve the OS premise.
- The glossary uses its grouped navigator and one centered Settings-style content column.

### Constrained window

- Container queries respond to the draggable Chrome window's content width.
- The grouped navigator collapses before it starves the article.
- Entry references remain in the centered single-column reading flow.

### Compact or short viewport

- Any opened app fills the usable area below the 30-pixel menu bar and above the compact dock. The floating-window fiction and outer shadow disappear.
- Essential Chrome controls remain visible with 40-to-44-pixel targets; nonessential actions move into More.
- The glossary navigator becomes a real disclosure surface, the article is single-column, and diagrams scroll only when semantic labels cannot collapse safely.
- Desktop touch launch remains one tap. No content is hidden under the panel or dock.

## App quirks

- Terminal supports shell-like discovery, command history, glossary and docs opening, Browserbase careers, clear, and exit. It uses GT Standard Mono as a functional command-line face while keeping host-neutral colors and layout.
- Trash explains garbage collection. Its action closes Trash, opens or restores Chromium, and navigates to `garbage-collection` as one outcome.
- Dock state immediately reflects closed, open, minimized, and focused applications.
- The existing Chrome details or About interaction remains the contained browser quirk.
- Broader launcher, window tiling, sound, and notification simulations remain deferred until the core fidelity contract is proven.

## Component map

```text
src/components/ChromiumGlossary.tsx
src/application/navigation.ts

src/components/os/Desktop.tsx
src/components/os/AppLauncher.tsx
src/components/os/NativeAppWindow.tsx
src/components/os/Dock.tsx
src/components/os/useBoundedWindowDrag.ts

src/components/chrome/ChromeWindow.tsx

src/components/glossary/GlossaryApp.tsx
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

Filenames describe current ownership. Legacy Lattice naming has been removed.

## Entry content contract

`GlossaryEntry` keeps one lede, two to four mechanism claims, and two or three deeper sections. A deeper section has a unique ID, a descriptive title, and two or three independently evidenced claims. Runtime validation rejects missing evidence, repeated claims, repeated section titles, forbidden punctuation, and entries with fewer than 100 words of explanatory prose. The search catalog indexes the deeper titles and claims alongside the term, aliases, lede, mechanism copy, and code paths.

The article renders all prose in one continuous Chrome-native reading surface before the diagram. This preserves the scan-friendly progression used by strong technical glossaries without copying another site's visual identity or prose.

## Migration order

1. Record reference and asset provenance, then update the spec and architecture.
2. Import the self-hosted font, wallpaper, Chromium mark, OS icons, and any semantic diagram.
3. Replace the desktop silhouette and update reducer geometry with its tests.
4. Rebuild Chrome against the exact source-derived hierarchy while preserving every action and accessible name.
5. Restyle the glossary with grouped navigation, restrained grid use, readable type, and semantic imagery.
6. Align container and viewport behavior at wide, narrow, short, and touch sizes.
7. Remove legacy Lattice selectors, CSS logos, font stacks, fake glyphs, unused assets, and dead branches after callers migrate.

## Verification boundary

- Unit tests cover bounded frames, left-dock and top-panel geometry, maximize or restore, compact reflow, lifecycle idempotence, and icon movement.
- Navigation tests cover public paths, local address input, route history, direct loads, and invalid input.
- Structural browser tests prove the 30-pixel menu bar, centered 77-pixel dock, 41-pixel tab strip, 34-pixel omnibox, left-side traffic-light controls, locally loaded assets, and the absence of the CSS-built logo.
- Computed-style sampling proves prose, controls, and chrome use Inter; `.concept-diagram` and `.terminal-app` use GT Standard Mono; and only `.concept-diagram` receives the Browserbase diagram scale.
- Playwright covers launch, search, entry navigation, dragging and bounds, minimize, restore, close, Back, Forward, Reload, Terminal, Trash, dock state, responsive navigation, and accessibility.
- Asset verification proves every shipped external asset has a provenance record and loads locally.
- Live external Chrome review compares desktop arrival, Chromium index, entry and diagram, browser menus and errors, layered native windows, short desktop, mobile portrait, mobile landscape, keyboard, zoom, and reduced motion.

Build output and automated tests are necessary but do not prove visual fidelity. The completion gate is the actual Chrome render and a requirement-by-requirement evidence audit.

## Synthesis decision

The selected direction now follows the user's macOS 27 simulator reference for the host environment, using its measured menu-bar, dock, window-radius, and traffic-light proportions with the user-provided Zoom Loom wallpaper. Chromium's browser constants, the grouped navigator, container-aware collapse, semantic image policy, asset provenance, and truthful-browser rule remain intact.

The design rejects the Plasma bottom panel, OS-level Browserbase red, an early Activities or calendar feature, a glossary rebrand, macOS controls, decorative WebGL, a second native wrapper around Chrome, unsupported multi-tab UI, persistent fake system instructions, and grids under long-form reading text.
