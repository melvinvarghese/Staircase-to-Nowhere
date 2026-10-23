# What has actually been checked

The cinematic redesign was inspected as rendered WebGL, not just as source. The current source already used genuine perspective WebGL; this release substantially changes the materials, architecture and lighting rather than claiming an engine migration that did not happen.

## Passing checks

| Check | Result |
| --- | --- |
| Node logic, geometry, lighting, material, camera and lifecycle regressions | 62 passed |
| Desktop/mobile browser acceptance | 36 passed |
| Walking, doors, stairs, pointer/touch input, audio and focus | 40 passed |
| Comfort defaults, leave/restart, fallback and graphics loss/restoration | 17 passed |
| All-room routes, repeated visits, WebGL errors and resource bounds | 102 passed |
| New material pipeline | Local atlas uploads, actual movement, idle rendering, graphics restoration and optional-extension fallback checked |
| Late image callbacks after graphics loss | Reproduced GL error 1282; fixed by disposing the lost renderer; regression now reports GL error 0 |
| Selected axe checks | No violations in the selected invitation, exploration and pause rules |
| Source hygiene | `git diff --check` passed |

All ten locations were visited through the real exploration buttons, then visited repeatedly. Screenshot runs cover all rooms, the opening, portrait/landscape mobile, and a 320-pixel-wide layout in both graphics modes. The visual review corrected material-repeat seams, blank wall plaques, incorrect wood finishes on bedding, floating carpet decals, coplanar wall splits, inward furniture normals and excessive portrait field of view.

## Measured low-power sample

These are local Chromium **SwiftShader software-rendering** measurements, not accelerated laptop or Android hardware benchmarks. The viewport was 1280 × 800; software Low power used a 379 × 237 backing view and a 12-frame-per-second ceiling.

| Measurement | Observed result |
| --- | --- |
| Page and local assets transferred | 642,038 bytes |
| Initial load including the test's network-idle wait | 1,018.20 ms |
| JavaScript heap after collection, before repeated routes | 3,228,448 bytes |
| JavaScript heap after collection, after repeated routes | 3,899,724 bytes |
| Heap growth across repeated routes | 671,276 bytes |
| Added frames while stationary for two seconds | 0 |
| Idle main-thread task time over two seconds | 0.27 ms |
| Main-thread task time during a continuous turn | 968.03 ms over 3,007.19 ms |
| Frames in that turn | 32 |
| Added frames while paused | 0 |
| Last room's vertex buffer | 894,600 bytes; not total GPU memory |
| External asset requests, script exceptions and WebGL errors | None |

The first fully textured software path exceeded the existing CPU budget. A software-only economy shader skips normal-detail and specular work, and its pixel ceiling is now 90,000. It retains the local material colors, modeled geometry and baked illumination. Hardware Low power and More detail retain normal mapping and material highlights. This is a deliberate tradeoff, not a claim that all modes are equally detailed or free to render.

## Resource design

Normal Low power remains capped at 30 moving frames per second, 900 backing pixels wide and 550,000 pixels in area. Known software drivers use at most 12 frames, 400 pixels wide and 90,000 pixels in area. More detail is an explicit opt-in: at most 45 frames, 1,400 pixels wide and 1.2 million pixels. Device pixel ratio does not multiply these limits.

Rendering is demand-driven and stops when idle, paused or hidden. One current room buffer replaces the previous one; label/reflection resources are disposed on changes. Two fixed local 1024 × 1024 color/normal atlases total 502,498 compressed bytes. They have additional decoded/GPU/mipmap memory costs, which are not included in JavaScript heap figures. The flooded room alone has a bounded extra reflection pass.

Diffuse light and soft solid-object occlusion are baked only on room changes. Low power uses a coarser 1.3 m grid; More detail uses 0.8 m. Independent review identified transition allocation costs, so the bake now avoids per-ray arrays and per-vertex string keys. Transitions still do synchronous work; low hardware performance is not guaranteed.

## Repeat locally

Serve the repository with `python3 -m http.server 4173`, then run:

```bash
npm test
python3 tests/browser_test.py http://localhost:4173/
python3 tests/interaction_test.py http://localhost:4173/
python3 tests/overhaul_test.py http://localhost:4173/
python3 tests/performance_test.py http://localhost:4173/
python3 tests/cinematic_test.py http://localhost:4173/
python3 tests/material_loss_test.py http://localhost:4173/
python3 tests/visual_test.py http://localhost:4173/
python3 tests/visual_test.py http://localhost:4173/ high
```

Browser scripts require development-only Python Playwright and Chromium; set `CHROMIUM_PATH` when needed. Optional axe uses a local development-only copy and reports a skip if unavailable. None of those tools or dependencies is requested by visitors. Logs and real captures are in the ignored `.test-artifacts/` directory.

## Limits

The result is a more detailed low-poly environment, not photorealism or physically complete light transport. Shadows approximate selected solid furnishings with boxes. Doorways and stair tops transition between authored spaces; the building is not seamlessly streamed. The existing return-visit changes and all ten locations remain intact.

Mobile touch/layout was tested in emulation, not on physical Android devices. Safari/iOS, battery use, thermals, full screen-reader behavior and whole-browser/GPU memory are unverified. Selected automated accessibility scans do not establish full WCAG compliance. Submission timing is not completed GPU frame time.

Publication and live verification are separate from these local measurements. The public experience is <https://melvinvarghese.github.io/Staircase-to-Nowhere/>; actual deployment status is recorded in [GitHub Pages builds](https://github.com/melvinvarghese/Staircase-to-Nowhere/actions/workflows/pages/pages-build-deployment).
