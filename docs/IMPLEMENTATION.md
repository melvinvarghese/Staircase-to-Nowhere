# The Staircase to Nowhere — implementation plan

## Design

The owner's attached master brief is the product specification. This is an architectural build, authorized for autonomous design, implementation, tests, commits, and deployment. Use a small custom Canvas 2.5D renderer rather than a large WebGL engine or a sequence of static pictures. Visitors continuously walk within each room; deliberate door and stair transitions connect ten locations. Impossible architecture is expressed through the connections, never unreliable collision geometry.

The visual identity comes from an old hotel's materials: dirty cream #b3ad91, shadow #161b18, faded green #5a6654, carpet #544939, brass #b19d6b, fluorescent #e0e8c7. A Georgia display title resembles a worn hotel register; system sans-serif controls remain readable. The building fills the screen; no cards, navbar, minimap, objectives, or dashboard. Original procedural geometry only; no fetched fonts, images, audio, analytics, or runtime dependencies.

## Shared interfaces

Coordinates: x increases east, z increases north; yaw 0 looks +z, yaw PI/2 looks +x. Room bounds x=0..width, z=0..depth. y is height above floor. Doors use wall north/south/east/west and offset (x on north/south, z on east/west).

`js/world.js` exports `SCENES` (record), `START_SCENE='entrance'`, `doorPosition(scene,door) -> {x,z}`, and `getScene(id,visits=1) -> scene` (return-visit changes without mutating originals).

Scene: `{id,name,floor,kind,width,depth,height,spawn:{x,z,yaw},colors:{wall,lower,floor,ceiling},doors:[{id,wall,offset,width:1.5,label,to}],objects:[{id,type,x,z,w,d,h,title,text,clue,solid}],description}`. Object types: desk, elevator, directory, clock, telephone, bed, chair, note, mirror, pipe, bench, plant. Extra decorative types are allowed. Optional `stairs:{x,z,width,length,rise,to}` means a walkable ramp represented by stair treads, rising from z to z+length.

`js/engine.js` exports `createState()`, `move(state,{forward,strafe,turn},dt) -> boolean`, `look(state,dx,dy)`, `getTarget(state) -> null|{kind:'door'|'object',id,label,distance}`, `interact(state,target=getTarget(state)) -> {type:'none'|'door'|'transition'|'inspect',title?,text?,clue?}`, `closeDoor(state,id)`, `restart(state)`, `eyeHeight(state)`. State `{sceneId,player:{x,z,yaw,pitch},visits:{},openDoors:{},clues:[]}`. Door keys use sceneId+':'+id. First interaction opens a door, second transitions; approaching an open doorway can also transition. Walls never become pass-through holes. Closed doors are collidable. Return visits alter selected clues and room arrangement. `move` time is capped and substepped to avoid tunneling. Radius at least .2. Objects with solid:true block movement. Targeting is range limited and angle limited, with nearer solids occluding targets.

`js/renderer.js` exports class `Renderer(canvas,{quality='low'}={})`: `resize(quality?)`, `render(scene,state,{title=false,flicker=false,time=0}={})`, `dispose()`, plus `stats` with last render milliseconds, polygon count, frames. Reads engine-compatible state but imports no engine. Low quality caps resolution to ~900 px wide and ~0.55 megapixels, high to ~1400px and ~1.2MP; no device pixel ratio multiplication. Graceful null-context failure handled by UI. Geometry built/cached only on scene/visit/door state changes; no unbounded cache. Projection near-clips polygons. Ceiling lights, wainscoting, door panels, carpet patterns, furniture, stair treads and railing give spatial depth. Light distance affects colors. Water reflections are restrained, static and local.

`js/app.js`: lifecycle, one demand-driven RAF chain capped at 30fps low/45fps high while moving only, input and DOM menus. No rendering while idle/paused/hidden. Gentle title flicker can be a cheap CSS overlay, independently disabled; reduced motion defaults from OS. Keyboard WASD move, arrows move/turn, Q/E? E is reserved for interaction; use Q/Z to turn only if needed, documented. Mouse drag always works; explicit optional pointer lock. Touch left joystick, scene-drag look, clear interact and pause buttons. Native modal dialog with focus restoration. Exploration alternative lists connected exits and inspections as real buttons for screen readers/graphics fallback; no need to visually aim. Web Audio off by default and suspended on pause/hidden, mute always visible. localStorage preferences only, exception safe, reset option.

## Execution and checks

- [x] World/engine: write failing Node tests, then implement all ten locations, graph reachability, collision, targeting, doors, stair height, optional mystery and restart. Test routes both directions and revisit changes.
- [x] Renderer: tests first for near clipping/projection if extracted; build convincing original geometry with finite caches and bounded pixels. Review screenshots in all scene kinds.
- [x] UI: test title/entry, keyboard movement and look, settings, pause/focus, restart, touch portrait/landscape, alternative exploration, denied pointer lock, storage failure, missing graphics.
- [x] Run axe accessibility scans; keyboard walkthrough; console/network checks; offline-after-load checks. Measure actual render cost, idle frame count, load weight and heap after repeated traversal. Do not claim real-phone or screen-reader hardware tests.
- [x] Beginner README: playing, controls, architecture, Pages, adding rooms, reusable Cue prompt, known limitations, test evidence. No invented license.
- [x] Review diff and independent code review; fix important findings with regression tests. Commit on feat/liminal-hotel, fetch main, fast-forward only when safe, push without force; verify Pages build SHA and live entry/interactions (publication check pending). Set repository description/topics.

## Risk review

Check corner collision and large time deltas; touch pointer cancellation and multiple fingers; focus trapping and key state after blur; near-plane polygons and graphics unavailable; storage blocked and reduced-motion changes; no idle rendering/audio work; project-subpath and external-network independence.

## Decisions

The owner explicitly requests independent decisions and no avoidable approval interruptions, so the supplied full brief serves as approved scope. This clean dedicated checkout uses a feature branch instead of an unnecessary second worktree. Keep the legacy Pages source on main and merge only by fast-forward after fresh remote checks. Audio is procedural and opt-in; no media services are used.
