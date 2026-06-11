import { AlertTriangle, Brain, CheckCircle2, Copy, Gauge, Loader2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { ScoreResult } from "../../shared/types";

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  title
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  title?: string;
}) {
  const classes = {
    primary: "bg-ink text-white hover:bg-black",
    secondary: "border border-ink/20 bg-white text-ink hover:bg-ink/5",
    danger: "border border-clay/30 bg-white text-clay hover:bg-clay/5"
  };

  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55 ${classes[variant]}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function StatusLine({ status, error }: { status?: string; error?: string }) {
  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-clay/25 bg-clay/5 p-3 text-sm text-clay">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="flex items-center gap-2 text-sm text-moss">
        <CheckCircle2 className="h-4 w-4" />
        <span>Analysis complete</span>
      </div>
    );
  }

  if (status && status !== "idle") {
    return (
      <div className="flex items-center gap-2 text-sm text-signal">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Working locally</span>
      </div>
    );
  }

  return null;
}

function scoreBand(value: number): { label: string; className: string } {
  if (value >= 70) {
    return { label: "High", className: "bg-moss/10 text-moss" };
  }
  if (value >= 35) {
    return { label: "Medium", className: "bg-brass/15 text-ink" };
  }
  return { label: "Low", className: "bg-ink/5 text-ink/65" };
}

function scoreMeaning(label: string, value: number): string {
  const band = scoreBand(value).label.toLowerCase();
  if (label.includes("Decision")) {
    return band === "high"
      ? "Likely has authority or influence in business decisions."
      : band === "medium"
        ? "Some authority signals are present, but decision power is not fully clear."
        : "No strong public signs of senior buying or decision authority.";
  }
  if (label.includes("Founder")) {
    return band === "high"
      ? "Strong founder, operator, or startup-building signals are visible."
      : band === "medium"
        ? "Some startup or builder signals are visible, but founder fit is uncertain."
        : "No clear founder or startup ownership signals were found.";
  }
  return band === "high"
    ? "Strong signs suggest this person or team may be hiring."
    : band === "medium"
      ? "Some hiring-related clues are present, but intent is not definitive."
      : "No clear hiring intent was found in the visible profile content.";
}

export function ScoreBlock({ label, score }: { label: string; score: ScoreResult }) {
  const band = scoreBand(score.value);
  const usefulFactors = score.factors.filter((factor) => factor.impact > 0);

  return (
    <section className="border-b border-ink/10 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Gauge className="h-4 w-4 shrink-0 text-signal" />
          <h2 className="truncate text-sm font-semibold">{label}</h2>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums">{score.value}/100</div>
          <div className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${band.className}`}>{band.label}</div>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full score-track" style={{ "--score": `${score.value}%` } as CSSProperties} />
      <p className="mt-3 text-sm leading-6 text-ink/75">{scoreMeaning(label, score.value)}</p>
      <div className="mt-1 text-xs text-ink/55">Confidence {Math.round(score.confidence * 100)}% based on visible profile data.</div>
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Why</h3>
        {usefulFactors.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {usefulFactors.map((factor) => (
              <li className="rounded-md bg-white px-3 py-2 text-xs leading-5 text-ink/75" key={`${factor.label}-${factor.evidence}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{factor.label}</span>
                  <span className="shrink-0 text-ink/45">+{factor.impact}</span>
                </div>
                <div className="mt-1 line-clamp-2 text-ink/60">{factor.evidence}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-md bg-white px-3 py-2 text-xs leading-5 text-ink/60">No strong evidence was found for this category.</p>
        )}
      </div>
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-ink/20 px-5 text-center text-sm text-ink/65">
      <Brain className="h-6 w-6 text-signal" />
      <p>{text}</p>
    </div>
  );
}

export function CopyButton({ value }: { value: string }) {
  return (
    <button
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ink/15 bg-white text-ink/70 hover:text-ink"
      onClick={() => navigator.clipboard.writeText(value)}
      title="Copy"
      type="button"
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}
