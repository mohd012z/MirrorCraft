import type { ChangeWatchResult, MirrorCommand } from "@/mirrorcraft/target-studio/types";
import { createMirrorCommand } from "@/mirrorcraft/target-studio";

export type AdviceSeverity = "info" | "warning" | "critical";

export interface RealtimeAdvice {
  id: string;
  targetId: string;
  severity: AdviceSeverity;
  title: string;
  reason: string;
  affectedRoutes: string[];
  affectedViewports: number[];
  suggestedCommand: MirrorCommand;
}

function stableAdviceId(targetId: string, reason: string): string {
  let hash = 2166136261;
  const value = `${targetId}|${reason}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `advice-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Projects deterministic graph evidence into actionable Studio advice.
 * This layer never mutates source. Suggested corrections remain virtual
 * until a caller explicitly promotes the command to real mode.
 */
export function buildRealtimeAdvice(change: ChangeWatchResult): RealtimeAdvice[] {
  if (!change.revalidation.required) return [];

  const targets = [...change.changedTargetIds, ...change.addedTargetIds, ...change.removedTargetIds];
  return targets.sort().map((targetId) => {
    const behavioral = change.revalidation.behavioral;
    const visual = change.revalidation.visual;
    const reason = behavioral
      ? "Changed target affects an interaction and requires behavioral revalidation."
      : visual
        ? "Changed target affects rendered routes/viewports and requires visual revalidation."
        : "Changed target requires structural revalidation.";
    const severity: AdviceSeverity = behavioral ? "warning" : "info";
    const command = createMirrorCommand({
      command: "rectify",
      targetId,
      mode: "virtual",
      intent: reason,
      verification: {
        viewports: change.revalidation.viewports,
        visual,
        structural: change.revalidation.structural,
        behavioral,
        tests: change.revalidation.tests.length > 0,
      },
    });
    return {
      id: stableAdviceId(targetId, reason),
      targetId,
      severity,
      title: behavioral ? "Recheck interaction impact" : visual ? "Recheck visual impact" : "Recheck structural impact",
      reason,
      affectedRoutes: change.revalidation.routes,
      affectedViewports: change.revalidation.viewports,
      suggestedCommand: command,
    };
  });
}
