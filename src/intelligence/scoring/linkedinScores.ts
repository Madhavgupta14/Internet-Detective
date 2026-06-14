import type { LinkedInScores, LinkedInSignals, ScoreResult, SignalFactor } from "../../shared/types";
import { clamp, weightedScore } from "../../shared/scoring";

function factorsFor(signals: LinkedInSignals, labels: string[], fallback: string): SignalFactor[] {
  const selected = signals.evidence.filter((factor) => labels.some((label) => factor.label.toLowerCase().includes(label.toLowerCase())));
  if (selected.length > 0) {
    return selected.slice(0, 5);
  }

  return [
    {
      label: "Limited evidence",
      impact: 0,
      evidence: fallback
    }
  ];
}

function result(value: number, confidence: number, factors: SignalFactor[]): ScoreResult {
  return {
    value: Math.round(clamp(value)),
    confidence: Math.round(confidence) / 100,
    factors
  };
}

export function scoreLinkedInProfile(signals: LinkedInSignals): LinkedInScores {
  const decisionMaker = weightedScore([
    [signals.seniority, 0.35],
    [signals.leadership, 0.25],
    [signals.titleAuthority, 0.2],
    [signals.companyInfluence, 0.1],
    [signals.confidence, 0.1]
  ]);

  const founder = weightedScore([
    [signals.founderLikelihood, 0.4],
    [signals.startupAffinity, 0.2],
    [signals.titleAuthority, 0.15],
    [signals.companyInfluence, 0.15],
    [signals.seniority, 0.1]
  ]);

  const hiringIntent = weightedScore([
    [signals.hiringLanguage, 0.4],
    [signals.teamGrowth, 0.2],
    [signals.recruitingRelevance, 0.15],
    [signals.leadership, 0.15],
    [signals.confidence, 0.1]
  ]);

  return {
    decisionMaker: result(
      decisionMaker,
      signals.confidence,
      factorsFor(signals, ["executive", "founder", "VP-level", "Department", "Team leadership", "Management", "Investor", "ownership", "reach", "Top-tier"], "No strong decision-maker evidence was extracted.")
    ),
    founder: result(
      founder,
      signals.confidence,
      factorsFor(signals, ["founder", "builder", "Startup", "Entrepreneurial", "Executive", "ownership", "Growth-stage"], "No strong founder evidence was extracted.")
    ),
    hiringIntent: result(
      hiringIntent,
      signals.confidence,
      factorsFor(signals, ["Hiring", "scope", "Team growth", "Recruiting", "Management"], "No strong hiring-intent evidence was extracted.")
    )
  };
}
