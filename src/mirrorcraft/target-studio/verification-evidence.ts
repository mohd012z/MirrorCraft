import type { CorrectionPreview } from "@/mirrorcraft/target-studio/problem-navigator";

export type VerificationStatus = "PASS" | "FAIL" | "PENDING";

export interface VerificationCheck {
  id: string;
  kind: "build" | "visual" | "structural" | "behavioral" | "test";
  status: VerificationStatus;
  detail: string;
}

export interface VerificationEvidence {
  problemId: string;
  targetId: string;
  status: VerificationStatus;
  checks: VerificationCheck[];
  evidence: string[];
  canOfferApply: boolean;
}

/** Reduce targeted verification checks without allowing a preview to self-approve. */
export function buildVerificationEvidence(
  preview: CorrectionPreview,
  checks: VerificationCheck[],
): VerificationEvidence {
  const requiredKinds = new Set<VerificationCheck["kind"]>(["structural"]);
  if (preview.verification.visual) requiredKinds.add("visual");
  if (preview.verification.behavioral) requiredKinds.add("behavioral");
  if (preview.verification.tests.length > 0) requiredKinds.add("test");

  const relevant = checks.filter((check) => requiredKinds.has(check.kind));
  const hasFailure = relevant.some((check) => check.status === "FAIL");
  const complete = [...requiredKinds].every((kind) => relevant.some((check) => check.kind === kind && check.status === "PASS"));
  const status: VerificationStatus = hasFailure ? "FAIL" : complete ? "PASS" : "PENDING";

  return {
    problemId: preview.problemId,
    targetId: preview.targetId,
    status,
    checks: relevant,
    evidence: preview.evidence,
    canOfferApply: status === "PASS",
  };
}
