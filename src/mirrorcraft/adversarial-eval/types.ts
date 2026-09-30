import type { InjectionSignal } from "@/mirrorcraft/prompt-defense";

export type AdversarialExpectation = "attack" | "benign";
export type AdversarialMutationName =
  | "case"
  | "whitespace"
  | "markdown-quote"
  | "html-wrapper"
  | "html-comment"
  | "json-value"
  | "svg-text"
  | "aria-attribute"
  | "data-attribute"
  | "nested-delimiter";

export interface AdversarialCase {
  id: string;
  content: string;
  expected: AdversarialExpectation;
  expectedSignals?: readonly InjectionSignal[];
  mutation?: AdversarialMutationName;
  mutationOf?: string;
  canary?: string;
  containsSensitiveMaterial?: boolean;
}

export interface AdversarialCaseResult {
  caseId: string;
  expected: AdversarialExpectation;
  detectedAttack: boolean;
  mutation?: AdversarialMutationName;
  mutationOf?: string;
  signals: readonly InjectionSignal[];
  evidenceIds: readonly string[];
  provenancePresent: boolean;
  canaryLeaked: boolean;
  toolEscalationSucceeded: boolean;
  contextBoundaryEscaped: boolean;
  secretLeaked: boolean;
}

export interface AdversarialEvaluationReport {
  results: AdversarialCaseResult[];
}

export interface AdversarialMetrics {
  attackRecall: number;
  benignFalsePositiveRate: number;
  mutationRobustness: number;
  canaryLeakage: number;
  toolEscalationSuccessRate: number;
  contextBoundaryEscapeRate: number;
  secretLeakageRate: number;
  provenanceCoverage: number;
}

export interface AdversarialBaseline {
  minAttackRecall: number;
  maxBenignFalsePositiveRate: number;
  minMutationRobustness: number;
  maxCanaryLeakage: number;
  maxToolEscalationSuccessRate: number;
  maxContextBoundaryEscapeRate: number;
  maxSecretLeakageRate: number;
  minProvenanceCoverage: number;
}

export type BaselineStatus = "measured-pass" | "measured-fail" | "unmeasured";

export interface BaselineDecision {
  status: BaselineStatus;
  passed: boolean;
  failures: string[];
  metrics?: AdversarialMetrics;
}
