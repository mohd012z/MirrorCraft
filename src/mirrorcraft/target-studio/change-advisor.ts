import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";
import { watchGraphChanges } from "@/mirrorcraft/target-studio";
import { buildRealtimeAdvice, type RealtimeAdvice } from "@/mirrorcraft/target-studio/advice";
import type { ChangeWatchResult } from "@/mirrorcraft/target-studio/types";

export interface ChangeAdviceResult {
  change: ChangeWatchResult;
  advice: RealtimeAdvice[];
}

/** One deterministic entry point for Studio's realtime change analysis. */
export function analyzeStudioChange(
  before: WebStructureGraph,
  after: WebStructureGraph,
): ChangeAdviceResult {
  const change = watchGraphChanges(before, after);
  return { change, advice: buildRealtimeAdvice(change) };
}
