import { AtSign, BriefcaseBusiness, ChevronDown, FileText, Loader2, LogOut, Mail, MessageSquare, RefreshCw, Search, Sparkles, Target, Upload, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AuthState, EmailResult, LinkedInAnalysis, OutreachSuggestions, ScoreResult } from "../../shared/types";
import type { EmailFinderResult } from "../../background/emailFinder";
import "../shared/index.css";
import { Button, CopyButton, EmptyState, StatusLine } from "../shared/components";
import { ProfileCharacterFull } from "../shared/avatar";
import { PanelScenery } from "../shared/scenery";
import { sendMessage } from "../shared/runtime";
import { parseResumeFile, summarizeResume, type ParsedResume } from "../../intelligence/resume/resumeParser";
import { getLatestResume, saveResume, type StoredResume } from "../../storage/db";

const defaultOutreach: OutreachSuggestions = {
  emailOpener: "",
  connectionRequest: "",
  icebreaker: ""
};

type FocusKey = "decisionMaker" | "founder" | "hiringIntent";
type OutreachKey = keyof OutreachSuggestions;

const scoreMeta: Record<FocusKey, { label: string; shortLabel: string; icon: typeof Target }> = {
  decisionMaker: { label: "Decision Maker", shortLabel: "Decision", icon: Target },
  founder: { label: "Founder", shortLabel: "Founder", icon: UserRound },
  hiringIntent: { label: "Hiring Intent", shortLabel: "Hiring", icon: BriefcaseBusiness }
};

const outreachMeta: Record<OutreachKey, { label: string; icon: typeof Mail }> = {
  emailOpener: { label: "Email", icon: Mail },
  connectionRequest: { label: "LinkedIn", icon: MessageSquare },
  icebreaker: { label: "Icebreaker", icon: Sparkles }
};

function scoreBand(value: number): { label: string; className: string; barClassName: string } {
  if (value >= 70) {
    return { label: "High", className: "bg-moss text-white", barClassName: "bg-moss" };
  }
  if (value >= 35) {
    return { label: "Medium", className: "bg-brass text-white", barClassName: "bg-brass" };
  }
  return { label: "Low", className: "bg-ink/10 text-ink/65", barClassName: "bg-ink/35" };
}

function scoreMeaning(key: FocusKey, value: number): string {
  const band = scoreBand(value).label;
  if (key === "decisionMaker") {
    return band === "High" ? "Likely authority or influence." : band === "Medium" ? "Some authority signals." : "Weak buying-authority evidence.";
  }
  if (key === "founder") {
    return band === "High" ? "Strong founder/operator signal." : band === "Medium" ? "Some founder context." : "Weak founder evidence.";
  }
  return band === "High" ? "Visible hiring motion." : band === "Medium" ? "Possible hiring context." : "No clear hiring scope.";
}

function ProfileAvatar({ name }: { name: string }) {
  return (
    <div className="character-3d relative shrink-0" aria-hidden="true">
      <div className="character-3d__float">
        <ProfileCharacterFull name={name} height={188} />
      </div>
    </div>
  );
}

function ScoreRow({ label, score, active, onClick }: { label: FocusKey; score: ScoreResult; active: boolean; onClick: () => void }) {
  const meta = scoreMeta[label];
  const band = scoreBand(score.value);
  const Icon = meta.icon;

  return (
    <button
      className={`flex items-center gap-3 rounded-xl border bg-white/85 px-3 py-2 text-left backdrop-blur transition hover:-translate-y-0.5 hover:shadow-soft ${
        active ? "border-brand-500 ring-1 ring-brand-500/30 shadow-soft" : "border-ink/10"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4 shrink-0 text-signal" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-ink/70">{meta.shortLabel}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tabular-nums">{score.value}</span>
            <span className={`rounded px-1 py-0.5 text-[9px] font-semibold ${band.className}`}>{band.label}</span>
          </div>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div className={`h-full rounded-full ${band.barClassName}`} style={{ width: `${score.value}%` }} />
        </div>
      </div>
    </button>
  );
}

function FocusPanel({ label, score }: { label: FocusKey; score: ScoreResult }) {
  const meta = scoreMeta[label];
  const usefulFactors = score.factors.filter((factor) => factor.impact > 0);

  return (
    <section className="rounded-2xl border border-white/55 bg-white/80 p-4 shadow-panel backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{meta.label}</h2>
          <p className="mt-1 text-sm leading-5 text-ink/65">{scoreMeaning(label, score.value)}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums">{score.value}/100</div>
          <div className="mt-1 text-xs text-ink/45">{Math.round(score.confidence * 100)}% confidence</div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {usefulFactors.length > 0 ? (
          usefulFactors.slice(0, 4).map((factor, index) => (
            <details className="rounded-md border border-ink/10 bg-paper px-3 py-2" key={`${factor.label}-${factor.evidence}`} open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-ink">
                <span>{factor.label}</span>
                <span className="flex items-center gap-1 text-ink/45">
                  +{factor.impact}
                  <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </summary>
              <p className="mt-2 text-xs leading-5 text-ink/60">{factor.evidence}</p>
            </details>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-ink/15 bg-paper px-3 py-3 text-xs leading-5 text-ink/55">
            No strong evidence was found for this category.
          </div>
        )}
      </div>
    </section>
  );
}

function SignalList({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">{label}</h3>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span className="rounded-md bg-white px-2 py-1 text-xs text-ink/70" key={value}>
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-ink/55">{empty}</p>
      )}
    </div>
  );
}

function OutreachPanel({ outreach, selected, onSelect }: { outreach: OutreachSuggestions; selected: OutreachKey; onSelect: (key: OutreachKey) => void }) {
  const value = outreach[selected];
  const meta = outreachMeta[selected];

  return (
    <section className="rounded-2xl border border-white/55 bg-white/80 p-4 shadow-panel backdrop-blur-md">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(outreachMeta) as OutreachKey[]).map((key) => {
          const item = outreachMeta[key];
          const Icon = item.icon;
          return (
            <button
              className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition ${
                selected === key ? "border-transparent brand-gradient text-white shadow-soft" : "border-ink/10 bg-paper text-ink/70 hover:border-brand-400 hover:text-brand-700"
              }`}
              key={key}
              onClick={() => onSelect(key)}
              type="button"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-md bg-paper p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">{meta.label}</h2>
          {value ? <CopyButton value={value} /> : null}
        </div>
        <p className="min-h-20 whitespace-pre-line text-sm leading-6 text-ink/80">
          {value || "No outreach generated yet. Start Ollama and keep local LLM generation enabled in Settings."}
        </p>
      </div>
    </section>
  );
}

const outreachIntents = ["Hiring", "Pitching", "Partnership", "Recruiting", "Sales", "Custom"];

function resumePayload(resume: ParsedResume | StoredResume) {
  return {
    fileName: resume.fileName,
    fileSize: resume.fileSize,
    mimeType: resume.mimeType,
    kind: resume.kind,
    text: resume.text,
    charCount: resume.charCount,
    wordCount: resume.wordCount,
    pageCount: resume.pageCount,
    warnings: resume.warnings
  };
}

function ProfileOutreachBuilder({
  analysis,
  onGenerated,
  signedIn,
  onSignIn,
  authBusy
}: {
  analysis: LinkedInAnalysis;
  onGenerated: (analysis: LinkedInAnalysis) => void;
  signedIn: boolean;
  onSignIn: () => void;
  authBusy: boolean;
}) {
  const [resume, setResume] = useState<ParsedResume | StoredResume | undefined>();
  const [intent, setIntent] = useState("Hiring");
  const [contextPrompt, setContextPrompt] = useState("");
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getLatestResume(),
      sendMessage<{ contextPrompt: string; intent: string; hasResume: boolean; resumeName?: string; updatedAt: string } | undefined>({
        type: "GET_OUTREACH_PREFERENCES"
      })
    ])
      .then(([latestResume, prefs]) => {
        if (!mounted) {
          return;
        }
        setResume(latestResume);
        if (prefs?.intent) {
          setIntent(prefs.intent);
        }
        if (prefs?.contextPrompt) {
          setContextPrompt(prefs.contextPrompt);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    setParsing(true);
    setError("");
    try {
      const parsed = await parseResumeFile(file);
      const stored = await saveResume(resumePayload(parsed));
      setResume(stored);
      await sendMessage({
        type: "SAVE_OUTREACH_PREFERENCES",
        preferences: {
          contextPrompt,
          intent,
          hasResume: true,
          resumeName: parsed.fileName,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse this resume.");
    } finally {
      setParsing(false);
    }
  }

  async function generate() {
    if (!signedIn) {
      onSignIn();
      return;
    }
    if (!resume) {
      setError("Upload a resume before generating profile-aware outreach.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      await sendMessage({
        type: "SAVE_OUTREACH_PREFERENCES",
        preferences: {
          contextPrompt,
          intent,
          hasResume: true,
          resumeName: resume.fileName,
          updatedAt: new Date().toISOString()
        }
      });
      const generated = await sendMessage<LinkedInAnalysis>({
        type: "GENERATE_PROFILE_OUTREACH",
        resume: resumePayload(resume),
        contextPrompt,
        intent
      });
      onGenerated(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile outreach generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/55 bg-white/80 p-4 shadow-panel backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Profile outreach builder</h2>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            Use your resume and this LinkedIn profile to generate outreach for the context you choose.
          </p>
        </div>
        {resume ? (
          <button
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ink/15 bg-white text-ink/60 hover:text-ink"
            onClick={() => setResume(undefined)}
            title="Clear resume"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-ink/20 bg-paper px-3 py-4 text-sm font-medium text-ink/70 hover:border-signal/60">
        {parsing ? <Loader2 className="h-4 w-4 animate-spin text-signal" /> : <Upload className="h-4 w-4 text-signal" />}
        <span>{parsing ? "Parsing resume locally" : resume ? "Upload a different resume" : "Upload resume"}</span>
        <input
          accept=".pdf,.docx,.txt,.md,.markdown,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={parsing || generating}
          onChange={(event) => {
            handleFile(event.currentTarget.files?.[0]).catch(() => undefined);
            event.currentTarget.value = "";
          }}
          type="file"
        />
      </label>

      {resume ? (
        <div className="mt-3 rounded-md border border-ink/10 bg-paper p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink/70">
            <FileText className="h-4 w-4 shrink-0 text-signal" />
            <span className="truncate">{summarizeResume(resume)}</span>
          </div>
          {resume.warnings.length > 0 ? <p className="mt-2 text-xs leading-5 text-clay">{resume.warnings.slice(0, 2).join(" ")}</p> : null}
          <p className="mt-2 line-clamp-5 whitespace-pre-line text-xs leading-5 text-ink/60">{resume.text}</p>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="grid grid-cols-3 gap-2">
          {outreachIntents.map((value) => (
            <button
              className={`h-9 rounded-md border px-2 text-xs font-semibold transition ${
                intent === value ? "border-signal bg-signal text-white" : "border-ink/10 bg-paper text-ink/70 hover:border-signal/50"
              }`}
              key={value}
              onClick={() => setIntent(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
        <textarea
          className="mt-3 min-h-24 w-full resize-y rounded-md border border-ink/15 bg-white px-3 py-2 text-sm leading-6 text-ink placeholder:text-ink/35"
          onChange={(event) => setContextPrompt(event.currentTarget.value)}
          placeholder="Add context, e.g. I want to ask about frontend roles, pitch a SaaS tool, request a partnership intro, or recruit this person."
          value={contextPrompt}
        />
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-clay/25 bg-clay/5 px-3 py-2 text-xs leading-5 text-clay">{error}</div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs leading-5 text-ink/50">
          Target: <span className="font-medium text-ink/70">{analysis.profile.name || "LinkedIn profile"}</span>
        </div>
        {signedIn ? (
          <Button disabled={parsing || generating || !resume} onClick={generate} title="Generate profile-aware outreach">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
        ) : (
          <Button disabled={authBusy} onClick={onSignIn} title="Sign in with Google to generate outreach">
            {authBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
            Sign in to generate
          </Button>
        )}
      </div>
      {!signedIn && (
        <p className="mt-2 text-[11px] leading-5 text-ink/50">Sign in with Google to generate outreach copy.</p>
      )}
    </section>
  );
}

function confidenceBadge(c: number, source: EmailResult["source"]): string {
  if (source === "hunter") return "bg-moss text-white";
  if (c >= 40) return "bg-brass/20 text-brass";
  return "bg-ink/8 text-ink/50";
}

type EmailFinderResponse = EmailFinderResult & {
  usesRemaining?: number;
  freeLimit?: number;
  usingOwnKey?: boolean;
};

function EmailFinderPanel({
  name,
  domain,
  auth,
  onSignIn,
  authBusy
}: {
  name: string;
  domain: string;
  auth: AuthState | null;
  onSignIn: () => void;
  authBusy: boolean;
}) {
  const [results, setResults] = useState<EmailResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<EmailFinderResponse | null>(null);

  const usingOwnKey = Boolean(auth?.usingOwnKey);
  const signedIn = Boolean(auth?.user);
  const unlocked = signedIn || usingOwnKey;

  async function find() {
    if (!unlocked) {
      onSignIn();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await sendMessage<EmailFinderResponse>({ type: "FIND_EMAIL" });
      setResults(res.results);
      setMeta(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  // Prefer the freshest credit count from the last lookup, else the account state.
  const usesRemaining = meta?.usesRemaining ?? auth?.usesRemaining;
  const freeLimit = meta?.freeLimit ?? auth?.freeLimit;
  const limited = !usingOwnKey && typeof usesRemaining === "number";
  const noFreeLeft = limited && usesRemaining === 0;

  return (
    <section className="rounded-2xl border border-white/55 bg-white/80 p-4 shadow-panel backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AtSign className="h-4 w-4 text-signal" />
          <h2 className="text-sm font-semibold">Find email</h2>
        </div>
        {unlocked ? (
          <Button disabled={loading} onClick={find} variant="secondary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Searching…" : results ? "Refresh" : "Find"}
          </Button>
        ) : (
          <Button disabled={authBusy} onClick={onSignIn} variant="secondary">
            {authBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
            Sign in
          </Button>
        )}
      </div>

      {results === null && !error && (
        <p className="mt-3 text-xs leading-5 text-ink/50">
          Finds the most likely email for <span className="font-medium text-ink/70">{name}</span> at{" "}
          <span className="font-medium text-ink/70">{domain}</span>.{" "}
          {usingOwnKey
            ? "Using your own Hunter.io API key (unlimited)."
            : "Sign in with Google for free verified lookups, or add your own Hunter.io API key in Settings for unlimited results."}
        </p>
      )}

      {error && <p className="mt-3 text-xs text-clay">{error}</p>}

      {limited && (
        <p className="mt-3 text-[11px] leading-5 text-ink/50">
          {noFreeLeft ? (
            <>
              You&apos;ve used all {freeLimit} free verified lookups for this account. Showing best-guess patterns. Add
              your own Hunter.io API key in Settings for unlimited results.
            </>
          ) : (
            <>
              <span className="font-medium text-ink/70">{usesRemaining}</span> of {freeLimit} free verified lookups left
              on this account.
            </>
          )}
        </p>
      )}

      {results && results.length > 0 && (
        <div className="mt-3 grid gap-2">
          {results.map((r) => (
            <div className="flex items-center justify-between gap-3 rounded-md border border-ink/10 bg-paper px-3 py-2" key={r.email}>
              <span className="min-w-0 truncate font-mono text-xs text-ink/80">{r.email}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${confidenceBadge(r.confidence, r.source)}`}>
                  {r.source === "hunter" ? `${r.confidence}% verified` : `~${r.confidence}%`}
                </span>
                <CopyButton value={r.email} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SidePanel() {
  const [analysis, setAnalysis] = useState<LinkedInAnalysis | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [focus, setFocus] = useState<FocusKey>("hiringIntent");
  const [outreachTab, setOutreachTab] = useState<OutreachKey>("emailOpener");
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  async function loadLatest() {
    const latest = await sendMessage<LinkedInAnalysis | undefined>({ type: "GET_LATEST_ANALYSIS" });
    setAnalysis(latest);
  }

  async function loadAuth() {
    try {
      setAuth(await sendMessage<AuthState>({ type: "GET_AUTH_STATE" }));
    } catch {
      setAuth({ user: null, usingOwnKey: false });
    }
  }

  async function signIn() {
    setAuthBusy(true);
    setError("");
    try {
      setAuth(await sendMessage<AuthState>({ type: "SIGN_IN" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOutUser() {
    setAuthBusy(true);
    try {
      await sendMessage({ type: "SIGN_OUT" });
      await loadAuth();
    } catch {
      // ignore
    } finally {
      setAuthBusy(false);
    }
  }

  useEffect(() => {
    loadLatest().catch(() => undefined);
    loadAuth().catch(() => undefined);
  }, []);

  const signedIn = Boolean(auth?.user);

  async function analyze() {
    setBusy(true);
    setError("");
    try {
      setAnalysis(await sendMessage<LinkedInAnalysis>({ type: "ANALYZE_CURRENT_TAB" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  const outreach = analysis?.insight?.outreach ?? defaultOutreach;
  const focusedScore = analysis?.scores[focus];
  const isTemplateInsight = analysis?.status === "complete" && analysis?.insight?.model.toLowerCase().includes("template");
  const displayError = isTemplateInsight ? "" : error || analysis?.error;

  const logoUrl = chrome.runtime.getURL("icons/icon-128.png");

  return (
    <main className="panel-descent relative min-h-screen text-ink">
      <PanelScenery />
      <header className="relative z-10 brand-gradient px-4 py-4 text-white shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img alt="Spectra" className="h-9 w-9 shrink-0 rounded-xl bg-white p-1 shadow-soft" src={logoUrl} />
            <div className="min-w-0">
              <div className="text-base font-bold leading-tight tracking-tight">Spectra</div>
              <div className="truncate text-[11px] font-medium text-white/70">LinkedIn intelligence</div>
            </div>
          </div>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-brand-700 shadow-soft transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={analyze}
            title="Analyze current tab"
            type="button"
          >
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Analyze
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs backdrop-blur">
          {signedIn ? (
            <>
              <span className="min-w-0 truncate text-white/80">
                Signed in as <span className="font-semibold text-white">{auth?.user?.email}</span>
              </span>
              <button
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2 py-1 font-medium text-white hover:bg-white/25 disabled:opacity-50"
                disabled={authBusy}
                onClick={signOutUser}
                type="button"
              >
                {authBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                Sign out
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 truncate text-white/75">Sign in to unlock outreach &amp; email finder</span>
              <button
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                disabled={authBusy}
                onClick={signIn}
                type="button"
              >
                {authBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserRound className="h-3 w-3" />}
                Sign in with Google
              </button>
            </>
          )}
        </div>
      </header>

      <div className="relative z-10 px-4 py-4">
        <StatusLine status={busy ? "extracting" : analysis?.status} error={displayError} />
      </div>

      {!analysis ? (
        <div className="relative z-10 px-4">
          <EmptyState text="Open a LinkedIn profile and run analysis to build the first local intelligence report." />
        </div>
      ) : (
        <div className="relative z-10 space-y-4 px-4 pb-8">
          <section className="relative px-1 pt-1 pb-2">
            <div className="flex items-center gap-3">
              <ProfileAvatar name={analysis.profile.name} />
              <div className="grid flex-1 gap-2">
                <ScoreRow active={focus === "decisionMaker"} label="decisionMaker" onClick={() => setFocus("decisionMaker")} score={analysis.scores.decisionMaker} />
                <ScoreRow active={focus === "founder"} label="founder" onClick={() => setFocus("founder")} score={analysis.scores.founder} />
                <ScoreRow active={focus === "hiringIntent"} label="hiringIntent" onClick={() => setFocus("hiringIntent")} score={analysis.scores.hiringIntent} />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="truncate text-xl font-semibold text-white drop-shadow">{analysis.profile.name || "LinkedIn profile"}</h2>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/75">{analysis.profile.headline || "No headline extracted."}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium uppercase tracking-wide text-white/40">
              <span>{analysis.profile.extractionConfidence}% extracted</span>
              <span aria-hidden="true">·</span>
              <span>{analysis.signals.evidence.length} signals</span>
              <span aria-hidden="true">·</span>
              <span className="truncate normal-case tracking-normal">{analysis.insight?.model ?? "local"}</span>
            </div>
          </section>

          {focusedScore ? <FocusPanel label={focus} score={focusedScore} /> : null}

          <section className="rounded-2xl border border-white/55 bg-white/80 p-4 shadow-panel backdrop-blur-md">
              <h2 className="text-sm font-semibold">Hiring and skills</h2>
              <div className="mt-3 grid gap-4">
                <SignalList
                  empty="No explicit hiring role, team, or open-role scope was extracted from visible profile text."
                  label="Hiring scope"
                  values={analysis.signals.hiringScope}
                />
                <SignalList
                  empty="No clear skill requirements were extracted from visible profile text."
                  label="Skill signals"
                  values={analysis.signals.skillSignals}
                />
              </div>
            </section>

          <details className="rounded-2xl border border-white/55 bg-white/80 p-4 shadow-panel backdrop-blur-md">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Insights</h2>
              <ChevronDown className="h-4 w-4 text-ink/45" />
            </summary>
            <p className="mt-3 text-sm leading-6 text-ink/75">
              {analysis.insight?.summary ?? "Scores were calculated locally from visible LinkedIn profile signals. Start Ollama and enable local LLM generation in Settings to add a written explanation and outreach copy."}
            </p>
          </details>

          <section>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-ink/55 px-3 py-1 text-white shadow-soft backdrop-blur">
              <Sparkles className="h-4 w-4" />
              <h2 className="text-sm font-semibold">Outreach</h2>
            </div>
            <ProfileOutreachBuilder analysis={analysis} authBusy={authBusy} onGenerated={setAnalysis} onSignIn={signIn} signedIn={signedIn} />
          </section>

          <section>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-ink/55 px-3 py-1 text-white shadow-soft backdrop-blur">
              <Mail className="h-4 w-4" />
              <h2 className="text-sm font-semibold">Generated copy</h2>
            </div>
            <OutreachPanel onSelect={setOutreachTab} outreach={outreach} selected={outreachTab} />
          </section>

          <EmailFinderPanel
            auth={auth}
            authBusy={authBusy}
            domain={analysis.profile.currentCompany ?? ""}
            name={analysis.profile.name}
            onSignIn={signIn}
          />
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<SidePanel />);
