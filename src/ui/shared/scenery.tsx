/**
 * Crisp 2D background scenery for the side panel, anchored to depth bands that
 * track the space -> core gradient (percentages match the gradient stops):
 *   space       -> starfield + falling stars
 *   sky         -> drifting clouds + a passing plane
 *   ground      -> trees + wind-swaying grass on a ground line
 *   underground -> burrowing worms + buried skeletons
 *   core        -> molten glow
 *
 * Pure SVG/CSS, no blur. All motion is in index.css and disabled under
 * prefers-reduced-motion. Decorative — sits in the ambient layer behind
 * content with pointer-events disabled.
 */

function Plane() {
  return (
    <svg viewBox="0 0 64 24" width="36" height="14" aria-hidden="true">
      <path d="M2 13 L40 10 L52 4 L54 5 L48 11 L60 11 L63 13 L48 15 L54 21 L52 22 L38 16 L4 15 Z" fill="#e6edf6" />
      <path d="M40 10 L52 4 L54 5 L48 11 Z" fill="#c2d0e2" />
      <circle cx="14" cy="13" r="1" fill="#9fb2c9" />
      <circle cx="20" cy="13" r="1" fill="#9fb2c9" />
    </svg>
  );
}

function Tree({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 60" width="40" height="55" className={className} aria-hidden="true">
      <rect x="19" y="36" width="6" height="22" rx="2" fill="#5b3b22" />
      <ellipse cx="22" cy="40" rx="13" ry="5" fill="#000" opacity="0.12" />
      <circle cx="22" cy="24" r="15" fill="#3f7d34" />
      <circle cx="11" cy="31" r="10" fill="#4a8c3c" />
      <circle cx="33" cy="31" r="10" fill="#356b29" />
      <circle cx="22" cy="20" r="9" fill="#56a043" opacity="0.85" />
    </svg>
  );
}

function PineTree({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 60" width="32" height="48" className={className} aria-hidden="true">
      <rect x="18" y="46" width="4" height="12" rx="1.5" fill="#5b3b22" />
      <path d="M20 6 L32 26 L25 26 L34 42 L6 42 L15 26 L8 26 Z" fill="#2f7a3a" />
      <path d="M20 6 L26 16 L20 16 Z" fill="#3c8f48" />
    </svg>
  );
}

function Worm({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" width="30" height="15" className={className} aria-hidden="true">
      <path d="M4 14 Q10 6 18 12 Q26 18 34 8" stroke="#d98e76" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="8" r="3" fill="#e2a48f" />
      <circle cx="35" cy="7" r="0.7" fill="#3a2a2a" />
    </svg>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 40" width="34" height="31" className={className} aria-hidden="true">
      {/* crossed bones */}
      <g stroke="#e9e4d8" strokeWidth="4" strokeLinecap="round">
        <line x1="8" y1="12" x2="36" y2="34" />
        <line x1="36" y1="12" x2="8" y2="34" />
      </g>
      <g fill="#f3efe5">
        <circle cx="7" cy="11" r="3" />
        <circle cx="11" cy="13" r="3" />
        <circle cx="37" cy="11" r="3" />
        <circle cx="33" cy="13" r="3" />
        <circle cx="7" cy="35" r="3" />
        <circle cx="11" cy="33" r="3" />
        <circle cx="37" cy="35" r="3" />
        <circle cx="33" cy="33" r="3" />
      </g>
      {/* skull */}
      <circle cx="22" cy="18" r="11" fill="#f3efe5" />
      <path d="M16 28 h12 v3 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 z" fill="#f3efe5" />
      <circle cx="18" cy="17" r="2.6" fill="#2b2b2f" />
      <circle cx="26" cy="17" r="2.6" fill="#2b2b2f" />
      <path d="M22 20 l-1.6 3 h3.2 z" fill="#2b2b2f" />
      <line x1="20" y1="30" x2="20" y2="34" stroke="#cbc6b8" strokeWidth="1.4" />
      <line x1="24" y1="30" x2="24" y2="34" stroke="#cbc6b8" strokeWidth="1.4" />
    </svg>
  );
}

export function PanelScenery() {
  return (
    <div className="ambient-layer" aria-hidden="true">
      {/* ---------- SPACE ---------- */}
      <div className="zone zone-space">
        <div className="starfield2" />
        <span className="falling-star fs1" />
        <span className="falling-star fs2" />
        <span className="falling-star fs3" />
      </div>

      {/* ---------- SKY ---------- */}
      <div className="zone zone-sky">
        <div className="sun" />
        <span className="cloud2 cl1" />
        <span className="cloud2 cl2" />
        <span className="cloud2 cl3" />
        <span className="cloud2 cl4" />
        <div className="plane">
          <Plane />
        </div>
        {/* parallax hills at the horizon for depth */}
        <div className="hill hill-back" />
        <div className="hill hill-mid" />
        <div className="haze" />
      </div>

      {/* ---------- GROUND ---------- */}
      <div className="zone zone-ground">
        {/* receding 3D floor */}
        <div className="ground-plane">
          <div className="ground-furrows" />
        </div>
        {/* far, small trees near the horizon */}
        <Tree className="tree tree-far tree-f1" />
        <PineTree className="tree tree-far tree-f2" />
        {/* near, large trees */}
        <Tree className="tree tree-a" />
        <PineTree className="tree tree-b" />
        <Tree className="tree tree-c" />
        <div className="ground-line" />
        <div className="grass-row grass-back">
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${(i % 7) * 0.22}s` }} />
          ))}
        </div>
        <div className="grass-row grass-front">
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${(i % 6) * 0.28}s` }} />
          ))}
        </div>
      </div>

      {/* ---------- UNDERGROUND + CORE ---------- */}
      <div className="zone zone-under">
        <div className="rock-strata" />
        <Worm className="dirt-worm dw1" />
        <Worm className="dirt-worm dw2" />
        <Skeleton className="bones bn1" />
        <Skeleton className="bones bn2" />
      </div>
      <div className="panel-core-glow" />
    </div>
  );
}
