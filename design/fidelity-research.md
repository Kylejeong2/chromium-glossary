# Fidelity research notes

Research date: September 3, 2026.

This file records the external references that informed revision 9. It separates observed facts from implementation choices so future visual changes can be checked against the same sources.

## Selected host system

The host follows the user's macOS 27 simulator reference without copying its code or protected system artwork. Its wallpaper is the project owner's supplied artwork.

Observed reference measurements at 1478 by 1024:

- The translucent menu bar is 30 pixels tall and uses compact 13-pixel system typography.
- The centered dock is 77 pixels tall with 50-pixel app targets, 8-pixel gaps, 23-pixel corner radii, a warm translucent fill, a 38-pixel blur, and restrained magnification.
- Floating windows use 14-pixel corner radii, left-side 12-pixel traffic lights, soft warm shadows, and translucent title areas.
- Desktop shortcuts are about 96 pixels wide with 12-pixel white labels and warm text shadows.
- Paired weather and calendar widgets give the desktop scale before an application opens.

Reference: https://macos-27-simulator.mweinbach.chatgpt.site/

Implementation choice: preserve that anatomy with the supplied blue and orange Zoom Loom wallpaper, a 30-pixel glass menu bar, two glossary-relevant widgets, a centered 77-pixel dock, upper-right shortcuts, traffic-light controls, and warm window shadows. The Chrome webpage and Browserbase diagram boundary remain unchanged.

## Chrome frame

Chromium source supplies the browser hierarchy and dimensions. These are treated as stronger evidence than a screenshot estimate.

Observed non-touch constants:

| Element | Size |
| --- | ---: |
| Tab strip | 41 DIP |
| Active tab | 35 DIP |
| Toolbar controls | 34 DIP |
| Omnibox | 34 DIP |
| Omnibox radius | 17 DIP |
| Ordinary location-bar icon | 16 DIP |
| Trailing or page-info icon | 20 DIP |
| Toolbar interior inset | 6 DIP |
| Main browser-region radius | 8 DIP |

Current tabs are detached rounded rectangles. The active tab uses the toolbar fill and visually joins the toolbar. Inactive tabs use the frame fill. The simulated host places close, minimize, and maximize or restore controls at the left.

Primary sources:

- Chromium UX: https://www.chromium.org/user-experience/
- Toolbar: https://www.chromium.org/user-experience/toolbar/
- Omnibox: https://new.chromium.org/user-experience/omnibox/
- Layout constants: https://chromium.googlesource.com/chromium/src/+/master/chrome/browser/ui/layout_constants.cc
- Tab implementation: https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/browser/ui/views/tabs/tab_style_views.cc
- Chrome desktop redesign: https://blog.google/products-and-platforms/products/chrome/google-chrome-new-features-redesign-2023/
- Chrome address bar: https://blog.google/products-and-platforms/products/chrome/chrome-address-bar-updates/
- Chrome toolbar customization: https://support.google.com/chrome/answer/14835450?co=GENIE.Platform%3DDesktop&hl=en

Implementation choice: keep one truthful tab and only functional controls. Preserve Back, Forward, Reload, local address parsing, close, minimize, maximize or restore, build details, source handoff, and More. Omit unsupported profiles, extensions, downloads, permissions, accounts, and multi-tab UI.

## Chromium imagery

Chromium documentation explains that Google Chrome product art is separately trademarked while the open-source build ships Chromium art. The open Chromium mark is the truthful default for a Chromium-focused learning resource.

Primary sources:

- Branding distinction: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/google_chrome_branded_builds.md
- Product mark: https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/app/theme/chromium/product_logo.svg
- Chromium repository license: https://chromium.googlesource.com/chromium/src/+/HEAD/LICENSE
- Multi-process diagram: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/accessibility/browser/figures/multi_process_browser.png

Implementation choice: serve the Chromium mark locally for launchers, dock, tab, About, and webpage identity. Use the multi-process diagram only on the matching concept entry and include a factual caption, alt text, source, and provenance.

## Ryo OS

The live ryOS reference is a coherent Aqua-era simulation. Its system completeness remains useful alongside the newer macOS 27 simulator reference.

Observed strengths:

- The wallpaper is a real image rather than CSS decoration.
- Desktop objects select and launch, the dock reflects app state, windows focus and stack, and controls respond immediately.
- A fixed global bar and dock frame movable windows.
- Notifications, tooltips, and Easter eggs appear through believable operating-system affordances.

Source: https://os.ryo.lu/

Implementation choice: preserve reducer-backed window lifecycle, bounded dragging, shortcut movement, dock recovery, Terminal, Trash, and Chrome details. Use restrained dock magnification and project-owned artwork rather than copying protected system assets.

## Stagehand and Modal

Stagehand was inspected in the live site and in the supplied screenshot. Its outer frame is intentionally macOS-like, while its webpage uses a fine grid, large direct type, thin rules, technical diagrams, and dense two-column composition. Modal's GPU glossary supplies the stronger information-architecture reference with grouped navigation, durable term routes, search, related links, and previous or next traversal.

Sources:

- Stagehand: https://www.stagehand.dev/
- Modal GPU glossary: https://modal.com/gpu-glossary

Implementation choice: retain Stagehand's separation of browser chrome from webpage and Modal's grouped navigation and durable route model. The glossary webpage itself follows Chrome Settings and Chrome Material conventions through Chrome blue interactions, pale neutral surfaces, rounded controls and list rows, restrained dividers, and clear section spacing. Do not copy Stagehand green, macOS controls, its font mix, Modal's terminal palette, or proprietary Google fonts and assets.

## Typography and brand boundary

Inter Variable covers the OS, Chrome frame, glossary prose and navigation, forms, and code paths. GT Standard Mono is the second and only other family; it is scoped to custom concept diagrams and Terminal, and its generated metrics drive the diagram geometry engine.

Sources:

- Inter: https://github.com/rsms/inter

The Browserbase visual scale is confined to custom concept diagrams. Browserbase Grey 900 `#46639f` defines diagram structure, Grey 200 `#f0f4f8` defines construction lines, and red `#ff4500` marks only a sourced positive focus or active path. Terminal reuses GT Standard Mono as a functional command-line face but does not inherit Browserbase diagram colors, geometry, logo, gradient, illustration, or layout patterns.

Source: https://www.browserbase.com/

## Current Chrome WebUI

A live Google session and the current Chromium Settings sources were inspected on September 3, 2026. The Google home and results pages use restrained type, high-contrast neutral surfaces, pill search controls, compact icon actions, and a single content column. Chromium's current Settings WebUI supplies the stronger implementation constants.

Observed Settings constants:

| Element | Current value |
| --- | ---: |
| Content toolbar | 56px |
| Navigation rail | 266px |
| Centered card maximum | 680px |
| Centered card width | 96% |
| Card radius | 8px |
| Section inset | 20px |
| One-line row | 48px minimum |
| Two-line row | 64px minimum |
| Section gap | 24px |
| Primary blue | `#0b57d0` |
| Primary container | `#d3e3fd` |

Primary sources:

- Chrome Material You redesign: https://blog.google/products-and-platforms/products/chrome/google-chrome-new-features-redesign-2023/
- Settings shell: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/resources/settings/settings_ui/settings_ui.html
- Settings section: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/resources/settings/settings_page/settings_section.css
- Shared WebUI variables: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/ui/webui/resources/cr_elements/cr_shared_vars.css

Implementation choice: replace the wide editorial dashboard with the measured Settings column and component rhythm. Keep the glossary's larger reading copy where it improves comprehension, but use Chrome's width, radius, row, inset, elevation, and selection primitives. Research screenshots remain local review evidence under `/tmp/chromium-glossary-google-reference.png`, `/tmp/chromium-glossary-google-results-reference.png`, and `/tmp/chromium-glossary-official-chrome-redesign-detail.png`.

## Direct review matrix

The external Chrome review must cover:

1. Desktop arrival.
2. Chromium open on the glossary index.
3. A direct concept entry with diagram and sources.
4. Browser menu, build details, focused and invalid address states.
5. Terminal and Trash layered with active and inactive window depth.
6. Drag bounds, maximize, minimize, restore, and close.
7. Short desktop, portrait mobile, and landscape mobile.
8. Keyboard-only use, reduced motion, browser zoom, failed requests, and console errors.

The largest silhouette or hierarchy mismatch is corrected before ornamental detail is added.
