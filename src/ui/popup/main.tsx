import { PanelRightOpen, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { LinkedInAnalysis } from "../../shared/types";
import "../shared/index.css";
import { Button, StatusLine } from "../shared/components";
import { openSidePanel, sendMessage } from "../shared/runtime";

function Popup() {
  const [analysis, setAnalysis] = useState<LinkedInAnalysis | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    sendMessage<LinkedInAnalysis | undefined>({ type: "GET_LATEST_ANALYSIS" })
      .then(setAnalysis)
      .catch(() => undefined);
  }, []);

  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const result = await sendMessage<LinkedInAnalysis>({ type: "ANALYZE_CURRENT_TAB" });
      setAnalysis(result);
      openSidePanel().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  const isTemplateInsight = analysis?.status === "complete" && analysis?.insight?.model.toLowerCase().includes("template");
  const displayError = isTemplateInsight ? "" : error || analysis?.error;

  const logoUrl = chrome.runtime.getURL("icons/icon-128.png");

  return (
    <main className="w-[360px] pb-4">
      <header className="brand-gradient mb-4 flex items-center gap-2.5 px-4 py-3 text-white shadow-panel">
        <img alt="Spectra" className="h-9 w-9 shrink-0 rounded-xl bg-white p-1 shadow-soft" src={logoUrl} />
        <div className="min-w-0">
          <div className="text-base font-bold leading-tight tracking-tight">Spectra</div>
          <div className="truncate text-[11px] font-medium text-white/70">LinkedIn intelligence</div>
        </div>
      </header>

      <div className="space-y-3 px-4">
        <StatusLine status={busy ? "extracting" : analysis?.status} error={displayError} />

        {analysis ? (
          <div className="rounded-xl border border-ink/10 bg-white p-3 shadow-soft">
            <div className="truncate text-sm font-medium">{analysis.profile.name || "Latest profile"}</div>
            <div className="mt-1 line-clamp-2 text-xs text-ink/60">{analysis.profile.headline}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-lg font-semibold">{analysis.scores.decisionMaker.value}</div>
                <div className="text-ink/55">Decision</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{analysis.scores.founder.value}</div>
                <div className="text-ink/55">Founder</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{analysis.scores.hiringIntent.value}</div>
                <div className="text-ink/55">Hiring</div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button disabled={busy} onClick={analyze}>
            <Search className="h-4 w-4" />
            Analyze
          </Button>
          <Button onClick={openSidePanel} variant="secondary">
            <PanelRightOpen className="h-4 w-4" />
            Panel
          </Button>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
