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

const SKIN: Array<[string, string]> = [
  ["#ffe2c4", "#f4c79b"],
  ["#f6cda6", "#e7b083"],
  ["#e7b48c", "#cf9468"],
  ["#c98a5e", "#a96f45"],
  ["#fcdcc0", "#f0bf99"]
];
const HAIR = ["#3b2a1a", "#5a3a22", "#1f1a16", "#6b4a2e", "#2b2b2f"];

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
  const [skinTop, skinBot] = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const female = g === "female";
  const neutral = g === "neutral";
  const uid = `f${(h % 9973).toString(36)}`;
  const shirt = female ? ["#5b9bff", "#2f6fe0"] : ["#4f8bf0", "#1d4ed8"];
  const pants = female ? ["#3b4a63", "#28344a"] : ["#33415c", "#1f2a40"];
  const width = Math.round((height * 120) / 250);

  const hairShape = female ? (
    <>
      <path
        d="M37 60c-5-22 9-34 23-34s28 12 23 34c-3-3-6-4-8-4 3-13-5-22-15-22s-18 9-15 22c-2 0-5 1-8 4z"
        fill={hair}
      />
      <path d="M38 56c-3 14-3 32 0 50l8-3c-3-14-3-30-1-43zM82 56c3 14 3 32 0 50l-8-3c3-14 3-30 1-43z" fill={hair} />
    </>
  ) : neutral ? (
    <path d="M40 60a20 20 0 0 1 40 0c0-15-9-24-20-24s-20 9-20 24z" fill={hair} />
  ) : (
    <path d="M41 59a19 19 0 0 1 38 0c0-14-8-23-19-23s-19 9-19 23z" fill={hair} />
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
        <linearGradient id={`${uid}skin`} x1="0" x2="0.4" y1="0" y2="1">
          <stop offset="0%" stopColor={skinTop} />
          <stop offset="100%" stopColor={skinBot} />
        </linearGradient>
        <linearGradient id={`${uid}shirt`} x1="0.15" x2="0.9" y1="0" y2="1">
          <stop offset="0%" stopColor={shirt[0]} />
          <stop offset="100%" stopColor={shirt[1]} />
        </linearGradient>
        <linearGradient id={`${uid}pants`} x1="0.15" x2="0.9" y1="0" y2="1">
          <stop offset="0%" stopColor={pants[0]} />
          <stop offset="100%" stopColor={pants[1]} />
        </linearGradient>
        <radialGradient id={`${uid}halo`} cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="rgba(96,165,250,0.35)" />
          <stop offset="100%" stopColor="rgba(96,165,250,0)" />
        </radialGradient>
      </defs>

      {/* soft halo so the figure separates from the background */}
      <ellipse cx="60" cy="120" rx="58" ry="120" fill={`url(#${uid}halo)`} />
      {/* contact shadow */}
      <ellipse cx="60" cy="238" rx="30" ry="7" fill="#040814" opacity="0.45" />

      {/* legs */}
      <rect x="46" y="150" width="13" height="80" rx="6.5" fill={`url(#${uid}pants)`} />
      <rect x="61" y="150" width="13" height="80" rx="6.5" fill={`url(#${uid}pants)`} />
      {/* shoes */}
      <ellipse cx="51" cy="232" rx="10" ry="5" fill="#161c2b" />
      <ellipse cx="69" cy="232" rx="10" ry="5" fill="#161c2b" />

      {/* arms (sleeve + skin + hand) */}
      <rect x="31" y="106" width="11" height="46" rx="5.5" fill={`url(#${uid}skin)`} />
      <rect x="78" y="106" width="11" height="46" rx="5.5" fill={`url(#${uid}skin)`} />
      <rect x="31" y="106" width="11" height="20" rx="5.5" fill={`url(#${uid}shirt)`} />
      <rect x="78" y="106" width="11" height="20" rx="5.5" fill={`url(#${uid}shirt)`} />
      <circle cx="36.5" cy="151" r="5" fill={skinBot} />
      <circle cx="83.5" cy="151" r="5" fill={skinBot} />

      {/* torso / shirt */}
      <path
        d="M42 152 L40 110 Q40 99 52 96 L68 96 Q80 99 80 110 L78 152 Q78 158 71 158 L49 158 Q42 158 42 152 Z"
        fill={`url(#${uid}shirt)`}
      />
      <path d="M52 96 L60 110 L68 96 Z" fill="#ffffff" opacity="0.16" />

      {/* neck + head */}
      <rect x="54" y="80" width="12" height="14" rx="4" fill={skinBot} />
      <circle cx="60" cy="62" r="22" fill={`url(#${uid}skin)`} />
      <circle cx="39" cy="63" r="4" fill={skinBot} />
      <circle cx="81" cy="63" r="4" fill={skinBot} />
      {hairShape}

      {/* face */}
      <circle cx="53" cy="62" r="2.6" fill="#2b2b2f" />
      <circle cx="67" cy="62" r="2.6" fill="#2b2b2f" />
      <circle cx="54" cy="61" r="0.8" fill="#fff" />
      <circle cx="68" cy="61" r="0.8" fill="#fff" />
      <path d="M49 56q4-2.4 8 0" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M63 56q4-2.4 8 0" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M54 70q6 5 12 0" stroke="#b06a44" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      {female ? (
        <>
          <circle cx="47" cy="68" r="2.8" fill="#f59ca0" opacity="0.45" />
          <circle cx="73" cy="68" r="2.8" fill="#f59ca0" opacity="0.45" />
        </>
      ) : null}
      {/* head sheen */}
      <ellipse cx="52" cy="54" rx="8" ry="10" fill="#ffffff" opacity="0.14" />
    </svg>
  );
}
