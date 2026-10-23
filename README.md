# The Staircase to Nowhere

An abandoned hotel outside ordinary time. The reception desk is too far away. The clocks agree on 2:14. A suitcase is not where you left it.

Walk at your own pace through a quiet first-person architectural experience. There are no enemies, jump scares, required puzzles, or objectives to complete. The small mystery is optional.

**Experience:** [Staircase to Nowhere](https://melvinvarghese.github.io/Staircase-to-Nowhere/). See the [deployment history](https://github.com/melvinvarghese/Staircase-to-Nowhere/actions/workflows/pages/pages-build-deployment) for release status.

## Enter and wander

Choose **Enter the building**. The opening is a view of the hotel itself, not a dashboard. Explore its high reception hall, long guest wing, service passages, stairs, flooded landing and unlisted floor. Returning to a place can change the room number, luggage or evidence waiting at reception.

| Action | Keyboard and mouse | Touch |
| --- | --- | --- |
| Walk | **W A S D**, or **↑ / ↓** forward and back | Left movement control |
| Turn | **← / →**, or drag the view | Drag the view |
| Look up and down | Drag the view | Drag the view |
| Inspect or use an aimed door | **E**, click the view, or the interaction button | Interaction button |
| Close an aimed door | **C** | Pause, then exploration choices |
| Pause | **Escape** or **Pause / controls** | **Pause / controls** |
| Leave | Pause, then **Leave the building** | Same |

A door opens on the first interaction. Interact again, or walk through the opening, to enter the next space. Stairs raise the camera as you climb. Door thresholds and stair tops intentionally transition between authored spaces; this is not a continuously streamed building or a full physics simulation.

If aiming is uncomfortable, pause and choose **Explore without aiming**. Real buttons list the exits and inspectable objects. The same mode works when 3D graphics are unavailable. Optional mouse capture is in the pause menu; **Escape** releases it. Dragging works without capture.

## Comfort and privacy

Sound is **off on every fresh visit**, including after a reload. Opt in using **Sound off** or the ambient-sound checkbox. The restrained hum and ventilation are synthesized locally, and suspended while muted, paused or hidden.

The operating system's reduced-motion preference takes priority over stored settings. There is no camera bobbing, automatic camera travel, rapid flashing or animated post-processing. You can also turn on **Reduce motion** in the controls. Moving and looking still respond directly to your input.

**Low power** is the default graphics mode. Rendering has a 30-frame-per-second ceiling while moving, a 900-pixel width ceiling and a 550,000-pixel backing-area ceiling. **More detail** permits up to 45 frames per second and 1.2 million pixels. Device pixel ratio does not multiply these limits. When a known software graphics driver is detected, Low power automatically drops to a 12-frame ceiling, at most 400 pixels wide and 90,000 pixels in area. Software-only Low power also omits normal-detail and specular shader work, keeping the local material colors and baked lighting. The controls explain this softer view; More detail is still an explicit opt-in. These are ceilings, not guaranteed frame rates.

The scene stops drawing completely when idle, paused or hidden. The renderer keeps one current room mesh, not an ever-growing cache. No external runtime asset service, font, video, analytics, account, backend, paid API or database is required. Two locally hosted 1024-pixel material atlases total about 491 KiB compressed. Their source and redistribution terms are in [asset credits](assets/LICENSES.md). Preferences stay in local browser storage when available. There is no saved game: refreshing resets exploration. **Start again at reception** clears open doors and clues; **Leave the building** returns to the entrance screen without resetting the current visit.

## What makes the view different

A small original WebGL renderer gives the environment real perspective, depth-tested surfaces and a first-person camera. The cinematic material pipeline combines local patterned wallpaper, woven carpet, walnut and aged plaster with normal detail, restrained varnish/stone highlights, distance extinction and lens shading. Molded wainscoting, pilasters, door arches, recessed panels, brass hardware and hanging fixtures provide modeled depth. Static diffuse light and soft occlusion from solid furnishings are baked into subdivided mesh vertices when a room changes, never traced on every movement frame. Low power uses a coarser bake to reduce transition work and mesh memory. This is a more materially convincing low-poly hotel, not a claim of photorealism. Floodwater uses a bounded mirrored view with static ripple distortion rather than a fluid simulation.

The opening shows a live, depth-rendered guest corridor rather than a flat background image or interface card. Portrait camera perspective is capped to avoid an excessively stretched ceiling/floor view. The design concentrates on proportions, material differences and composed sightlines instead of adding more rooms. The existing ten-location network and accessible exploration controls are preserved.

## Project map

```text
index.html             Entry, controls, text alternative and dialogs
styles.css             Responsive interface and focus states
js/app.js              Input, pause/leave, preferences and rendering lifecycle
js/world.js            Architecture, exits, objects and return-visit changes
js/engine.js           Collision, walking, stairs, targeting and interactions
js/renderer.js         Shared architectural geometry and legacy projection helpers
js/webgl-renderer.js   Depth-tested renderer, materials and world-space labels
js/audio.js            Optional browser-generated ambience
js/preferences.js      Local comfort preferences
js/hotel-shader.js     Material-specific shading and seamless atlas sampling
js/lighting.js         Bounded static irradiance / soft-occlusion bake
assets/materials/     Local color and normal atlases (CC0-derived/original)
assets/LICENSES.md    Material source links and redistribution terms
tools/build-materials.py  Optional offline atlas regeneration
tests/                 Logic, browser, accessibility and resource checks
```

## Development checks

No build step or runtime package installation is needed. For a local developer preview:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/`. For dependency-free logic tests, use Node.js 22 or newer:

```bash
npm test
```

Browser checks require development-only Python Playwright and Chromium. They accept a base URL, including a GitHub Pages-style project subpath:

```bash
python3 tests/browser_test.py http://localhost:4173/
python3 tests/interaction_test.py http://localhost:4173/
python3 tests/performance_test.py http://localhost:4173/
python3 tests/overhaul_test.py http://localhost:4173/
python3 tests/cinematic_test.py http://localhost:4173/
python3 tests/material_loss_test.py http://localhost:4173/
python3 tests/visual_test.py http://localhost:4173/
# Optional-detail comparison, saved separately:
python3 tests/visual_test.py http://localhost:4173/ high
```

Set `CHROMIUM_PATH` when Chromium is not at `/usr/bin/chromium`. Optional axe scans use a local development-only `axe.min.js`: set `AXE_PATH`, or install `axe-core` without saving it as a runtime dependency. Missing axe is explicitly reported as skipped. Visitor pages never load the testing tools. See [the testing notes](docs/TESTING.md) for checks actually performed and their limitations.

## Future changes

Ordinary room and clue changes belong in `js/world.js`. Keep exits connected, respect collision bounds and safe spawns, and use concise environmental clues. Renderer or engine changes need regression tests and a real visual check.

A reusable request for Cue:

> Please improve this room or clue: **[describe it]**. Preserve the quiet atmosphere, low RAM and processor use, graphics-free exploration and all existing routes. Check the actual rendered desktop/mobile view, run all logic and browser tests, and report only verified results. Work on a local review branch. Do not push, merge or publish until I review and explicitly approve publication. Never force-push.

## Limits

WebGL availability depends on the browser and device; the text alternative is intentional. Real-phone performance, Safari/iOS and full screen-reader use require hardware testing beyond browser emulation. Automated accessibility checks cannot establish complete WCAG conformance. JavaScript heap measurements do not include the whole browser, GPU or operating system.

No open-source license is asserted for this project. Check with the owner before reusing or redistributing it.
