# The Staircase to Nowhere

An empty hotel, ten impossible places, and no hurry. **The Staircase to Nowhere** is a quiet, low-poly, stylized 2.5D exploration experience. You walk around each room and choose doors to move between rooms; it is not a full 3D physics game. There are no enemies or required puzzles. A small mystery gathers around memory, rooms that seem to remember earlier visits, and the recurring time **2:14**. You can simply wander without trying to solve it.

## Enter the building

Open the experience in a modern browser and choose **Enter the Building**. No account, download, or technical setup is needed. Sound is off until you opt in. If the visual view is unavailable, choose **Explore the building** to navigate rooms and inspect details using buttons instead.

### Controls

| Action | Mouse and keyboard | Touch |
| --- | --- | --- |
| Walk | **W A S D** or **↑ / ↓** forward and back | Move the left joystick |
| Turn | **← / →** | Drag the scene to look around |
| Look around | Drag the scene | Drag the scene, separately from the joystick |
| Inspect or use an aimed door | **E** or click the on-screen interaction button; clicking the scene also interacts | Use the on-screen interaction button |
| Close an aimed open door | **C** | Use the exploration choices when available |
| Pause / open controls | **Escape** or **Pause / controls** | Tap **Pause / controls** |

A door opens first; interact with it again to pass through. When aiming is awkward or unavailable, pause and choose **Explore without aiming**. Its room description and real buttons let you inspect objects and choose exits. Optional mouse capture is available in the pause menu; **Escape** releases it and returns to the pause menu. Ordinary drag-to-look works without capture.

## Comfort and preferences

Open **Controls & accessibility** before entering, or **Pause / controls** while exploring.

- **Ambient sound** is optional and off by default. The soft sound is made in the browser.
- **Reduce motion** follows your device's reduced-motion preference by default. You can change it independently; it suppresses decorative motion and transition effects.
- **Subtle light flicker** is optional and off by default. It is disabled while reduced motion is on.
- **Graphics** offers **Low power** (the default) and **More detail**. Low power caps the canvas at about 30 frames per second while moving and about 550,000 pixels; More detail caps it at about 45 frames per second and 1.2 million pixels. These are configured limits, not measured performance promises.

Rendering stops while you are idle, paused, or the tab is hidden. Preferences are saved only in this browser on this device; **Reset preferences** restores defaults. They are not an account or a save file. Refreshing starts at the lobby. **Start again at reception** resets your current visit, including collected clues and open doors, but keeps your preferences.

## The ten places

The connected locations are:

1. `entrance` — The Remembered Lobby
2. `first-stairwell` — First Stairwell
3. `repeating-corridor` — Repeating Corridor
4. `room-214` — Room 214
5. `service-corridor` — Service Corridor
6. `elevator-hall` — Elevator Hall
7. `flooded-landing` — Flooded Landing
8. `windowless-floor` — Windowless Floor
9. `impossible-staircase` — Impossible Staircase
10. `unlisted-floor` — Unlisted Floor

There is no required order. Clocks, notes, room numbers, and familiar objects hint at what the building remembers; revisiting a place may subtly change a few details. The story is meant to remain open to interpretation.

## For the project owner

You do not need to install anything to use the experience. The project runs locally in a browser, with no runtime package dependencies, external services, tracking, or accounts.

### Project map

```text
index.html          Entry screen and menus
styles.css          Layout and visual styling
js/app.js           Input, menus, accessibility, and app lifecycle
js/world.js         The ten locations, their doors, objects, descriptions, and clues
js/engine.js        Walking, interaction, and room transitions
js/renderer.js      Canvas drawing
js/audio.js         Optional locally generated ambience
js/preferences.js   Locally saved comfort and graphics preferences
assets/             Small project artwork (favicon)
tests/              Automated checks
```

### Run or check it locally

If you want to preview the project on your computer, open a terminal in the project folder and run:

```bash
python3 -m http.server 4173
```

Then visit <http://localhost:4173>. Stop the local server with **Ctrl+C**. This serves the files as-is; it does not install anything. With Node.js 22 or newer, the built-in unit checks can be run separately:

```bash
npm test
```

The browser-based development checks are optional and are not needed to play. They require Python Playwright and a Chromium browser (by default `/usr/bin/chromium`; set `CHROMIUM_PATH` if it is elsewhere). With the local server running, use:

```bash
python3 tests/browser_test.py
python3 tests/performance_test.py
python3 tests/interaction_test.py
```

For the optional automated accessibility scans, install `axe-core` as development tooling (`npm install --no-save --package-lock=false axe-core`), or set `AXE_PATH` to an existing local `axe.min.js`. Without it, the scripts explicitly report those scans as skipped. Those scripts and their browser tooling are for development only, not visitors. Real mobile devices and screen-reader hardware have not yet been tested. See [`docs/TESTING.md`](docs/TESTING.md) for the measured results, regression coverage, and honest testing limits.

### Add a room or clue

For ordinary world-content changes, start in **`js/world.js`**: that is where rooms, connections, inspectable objects, descriptions, and clues are defined. Follow the existing room and object shapes, give each new location a unique scene ID, and connect it with doors to existing locations. The shared movement and rendering systems are in `js/engine.js` and `js/renderer.js`; adding a room should not require rewriting them. Ask for help before changing those shared systems.

You can reuse this prompt with Cue or another coding assistant:

> Please add the following room or clue to The Staircase to Nowhere: **[describe the idea]**. Preserve the existing quiet, nonviolent, optional-mystery experience and its accessible exploration choices. For a content addition, make the smallest appropriate change in `js/world.js`; follow its existing scene, door, and object patterns, keep all ten existing locations and their connections working, and do not rewrite the engine or renderer. Run `npm test` and test navigation through every door route in both directions; report exactly what you ran and any failures. Do not claim unrun checks passed. Do not commit or push, and never force-push.

## Publishing status

The repository is configured for GitHub Pages to publish from the root of its `main` branch. The live experience is <https://melvinvarghese.github.io/Staircase-to-Nowhere/>. GitHub Pages built the implementation commit successfully, and the deployed site passed the desktop/mobile browser acceptance suite. See [`docs/TESTING.md`](docs/TESTING.md) for the verified revision, test coverage, and measured resource use.

## What this is—and is not

This is a deliberately small browser experience, not a full 3D engine. There is no saved game: refreshing returns you to the entrance, while comfort preferences remain in local browser storage. No open-source license is asserted here; check with the project owner before reusing or redistributing the project.
