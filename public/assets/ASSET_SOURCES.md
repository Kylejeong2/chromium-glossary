# Asset sources

All bundled visual and font assets are stored locally. Nothing is hotlinked at runtime.

## Chromium product mark

- File: `icons/chromium.svg`
- Source: https://chromium.googlesource.com/chromium/src/+/abd9d1f0c4939a34e7b6e7b378b565c42c7222f5/chrome/app/theme/chromium/product_logo.svg
- Revision: `abd9d1f0c4939a34e7b6e7b378b565c42c7222f5`
- License: Chromium BSD-style license, https://chromium.googlesource.com/chromium/src/+/abd9d1f0c4939a34e7b6e7b378b565c42c7222f5/LICENSE
- Modification: none
- Use: Chromium launchers, dock, browser frame, and glossary identity

## Yaru application icons

- Files: `icons/terminal.png`, `icons/trash.png`
- Terminal source: https://github.com/ubuntu/yaru/blob/2c466d8f420b343cf71183cf1ce83a90ceedcb6b/icons/Yaru/256x256/apps/terminal-app.png
- Trash source: https://github.com/ubuntu/yaru/blob/2c466d8f420b343cf71183cf1ce83a90ceedcb6b/icons/Yaru/256x256/places/user-trash.png
- Revision: `2c466d8f420b343cf71183cf1ce83a90ceedcb6b`
- License: Creative Commons Attribution-ShareAlike 4.0, https://github.com/ubuntu/yaru/blob/2c466d8f420b343cf71183cf1ce83a90ceedcb6b/COPYING
- Copyright: Yaru contributors and Canonical Ltd.
- Modification: none. The terminal alias resolves upstream to `terminal-app.png`; this repository stores the resolved PNG.
- Use: desktop launchers, dock, and native application context

## Zoom Loom wallpaper

- File: `wallpapers/zoom-loom-05.jpg`
- Source: User-provided file `zoom_loom_05.png`
- Release: `2026-09-03 user-provided project asset`
- Creator: supplied by the repository owner
- License: User-provided project asset
- Modification: resized from 5760 by 3315 pixels to a maximum dimension of 2880 pixels and converted from PNG to JPEG at quality 90 for faster delivery
- Use: full-bleed simulated desktop wallpaper

## Inter Variable

- File: `fonts/InterVariable.woff2`
- Source: https://github.com/rsms/inter/blob/353b61b9f4430d5f420d56605a6e7993e0941470/docs/font-files/InterVariable.woff2
- Revision: `353b61b9f4430d5f420d56605a6e7993e0941470`
- Creator: Rasmus Andersson and contributors
- License: SIL Open Font License 1.1, https://github.com/rsms/inter/blob/353b61b9f4430d5f420d56605a6e7993e0941470/LICENSE.txt
- Modification: none
- Use: rendered font family across the OS, Chrome frame, glossary prose, and controls

## GT Standard Mono

- File: `fonts/GT-Standard-Mono-Regular.otf`
- Source: https://www.grillitype.com/typeface/gt-standard
- Release: `Browserbase licensed brand asset snapshot, 2026-09-03`
- Creator: Grilli Type
- License: Browserbase commercial font license; do not redistribute outside licensed Browserbase properties
- Modification: none
- Use: measured labels inside `.concept-diagram` and the Terminal command-line surface
