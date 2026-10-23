# A hotel worth getting lost in

The requested direction is an empty, cinematic hotel with believable materials, architectural depth and impossible connections. The existing ten spaces, navigation, accessibility and free GitHub Pages hosting stay intact. No services or paid runtime dependencies are introduced.

## What was wrong

Inspection of main `f0d49f3` and fresh captures of the published website confirmed that the current renderer is already actual WebGL 1, not Canvas 2.5D. It uses triangle meshes, a depth buffer, perspective projection and first-person movement. The older Canvas renderer remains in the repository but is not selected by the app.

The visual weaknesses are in the content and shading: flat polygon colors with the same noise on every material; tall dark wall infill where the intended lower paneling should stop; broad ambient illumination without occlusion; mostly cuboid furnishings; coplanar trim; and a distant reception desk in a largely empty high volume. Upgrading only CSS cannot repair these issues.

## Engine decision

A replacement with Three.js was evaluated conceptually against retaining the current renderer. Three.js would offer a broader material and asset ecosystem, but would not itself fix the geometry, composition or lighting. This compact renderer already provides the required real-time 3D and avoids adding a second scene graph, bundle, controls layer or physics runtime. Retain it, but replace the material/shading pipeline and architectural presentation substantially.

## Implementation

1. Add local CC0-derived and original material tiles, with a normal atlas, mipmaps and bounded anisotropic filtering. Wallpaper, carpet, wood, plaster, stone and metal receive different material responses.
2. Bake diffuse illumination and geometry-based soft occlusion into vertices when a room changes. Tessellate broad surfaces to carry actual pools of light and shadows (1.3 m low-power grid, 0.8 m detail grid); do no shadow tracing during movement. Retain modest material highlights and distance extinction in the fragment shader.
3. Rebuild wall material splits, projecting joinery, door details, architectural profiles, reception and fixture composition. Keep collision-critical dimensions and all exits intact.
4. Retain capped backing buffers and movement rates, one active scene buffer, GPU-resource disposal and zero continuous idle rendering. Keep text exploration when WebGL is unavailable or lost.
5. Inspect newly rendered desktop and mobile scenes, not just source. Run unit, browser, interaction, lifecycle and resource tests. Correct visible defects before publishing. Verify Pages after a normal, non-forced push.

## Honest verification boundaries

Headless Chromium uses software WebGL in this environment; its measurements are not Android hardware benchmarks. Mobile viewport/touch emulation can validate layout and input, but cannot certify a physical phone's battery use, thermals or frame rate. Browser fallback must remain honest about unavailable graphics.
