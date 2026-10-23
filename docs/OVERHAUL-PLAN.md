# A hotel that has been expecting you

The owner's creative-overhaul brief authorizes autonomous design and implementation. Publication is expressly withheld: work only on `review/creative-overhaul`; do not push, merge, change Pages, or deploy. The clean dedicated checkout preserves main and all unrelated files.

## Direction

Architecture, not interface, fills the first screen. A remote reception desk sits under a cavernous coffered ceiling; repeated piers, worn stone and amber pools establish scale. The guest wing compresses into an oxblood runner and repeated doors. Service spaces are low, green and utilitarian. A shallow flooded landing holds a still architectural reflection. The unlisted floor echoes reception incorrectly. The recurring time 2:14, displaced luggage, and a prepared registration card form one restrained mystery.

Palette: nicotine plaster #b9ad88, dark walnut #453327, oxidized brass #a18b5c, oxblood carpet #542e2c, institutional green #52625a, reflected light #b8cbc0. Georgia is confined to a small opening title and inspection text; system sans-serif remains legible in controls. No downloaded fonts, photograph backgrounds, dashboard, objective markers, or decorative animation.

## Technical choice

Use a tiny original WebGL 1 renderer over the existing authored mesh format, with depth testing, spatial material noise, distance haze, static lighting and a bounded text atlas. No engine dependency or CDN. Retain the proven world/engine interfaces, collision, doors, elevating stairs, semantic exploration, preferences and optional synthesized audio. One scene mesh in GPU memory at a time; bounded backing resolution; render only after input, stop completely while idle, paused or hidden. Do not promise photorealism or seamless room streaming: thresholds intentionally transition between rooms.

Compared with expanding the software painter, WebGL fixes face-order artifacts and removes CPU polygon sorting. Compared with a full game engine, it avoids a large runtime, continuous loops and unnecessary physics. If unavailable, semantic exploration remains usable.

## Implementation sequence

- [x] Renderer worker: write and observe failing mesh/WebGL lifecycle tests, implement `js/webgl-renderer.js` and improve `js/renderer.js` geometry; keep pure geometry/projection contracts. Test bounds, finite data, caching, disposal, errors. Own renderer files and renderer tests only.
- [x] World worker: write failing architectural/story regressions, then reshape `js/world.js` into distinctive compositions without adding rooms; preserve IDs, graph and safe spawns. Make major columns collision solids; retain existing engine behavior. Own world file and new world tests only.
- [x] Main: preserve input/lifecycle and accessibility, integrate renderer, reduce opening typography, add explicit leave action, contextual support and context-loss recovery. Add failing browser regressions before behavior changes.
- [x] Main: run all logic and browser suites against the project subpath, axe selected UI states, offline/fallback and actual desktop/mobile renders. Inspect images, fix visible defects and measure CPU/heap/frame behavior. Physical phones, Safari and screen-reader hardware remain unverified.
- [x] Independent reviewer: inspect integration and identify material correctness, low-power and accessibility risks. Fix important findings with regressions.
- [x] Main: update truthful README and test notes, save visual evidence and prepare the local review branch. Commit locally and report the verified branch/SHA in the handoff. Never publish without a later explicit approval.

## Review focus

1. Near doors: depth testing must not hide traversable openings behind wall infill.
2. Stairs: physical camera elevation must follow actual step geometry and transition safely.
3. GPU unavailable/lost: clear text alternative, no blank unresponsive page.
4. Idle, pause, blur, hidden tab and sound: no background render/audio loop.
5. Narrow/mobile and keyboard: restrained title remains readable, touch controls fit, modal focus returns, leave is explicit.

## Final review decisions

The old ten-location route graph is retained to preserve working exploration; the brief’s smaller-room-count preference is not fully realized. Supporting rooms remain more spare than the principal compositions. Known software graphics now use a deliberately softer 12-fps Low power path, with separately captured optional-detail views. The actual resource and accessibility results, including hardware limits, are recorded in TESTING.md. Independent mouse-capture and GPU-cleanup findings have regression tests.

## Publication authorization update (2026-10-23)

The publication hold above records the original brief and is historical. The owner has since explicitly approved normal, non-force publication, conditional on `main` remaining at `3f5bbda5bb79059be4783be0417f0ac7c13a3b43`; a fresh fetch confirmed that base. No force-push is authorized. This approval is not evidence that publication or live verification has completed; those outcomes remain to be reported separately. The reviewed runtime commit `ae39062fddfd3bcc4d6cae8707a48e3bd9efadf5` is preserved unchanged.
