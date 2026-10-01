export type {
  InjectionAssessment,
  InjectionClassification,
  InjectionDisposition,
  InjectionEvidence,
  InjectionSignal,
  SecurityEvidence,
  SecurityEvidenceInput,
  SecurityEvidenceSourceType,
  TrustTier,
} from "./types";
export type { ClassificationInput } from "./classifier";
export type { SignalMatch } from "./instruction-signals";
export {
  classifyExternalInstruction,
  SUSPICIOUS_THRESHOLD,
  PROBABLE_INJECTION_THRESHOLD,
  CONFIRMED_INJECTION_THRESHOLD,
} from "./classifier";
export { extractInstructionSignals } from "./instruction-signals";
export { createSecurityEvidence } from "./evidence";
export { isExecutableInstructionSource } from "./trust-boundary";
