# Creature 3D models (optional)

Drop GLB model files here to upgrade the panel creatures from the built-in SVG
look to **real, interactive 3D** (drag to spin, auto-rotate).

## How to enable a creature in 3D

1. **Get a model.** Use an **uncompressed `.glb`** (no Draco / no KTX2 — those
   need a CSP change for WebAssembly). Free CC0 sources:
   - https://poly.pizza  (filter by CC0)
   - https://sketchfab.com  (filter: Downloadable + CC0)
   - https://quaternius.com  (free low-poly animal/character packs)

2. **Name it after the creature** and put it in this folder, e.g.:
   ```
   public/models/cat.glb
   public/models/dog.glb
   public/models/astronaut.glb
   ```
   Valid creature keys: `astronaut`, `alien`, `eagle`, `cat`, `human`, `dog`, `worm`, `magma`.

3. **Register it** in `src/ui/shared/creatures.tsx` → `MODEL_REGISTRY`:
   ```ts
   export const MODEL_REGISTRY = {
     cat: { src: chrome.runtime.getURL("models/cat.glb"), alt: "Cat", animation: "Run" },
   };
   ```
   `animation` is the GLB's clip name to autoplay (open the file in
   https://modelviewer.dev/editor/ to see clip names). Omit it to just show the
   model.

4. **Rebuild** (`npm run build`) and reload the extension.

## Behaviour

- A creature with a registered model shows its **SVG** at rest and swaps to the
  **interactive 3D model on hover** (drag to rotate). Only the hovered panel
  mounts a 3D/WebGL context, so panel performance stays bounded.
- Creatures with no registered model keep their SVG + cursor-chase behaviour.
- Everything is disabled under `prefers-reduced-motion`.

## Note

`@google/model-viewer` (and Three.js) is lazy-loaded — it's only fetched the
first time a 3D model is actually shown. If you decide not to use 3D, remove the
dependency with `npm remove @google/model-viewer` to slim the build.
