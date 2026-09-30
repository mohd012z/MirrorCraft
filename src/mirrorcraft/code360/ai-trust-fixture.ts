import {
  buildAITrustSummary,
  type AITrustSummary,
} from "./index";
import type { InjectionAssessment, SecurityEvidence } from "@/mirrorcraft/prompt-defense";

const evidence: SecurityEvidence = {
  id: "e-ai-trust",
  sourceType: "dom",
  origin: "https://example.test/docs",
  selector: "main > article",
  path: "/docs",
  line: 12,
  hash: "sha256:fixture",
  capturedAt: "2026-10-01T00:00:00.000Z",
  confidence: 0.96,
};

const assessment: InjectionAssessment = {
  score: 0.95,
  classification: "confirmed-injection",
  signals: ["authority-override", "tool-permission-escalation"],
  evidence: [
    {
      id: "e-injection",
      signal: "authority-override",
      source: "browser",
      excerpt: "fixture",
      confidence: 0.95,
    },
  ],
  action: "exclude-from-agent-context",
};

const summary = buildAITrustSummary({
  evidence,
  page: "docs",
  trust: "external-content",
  assessment,
  restrictionIds: ["restriction:instruction-boundary-violation"],
});

if (summary.source.origin !== "https://example.test/docs") throw new Error("origin lost");
if (summary.source.path !== "/docs") throw new Error("path lost");
if (summary.source.page !== "docs") throw new Error("page lost");
if (summary.source.selector !== "main > article") throw new Error("selector lost");
if (summary.trust !== "external-content") throw new Error("trust lost");
if (!summary.signals.includes("authority-override")) throw new Error("signal lost");
if (summary.confidence !== 0.95) throw new Error("confidence mismatch");
if (summary.disposition !== "exclude-from-agent-context") throw new Error("disposition lost");
if (!summary.restrictionIds.includes("restriction:instruction-boundary-violation")) throw new Error("restriction link lost");
if (!summary.evidenceIds.includes("e-ai-trust") || !summary.evidenceIds.includes("e-injection")) throw new Error("evidence links lost");

// Code360 surfaces evidence and decisions, never hidden reasoning.
type NoHiddenReasoning = "chainOfThought" extends keyof AITrustSummary ? never : true;
const noHiddenReasoning: NoHiddenReasoning = true;
void noHiddenReasoning;

JSON.stringify(summary);
