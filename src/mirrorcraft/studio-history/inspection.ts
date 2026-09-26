import {
  summarizeStudioDiff,
  type StudioHistoryTransition,
} from "@/mirrorcraft/studio-history";
import type { EditOperation } from "@/mirrorcraft/editing/types";

export type StudioVerificationLevel = EditOperation["verification"]["level"];

export interface StudioTransitionInspection {
  transitionId: string;
  label: string;
  timestamp: string;
  operationCount: number;
  reversible: boolean;
  affectedNodeIds: readonly string[];
  categories: readonly EditOperation["category"][];
  verificationLevels: readonly StudioVerificationLevel[];
  diff: ReturnType<typeof summarizeStudioDiff>;
}

export function buildStudioTransitionInspection(
  transition: StudioHistoryTransition,
): StudioTransitionInspection {
  const affectedNodeIds = [
    ...new Set(transition.operations.map((operation) => operation.target.nodeId)),
  ];
  const categories = [
    ...new Set(transition.operations.map((operation) => operation.category)),
  ];
  const verificationLevels = [
    ...new Set(transition.operations.map((operation) => operation.verification.level)),
  ];

  return {
    transitionId: transition.id,
    label: transition.label,
    timestamp: transition.timestamp,
    operationCount: transition.operations.length,
    reversible: transition.operations.every((operation) => operation.reversible),
    affectedNodeIds,
    categories,
    verificationLevels,
    diff: summarizeStudioDiff(transition.before, transition.after),
  };
}
