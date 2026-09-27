import {
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
  redoStudioHistory,
  undoStudioHistory,
  type CreateStudioSnapshotOptions,
  type StudioHistory,
  type StudioSnapshot,
} from "@/mirrorcraft/edit-history";
import type { SectionContentState } from "@/mirrorcraft/section-content";
import type { PageComposition } from "@/mirrorcraft/section-composer";

export type EditCheckpoint = StudioSnapshot;
export type EditHistory = StudioHistory;

export interface RecordEditOptions {
  label?: string;
  createdAt?: string;
}

export function createEditCheckpoint(
  composition: PageComposition,
  content: SectionContentState,
  options: CreateStudioSnapshotOptions = {},
): EditCheckpoint {
  return createStudioSnapshot(composition, content, options);
}

export function createEditHistory(
  checkpoint: EditCheckpoint,
  maxEntries = 100,
): EditHistory {
  return createStudioHistory(checkpoint, maxEntries);
}

export function recordEdit(
  history: EditHistory,
  checkpoint: EditCheckpoint,
  options: RecordEditOptions = {},
): EditHistory {
  return recordStudioSnapshot(history, checkpoint, {
    label: options.label ?? checkpoint.label,
    createdAt: options.createdAt ?? checkpoint.createdAt,
    operations: checkpoint.operations,
  });
}

export function undoEdit(history: EditHistory): EditHistory {
  return undoStudioHistory(history);
}

export function redoEdit(history: EditHistory): EditHistory {
  return redoStudioHistory(history);
}
