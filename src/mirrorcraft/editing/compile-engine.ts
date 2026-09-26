import type { PublishDecision, PublishPolicy } from "@/mirrorcraft/publish";
import { evaluatePublish } from "@/mirrorcraft/publish";
import type { ReleaseManifest } from "@/mirrorcraft/release-manifest";
import {
  evaluateVerification,
  mergeVerificationResults,
  type VerificationResult,
} from "@/mirrorcraft/verification-engine";

export type CompileCheckId =
  | "lint"
  | "typecheck"
  | "build"
  | "route"
  | "console";

export interface CompileCheck extends Omit<VerificationResult, "id"> {
  id: CompileCheckId;
}

export interface CompileReport {
  checks: readonly CompileCheck[];
  passed: boolean;
  blockers: readonly string[];
}

export const REQUIRED_COMPILE_CHECKS: readonly CompileCheckId[] = [
  "lint",
  "typecheck",
  "build",
  "route",
  "console",
];

export function evaluateCompileReport(
  checks: readonly CompileCheck[],
): CompileReport {
  const report = evaluateVerification([...checks], {
    requireIds: [...REQUIRED_COMPILE_CHECKS],
    failOnPendingRequired: true,
  });

  return {
    checks: [...checks],
    passed: report.passed,
    blockers: [...report.blockers],
  };
}

export function attachCompileReport(
  manifest: ReleaseManifest,
  report: CompileReport,
): ReleaseManifest {
  return {
    ...manifest,
    verification: mergeVerificationResults(
      manifest.verification,
      [...report.checks],
    ),
  };
}

export function evaluateCompilePublish(
  manifest: ReleaseManifest,
  report: CompileReport,
  policy?: PublishPolicy,
): PublishDecision {
  const withCompileVerification = attachCompileReport(manifest, report);
  const decision = evaluatePublish(withCompileVerification, policy);
  const blockers = [...decision.blockers];

  for (const blocker of report.blockers) {
    if (!blockers.includes(blocker)) blockers.push(blocker);
  }

  return {
    allowed: decision.allowed && report.passed,
    blockers,
    warnings: [...decision.warnings],
  };
}
