# Chromium glossary architecture

## Problem

The artifact has two jobs. It must teach exactly 50 Chromium concepts as a coherent learning path, and it must wrap that reference in a playful desktop without slowing down reading. The glossary content, browser navigation, desktop window lifecycle, and diagrams have different invariants. The architecture keeps those concerns separate while giving each one a small public interface.

## Usage

Server routes pass a serializable glossary document and an optional initial entry to one client composition boundary.

```tsx
<ChromiumGlossary document={chromiumGlossary} initialEntry={entrySlug} />
```

Content authors edit one seven-stage registry. The stages use the structure supported by the source research rather than forcing equal chapter sizes. The parser rejects missing fields, duplicate slugs, broken relationships, invalid diagrams, unsafe paths, and unsupported source domains.

```ts
export const chromiumGlossary = defineGlossary({
  chapters: [
    {
      id: "meet-the-browser",
      title: "Meet the browser",
      promise: "Learn what starts and coordinates a Chromium session.",
      entries: meetTheBrowserEntries,
    },
  ],
});
```

Reader components use a narrow catalog. They do not receive maps, search scores, or raw authoring data.

```ts
catalog.entry(slug);
catalog.query({ text, chapter });
catalog.navigation(slug);
catalog.chapters;
```

Desktop controls dispatch semantic commands to one reducer.

```ts
dispatch({ type: "app.open", app: "chromium" });
dispatch({ type: "window.minimize", app: "chromium" });
dispatch({ type: "window.close", app: "chromium" });
dispatch({ type: "icon.move", icon: "terminal", position });
```

## Shape

### Glossary document

`GlossaryDocument` is a serializable tree of stages and entries. Stage order and entry order form the primary learning path. Related-term links are authored graph edges. `defineGlossary` validates the document once. `createCatalog` derives private lookup and search indexes.

Every entry contains a slug, term, aliases, short summary, definition paragraphs, one semantic diagram, code-path references, related slugs, and primary sources. Required collections are nonempty. The current editorial contract is seven stages with exactly 50 entries. The stages cover orientation, process boundaries, URL and navigation, rendering, JavaScript scheduling, security, and observation. The parser enforces the total and the verifier enforces the approved stage order.

### Diagram grammar

The content registry supports four diagrams. `pipeline` explains ordered transformation. `boundary` explains a trust or process crossing. `hierarchy` explains ownership and containment. `cycle` explains repeating work. Entries declare labeled nodes and relationships without coordinates. One semantic SVG renderer owns layout, responsive behavior, animation, and accessible descriptions.

### Desktop state

`WindowState` is a union of `closed`, `visible`, and `minimized`. Visible and minimized windows carry z-order. Focus is derived from the highest visible z-order and is never stored separately. Repeated open, focus, minimize, restore, and close commands converge to valid states.

Pointer dragging stays local to each icon until the drag ends. The reducer receives one committed position and clamps it to the usable desktop. Double-click, keyboard activation, and touch activation all dispatch the same open command.

### Navigation

`/` is the closed desktop. `/glossary` opens Chromium to the journey index. `/glossary/[slug]` opens Chromium to a specific entry and returns useful server-rendered content. Search uses `?q=` only for discovery context. Window focus, minimization, z-order, and icon positions never enter the URL.

The composition boundary owns route synchronization. Closing Chromium returns to `/`. Minimizing preserves the current glossary URL. Restoring reveals the same location without adding history. Browser back and forward update the selected entry without changing the window lifecycle.

### Presentation

Three.js provides the ambient computer screen and depth cues. Semantic DOM controls remain above the scene for launchers, windows, glossary text, search, terminal, and diagrams. Reduced motion and missing WebGL use a static visual fallback without changing the task flow.

The early-2000s desktop uses Browserbase's light palette, crisp linework, and physical window shadows. Opening Chromium reveals a modern ChromeOS reading surface at 80 percent of the usable viewport. The window is fixed-size in v1. The desktop remains visible around it, and the taskbar restores minimized apps.

## Module map

```text
app/
  page.tsx
  glossary/page.tsx
  glossary/[slug]/page.tsx
  layout.tsx
components/
  ChromiumGlossary.tsx
  desktop/
    Desktop.tsx
    DesktopIcon.tsx
    AppWindow.tsx
    ComputerScene.tsx
    Terminal.tsx
  glossary/
    GlossaryBrowser.tsx
    JourneyIndex.tsx
    JourneyRail.tsx
    EntryArticle.tsx
    SearchPalette.tsx
    ConceptDiagram.tsx
domain/
  glossary.ts
  desktop.ts
  terminal.ts
data/
  chromium-glossary.ts
scripts/
  verify-glossary.ts
tests/
  glossary.test.ts
  desktop.test.ts
  navigation.test.ts
```

`domain/glossary.ts` owns content validation, relationship resolution, journey position, and local search. `domain/desktop.ts` owns application lifecycle and icon geometry. `domain/terminal.ts` owns the small declared command language. React components render state and translate browser events into domain commands.

## Synthesis decision

Candidate B is the base because its journey, browser layout, route behavior, taskbar, responsive plan, and progressive Three.js treatment form the stronger product experience. The researched curriculum changed its rigid ten-by-five chapter grid into seven stages with natural sizes. Candidate A supplied four grafts. The runtime catalog now exposes only entry, query, navigation, and stage reads. Focus is derived instead of duplicated. Diagram relationships allow more than a one-level hierarchy or two fixed regions. Validation returns machine-readable issues and the source verifier returns auditable counts.

The flat catalog alternative lost because it makes category ordering and previous-next traversal secondary policies. A generic desktop framework lost because three launchers do not justify plugins, persistence, or resizable windows. Freeform per-entry diagrams lost because they would repeat geometry and accessibility work 50 times. A fully Three.js interface lost because text selection, keyboard navigation, search, and narrow-screen reading belong in the DOM.

## Tradeoffs

- We accept seven uneven stages in exchange for a journey that follows Chromium's actual conceptual density.
- We accept four diagram types in exchange for one coherent visual language and one accessibility implementation.
- We accept local search rebuilt from 50 entries in exchange for no server or synchronized search artifact.
- We accept a nonresizable browser in exchange for a deliberate 80 percent composition.
- We accept ephemeral desktop positions in exchange for no persistence or stale off-screen coordinates.

## Verification contract

The build imports the validated document, so malformed content fails compilation. `verify-glossary.ts` checks exact counts, unique slugs, relationship targets, diagram endpoints, paths, and primary-source allowlists. Unit tests cover search ranking, previous-next traversal, route parsing, terminal commands, and every desktop transition. Browser verification covers launch, close, minimize, restore, search, related navigation, direct links, keyboard operation, touch behavior, reduced motion, desktop and mobile layouts, and automated accessibility.

## Next implementation step

Scaffold Next.js, implement the glossary and desktop domain contracts with tests, then fill the 50-entry registry before building the visual shell.
