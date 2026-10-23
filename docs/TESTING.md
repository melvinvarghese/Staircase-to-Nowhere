# What has actually been checked

The results below document the **local review build** at the time these checks were run. The new native WebGL view was served under a GitHub Pages-style project subpath. At the time of inspection, the existing live site showed its original release; that observation is historical and is not a current live check.

## Final checks

| Check | Result |
| --- | --- |
| Dependency-free Node logic and geometry tests | 49 passed |
| Desktop/mobile browser acceptance checks | 36 passed |
| Focused keyboard, door, pointer, touch, audio and focus checks | 40 passed |
| Leave, comfort defaults, unavailable graphics, actual GPU loss/restoration and mouse-capture checks | 17 passed |
| All-room routes, repeated visits, WebGL errors and resource checks | 102 passed |
| Screenshot capture through real UI routes | 17 Low power + 17 More detail images; no captured script or WebGL errors |
| Selected axe scans of invitation, exploration and pause controls | Zero violations in the selected rules |
| Whitespace/error check | `git diff --check` passed |

The browser checks cover actual walking and interaction, not only direct state changes. They include touch movement and look, denied mouse capture, blocked storage, offline-after-load use, reduced motion, modal focus, pause and restart. The lifecycle tests deliberately lose and restore a real WebGL context, including loss while the mouse is captured. When graphics cannot start, the entrance explains the text alternative; all rooms remain navigable without aiming.

Independent interaction review identified captured mouse input persisting after graphics loss. Independent renderer review identified failed reflection targets being cached as ready and a vertex-shader leak on fragment compilation failure. All three were fixed with failing-then-passing regressions. Visual review also corrected occluded door openings, side-wall labels, floor materials, a false flood stripe, stair arrival angles, mounted props and an unsupported telephone.

## Measured low-power sample

The final resource run used Chromium on Linux at a 1280 × 800 viewport. This machine provides **SwiftShader software WebGL, not a physical accelerated GPU**. Low power automatically selected a smaller 473 × 295 backing view and a 12-frame ceiling. Every location was visited through real exit buttons; the itinerary was then repeated four times.

| Measurement | Observed result |
| --- | --- |
| Page and local assets transferred | 123,752 bytes, about 124 KB |
| Initial local load, including the test's network-idle wait | 823.34 ms |
| JavaScript heap after collection, before repeated route | 2,162,800 bytes |
| JavaScript heap after collection, after repeated route | 3,299,620 bytes |
| Heap growth across repeated visits | 1,136,820 bytes |
| Added scene frames over 2 stationary seconds | 0 |
| Idle main-thread task time over 2 seconds | 0.26 ms |
| Main-thread task time during a continuous turn | 590.13 ms over a 3,009.43 ms sample |
| Frames in that turn sample | 31, below the 12-per-second ceiling |
| Added paused scene frames | 0 |
| Last room's vertex buffer | 194,880 bytes; not total GPU memory |
| External asset requests or uncaught script errors | None |

The earlier unrestricted software path was too processor-heavy. Reusing one tiny material texture helped, but a smaller software-only resolution and frame budget were necessary. The final processor sample is still real work, not zero-cost rendering. The deliberately softer Low power view is included in the review evidence rather than hidden behind higher-detail screenshots.

The reported draw duration averages 3.34 ms, but that measures JavaScript/GL submission, **not completed GPU work or guaranteed frame time**. Heap figures exclude other browser processes, graphics surfaces, driver/GPU memory and the operating system. Main-thread task time is not a whole-device CPU or battery measurement. Audio was off during the resource sample.

## Resource limits

Normal Low power has ceilings of 30 moving frames per second, 900 backing pixels wide and 550,000 pixels in area. Recognized software drivers use stricter ceilings: 12 frames, 480 pixels wide and 140,000 pixels in area. The controls explain this mode. More detail is an explicit opt-in, with ceilings of 45 frames, 1,400 pixels wide and 1.2 million pixels. Device pixel ratio does not multiply these limits.

Drawing stops while stationary, blocked by a wall, paused, hidden or left. The idle test waits for the last input-requested frame to settle before starting its sample; it also requires the animation callback to become inactive. Geometry, label atlases and reflection buffers are replaced instead of accumulating across visits. A fixed 64 × 64 material texture is shared until disposal. The flooded room alone uses an extra bounded reflection pass, reduced further in software Low power.

## Repeat the checks

Only developer tooling is needed for tests; none is loaded by visitors. Run a static HTTP server, then:

```bash
npm test
python3 tests/browser_test.py http://localhost:4173/
python3 tests/interaction_test.py http://localhost:4173/
python3 tests/overhaul_test.py http://localhost:4173/
python3 tests/performance_test.py http://localhost:4173/
python3 tests/visual_test.py http://localhost:4173/
python3 tests/visual_test.py http://localhost:4173/ high
```

Browser scripts need Python Playwright and Chromium. Set `CHROMIUM_PATH` if necessary. They enable software WebGL for this GPU-less test machine and explicitly require the WebGL backend, so a text-only fallback cannot silently count as a rendering test. Axe uses a local development-only `axe.min.js` supplied through `AXE_PATH` or an unsaved `axe-core` installation; missing axe is reported as skipped. It was available for the recorded scans.

Logs, result JSON, full screenshots and review sheets live in the ignored `.test-artifacts/` folder. `visual/` records actual Low power; `visual-detail/` records the explicitly selected More detail option. The review sheets only resize and arrange those real screenshots; they do not repaint or generate the environment.

## Limits and publication status

The visual result is stylized, not photorealistic. Lighting uses inexpensive approximations, not physical soft-shadow simulation. Doorways and stair tops deliberately transition between spaces; this is not a seamlessly streamed whole building. The existing ten-location network is retained rather than reduced to fewer locations, and supporting areas remain simpler than the principal spaces.

Desktop and mobile layouts were visually inspected, including portrait, landscape and a 320-pixel-wide view. This is not real-phone, Safari/iOS or full screen-reader testing, and selected axe scans do not establish complete WCAG conformance. Hardware-accelerated performance and whole-browser memory remain unmeasured; minimal resource use on every device is not promised.

At the time these checks were recorded, nothing had been pushed, merged or deployed, and Pages settings had not been changed. Those statements describe that historical review snapshot, not the current authorization status. On 2026-10-23, the owner approved normal, non-force publication, conditional on `main` remaining at `3f5bbda5bb79059be4783be0417f0ac7c13a3b43`; a fresh fetch confirmed that base. This approval does not establish that publication has completed or that the live site has been verified. The experience URL is <https://melvinvarghese.github.io/Staircase-to-Nowhere/>; publication and live verification are reported separately from these local measurements, with deployment results in the repository’s Pages build history.
