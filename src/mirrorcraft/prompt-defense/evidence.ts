import type { SecurityEvidence, SecurityEvidenceInput } from "./types";

export function createSecurityEvidence(input: SecurityEvidenceInput): SecurityEvidence {
  return { ...input };
}
