import type { TrustTier } from "@/mirrorcraft/prompt-defense";

export type AgentPhase =
  | "plan"
  | "inspect"
  | "map"
  | "edit"
  | "verify"
  | "explain";

export type ToolClass =
  | "read"
  | "search"
  | "edit"
  | "terminal"
  | "browser"
  | "network"
  | "git";

export interface AgentInstructionProvenance {
  origin: string;
  hash?: string;
  evidenceIds?: string[];
}

export interface AgentInstruction {
  id: string;
  description: string;
  scope?: string[];
  priority: number;
  /** Defaults to operator semantics for legacy callers that omit provenance. */
  source?: TrustTier;
  /** Explicitly false for evidence-only instructions; legacy callers may omit this field. */
  executableInstruction?: boolean;
  provenance?: AgentInstructionProvenance;
}

export interface AgentTool {
  id: string;
  class: ToolClass;
  description: string;
  mutatesWorkspace: boolean;
  requiresVerification: boolean;
}

export interface AgentModelProfile {
  id: string;
  strengths: string[];
  maxParallelTasks?: number;
}

export interface AgentTask {
  id: string;
  intent: string;
  targets: string[];
  constraints: string[];
  acceptanceCriteria: string[];
}

export interface AgentEvent {
  id: string;
  phase: AgentPhase;
  timestamp: string;
  summary: string;
  toolId?: string;
  target?: string;
  evidence?: string[];
}

export interface AgentCheckpoint {
  id: string;
  taskId: string;
  createdAt: string;
  phase: AgentPhase;
  touchedFiles: string[];
  eventIds: string[];
  restorable: boolean;
}

export interface KernelRun {
  task: AgentTask;
  instructions: AgentInstruction[];
  tools: AgentTool[];
  model: AgentModelProfile;
  phase: AgentPhase;
  events: AgentEvent[];
  checkpoints: AgentCheckpoint[];
}

export const DEFAULT_PHASE_ORDER: readonly AgentPhase[] = [
  "plan",
  "inspect",
  "map",
  "edit",
  "verify",
  "explain",
] as const;

export function nextAgentPhase(current: AgentPhase): AgentPhase | null {
  const index = DEFAULT_PHASE_ORDER.indexOf(current);
  if (index < 0 || index === DEFAULT_PHASE_ORDER.length - 1) return null;
  return DEFAULT_PHASE_ORDER[index + 1];
}

export function canMutate(run: KernelRun): boolean {
  return run.phase === "edit" && run.tools.some((tool) => tool.mutatesWorkspace);
}

export function appendEvent(run: KernelRun, event: AgentEvent): KernelRun {
  return {
    ...run,
    events: [...run.events, event],
  };
}

export function createCheckpoint(
  run: KernelRun,
  input: Omit<AgentCheckpoint, "eventIds">,
): KernelRun {
  return {
    ...run,
    checkpoints: [
      ...run.checkpoints,
      {
        ...input,
        eventIds: run.events.map((event) => event.id),
      },
    ],
  };
}
