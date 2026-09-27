import type {
  EditCategory,
  EditOperation,
  EditVerification,
} from "@/mirrorcraft/editing/types";
import type { StudioHistory } from "@/mirrorcraft/studio-history";

export type StudioChangeSetStatus = "empty" | "ready";

export type StudioVerificationCheck =
  | "typecheck"
  | "lint"
  | "build"
  | "visual";

export interface StudioChangeSet {
  status: StudioChangeSetStatus;
  transitionIds: readonly string[];
  operationCount: number;
  categories: readonly EditCategory[];
  targetNodeIds: readonly string[];
  verificationLevels: readonly EditVerification["level"][];
  verificationChecks: readonly StudioVerificationCheck[];
  reversible: boolean;
  operations: readonly EditOperation[];
}

function checksForLevel(
  level: EditVerification["level"],
): readonly StudioVerificationCheck[] {
  if (level === "none") return [];
  if (level === "typecheck") return ["typecheck"];
  if (level === "compile") return ["typecheck", "lint", "build"];
  if (level === "visual") return ["visual"];
  return ["typecheck", "lint", "build", "visual"];
}

export function buildStudioChangeSet(history: StudioHistory): StudioChangeSet {
  const transitions = history.past;
  const operations = transitions.flatMap((transition) => [...transition.operations]);
  const categories = [...new Set(operations.map((operation) => operation.category))];
  const targetNodeIds = [
    ...new Set(operations.map((operation) => operation.target.nodeId)),
  ];
  const verificationLevels = [
    ...new Set(operations.map((operation) => operation.verification.level)),
  ];
  const verificationChecks = [
    ...new Set(verificationLevels.flatMap((level) => checksForLevel(level))),
  ];

  return {
    status: operations.length === 0 ? "empty" : "ready",
    transitionIds: transitions.map((transition) => transition.id),
    operationCount: operations.length,
    categories,
    targetNodeIds,
    verificationLevels,
    verificationChecks,
    reversible: operations.every((operation) => operation.reversible),
    operations,
  };
}
