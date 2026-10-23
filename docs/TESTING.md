# What has been checked

The building has ten connected spaces. All are reachable without collecting clues or solving a puzzle. It uses a small software perspective renderer and ordinary HTML controls, not a game framework or a backend.

## Working controls

The automated browser checks exercise keyboard walking and turning, drag-to-look, optional captured mouse-look, pointer-lock release and denial, door opening and closing, object inspection, room changes, pause, restart, audio mute, and keyboard focus in dialogs. The semantic **Explore without aiming** controls offer another way through every room.

Touch checks use Chromium’s mobile emulation and pointer events. They exercise the movement control, separate touch-look, the interaction button opening and traversing a door, portrait and landscape layouts, minimum control heights, and prevention of unintended page scrolling. A 320-pixel-wide title view was also visually checked.

## Repeatable checks

Run `npm test` for the dependency-free world, movement, projection, geometry, renderer lifecycle, and preference-storage tests. The repository’s GitHub Actions workflow runs this command on pushes and pull requests.

For browser tests, first serve the repository locally and install Python Playwright with a Chromium browser. Set `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`. These commands also accept a deployed base URL as the final argument:

```bash
python3 tests/browser_test.py http://localhost:4173/
python3 tests/interaction_test.py http://localhost:4173/
python3 tests/performance_test.py http://localhost:4173/
```

The optional axe accessibility scans use a local development-only copy of `axe-core`. Install it with `npm install --no-save --package-lock=false axe-core`, or set `AXE_PATH` to a local `axe.min.js`. If it is missing, the scripts report the scans as skipped. This tooling is never loaded by visitors.

The browser suite also checks blocked storage, unavailable Canvas graphics, continuing exploration after the network goes offline, console errors, and failed requests. The performance suite visits every location through the actual exit controls, repeats the route, compares JavaScript heap use after garbage collection, and checks that idle and pause do not keep drawing. It records main-thread task time and moving frame counts rather than promising a frame rate on every device.

Generated logs, screenshots, and measurements are kept in the ignored `.test-artifacts/` folder; they are not runtime assets.

## What the resource controls do

Low power is the default: at most 30 scene frames per second while moving, at most 900 backing pixels wide, and at most 550,000 backing pixels in total. More detail permits up to 45 moving frames per second and 1.2 million pixels. Device pixel ratio does not multiply those limits.

There is only one requested animation frame at a time. The view stops drawing when stationary, when movement is blocked by a wall, when paused, and when the tab is hidden. Losing focus clears held keys and pauses. Optional synthesized audio is suspended while muted or paused. There are no external fonts, image downloads, analytics, remote APIs, or runtime packages.

## Limits worth knowing

This is intentionally a stylized 2.5D building, not a photorealistic physics simulation. Doorways and stair landings use deliberate scene transitions. The water is a restrained static visual treatment. There is no saved game; refreshing returns to reception. Preferences are stored locally when the browser permits it.

Tests in this environment do not substitute for real phone hardware, Safari/iOS, or a person using a screen reader. Automated accessibility scans cannot establish complete WCAG conformance. JavaScript heap measurements do not include all browser processes, Canvas backing memory, GPU memory, or the operating system. CPU timings vary with hardware, browser, and the other tests running at the same time.

## Measured release check

The final local project-subpath run used Chromium at a 1280 × 800 viewport in Low power mode. It visited all ten locations and repeated the itinerary four more times through actual room-exit buttons.

| Measurement | Observed result |
| --- | --- |
| Initial local load, including the test's network-idle wait | 791.43 ms |
| Page and local assets transferred in that run | About 92 KB |
| Mean Canvas draw time across 237 frames | 7.00 ms |
| Slowest observed draw, including cold setup | 66.10 ms |
| JavaScript heap after garbage collection, before repeated route | 2.21 MB |
| JavaScript heap after garbage collection, after repeated route | 2.94 MB |
| Heap growth over the repeated route | 0.74 MB |
| Idle main-thread task time over 2 seconds | 0.31 ms |
| Turning main-thread task time over 3 seconds | 846.44 ms |
| Scene frames during that 3-second turn | 67 (configured cap: 30 per second) |
| Backing Canvas | 900 × 562 pixels |

These are measurements from one shared Linux test environment, not guaranteed phone results. Drawing was inactive during the idle sample, and no frames were added during the separate paused sample. Audio was not enabled in the resource measurement. The renderer caches static lighting/material calculations; a before/after Canvas comparison was pixel-identical after that optimization.

The final logic suite has **26 passing tests**. Desktop/mobile and focused-interaction browser suites pass, with no uncaught JavaScript errors or failed requests in the checked desktop session. Automated axe scans on the title, exploration view, and pause dialog reported **zero violations** for their selected WCAG A/AA tags; this is not a claim of complete accessibility conformance. Independent code review found two important edge cases (pending audio resume and competing touch pointers); both were fixed with failing-then-passing regressions.

## Published and checked

The implementation was pushed to `main` as commit [`ef98136`](https://github.com/melvinvarghese/Staircase-to-Nowhere/commit/ef9813616e1d0f0b314b054abfefca6c8c1e7934), preserving the initial commit and using a fast-forward merge rather than rewriting history. GitHub Pages reported a successful build for that exact commit. The [automated repository checks](https://github.com/melvinvarghese/Staircase-to-Nowhere/actions/runs/39914508766) also succeeded.

**Live site:** <https://melvinvarghese.github.io/Staircase-to-Nowhere/>

The complete desktop/mobile browser acceptance suite was rerun against that real URL: **35 checks passed**, no uncaught JavaScript errors, no failed page requests, and no violations in the selected exploration-view and pause-dialog axe scans. The live view was also opened separately in the interactive browser; entering the building, opening its controls, and taking the accessible STAIRS route all worked. A screenshot of that published stairwell was saved as release evidence.

Local final checks: **26 logic tests, 35 desktop/mobile browser checks, 39 focused interaction checks, and 90 route/resource checks passed**. There are no known blocking issues and no hosting settings the owner must change. The real-phone, Safari/iOS, full-screen-reader, and whole-browser-memory limits above still apply.
