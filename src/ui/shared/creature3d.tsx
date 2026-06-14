/**
 * Real-3D creature renderer using Google's <model-viewer>.
 *
 * The library (and Three.js under it) is LAZY-loaded the first time a 3D
 * creature actually mounts, so it costs nothing until a GLB model is both
 * registered and on screen. Renders an interactive, auto-rotating 3D model
 * that the user can drag to spin.
 *
 * Until the library is ready (or if it fails / there's no WebGL), the caller
 * keeps showing the SVG creature — this returns null in that window.
 */
import { createElement, useEffect, useState } from "react";

let mvPromise: Promise<unknown> | null = null;
function ensureModelViewer(): Promise<unknown> {
  if (!mvPromise) {
    // dynamic import → its own async chunk, fetched on demand only
    mvPromise = import("@google/model-viewer");
  }
  return mvPromise;
}

export function Creature3D({
  src,
  alt,
  size,
  animation
}: {
  src: string;
  alt: string;
  size: number;
  animation?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    ensureModelViewer()
      .then(() => mounted && setReady(true))
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return null;

  return createElement("model-viewer", {
    src,
    alt,
    "camera-controls": true,
    "auto-rotate": true,
    "disable-zoom": true,
    "disable-pan": true,
    "interaction-prompt": "none",
    "rotation-per-second": "26deg",
    "auto-rotate-delay": 0,
    "shadow-intensity": "0.6",
    exposure: "1.0",
    "animation-name": animation,
    autoplay: true,
    loading: "eager",
    reveal: "auto",
    style: {
      width: size,
      height: size,
      background: "transparent",
      "--poster-color": "transparent"
    }
  });
}
