# Gibson Home

A 3D home page styled after the **"Gibson" supercomputer interface from the
movie _Hackers_ (1995)**: glass monolith "file towers" plastered with dense
streaming report text, aligned in rows flanking a central data corridor, on a
black floor etched with glowing violet circuit traces. The tower field loops
endlessly in any horizontal direction.

Built with **Vite + Three.js + TypeScript**. No UI framework — the overlay cards
are plain accessible DOM.

## Quick start

```bash
npm install
npm run dev      # dev server with HMR (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

The build is fully static (`vite.config.ts` sets `base: "./"`), so `dist/` can
be hosted from any static host or subdirectory.

## Controls

| Input | Action |
| --- | --- |
| Drag / swipe | Look around (orbit) |
| Scroll / pinch | Zoom |
| Two-finger drag | Pan across the plane |
| Arrow keys / WASD | Fly horizontally across the field |
| Tab / Shift+Tab | Cycle hotspots (camera flies to frame each) |
| Enter / Space | Open the focused hotspot's detail card |
| Escape | Close the card (or release the canvas to Tab out) |
| Tap / click a hotspot | Open its detail card |

A visually-hidden but keyboard/screen-reader accessible link list (the "Skip to
site links" target) mirrors every hotspot, so the page is usable without WebGL.

## Adding real links

Everything is driven by one file: [`src/config/towers.ts`](src/config/towers.ts).

Each tower has a `position`, `colorKey`, `blocks` (the stacked silhouette), and
optional `hotspots`. A hotspot's `link.url` is empty by default, which renders a
disabled **"Visit (coming soon)"** button. **Fill in the `url` and it becomes a
real "Visit" link — no other code changes needed.** Towers without `hotspots`
are decorative skyline.

```ts
{
  id: "resume",
  label: "Resume tower",
  position: [-28, -22],
  colorKey: "cyan",
  blocks: [{ width: 8, depth: 8, height: 14 }, /* ... */],
  hotspots: [{
    id: "resume",
    heightFraction: 0.55,
    link: { title: "Resume", description: "...", url: "" }, // <- set url to go live
  }],
}
```

## How it works

- `scene/GibsonScene.ts` — renderer, scene, fog, lighting, bloom composer, loop.
- `scene/Tower.ts` / `scene/TowerField.ts` — procedural towers; one prototype
  tile cloned into a grid that recentres on the camera each frame for the
  infinite-loop effect.
- `scene/materials.ts` — neon palette and shared emissive/edge materials.
- `interaction/CameraRig.ts` — OrbitControls + keyboard fly + idle drift +
  fly-to framing.
- `interaction/Navigation.ts` — keyboard state machine and focus/highlight.
- `interaction/Picker.ts` — tap/click raycasting (drag-guarded).
- `ui/Overlay.ts` — accessible hotspot dialog with focus trap.
- `ui/A11yFallback.ts` — text link list mirroring the config.
- `interaction/capabilities.ts` — mobile/perf tier (pixel-ratio cap, AA, bloom
  scale, fog, idle motion).
