/**
 * Cute "claymation 3D" creatures that act out little behaviours along the top
 * line of each report panel, matched to that panel's depth zone:
 *   space  -> astronaut (drifts), alien (flies an orbit)
 *   sky    -> eagle (glides across, flapping)
 *   ground -> cat (sits, then sprints), human (thinks), dog (eats, barks)
 *   soil   -> worm (inch-crawls)
 *   core   -> magma sprite (bobs + erupts)
 *
 * Volumetric look comes from radial/linear gradient shading + highlights +
 * a soft cast shadow. Motion is CSS-driven (index.css) and fully disabled
 * under prefers-reduced-motion. Decorative — pointer-events disabled.
 */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Creature3D } from "./creature3d";

export type CreatureKind =
  | "astronaut"
  | "alien"
  | "eagle"
  | "cat"
  | "human"
  | "dog"
  | "worm"
  | "magma";

const SIZES: Record<CreatureKind, number> = {
  astronaut: 30,
  alien: 28,
  eagle: 34,
  cat: 30,
  human: 32,
  dog: 32,
  worm: 30,
  magma: 30
};

const origin = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` });

function Astronaut() {
  return (
    <svg viewBox="0 0 64 64" width={SIZES.astronaut} height={SIZES.astronaut} aria-hidden="true">
      <defs>
        <radialGradient id="astSuit" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c7d2e0" />
        </radialGradient>
        <radialGradient id="astVisor" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#5b8fe0" />
          <stop offset="60%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0b1230" />
        </radialGradient>
      </defs>
      <rect x="20" y="24" width="24" height="24" rx="7" fill="#aeb9c9" />
      <rect x="14" y="30" width="9" height="20" rx="4.5" fill="url(#astSuit)" />
      <rect x="41" y="30" width="9" height="20" rx="4.5" fill="url(#astSuit)" />
      <rect x="24" y="46" width="8" height="16" rx="4" fill="url(#astSuit)" />
      <rect x="32" y="46" width="8" height="16" rx="4" fill="url(#astSuit)" />
      <rect x="22" y="26" width="20" height="24" rx="9" fill="url(#astSuit)" />
      <rect x="29" y="34" width="6" height="6" rx="2" fill="#60a5fa" />
      <circle cx="32" cy="18" r="15" fill="url(#astSuit)" />
      <circle cx="32" cy="18" r="11" fill="url(#astVisor)" />
      <ellipse cx="27" cy="13" rx="4" ry="2.6" fill="#bcd6ff" opacity="0.85" />
    </svg>
  );
}

function Alien() {
  return (
    <svg viewBox="0 0 64 64" width={SIZES.alien} height={SIZES.alien} aria-hidden="true">
      <defs>
        <radialGradient id="alienHead" cx="42%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#b6ed98" />
          <stop offset="100%" stopColor="#4f9e3c" />
        </radialGradient>
        <radialGradient id="alienBody" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#86d06c" />
          <stop offset="100%" stopColor="#3f8a30" />
        </radialGradient>
      </defs>
      <path d="M26 16 Q24 6 20 4" stroke="#5fae4e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M38 16 Q40 6 44 4" stroke="#5fae4e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="4" r="2.6" fill="#caf0ac" />
      <circle cx="44" cy="4" r="2.6" fill="#caf0ac" />
      <rect x="26" y="36" width="12" height="18" rx="6" fill="url(#alienBody)" />
      <rect x="20" y="40" width="7" height="14" rx="3.5" fill="url(#alienBody)" className="alien-wave" style={origin(23, 42)} />
      <rect x="37" y="40" width="7" height="14" rx="3.5" fill="url(#alienBody)" />
      <ellipse cx="32" cy="24" rx="17" ry="15" fill="url(#alienHead)" />
      <ellipse cx="25" cy="25" rx="4.5" ry="6.5" fill="#10241a" transform="rotate(-18 25 25)" />
      <ellipse cx="39" cy="25" rx="4.5" ry="6.5" fill="#10241a" transform="rotate(18 39 25)" />
      <circle cx="26" cy="22" r="1.3" fill="#fff" />
      <circle cx="40" cy="22" r="1.3" fill="#fff" />
      <path d="M27 32 q5 4 10 0" stroke="#2f5e26" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Eagle() {
  return (
    <svg viewBox="0 0 72 56" width={SIZES.eagle} height={SIZES.eagle * (56 / 72)} aria-hidden="true">
      <defs>
        <radialGradient id="eagleBody" cx="42%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#9a7048" />
          <stop offset="100%" stopColor="#5f4226" />
        </radialGradient>
      </defs>
      <path d="M34 30 Q14 14 4 26 Q16 30 30 34 Z" fill="#6b4a2e" className="wing-l" style={origin(34, 30)} />
      <path d="M38 30 Q58 14 68 26 Q56 30 42 34 Z" fill="#6b4a2e" className="wing-r" style={origin(38, 30)} />
      <path d="M30 40 L42 40 L38 52 L34 52 Z" fill="#5a3d24" />
      <ellipse cx="36" cy="34" rx="11" ry="13" fill="url(#eagleBody)" />
      <circle cx="36" cy="20" r="9" fill="#f4f1ea" />
      <ellipse cx="33" cy="17" rx="3" ry="2" fill="#ffffff" />
      <path d="M36 20 L50 22 L36 26 Z" fill="#f5b301" />
      <circle cx="39" cy="18" r="1.6" fill="#1f2937" />
    </svg>
  );
}

function Cat() {
  return (
    <svg viewBox="0 0 56 56" width={SIZES.cat} height={SIZES.cat} aria-hidden="true">
      <defs>
        <radialGradient id="catBody" cx="42%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#8b95a3" />
          <stop offset="100%" stopColor="#5b6470" />
        </radialGradient>
      </defs>
      <path d="M42 46 Q56 44 52 30" stroke="#5b6470" strokeWidth="6" fill="none" strokeLinecap="round" className="cat-tail" style={origin(42, 46)} />
      <path d="M16 52 Q16 30 28 30 Q40 30 40 52 Z" fill="url(#catBody)" />
      <circle cx="28" cy="26" r="13" fill="#7a8492" />
      <path d="M17 18 L21 8 L26 16 Z" fill="#7a8492" />
      <path d="M39 18 L35 8 L30 16 Z" fill="#7a8492" />
      <path d="M19 17 L21.5 11 L24 15 Z" fill="#f3a5b1" />
      <path d="M37 17 L34.5 11 L32 15 Z" fill="#f3a5b1" />
      <ellipse cx="24" cy="20" rx="4" ry="3" fill="#9aa3b0" opacity="0.7" />
      <ellipse cx="23" cy="26" rx="2" ry="2.6" fill="#1f2937" />
      <ellipse cx="33" cy="26" rx="2" ry="2.6" fill="#1f2937" />
      <path d="M26 30 L28 32 L30 30" stroke="#1f2937" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 31 v3" stroke="#1f2937" strokeWidth="1.2" />
      <path d="M22 30 L13 29 M22 32 L13 34 M34 30 L43 29 M34 32 L43 34" stroke="#e2e8f0" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

function Human() {
  return (
    <svg viewBox="0 0 56 64" width={SIZES.human} height={SIZES.human * (64 / 56)} aria-hidden="true">
      <defs>
        <radialGradient id="humanSkin" cx="42%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#ffe2c4" />
          <stop offset="100%" stopColor="#edb98a" />
        </radialGradient>
        <linearGradient id="humanShirt" x1="0.2" x2="0.8" y1="0" y2="1">
          <stop offset="0%" stopColor="#5b9bff" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      {/* thought bubble + idea bulb */}
      <g className="think-idea" style={origin(40, 12)}>
        <circle cx="34" cy="20" r="1.6" fill="#fff" opacity="0.85" />
        <circle cx="38" cy="15" r="2.4" fill="#fff" opacity="0.9" />
        <circle cx="43" cy="9" r="5.2" fill="#fff" />
        <path d="M43 6.5 a2.4 2.4 0 0 1 0 4.8 a2.4 2.4 0 0 1 0 -4.8z" fill="#f5b301" />
        <rect x="41.8" y="10.8" width="2.4" height="1.6" rx="0.6" fill="#b45309" />
      </g>
      {/* legs */}
      <rect x="22" y="48" width="5.5" height="14" rx="2.6" fill="#33415c" />
      <rect x="28.5" y="48" width="5.5" height="14" rx="2.6" fill="#33415c" />
      {/* body */}
      <path d="M19 50 L18 36 Q18 30 28 30 Q38 30 38 36 L37 50 Z" fill="url(#humanShirt)" />
      {/* arm resting + arm to chin */}
      <rect x="14" y="34" width="5" height="16" rx="2.5" fill="url(#humanShirt)" />
      <path d="M37 36 Q44 38 40 30 Q38 26 31 25" stroke="url(#humanShirt)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="25" r="2.4" fill="url(#humanSkin)" />
      {/* head */}
      <circle cx="28" cy="20" r="11" fill="url(#humanSkin)" />
      <path d="M18 19 a10 10 0 0 1 20 0 c0-8-5-13-10-13s-10 5-10 13z" fill="#3b2a1a" />
      <circle cx="24" cy="20" r="1.4" fill="#2b2b2f" />
      <circle cx="31" cy="20" r="1.4" fill="#2b2b2f" />
      <path d="M21 15 q3-1.6 5 0" stroke="#3b2a1a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M25 25 q2 1 4 0" stroke="#b06a44" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Dog() {
  return (
    <svg viewBox="0 0 64 56" width={SIZES.dog} height={SIZES.dog * (56 / 64)} aria-hidden="true">
      <defs>
        <radialGradient id="dogBody" cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#e3ad73" />
          <stop offset="100%" stopColor="#b87c41" />
        </radialGradient>
      </defs>
      {/* food bowl */}
      <ellipse cx="14" cy="50" rx="9" ry="3" fill="#3b4a63" />
      <path d="M6 47 h16 l-2 4 h-12 z" fill="#5b6e8c" />
      <ellipse cx="14" cy="47" rx="8" ry="2.4" fill="#caa15e" />
      {/* tail (wag) */}
      <path d="M48 48 Q62 42 58 32" stroke="#b07a45" strokeWidth="6" fill="none" strokeLinecap="round" className="dog-wag" style={origin(48, 48)} />
      {/* body */}
      <path d="M24 52 Q24 32 36 32 Q48 32 48 52 Z" fill="url(#dogBody)" />
      {/* head group: dips to eat / lifts to bark */}
      <g className="dog-head" style={origin(34, 30)}>
        <circle cx="34" cy="26" r="14" fill="#d79a5e" />
        <ellipse cx="20" cy="24" rx="5" ry="11" fill="#a9743f" />
        <ellipse cx="48" cy="24" rx="5" ry="11" fill="#a9743f" />
        <ellipse cx="34" cy="33" rx="7" ry="5.5" fill="#f0d3aa" />
        {/* mouth: opens on bark */}
        <path className="dog-mouth" d="M30 34 q4 3 8 0" stroke="#7a4a3a" strokeWidth="1.6" fill="none" strokeLinecap="round" style={origin(34, 34)} />
        <ellipse cx="34" cy="31" rx="2.2" ry="1.7" fill="#1f2937" />
        <circle cx="28" cy="23" r="2" fill="#1f2937" />
        <circle cx="40" cy="23" r="2" fill="#1f2937" />
      </g>
      {/* bark mark */}
      <g className="dog-bark">
        <text x="52" y="20" fontSize="11" fontWeight="700" fill="#1f2937">!</text>
      </g>
    </svg>
  );
}

function Worm() {
  return (
    <svg viewBox="0 0 56 40" width={SIZES.worm} height={SIZES.worm * (40 / 56)} aria-hidden="true">
      <defs>
        <linearGradient id="wormBody" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f1ad99" />
          <stop offset="100%" stopColor="#d6826c" />
        </linearGradient>
      </defs>
      <g className="worm-crawl" style={origin(28, 30)}>
        <path d="M8 32 Q18 22 28 32 Q38 22 48 32" stroke="url(#wormBody)" strokeWidth="9" fill="none" strokeLinecap="round" />
        <circle cx="48" cy="32" r="5" fill="#e7a895" />
        <circle cx="49" cy="30.5" r="0.9" fill="#3a2a2a" />
        <circle cx="51" cy="31.5" r="0.9" fill="#3a2a2a" />
        <path d="M48 35 q2 1.4 4 0" stroke="#b9655a" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Magma() {
  return (
    <svg viewBox="0 0 48 44" width={SIZES.magma} height={SIZES.magma * (44 / 48)} aria-hidden="true">
      <defs>
        <radialGradient id="magmaBody" cx="50%" cy="36%" r="66%">
          <stop offset="0%" stopColor="#ffe6a6" />
          <stop offset="50%" stopColor="#ff8a1e" />
          <stop offset="100%" stopColor="#cf300a" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="38" rx="22" ry="5" fill="#1c0a06" />
      <ellipse cx="24" cy="37" rx="12" ry="3" fill="#ff6a1e" opacity="0.7" />
      {/* spark on eruption */}
      <circle className="magma-spark" cx="24" cy="2" r="2.2" fill="#ffd27a" />
      <g className="magma-pop" style={origin(24, 34)}>
        <path d="M24 5 q4 6 0 10 q-4 -4 0 -10z" fill="#ffd27a" className="magma-tuft" style={origin(24, 12)} />
        <path d="M10 30 Q8 14 24 12 Q40 14 38 30 Q38 36 24 36 Q10 36 10 30 Z" fill="url(#magmaBody)" />
        <ellipse cx="18" cy="20" rx="5" ry="3.5" fill="#ffe6a6" opacity="0.45" />
        <circle cx="19" cy="24" r="2.3" fill="#3a1206" />
        <circle cx="29" cy="24" r="2.3" fill="#3a1206" />
        <circle cx="19.7" cy="23.3" r="0.7" fill="#fff" />
        <circle cx="29.7" cy="23.3" r="0.7" fill="#fff" />
        <path d="M18 29 q6 5 12 0" stroke="#3a1206" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const RENDERERS: Record<CreatureKind, () => JSX.Element> = {
  astronaut: Astronaut,
  alien: Alien,
  eagle: Eagle,
  cat: Cat,
  human: Human,
  dog: Dog,
  worm: Worm,
  magma: Magma
};

/**
 * Real-3D models, one entry per creature you have a GLB for. EMPTY by default
 * — every creature falls back to its SVG until you add a model here.
 *
 * To enable real 3D for a creature:
 *   1. Drop a GLB into  public/models/  (e.g. public/models/cat.glb)
 *      — use an UNCOMPRESSED .glb (no Draco/KTX2) so no CSP change is needed.
 *      Free CC0 sources: https://poly.pizza  ·  https://sketchfab.com (CC0 filter)
 *   2. Add it below. `animation` is the clip name to autoplay (optional).
 *
 * On hover, that creature swaps from SVG to an interactive 3D model you can
 * drag to spin. Only the hovered panel mounts a 3D context, so panel
 * performance stays bounded.
 */
// DISABLED: model-viewer instantiates WebAssembly + blob workers on load, which
// the MV3 extension CSP blocks; and these GLBs are static (no animation clips),
// so they can't perform the playful behaviours. The animated SVG creatures below
// are the active experience. To re-enable real 3D, supply *rigged* GLBs (with
// animation clips), re-add entries here, and restore 'wasm-unsafe-eval' in the
// manifest CSP. Files remain in public/models/ and the integration in creature3d.tsx.
export const MODEL_REGISTRY: Partial<Record<CreatureKind, { src: string; alt: string; animation?: string }>> = {};

/**
 * Perches a creature on the top line of a panel and runs its behaviour reel.
 * When the pointer is over the panel the creature breaks out of its reel and
 * chases the cursor (eased follow + facing flip + slight dip), returning to
 * the reel on pointer-leave. Wrap a panel in a relative container, drop this
 * inside. Interactivity is skipped under prefers-reduced-motion.
 */
export function SectionCreature({
  kind,
  position = "right",
  delay = 0,
  offsetTop = -18
}: {
  kind: CreatureKind;
  position?: "left" | "right" | "center";
  delay?: number;
  offsetTop?: number;
}) {
  const Render = RENDERERS[kind];
  const model = MODEL_REGISTRY[kind];
  const pos = position === "right" ? "right-6" : position === "left" ? "left-6" : "left-1/2";
  const behRef = useRef<HTMLDivElement>(null);
  const [show3D, setShow3D] = useState(false);

  // Hover-to-3D: only when a GLB is registered. Mounts the 3D model on
  // pointer-enter, unmounts on leave (frees the WebGL context).
  useEffect(() => {
    if (!model) return;
    const beh = behRef.current;
    const panel = beh?.parentElement?.parentElement;
    if (!beh || !panel) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const enter = () => setShow3D(true);
    const leave = () => setShow3D(false);
    panel.addEventListener("pointerenter", enter);
    panel.addEventListener("pointerleave", leave);
    return () => {
      panel.removeEventListener("pointerenter", enter);
      panel.removeEventListener("pointerleave", leave);
    };
  }, [model]);

  // SVG cursor-chase: only when there's no 3D model for this creature.
  useEffect(() => {
    if (model) return;
    const beh = behRef.current;
    const panel = beh?.parentElement?.parentElement; // .beh -> .creature -> panel
    if (!beh || !panel) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let chasing = false;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let dir = 1;
    let home = { left: 0, top: 0, w: 0, h: 0 };
    const cursor = { x: 0, y: 0 };
    const PAD = 6;
    const MAX_DIP = 84;

    const measureHome = () => {
      const r = beh.getBoundingClientRect();
      home = { left: r.left - tx, top: r.top - ty, w: r.width, h: r.height };
    };

    const tick = () => {
      const p = panel.getBoundingClientRect();
      const centerX = home.left + tx + home.w / 2;
      const targetTx = tx + (cursor.x - centerX) * 0.16;
      const targetTy = ty + (cursor.y - (home.top + ty) - home.h / 2) * 0.16;
      const minTx = p.left + PAD - home.left;
      const maxTx = p.right - PAD - home.w - home.left;
      const minTy = -10;
      const maxTy = MAX_DIP;
      tx = Math.max(minTx, Math.min(maxTx, targetTx));
      ty = Math.max(minTy, Math.min(maxTy, targetTy));
      if (cursor.x - centerX > 2) dir = 1;
      else if (cursor.x - centerX < -2) dir = -1;
      beh.style.transform = `translate(${tx}px, ${ty}px) scaleX(${dir})`;
      if (chasing) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
    };
    const onEnter = (e: PointerEvent) => {
      if (chasing) return;
      chasing = true;
      tx = 0;
      ty = 0;
      beh.classList.add("is-chasing");
      measureHome();
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      chasing = false;
      cancelAnimationFrame(raf);
      beh.classList.remove("is-chasing");
      beh.style.transform = "";
    };

    panel.addEventListener("pointerenter", onEnter);
    panel.addEventListener("pointermove", onMove);
    panel.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      panel.removeEventListener("pointerenter", onEnter);
      panel.removeEventListener("pointermove", onMove);
      panel.removeEventListener("pointerleave", onLeave);
    };
  }, [model]);

  const use3D = Boolean(model) && show3D;

  return (
    <div className={`creature pointer-events-none absolute z-20 ${pos}`} style={{ top: offsetTop }} aria-hidden="true">
      <div ref={behRef} className={`beh beh-${kind} ${use3D ? "beh--3d" : ""}`} style={{ animationDelay: `${delay}s` }}>
        <div className="creature__shadow" />
        {use3D && model ? (
          <Creature3D src={model.src} alt={model.alt} animation={model.animation} size={Math.round(SIZES[kind] * 1.7)} />
        ) : (
          <Render />
        )}
      </div>
    </div>
  );
}
