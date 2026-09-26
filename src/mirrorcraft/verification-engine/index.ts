export type VerificationStatus = "passed" | "failed" | "skipped" | "pending";

export interface VerificationResult {
  id: string;
  name: string;
  status: VerificationStatus;
  required: boolean;
  evidence: string[];
  durationMs?: number;
}

export interface VerificationReport {
  results: VerificationResult[];
  passed: boolean;
  blockers: string[];
}

export interface VerificationPolicy {
  requireIds: string[];
  failOnPendingRequired: boolean;
}

export const defaultVerificationPolicy: VerificationPolicy = {
  requireIds: ["lint", "typecheck", "build"],
  failOnPendingRequired: true,
};

export function evaluateVerification(
  results: VerificationResult[],
  policy: VerificationPolicy = defaultVerificationPolicy,
): VerificationReport {
  const blockers: string[] = [];

  for (const id of policy.requireIds) {
    const result = results.find((candidate) => candidate.id === id);
    if (!result) {
      blockers.push(`Missing required verification: ${id}.`);
      continue;
    }
    if (result.status === "failed") blockers.push(`${result.name} failed.`);
    if (result.status === "skipped") blockers.push(`${result.name} was skipped.`);
    if (result.status === "pending" && policy.failOnPendingRequired) blockers.push(`${result.name} is still pending.`);
  }

  for (const result of results) {
    if (result.required && result.status === "failed" && !blockers.includes(`${result.name} failed.`)) {
      blockers.push(`${result.name} failed.`);
    }
  }

  return { results, passed: blockers.length === 0, blockers };
}

export function mergeVerificationResults(
  current: VerificationResult[],
  incoming: VerificationResult[],
): VerificationResult[] {
  const merged = new Map(current.map((result) => [result.id, result]));
  for (const result of incoming) merged.set(result.id, result);
  return [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
}
