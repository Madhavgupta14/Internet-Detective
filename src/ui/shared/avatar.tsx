/**
 * Stylized 3D "Pixar-ish" profile character for the side panel.
 *
 * Always shown in place of a real photo (product decision). Gender is inferred
 * from the first name with a neutral fallback; appearance (skin tone, hair
 * color) is deterministic per name so the same person always renders the same.
 *
 * Pure inline SVG + CSS — no images, no libraries, GPU-cheap.
 */

export type Gender = "male" | "female" | "neutral";

/* Common first names. Not exhaustive — anything unknown renders neutral. */
const MALE = new Set([
  "sandeep","rahul","amit","vijay","raj","rajesh","suresh","ramesh","anil","sunil",
  "vikram","arjun","rohit","sachin","manish","ankit","gaurav","nikhil","abhishek","deepak",
  "ashish","pankaj","vivek","sanjay","ajay","akash","aditya","harsh","kunal","varun",
  "siddharth","karan","mohit","naveen","prashant","saurabh","tushar","yash","aman","dhruv",
  "krishna","mohammed","mohammad","ahmed","ali","omar","john","michael","david","james",
  "robert","william","richard","joseph","thomas","charles","daniel","matthew","andrew","mark",
  "paul","steven","kevin","brian","george","edward","ronald","jason","ryan","jacob",
  "eric","jonathan","justin","scott","brandon","benjamin","samuel","gregory","alexander","patrick",
  "jack","tyler","aaron","jose","henry","adam","peter","nathan","kyle","ethan",
  "noah","liam","mason","lucas","oliver","elijah","nitin","gagan","tarun","ravi"
]);

const FEMALE = new Set([
  "priya","neha","pooja","anjali","divya","sneha","swati","kavita","anita","sunita",
  "deepika","shreya","riya","sakshi","aishwarya","nisha","rekha","sushma","meena","geeta",
  "sita","radha","lakshmi","manisha","ritu","payal","komal","simran","megha","isha",
  "tanvi","ananya","aditi","kritika","sanjana","mary","patricia","jennifer","linda","elizabeth",
  "barbara","susan","jessica","sarah","karen","nancy","lisa","margaret","betty","sandra",
  "ashley","dorothy","kimberly","emily","donna","michelle","carol","amanda","melissa","deborah",
  "stephanie","rebecca","laura","helen","sharon","cynthia","kathleen","amy","angela","anna",
  "ruth","brenda","pamela","nicole","katherine","samantha","christine","emma","catherine","olivia",
  "sophia","ava","isabella","mia","charlotte","amelia","grace","hannah","victoria","lily",
  "chloe","zoe","ella","lucy","sofia","shruti","preeti","jyoti","seema","aarti"
]);

/* Names that read either way — keep neutral rather than guess. */
const UNISEX = new Set([
  "alex","sam","jordan","taylor","jamie","casey","riley","morgan","jessie","avery",
  "quinn","charlie","robin","pat","chris","kelly","terry","kim","lee","dana"
]);

export function guessGender(name: string | undefined): Gender {
  const first = (name || "").trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, "") ?? "";
  if (!first) return "neutral";
  if (UNISEX.has(first)) return "neutral";
  if (MALE.has(first)) return "male";
  if (FEMALE.has(first)) return "female";
  return "neutral";
}

/* Deterministic small hash so the same name picks the same look every time. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// [highlight, mid, shadow] per skin tone for soft volumetric face shading
const SKIN3: Array<[string, string, string]> = [
  ["#fff0dd", "#ffe0bf", "#eec199"],
  ["#ffe6cb", "#f6cda6", "#dcab7e"],
  ["#f4cfa8", "#e7b48c", "#c8975f"],
  ["#dca97e", "#c98a5e", "#a56a40"],
  ["#ffe9d2", "#fcdcc0", "#e7bd92"]
];
const HAIR = ["#3b2a1a", "#5a3a22", "#1f1a16", "#6b4a2e", "#2b2b2f"];
const HAIR_HI = ["#6b4f30", "#8a6240", "#463c34", "#9c7148", "#52525e"];
const HAIR_DARK = ["#23180e", "#3a2514", "#120f0c", "#46301c", "#191920"];
const IRIS = ["#5b3a1f", "#3f2a18", "#6b4a2e", "#33597e", "#4a3a30"];

// kept for back-compat with the simpler bust avatar
const SKIN: Array<[string, string]> = SKIN3.map(([hi, mid, lo]) => [mid, lo]) as Array<[string, string]>;

export function ProfileCharacter({
  name,
  gender,
  size = 96
}: {
  name: string;
  gender?: Gender;
  size?: number;
}) {
  const g = gender ?? guessGender(name);
  const h = hash(name || "spectra");
  const [skinTop, skinBot] = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const female = g === "female";
  const neutral = g === "neutral";
  const uid = `c${(h % 9973).toString(36)}`;

  // hairstyle per gender
  const hairShape = female ? (
    <>
      <path
        d="M30 56c-5-22 8-36 30-36s35 14 30 36c-3-3-6-5-9-5 4-13-6-23-21-23s-25 10-21 23c-3 0-6 2-9 5z"
        fill={hair}
      />
      <path
        d="M31 52c-3 12-3 24 0 36l8-3c-3-12-3-22-1-31zM89 52c3 12 3 24 0 36l-8-3c3-12 3-22 1-31z"
        fill={hair}
      />
    </>
  ) : neutral ? (
    <path d="M36 52a24 24 0 0 1 48 0c0-17-10-27-24-27s-24 10-24 27z" fill={hair} />
  ) : (
    <path d="M37 51a23 23 0 0 1 46 0c0-16-9-26-23-26s-23 10-23 26z" fill={hair} />
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${name || "Profile"} character`}
      className="block"
    >
      <defs>
        <radialGradient id={`${uid}bg`} cx="50%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#8cc0ff" />
          <stop offset="55%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <linearGradient id={`${uid}skin`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={skinTop} />
          <stop offset="100%" stopColor={skinBot} />
        </linearGradient>
        <radialGradient id={`${uid}gloss`} cx="35%" cy="24%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* sphere */}
      <circle cx="60" cy="60" r="60" fill={`url(#${uid}bg)`} />
      {/* contact shadow inside sphere */}
      <ellipse cx="60" cy="108" rx="38" ry="20" fill="#0b1f4d" opacity="0.45" />
      {/* shoulders */}
      <path d="M34 78h52v26a26 26 0 0 1-52 0z" fill={female ? "#1d4ed8" : "#1e40af"} />
      <path d="M34 78h52v6H34z" fill="#ffffff" opacity="0.12" />
      {/* neck */}
      <rect x="52" y="68" width="16" height="16" rx="6" fill={skinBot} />
      {/* head */}
      <circle cx="60" cy="52" r="22" fill={`url(#${uid}skin)`} />
      {/* ears */}
      <circle cx="38" cy="53" r="4.5" fill={skinBot} />
      <circle cx="82" cy="53" r="4.5" fill={skinBot} />
      {hairShape}
      {/* eyes */}
      <circle cx="52" cy="52" r="2.8" fill="#2b2b2f" />
      <circle cx="68" cy="52" r="2.8" fill="#2b2b2f" />
      <circle cx="53" cy="51" r="0.9" fill="#fff" />
      <circle cx="69" cy="51" r="0.9" fill="#fff" />
      {/* brows */}
      <path d="M48 46q4-2.5 8 0" stroke={hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M64 46q4-2.5 8 0" stroke={hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* smile */}
      <path d="M53 60q7 5 14 0" stroke="#b06a44" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* blush on female variant */}
      {female ? (
        <>
          <circle cx="46" cy="59" r="3" fill="#f59ca0" opacity="0.45" />
          <circle cx="74" cy="59" r="3" fill="#f59ca0" opacity="0.45" />
        </>
      ) : null}
      {/* glossy 3D sheen */}
      <circle cx="60" cy="60" r="60" fill={`url(#${uid}gloss)`} />
    </svg>
  );
}

/**
 * Full-length standing character — floats in the panel's "space" region.
 * Transparent background (no sphere) so it reads as a figure in the scene.
 */
export function ProfileCharacterFull({
  name,
  gender,
  height = 184
}: {
  name: string;
  gender?: Gender;
  height?: number;
}) {
  const g = gender ?? guessGender(name);
  const h = hash(name || "spectra");
  const [skinHi, skinMid, skinLo] = SKIN3[h % SKIN3.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const hairHi = HAIR_HI[(h >> 3) % HAIR_HI.length];
  const hairDark = HAIR_DARK[(h >> 3) % HAIR_DARK.length];
  const iris = IRIS[(h >> 5) % IRIS.length];
  const female = g === "female";
  const neutral = g === "neutral";
  const uid = `f${(h % 9973).toString(36)}`;
  const shirt = female ? ["#5b9bff", "#2f6fe0"] : ["#4f8bf0", "#1d4ed8"];
  const pants = female ? ["#3b4a63", "#28344a"] : ["#33415c", "#1f2a40"];
  const width = Math.round((height * 120) / 250);
  const hairFill = `url(#${uid}hairg)`;

  // Hair sits over a slightly egg-shaped head (face path: y28–84, x37–83).
  // Layered locks + strand lines + sheen for a realistic, flowing look.
  const hairShape = female ? (
    <g>
      <path d="M33 60 C31 33 45 20 60 20 C75 20 89 33 87 60 C84 49 78 41 68 41 Q60 31 52 41 C42 41 36 49 33 60 Z" fill={hairFill} />
      <path d="M34 56 C28 76 30 99 36 119 L46 113 C40 93 40 72 45 57 Z" fill={hairFill} />
      <path d="M86 56 C92 76 90 99 84 119 L74 113 C80 93 80 72 75 57 Z" fill={hairFill} />
      {/* lock seams (depth) */}
      <path d="M40 58 Q36 88 40 116" stroke={hairDark} strokeWidth="0.9" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M80 58 Q84 88 80 116" stroke={hairDark} strokeWidth="0.9" fill="none" opacity="0.5" strokeLinecap="round" />
      {/* strand sheen */}
      <path d="M44 57 Q41 86 45 112" stroke={hairHi} strokeWidth="0.8" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M76 57 Q79 86 75 112" stroke={hairHi} strokeWidth="0.8" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M40 33 Q52 23 64 27" stroke={hairHi} strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round" />
      <ellipse cx="54" cy="29" rx="15" ry="5" fill={hairHi} opacity="0.35" transform="rotate(-10 54 29)" />
    </g>
  ) : neutral ? (
    <g>
      <path d="M35 58 C33 34 46 21 60 21 C74 21 87 34 85 58 C82 48 76 41 60 41 C44 41 38 48 35 58 Z" fill={hairFill} />
      <path d="M50 41 Q55 33 62 36 Q57 40 55 45 Z" fill={hairDark} opacity="0.4" />
      <path d="M42 53 Q54 33 70 35" stroke={hairHi} strokeWidth="0.9" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M40 56 Q52 37 68 37" stroke={hairHi} strokeWidth="0.7" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d="M72 36 Q82 43 84 55" stroke={hairDark} strokeWidth="0.8" fill="none" opacity="0.4" strokeLinecap="round" />
      <ellipse cx="55" cy="30" rx="14" ry="5" fill={hairHi} opacity="0.4" transform="rotate(-12 55 30)" />
    </g>
  ) : (
    <g>
      <path d="M35 57 C33 33 46 20 60 20 C75 20 88 34 85 57 C82 47 76 40 67 40 Q60 30 51 41 C44 41 38 48 35 57 Z" fill={hairFill} />
      {/* tufts at the hairline */}
      <path d="M51 41 Q55 33 63 35 Q57 39 55 45 Z" fill={hairDark} opacity="0.5" />
      <path d="M67 40 Q72 34 79 42 Q72 41 69 46 Z" fill={hairDark} opacity="0.45" />
      {/* strand sheen following the sweep */}
      <path d="M41 50 Q52 29 67 31" stroke={hairHi} strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M39 55 Q50 33 65 32" stroke={hairHi} strokeWidth="0.7" fill="none" opacity="0.32" strokeLinecap="round" />
      <path d="M70 32 Q81 40 84 53" stroke={hairDark} strokeWidth="0.8" fill="none" opacity="0.4" strokeLinecap="round" />
      <ellipse cx="55" cy="29" rx="14" ry="4.5" fill={hairHi} opacity="0.42" transform="rotate(-12 55 29)" />
    </g>
  );

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 250"
      role="img"
      aria-label={`${name || "Profile"} character`}
      className="block"
    >
      <defs>
        {/* volumetric face: light top-left, shaded lower-right */}
        <radialGradient id={`${uid}face`} cx="40%" cy="32%" r="78%">
          <stop offset="0%" stopColor={skinHi} />
          <stop offset="55%" stopColor={skinMid} />
          <stop offset="100%" stopColor={skinLo} />
        </radialGradient>
        <linearGradient id={`${uid}skin`} x1="0" x2="0.5" y1="0" y2="1">
          <stop offset="0%" stopColor={skinMid} />
          <stop offset="100%" stopColor={skinLo} />
        </linearGradient>
        <linearGradient id={`${uid}shirt`} x1="0.1" x2="0.95" y1="0" y2="1">
          <stop offset="0%" stopColor={shirt[0]} />
          <stop offset="100%" stopColor={shirt[1]} />
        </linearGradient>
        <linearGradient id={`${uid}pants`} x1="0.1" x2="0.95" y1="0" y2="1">
          <stop offset="0%" stopColor={pants[0]} />
          <stop offset="100%" stopColor={pants[1]} />
        </linearGradient>
        <radialGradient id={`${uid}halo`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="rgba(120,170,255,0.34)" />
          <stop offset="100%" stopColor="rgba(120,170,255,0)" />
        </radialGradient>
        {/* hair: sheen at the crown → mid → dark roots/ends */}
        <linearGradient id={`${uid}hairg`} x1="0.3" x2="0.7" y1="0" y2="1">
          <stop offset="0%" stopColor={hairHi} />
          <stop offset="42%" stopColor={hair} />
          <stop offset="100%" stopColor={hairDark} />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="118" rx="58" ry="120" fill={`url(#${uid}halo)`} />
      <ellipse cx="60" cy="238" rx="30" ry="7" fill="#040814" opacity="0.45" />

      {/* legs */}
      <rect x="46" y="150" width="13" height="80" rx="6.5" fill={`url(#${uid}pants)`} />
      <rect x="61" y="150" width="13" height="80" rx="6.5" fill={`url(#${uid}pants)`} />
      <rect x="61" y="150" width="13" height="80" rx="6.5" fill="#000" opacity="0.12" />
      <ellipse cx="51" cy="232" rx="10" ry="5" fill="#161c2b" />
      <ellipse cx="69" cy="232" rx="10" ry="5" fill="#10141f" />

      {/* arms */}
      <rect x="31" y="106" width="11" height="46" rx="5.5" fill={`url(#${uid}skin)`} />
      <rect x="78" y="106" width="11" height="46" rx="5.5" fill={`url(#${uid}skin)`} />
      <rect x="31" y="106" width="11" height="20" rx="5.5" fill={`url(#${uid}shirt)`} />
      <rect x="78" y="106" width="11" height="20" rx="5.5" fill={`url(#${uid}shirt)`} />
      <circle cx="36.5" cy="151" r="5" fill={skinLo} />
      <circle cx="83.5" cy="151" r="5" fill={skinLo} />

      {/* torso */}
      <path
        d="M42 152 L40 110 Q40 99 52 96 L68 96 Q80 99 80 110 L78 152 Q78 158 71 158 L49 158 Q42 158 42 152 Z"
        fill={`url(#${uid}shirt)`}
      />
      <path d="M61 96 L78 110 L78 152 Q78 158 71 158 L61 158 Z" fill="#000" opacity="0.1" />
      <path d="M52 96 L60 108 L68 96 Z" fill="#ffffff" opacity="0.18" />

      {/* neck + soft jaw shadow under chin */}
      <rect x="54" y="80" width="12" height="13" rx="4" fill={skinLo} />
      <ellipse cx="60" cy="84" rx="12" ry="5" fill={skinLo} opacity="0.5" />

      {/* ears */}
      <ellipse cx="36" cy="58" rx="4" ry="6" fill={skinMid} />
      <ellipse cx="84" cy="58" rx="4" ry="6" fill={skinMid} />
      <ellipse cx="36.5" cy="58" rx="1.6" ry="3" fill={skinLo} opacity="0.6" />
      <ellipse cx="83.5" cy="58" rx="1.6" ry="3" fill={skinLo} opacity="0.6" />

      {/* head (egg-shaped) */}
      <path d="M60 28 C45 28 37 39 37 54 C37 70 47 84 60 84 C73 84 83 70 83 54 C83 39 75 28 60 28 Z" fill={`url(#${uid}face)`} />
      {/* cheek + jaw shading for volume */}
      <path d="M60 84 C71 84 80 73 82 60 C80 76 72 86 60 86 C48 86 40 76 38 60 C40 73 49 84 60 84 Z" fill={skinLo} opacity="0.4" />
      {/* forehead highlight */}
      <ellipse cx="52" cy="42" rx="11" ry="8" fill="#ffffff" opacity="0.16" />

      {hairShape}

      {/* eyebrows */}
      <path d="M44 51 Q51 47 57 50" stroke={hair} strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <path d="M63 50 Q69 47 76 51" stroke={hair} strokeWidth="2.1" fill="none" strokeLinecap="round" />

      {/* eyes — large, with iris, pupil, catchlight, lid */}
      <ellipse cx="51" cy="60" rx="5.2" ry="6.2" fill="#fbfdff" />
      <ellipse cx="69" cy="60" rx="5.2" ry="6.2" fill="#fbfdff" />
      <circle cx="51.5" cy="61" r="3.5" fill={iris} />
      <circle cx="69.5" cy="61" r="3.5" fill={iris} />
      <circle cx="51.5" cy="61" r="1.7" fill="#1b1b22" />
      <circle cx="69.5" cy="61" r="1.7" fill="#1b1b22" />
      <circle cx="50.2" cy="59.4" r="1.1" fill="#fff" />
      <circle cx="68.2" cy="59.4" r="1.1" fill="#fff" />
      {/* upper lids / lashes */}
      <path d="M45.6 56.8 Q51 53.4 56.4 56.8" stroke="#3a2a24" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M63.6 56.8 Q69 53.4 74.4 56.8" stroke="#3a2a24" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* soft button nose */}
      <path d="M58.4 64 Q57.6 69 60 70.4 Q62.4 69 61.6 64" fill={skinLo} opacity="0.45" />
      <ellipse cx="60" cy="69.6" rx="2.4" ry="1.3" fill={skinLo} opacity="0.5" />

      {/* warm smile */}
      <path d="M52 74 Q60 81 68 74" stroke="#a4543f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M54 75.5 Q60 79.5 66 75.5" stroke="#ffffff" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.35" />

      {/* cheeks */}
      <circle cx="46" cy="69" r="3.4" fill="#f59ca0" opacity={female ? "0.4" : "0.22"} />
      <circle cx="74" cy="69" r="3.4" fill="#f59ca0" opacity={female ? "0.4" : "0.22"} />
    </svg>
  );
}
