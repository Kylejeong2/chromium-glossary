---
spec_format_version: "0.1"
title: "Chromium glossary"
artifact_type: "prd"
spec_revision: 10
author: "Kyle Jeong"
created_at: "2026-09-02T11:23:00-07:00"
updated_at: "2026-09-03T22:55:00-07:00"
applies_to:
  - path: "src/app/"
  - path: "src/components/"
  - path: "src/domain/"
  - path: "src/data/"
---

## Problem

Developers who want to understand browser internals encounter Chromium documentation as a broad engineering index. It assumes familiarity with the codebase and does not provide a compact path through the 50 concepts that make the rest of the system legible.

## Hypothesis

If Browserbase presents 50 foundational Chromium concepts as a searchable, linked learning path with diagrams and code paths, developers will open multiple related entries and use the source links to continue learning in Chromium's canonical documentation.

## Product Summary

Build a Next.js microsite that starts as a polished, macOS-inspired glass desktop. Double-clicking Chromium opens a draggable Chrome window built to current Chromium layout proportions. The window contains a curated glossary for developers learning browser internals. Each entry includes a plain-language definition, a compact diagram, representative source-tree paths, related terms, and links to primary Chromium documentation. Visitors can close the browser to return to the desktop. Functional quirks include a command-line app that uses Browserbase's voice and points visitors to the Browserbase careers page, a Trash shortcut into Chromium's garbage collector, dock feedback, and browser details that reward exploration.

## Scope

```productspec-scope
in:
  - Present exactly 50 foundational Chromium concepts in a ground-up journey from browser objects to processes, trust boundaries, navigation, document execution, rendering, and tracing.
  - Give every concept a source-reviewed lede, concise mechanism explanation, two deeper explanatory sections, a compact diagram, representative Chromium source paths, related terms, and at least one primary source link.
  - Start on an interactive macOS-inspired desktop with a 30-pixel translucent menu bar, a centered 77-pixel glass dock, Chromium, Trash, and Terminal shortcuts, draggable icons, widgets, and clear launch behavior.
  - Open the glossary in a Chrome window that occupies about 80 percent of the viewport and can be dragged, resized, zoomed, minimized, restored, focused, and placed in true full screen.
  - Match current Chrome hierarchy and source-derived proportions with a 41-pixel tab strip, 35-pixel active tab, 46-pixel toolbar, 34-pixel controls and omnibox, macOS-style left window controls, and a separate webpage region.
  - Use self-hosted Inter throughout the OS, browser frame, glossary prose, controls, and code paths. Use the existing self-hosted GT Standard Mono only for deterministic diagrams and the command-line surface.
  - Apply the Browserbase diagram system only inside custom concept diagrams. Diagram labels use self-hosted GT Standard Mono. Diagram structure uses Browserbase Grey 900 `#46639F`, construction lines use Grey 200 `#F0F4F8`, and red `#FF4500` marks only a sourced positive focus or active path. Use 1-pixel strokes, 8-pixel geometry, sharp structural boxes, and pills only for actions or live states.
  - Keep the desktop shell, Chrome frame, glossary prose and navigation, Terminal colors and layout, and official Chromium images outside the Browserbase diagram system.
  - Use source-controlled, locally served image assets with exact provenance and license notes, including a real wallpaper and the official open-source Chromium product mark. Use official Chromium diagrams only where they directly explain an entry.
  - Make the glossary webpage feel native to Google Chrome through its quiet blue interaction color, pale neutral surfaces, rounded control language, restrained dividers, and settings-page clarity without copying protected Google assets or adding another font family.
  - Ground the webpage layout in current Chromium Settings WebUI constants, including a 56-pixel content toolbar, a 266-pixel navigation rail, a 680-pixel centered card column, 8-pixel card radii, 20-pixel section padding, and 48-to-64-pixel rows.
  - Show the `Chromium glossary` product title only on the unfiltered glossary index. Stage, entry, and search pages let their current content provide the visible page title.
  - Support global search, persistent category navigation, previous and next entry navigation, direct links, keyboard use, touch use, and narrow screens.
  - Include a tabbed command-line Easter egg with command history, useful shell-like commands, Browserbase voice, and a link to the official Browserbase careers page.
  - Make the visible application, File, Edit, View, Window, and Help menus execute useful contextual actions.
  - Add restrained OS and browser quirks that respond to exploration without blocking the glossary.
  - Cite Chromium primary documentation and clearly identify the artifact as an independent Browserbase learning resource.
out:
  - Do not scrape or reproduce the full Chromium documentation tree.
  - Do not claim that the glossary is official Chromium documentation.
  - Do not add accounts, persistence, analytics, content management, or server-side search in the first version.
cut:
  - Do not implement a complete operating system simulation or functional filesystem.
  - Do not add desktop applications that do not support the glossary story or a deliberate Easter egg.
```

## Acceptance Criteria

```productspec-acceptance-criteria
- id: AC-1
  criterion: The initial route renders a coherent macOS-inspired desktop with a translucent 30-pixel menu bar, centered 77-pixel glass dock, upper-right Chromium, Terminal, and Trash shortcuts, two quiet widgets, the user-provided full-bleed Zoom Loom wallpaper, and no browser already open.
- id: AC-2
  criterion: Double-clicking the Chromium launcher opens a browser window at roughly 86 percent of the viewport, the user can drag the window without losing it beyond the usable desktop, and closing it returns the user to the desktop.
- id: AC-3
  criterion: The glossary contains exactly 50 unique entries in a validated sequence that begins with browser objects, then covers process ownership, trust boundaries, navigation, document execution, rendering, and tracing.
- id: AC-4
  criterion: Every glossary entry contains one non-repeating source-reviewed lede, two to four concise mechanism sentences, two or three distinct deeper sections with evidenced claims, at least 100 words of explanatory prose, an authored compact diagram whose nodes and relationships map to cited sources, at least one representative Chromium source path, at least one related term, and at least one working primary-source link.
- id: AC-5
  criterion: Text search always searches all 50 entries, category state remains visible and recoverable in the URL, and a user can move to related, previous, and next entries without returning to the index.
- id: AC-6
  criterion: Opening Terminal displays a tabbed, monospaced command-line interaction with history navigation, useful discovery and open commands, Browserbase's voice, and the official Browserbase careers link without using Browserbase's diagram color or layout system.
- id: AC-7
  criterion: Desktop icons can be repositioned with pointer input; floating windows can be dragged and resized within the usable desktop; Zoom, full screen, minimize, restore, and close preserve valid geometry; every launcher is keyboard reachable; and touch users can open an app without double-clicking.
- id: AC-8
  criterion: The core desktop, browser, search, navigation, resize, Zoom, full screen, close, minimize, restore, Terminal, Trash, and menubar flows work at representative desktop and mobile viewport sizes.
- id: AC-9
  criterion: Every rendered surface outside custom concept diagrams and Terminal resolves to self-hosted Inter; custom concept diagrams and Terminal use the same self-hosted GT Standard Mono so no third family is introduced; only custom diagrams use the Browserbase color and geometry contract; and primary routes pass automated accessibility checks.
- id: AC-10
  criterion: The production build succeeds and an automated content check verifies entry count, unique slugs, valid related terms, authored diagram endpoints, pattern topology, resolved claim evidence, source labels, source-tree paths, primary links, non-repeating copy, and the ban on em dashes, en dashes, curly quotes, and generic filler.
- id: AC-11
  criterion: The browser frame visibly matches Chrome's tab strip, navigation toolbar, omnibox, window controls, and webpage hierarchy; its navigation and reload controls perform the actions they claim.
- id: AC-12
  criterion: Trash behaves like a compact Finder window with selectable recovered files, Put Back, Empty Trash confirmation, recovery, and concept links; Terminal retains its commands and history; the dock gives immediate launch and focus feedback; and at least one discoverable Chrome quirk works without blocking normal navigation.
- id: AC-13
  criterion: The shipped wallpaper, Chromium mark, Inter family, GT Standard Mono family, and any source diagrams are local assets with exact upstream URL, revision or release, license, modification, and use recorded in an asset provenance file.
- id: AC-14
  criterion: At wide desktop sizes the glossary uses a grouped 260-to-272-pixel navigator and content-aware layout; at narrow or short sizes Chrome fills the usable desktop and the navigator collapses; each diagram chooses a legible composition from its own container width rather than viewport height; essential controls remain reachable; no content sits beneath system chrome; and no page has hidden horizontal scrolling.
- id: AC-15
  criterion: Every diagram declares its topology through one of eight authored patterns, preserves the declared relationships at every viewport, gives assistive technology a complete text equivalent, uses labels at least 12 CSS pixels tall, and never assigns red to a negative, blocked, unsafe, or legacy state.
- id: AC-16
  criterion: Every public content sentence and diagram relationship has a recorded primary-source reference, known rate limits remain explicit rather than counted as success, and a reviewer can trace the reviewed source revision without exposing private evidence.
- id: AC-17
  criterion: Glossary mechanism prose renders at 17 CSS pixels with at least 1.6 line height, ledes render at 19 CSS pixels or larger, interactive glossary labels render at 13 CSS pixels or larger, meaningful metadata never renders below 12 CSS pixels, and mechanism prose appears before the diagram in every entry.
- id: AC-18
  criterion: A deterministic geometry check exercises every diagram at 328, 360, 520, 680, and 840 CSS pixels and reports no overlapping nodes, clipped labels, obstructed relationships, out-of-bounds content, or loss of the authored pattern silhouette.
- id: AC-19
  criterion: The glossary webpage uses a coherent Chrome-native content aesthetic while custom diagrams remain the only Browserbase-styled surface; `Chromium glossary` appears as a visible title only on the unfiltered index and not on stage, entry, or search pages.
- id: AC-20
  criterion: The glossary webpage visibly follows the current Chromium Settings WebUI proportions and component rhythm with a 56-pixel toolbar, 266-pixel navigation rail, content no wider than 680 pixels, 8-pixel cards, 20-pixel section insets, 48-to-64-pixel list rows, Material You blue selection states, restrained elevation, and no oversized dashboard-style panels.
```

## Success Metrics

```productspec-success-metrics
- id: SM-1
  metric: glossary_entries_opened_per_session
  target: tbd
  target_status: provisional
  target_owner: Kyle Jeong
  window: within 30 days after launch
- id: SM-2
  metric: chromium_primary_source_click_through_rate
  target: tbd
  target_status: provisional
  target_owner: Kyle Jeong
  window: within 30 days after launch
```

## User Experience

The shortest critical journey is desktop arrival, Chromium launch, glossary orientation, entry selection, concept comprehension, related-term exploration, and source handoff. The desktop should reward curiosity without delaying readers who came for the reference. Chromium opens immediately after user input and uses familiar Chrome controls within a coherent macOS-inspired host. The draggable window stays recoverable. Search remains a webpage control rather than pretending to be the omnibox. Category grouping reduces scanning load while related terms keep the journey connected. Search is global. A selected category is browse context, never a hidden search filter. Each entry explains the mechanism before asking the reader to decode its diagram.

The visual hierarchy has four deliberately separate layers. The macOS-inspired host owns the translucent menu bar, centered dock, user-provided wallpaper, desktop shortcuts, widgets, and traffic-light window controls. Chrome owns the tab strip, toolbar, omnibox, browser menus, and the native visual language of the webpage controls and reading surfaces. The Chromium glossary owns the information architecture, prose, and references. Custom concept diagrams alone use the Browserbase diagram scale. They use semantic red sparingly and do not restyle the surrounding product.

## Risks

- A realistic desktop can become a loading screen. The Chromium launcher must remain obvious and keyboard reachable.
- Mixing operating-system conventions destroys credibility. The host must keep one macOS-inspired system across menu bar, dock, window controls, glass materials, shortcut treatment, and native app windows.
- A literal Chrome frame can create fake controls. Every visible navigation control must either work or appear clearly unavailable.
- Window dragging can strand content. The reducer must clamp committed positions, and narrow screens must use a fixed full-screen policy.
- Fifty entries can feel repetitive. Each page needs a distinct lede, a concise mechanism explanation, and tailored deeper sections instead of a fixed sentence template.
- A generic graph model can silently misstate relationships. Each diagram must use authored topology from an eight-pattern registry, and the renderer must never infer endpoints from array order or prose labels.
- Chromium internals change. Every entry needs primary links, and claims should avoid brittle implementation trivia when the docs do not promise it.
- Chromium and Chrome marks must not imply endorsement. The footer and About copy must state that Browserbase created the glossary independently.
- A technical font can leak into prose and controls. Scope GT Standard Mono to custom diagrams and Terminal, keep every Browserbase diagram color token beneath the custom diagram root, and verify both boundaries in computed styles.
- Larger text can expose weak fixed geometry. Diagram nodes, labels, groups, and routes must derive from measured content rather than shrinking copy or adding entry-specific coordinates.
- Short height and narrow width are different constraints. The shell may compact because of height, but diagram topology must respond to the diagram's actual inline size.
- Source pages and paths can move. Record the reviewed revision, distinguish rate limits from successful checks, and keep actionable replacements for known moved paths.
- Third-party imagery can introduce licensing and availability risk. Ship only local assets with recorded provenance and do not copy images from screenshots or search thumbnails.
