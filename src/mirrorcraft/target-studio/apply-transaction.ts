import type { CorrectionPreview } from "@/mirrorcraft/target-studio/problem-navigator";
import type { VerificationEvidence } from "@/mirrorcraft/target-studio/verification-evidence";
import { createMirrorCommand } from "@/mirrorcraft/target-studio";
import type { MirrorCommand } from "@/mirrorcraft/target-studio/types";

export type ApplyTransactionStatus = "PREPARED" | "COMMITTED" | "ROLLED_BACK" | "REJECTED";

export interface ApplySnapshot {
  targetId: string;
  content: string;
  createdAt: string;
}

export interface ApplyTransaction {
  id: string;
  problemId: string;
  targetId: string;
  status: ApplyTransactionStatus;
  snapshot: ApplySnapshot;
  command: MirrorCommand;
  proposedContent: string;
  preApplyVerification: VerificationEvidence;
  postApplyVerification?: VerificationEvidence;
  rollback?: { required: boolean; content: string; reason: string };
}

function transactionId(problemId: string, targetId: string, content: string): string {
  let hash = 2166136261;
  const value = `${problemId}|${targetId}|${content}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `apply-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Explicit promotion boundary from a verified virtual preview to a real
 * command. No source write occurs here; callers must execute the returned
 * command transactionally and then provide post-apply verification.
 */
export function prepareApplyTransaction(input: {
  preview: CorrectionPreview;
  verification: VerificationEvidence;
  snapshotCreatedAt: string;
}): ApplyTransaction {
  const { preview, verification } = input;
  if (verification.status !== "PASS" || !verification.canOfferApply) {
    return {
      id: transactionId(preview.problemId, preview.targetId, preview.before),
      problemId: preview.problemId,
      targetId: preview.targetId,
      status: "REJECTED",
      snapshot: { targetId: preview.targetId, content: preview.before, createdAt: input.snapshotCreatedAt },
      command: preview.command,
      proposedContent: preview.after,
      preApplyVerification: verification,
      rollback: { required: false, content: preview.before, reason: "Pre-apply verification did not pass." },
    };
  }

  const command = createMirrorCommand({
    command: "rectify",
    targetId: preview.targetId,
    mode: "real",
    intent: preview.command.intent,
    preserve: preview.command.preserve,
    verification: preview.command.verification,
  });
  return {
    id: transactionId(preview.problemId, preview.targetId, preview.after),
    problemId: preview.problemId,
    targetId: preview.targetId,
    status: "PREPARED",
    snapshot: { targetId: preview.targetId, content: preview.before, createdAt: input.snapshotCreatedAt },
    command,
    proposedContent: preview.after,
    preApplyVerification: verification,
  };
}

/** Post-apply verification decides commit vs rollback; failure is fail-closed. */
export function finalizeApplyTransaction(
  transaction: ApplyTransaction,
  postApplyVerification: VerificationEvidence,
): ApplyTransaction {
  if (transaction.status !== "PREPARED") return transaction;
  if (postApplyVerification.status === "PASS") {
    return { ...transaction, status: "COMMITTED", postApplyVerification, rollback: { required: false, content: transaction.snapshot.content, reason: "Post-apply verification passed." } };
  }
  return {
    ...transaction,
    status: "ROLLED_BACK",
    postApplyVerification,
    rollback: {
      required: true,
      content: transaction.snapshot.content,
      reason: postApplyVerification.status === "FAIL" ? "Post-apply verification failed." : "Post-apply verification incomplete.",
    },
  };
}
