---
spec_format_version: "0.1"
title: "Chromium glossary"
artifact_type: "prd"
spec_revision: 2
author: "Kyle Jeong"
created_at: "2026-09-02T11:23:00-07:00"
updated_at: "2026-09-02T14:24:00-07:00"
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

Build a Next.js microsite that starts as a polished native operating system inspired by iOS. Double-clicking Chrome opens a draggable browser window that matches Chrome's tab strip, navigation toolbar, omnibox, controls, and content hierarchy. The window contains a curated glossary for developers learning browser internals. Each entry includes a plain-language definition, a compact diagram, representative source-tree paths, related terms, and links to primary Chromium documentation. Visitors can close the browser to return to the desktop. Functional quirks include a command-line app that uses Browserbase's voice and points visitors to the Browserbase careers page, a Trash shortcut into Chromium's garbage collector, dock feedback, and browser details that reward exploration.

## Scope

```productspec-scope
in:
  - Present exactly 50 foundational Chromium concepts grouped into a conceptual learning journey.
  - Give every concept a definition, compact diagram, representative Chromium source paths, related terms, and at least one primary source link.
  - Start on an interactive native desktop inspired by iOS, with Chrome, Trash, and command-line launchers, draggable icons, and clear launch behavior.
  - Open the glossary in a Chrome window that occupies about 80 percent of the viewport and can be dragged, closed, minimized, restored, and focused.
  - Match Chrome's visible browser hierarchy with a tab strip, navigation controls, omnibox, toolbar actions, and a separate webpage region.
  - Remove Browserbase brand assets, fonts, colors, and visual patterns. Browserbase voice may shape product copy.
  - Support search, category navigation, previous and next entry navigation, direct links, keyboard use, touch use, and narrow screens.
  - Include a command-line Easter egg with Browserbase voice and a link to the official Browserbase careers page.
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
  criterion: The initial route renders a polished native desktop inspired by iOS, with Chrome, Terminal, and Trash launchers and no browser already open.
- id: AC-2
  criterion: Double-clicking the Chrome launcher opens a browser window at roughly 80 percent of the viewport, the user can drag the window without losing it beyond the usable desktop, and closing it returns the user to the desktop.
- id: AC-3
  criterion: The glossary contains exactly 50 unique entries organized into a conceptual learning journey.
- id: AC-4
  criterion: Every glossary entry contains a plain-language definition, a compact labeled diagram, at least one representative Chromium source path, at least one related term, and at least one working primary-source link.
- id: AC-5
  criterion: A user can find an entry through text search or category navigation and move to related, previous, and next entries without returning to the index.
- id: AC-6
  criterion: Opening Terminal displays a command-line interaction written in Browserbase's voice and offers the official Browserbase careers link without using Browserbase's visual system.
- id: AC-7
  criterion: Desktop icons can be repositioned with pointer input, desktop windows can be dragged from their title areas, every launcher is keyboard reachable, and touch users can open an app without double-clicking.
- id: AC-8
  criterion: The core desktop, browser, search, navigation, close, minimize, restore, and terminal flows work at representative desktop and mobile viewport sizes.
- id: AC-9
  criterion: The interface contains no Browserbase brand assets, fonts, colors, or brand-derived visual patterns; uses no more than two system font families; and passes automated accessibility checks for the primary routes.
- id: AC-10
  criterion: The production build succeeds and an automated content check verifies entry count, unique slugs, valid relationships, source links, and required content fields.
- id: AC-11
  criterion: The browser frame visibly matches Chrome's tab strip, navigation toolbar, omnibox, window controls, and webpage hierarchy; its navigation and reload controls perform the actions they claim.
- id: AC-12
  criterion: Trash opens the garbage-collection concept, Terminal retains its commands, the dock gives immediate launch and focus feedback, and at least one discoverable Chrome quirk works without blocking normal navigation.
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

The shortest critical journey is desktop arrival, Chrome launch, glossary orientation, entry selection, concept comprehension, related-term exploration, and source handoff. The native desktop should reward curiosity without delaying readers who came for the reference. Chrome opens immediately after user input and uses familiar controls. The draggable window stays recoverable. Search remains a webpage control rather than pretending to be the omnibox. Category grouping reduces scanning load while related terms keep the journey connected.

## Risks

- A realistic desktop can become a loading screen. The Chrome launcher must remain obvious and keyboard reachable.
- A literal Chrome frame can create fake controls. Every visible navigation control must either work or appear clearly unavailable.
- Window dragging can strand content. The reducer must clamp committed positions, and narrow screens must use a fixed full-screen policy.
- Fifty entries can feel repetitive. Diagrams should use a small grammar of process, boundary, hierarchy, and pipeline shapes tied to each concept.
- Chromium internals change. Every entry needs primary links, and claims should avoid brittle implementation trivia when the docs do not promise it.
- Chromium and Chrome marks must not imply endorsement. The footer and About copy must state that Browserbase created the glossary independently.
