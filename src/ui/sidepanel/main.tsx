import { BriefcaseBusiness, ChevronDown, FileText, Gauge, Loader2, Mail, MessageSquare, RefreshCw, Search, Sparkles, Target, Upload, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { LinkedInAnalysis, OutreachSuggestions, ScoreResult } from "../../shared/types";
import "../shared/index.css";
import { Button, CopyButton, EmptyState, StatusLine } from "../shared/components";
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

function ScoreTile({
  active,
  label,
  score,
  onClick
}: {
  active: boolean;
  label: FocusKey;
  score: ScoreResult;
  onClick: () => void;
}) {
  const meta = scoreMeta[label];
  const band = scoreBand(score.value);
  const Icon = meta.icon;

  return (
    <button
      className={`grid min-h-28 rounded-md border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-panel ${
        active ? "border-signal shadow-panel" : "border-ink/10"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-signal" />
          <span className="truncate text-xs font-semibold text-ink/70">{meta.shortLabel}</span>
        </div>
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${band.className}`}>{band.label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{score.value}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full ${band.barClassName}`} style={{ width: `${score.value}%` }} />
      </div>
    </button>
  );
}

function FocusPanel({ label, score }: { label: FocusKey; score: ScoreResult }) {
  const meta = scoreMeta[label];
  const usefulFactors = score.factors.filter((factor) => factor.impact > 0);

  return (
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
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
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(outreachMeta) as OutreachKey[]).map((key) => {
          const item = outreachMeta[key];
          const Icon = item.icon;
          return (
            <button
              className={`flex h-10 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition ${
                selected === key ? "border-signal bg-signal text-white" : "border-ink/10 bg-paper text-ink/70 hover:border-signal/50"
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
  onGenerated
}: {
  analysis: LinkedInAnalysis;
  onGenerated: (analysis: LinkedInAnalysis) => void;
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
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
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
        <Button disabled={parsing || generating || !resume} onClick={generate} title="Generate profile-aware outreach">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </Button>
      </div>
    </section>
  );
}

function SidePanel() {
  const [analysis, setAnalysis] = useState<LinkedInAnalysis | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [focus, setFocus] = useState<FocusKey>("hiringIntent");
  const [outreachTab, setOutreachTab] = useState<OutreachKey>("emailOpener");

  async function loadLatest() {
    const latest = await sendMessage<LinkedInAnalysis | undefined>({ type: "GET_LATEST_ANALYSIS" });
    setAnalysis(latest);
  }

  useEffect(() => {
    loadLatest().catch(() => undefined);
  }, []);

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

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper/95 px-4 py-4 backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">Internet Detective</div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-lg font-semibold text-ink">LinkedIn intelligence</h1>
          <Button disabled={busy} onClick={analyze} title="Analyze current tab">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Analyze
          </Button>
        </div>
      </header>

      <div className="px-4 py-4">
        <StatusLine status={busy ? "extracting" : analysis?.status} error={displayError} />
      </div>

      {!analysis ? (
        <div className="px-4">
          <EmptyState text="Open a LinkedIn profile and run analysis to build the first local intelligence report." />
        </div>
      ) : (
        <div className="space-y-4 px-4 pb-8">
          <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-signal text-base font-semibold text-white">
                {(analysis.profile.name || "L").slice(0, 1)}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">{analysis.profile.name || "LinkedIn profile"}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink/65">{analysis.profile.headline || "No headline extracted."}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-paper px-2 py-2">
                <div className="font-semibold text-ink">{analysis.profile.extractionConfidence}%</div>
                <div className="mt-0.5 text-ink/45">Extraction</div>
              </div>
              <div className="rounded-md bg-paper px-2 py-2">
                <div className="font-semibold text-ink">{analysis.signals.evidence.length}</div>
                <div className="mt-0.5 text-ink/45">Evidence</div>
              </div>
              <div className="rounded-md bg-paper px-2 py-2">
                <div className="truncate font-semibold text-ink">{analysis.insight?.model ?? "local"}</div>
                <div className="mt-0.5 text-ink/45">Model</div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-signal" />
              <h2 className="text-sm font-semibold">Signal focus</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ScoreTile active={focus === "decisionMaker"} label="decisionMaker" onClick={() => setFocus("decisionMaker")} score={analysis.scores.decisionMaker} />
              <ScoreTile active={focus === "founder"} label="founder" onClick={() => setFocus("founder")} score={analysis.scores.founder} />
              <ScoreTile active={focus === "hiringIntent"} label="hiringIntent" onClick={() => setFocus("hiringIntent")} score={analysis.scores.hiringIntent} />
            </div>
          </section>

          {focusedScore ? <FocusPanel label={focus} score={focusedScore} /> : null}

          <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
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

          <details className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Insights</h2>
              <ChevronDown className="h-4 w-4 text-ink/45" />
            </summary>
            <p className="mt-3 text-sm leading-6 text-ink/75">
              {analysis.insight?.summary ?? "Scores were calculated locally from visible LinkedIn profile signals. Start Ollama and enable local LLM generation in Settings to add a written explanation and outreach copy."}
            </p>
          </details>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-signal" />
              <h2 className="text-sm font-semibold">Outreach</h2>
            </div>
            <ProfileOutreachBuilder analysis={analysis} onGenerated={setAnalysis} />
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4 text-signal" />
              <h2 className="text-sm font-semibold">Generated copy</h2>
            </div>
            <OutreachPanel onSelect={setOutreachTab} outreach={outreach} selected={outreachTab} />
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<SidePanel />);
