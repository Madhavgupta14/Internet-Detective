/**
 * Refined atmospheric backdrop for the side panel — a calm space-to-core
 * descent. Base atmosphere (starfield, soft depth glows, horizon, core ember)
 * plus low-contrast silhouette motion layered into each depth band:
 *   space       -> shooting stars, a drifting rocket
 *   sky         -> soft clouds, wind streaks, a passing jet
 *   ground      -> a distant skyline of houses, wind
 *   underground -> burrowing worms, buried skeletons
 *
 * Everything is monochrome / low-opacity / slow so it reads as ambience, not
 * cartoon foreground. Pure SVG/CSS, disabled under prefers-reduced-motion,
 * pointer-events off.
 */

function Rocket() {
  return (
    <svg viewBox="0 0 24 50" width="13" height="27" aria-hidden="true">
      <path d="M12 1 C7 7 6 15 6 26 V38 H18 V26 C18 15 17 7 12 1 Z" fill="#dbe6ff" />
      <path d="M6 30 L1 43 L6 38 Z" fill="#dbe6ff" />
      <path d="M18 30 L23 43 L18 38 Z" fill="#dbe6ff" />
      <circle cx="12" cy="18" r="3" fill="#0a0e1a" />
    </svg>
  );
}

function Jet() {
  return (
    <svg viewBox="0 0 64 20" width="34" height="11" aria-hidden="true">
      <path
        d="M0 10 L40 8 L52 2 L55 3 L49 9 L62 9 L64 10 L49 11 L55 17 L52 18 L40 12 L0 10 Z"
        fill="#e6edfb"
      />
    </svg>
  );
}

function Skyline() {
  return (
    <svg viewBox="0 0 260 56" width="100%" height="56" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <path
        d="M0 56 V40 H14 V30 L22 24 L30 30 V40 H44 V46 H58 V28 H70 V46 H84 V34 L92 28 L100 34 V46 H118 V20 H130 V46 H146 V38 H160 V26 L168 20 L176 26 V46 H192 V44 H206 V30 H218 V44 H232 V36 L240 30 L248 36 V46 H260 V56 Z"
        fill="#0b1020"
      />
    </svg>
  );
}

function WormLine() {
  return (
    <svg viewBox="0 0 44 16" width="30" height="11" aria-hidden="true">
      <path d="M2 12 Q11 4 20 10 Q29 16 42 6" stroke="#b88f76" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Bones() {
  return (
    <svg viewBox="0 0 44 40" width="26" height="24" aria-hidden="true">
      <g stroke="#cdc4b2" strokeWidth="3.4" strokeLinecap="round">
        <line x1="9" y1="13" x2="35" y2="33" />
        <line x1="35" y1="13" x2="9" y2="33" />
      </g>
      <circle cx="22" cy="19" r="9" fill="#d8cfbd" />
      <path d="M16 27 h12 v3 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 z" fill="#d8cfbd" />
      <circle cx="18.5" cy="18" r="2.1" fill="#2b2b2f" />
      <circle cx="25.5" cy="18" r="2.1" fill="#2b2b2f" />
    </svg>
  );
}

export function PanelScenery() {
  return (
    <div className="ambient-layer" aria-hidden="true">
      {/* base atmosphere */}
      <div className="amb-stars" />
      <div className="amb-glow amb-glow--1" />
      <div className="amb-glow amb-glow--2" />
      <div className="amb-horizon" />
      <div className="amb-core" />

      {/* space */}
      <span className="sc-shoot sc-shoot--1" />
      <span className="sc-shoot sc-shoot--2" />
      <span className="sc-shoot sc-shoot--3" />
      <div className="sc-rocket">
        <Rocket />
      </div>

      {/* sky */}
      <span className="sc-cloud sc-cloud--1" />
      <span className="sc-cloud sc-cloud--2" />
      <span className="sc-cloud sc-cloud--3" />
      <span className="sc-wind sc-wind--1" />
      <span className="sc-wind sc-wind--2" />
      <span className="sc-wind sc-wind--3" />
      <div className="sc-jet">
        <Jet />
      </div>

      {/* ground */}
      <div className="sc-skyline">
        <Skyline />
      </div>

      {/* underground */}
      <div className="sc-worm sc-worm--1">
        <WormLine />
      </div>
      <div className="sc-worm sc-worm--2">
        <WormLine />
      </div>
      <div className="sc-bones sc-bones--1">
        <Bones />
      </div>
      <div className="sc-bones sc-bones--2">
        <Bones />
      </div>
    </div>
  );
}
