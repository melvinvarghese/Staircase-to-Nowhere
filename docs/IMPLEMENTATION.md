# Inside the redesigned hotel

## Review and publication status

This work is on the local branch `review/creative-overhaul`, based on the original `main` release `3f5bbda5bb79059be4783be0417f0ac7c13a3b43`. The earlier review-only restriction records the status before publication approval. On 2026-10-23, the owner explicitly approved normal, non-force publication, conditional on `main` remaining at that base; a fresh fetch confirmed the base. The reviewed runtime commit `ae39062fddfd3bcc4d6cae8707a48e3bd9efadf5` remains unchanged. The approval was recorded before publication or live verification and is not, by itself, evidence of deployment. Current deployment results are available in the repository’s Pages build history. The old implementation and its release evidence remain in Git history.

## Artistic direction

The hotel is preparing for Guest 214, whose arrival time is 2:14. The opening looks into a tall, columned reception hall; the invitation sits to one side instead of replacing the building with a menu. A long oxblood guest corridor, an overlong guest room, a compressed green service passage, walkable stairs and a cold flooded landing have deliberately different proportions, palettes and floor treatments.

Return visits move the suitcase, change physical room-number labels and reveal the prepared registration card. Inspecting the reception desk itself also reveals the card, so this clue does not depend on aiming at a tiny prop. These changes are optional; nothing is gated behind a puzzle. The existing ten-location route graph is retained rather than deleting working routes. This is a deliberate limitation relative to the brief's preference for fewer spaces, not an increase in room count.

## Rendering choice

`js/webgl-renderer.js` is a small native WebGL1 renderer. No framework, CDN, remote asset or runtime package is loaded. Depth-tested triangles replace the old painter-sorted Canvas view. `js/renderer.js` builds shared geometry and retains the tested legacy Canvas implementation and projection helpers, but the app selects WebGL, not the legacy renderer. If WebGL cannot initialize, semantic text exploration is offered openly rather than disguising a flat picture as 3D.

The renderer shares the small grain texture across scenes. Each scene uses one packed vertex buffer, a small local canvas texture atlas for world-space labels, and up to eight authored light sources. Materials combine original geometry, world-mapped samples of a fixed 64 × 64 noise texture generated once, distance falloff, restrained ground darkening, haze and room-specific color grading. There is no expensive shadow-map or physically based lighting system. Wall-spill overlay polygons from the legacy renderer are excluded from the WebGL mesh.

The flooded landing alone uses an extra mirrored-scene pass into a bounded framebuffer, at most 512 × 256 pixels, reduced further in software Low power mode. The reflection samples in screen coordinates with a static ripple distortion. Reflected floor surfaces are discarded, and the render-target texture is never sampled while attached to the active framebuffer. It is not a fluid simulation or an animated water effect.

Meshes and textures are replaced, not accumulated, when room, visit or door state changes. Framebuffers, depth renderbuffers, textures, buffers and shader programs have explicit cleanup paths. Label atlases are bounded to the available 32 cells. Door plaques use interior-facing bases; a zero component in a side-wall direction must remain zero.

## Space and interaction

Coordinates use x east, z north and y above the floor. Yaw zero faces +z; yaw π/2 faces +x. Each scene has bounds, safe spawn, connected doors, objects and optional stairs. Objects can specify mounting height `y`; elevated clues and overhead pipes are rendered at that height. Clocks, cards, windows and bells have authored geometry rather than generic fallback blocks.

The engine retains radius-based, substepped horizontal collision and a stair ramp for camera elevation. Closed doors and solid furniture block movement. A door opens on the first interaction; another interaction or walking through the threshold changes scenes. Stair tops likewise transition to an authored landing. This is real perspective 3D with simplified collision, not a seamless whole-building simulation.

Aiming is forgiving at floor level. Props with an explicit mounting height also respect vertical aim, so looking straight at a door cannot accidentally select a clock high above it. Text exploration lists the same exits and objects as ordinary buttons, without an aiming requirement.

## Low-power lifecycle

Low power is the default: 30 moving frames per second at most, a 900-pixel backing-width ceiling and a 550,000-pixel area ceiling. More detail raises the limits to 45 frames, 1,400 pixels wide and 1.2 million pixels. Device pixel ratio does not multiply these caps. Known software graphics drivers trigger a smaller Low power budget: at most 480 pixels wide, 140,000 pixels in area and 12 moving frames per second. This is explained beside the graphics choice. More detail remains an explicit opt-in; no driver information is sent anywhere or stored. This detection is best-effort, not a benchmark of unknown hardware.

One demand-driven animation-frame chain handles motion and changed views. It stops when stationary, blocked by a wall, paused, hidden or left. There is no decorative rendering loop, camera bob, flickering overlay, moving shader time or animated post-processing. Held input is cleared after blur and pause. Sound is synthesized locally, always off on a fresh visit, and suspended when muted, paused or hidden.

The OS reduced-motion setting takes priority over a stale stored opt-out. Storage failure cannot prevent entry. Leave releases mouse capture and returns to the invitation without resetting exploration; restart clears exploration. Graphics loss releases mouse capture and offers text navigation. After actual context restoration, graphics redraw but stay paused until deliberate resume.

## Verification boundaries

Node tests cover logic and geometry; browser tests cover real WebGL initialization and errors, interactions, touch emulation, fallback and restoration, accessibility scans, route traversal, screenshots and bounded resource use. See [the testing record](TESTING.md) for measured results and limits. Tests are not a claim of real-phone, Safari/iOS, full-screen-reader or whole-browser-memory validation.
