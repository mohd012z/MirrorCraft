import {
  recordStudioSnapshot,
  type StudioHistory,
} from "@/mirrorcraft/studio-history";
import {
  getStudioTimeline,
} from "@/mirrorcraft/studio-history/timeline";

export interface RestoreStudioCheckpointOptions {
  label?: string;
  timestamp?: string;
}

export function restoreStudioCheckpoint(
  history: StudioHistory,
  targetId: string,
  options: RestoreStudioCheckpointOptions = {},
): StudioHistory {
  const target = getStudioTimeline(history).find((entry) => entry.id === targetId);
  if (!target) {
    throw new Error(`Unknown studio checkpoint: ${targetId}`);
  }

  return recordStudioSnapshot(history, target.snapshot, {
    label: options.label ?? `Restore ${target.label}`,
    timestamp: options.timestamp,
  });
}
