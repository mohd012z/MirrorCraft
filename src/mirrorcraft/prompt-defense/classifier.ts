import { extractInstructionSignals } from "./instruction-signals";
import type {
  InjectionAssessment,
  InjectionClassification,
  InjectionDisposition,
} from "./types";

export interface ClassificationInput {
  content: string;
  source: string;
}

export const SUSPICIOUS_THRESHOLD = 0.35;
export const PROBABLE_INJECTION_THRESHOLD = 0.6;
export const CONFIRMED_INJECTION_THRESHOLD = 0.85;

function classificationFor(score: number): InjectionClassification {
  if (score >= CONFIRMED_INJECTION_THRESHOLD) return "confirmed-injection";
  if (score >= PROBABLE_INJECTION_THRESHOLD) return "probable-injection";
  if (score >= SUSPICIOUS_THRESHOLD) return "suspicious";
  return "none";
}

function actionFor(classification: InjectionClassification): InjectionDisposition {
  if (classification === "confirmed-injection") return "exclude-from-agent-context";
  if (classification === "probable-injection") return "quarantine";
  return "allow-as-data";
}

export function classifyExternalInstruction(
  input: ClassificationInput,
): InjectionAssessment {
  const matches = extractInstructionSignals(input.content);
  const score = matches.length === 0
    ? 0
    : Math.min(1, Math.max(...matches.map((match) => match.confidence)) + Math.min(0.08, (matches.length - 1) * 0.02));
  const classification = classificationFor(score);

  return {
    score,
    classification,
    signals: matches.map((match) => match.signal),
    evidence: matches.map((match, index) => ({
      id: `${input.source}:injection:${index + 1}`,
      signal: match.signal,
      source: input.source,
      excerpt: match.excerpt,
      confidence: match.confidence,
    })),
    action: actionFor(classification),
    sourceContent: input.content,
  };
}
