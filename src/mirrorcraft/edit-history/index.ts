import type { EditOperation } from "@/mirrorcraft/editing/types";
import type { SectionContentState } from "@/mirrorcraft/section-content";
import type { PageComposition } from "@/mirrorcraft/section-composer";
import {
  canRedoStudioHistory as canRedoCoreHistory,
  canUndoStudioHistory as canUndoCoreHistory,
  createStudioHistory as createCoreHistory,
  createStudioSnapshot as createCoreSnapshot,
  deriveStudioEditOperations as deriveCoreOperations,
  recordStudioSnapshot as recordCoreSnapshot,
  redoStudioHistory as redoCoreHistory,
  summarizeStudioDiff as summarizeCoreDiff,
  undoStudioHistory as undoCoreHistory,
  type StudioHistory as CoreStudioHistory,
  type StudioSnapshot as CoreStudioSnapshot,
} from "@/mirrorcraft/studio-history";

export interface StudioSnapshot {
  id: string;
  label: string;
  createdAt: string;
  composition: PageComposition;
  content: SectionContentState;
  operations: readonly EditOperation[];
}

export interface StudioHistory {
  present: StudioSnapshot;
  past: readonly StudioSnapshot[];
  future: readonly StudioSnapshot[];
  maxEntries: number;
  sequence: number;
  core: CoreStudioHistory;
}

export interface CreateStudioHistoryOptions {
  maxEntries?: number;
  label?: string;
  createdAt?: string;
}

export interface CreateStudioSnapshotOptions {
  id?: string;
  label?: string;
  createdAt?: string;
  operations?: readonly EditOperation[];
}

export interface CommitStudioSnapshotInput {
  composition: PageComposition;
  content: SectionContentState;
  label: string;
  operations?: readonly EditOperation[];
  createdAt?: string;
}

export interface StudioTransitionSummary {
  compositionChanged: boolean;
  contentChanged: boolean;
  sectionDelta: number;
  changedSectionIds: readonly string[];
  changedContentNodeIds: readonly string[];
}

export interface StudioSnapshotDiff {
  sections: {
    added: readonly string[];
    removed: readonly string[];
    changed: readonly string[];
    reordered: readonly string[];
  };
  content: {
    added: readonly string[];
    removed: readonly string[];
    changed: readonly string[];
  };
  changedSections: readonly string[];
  changedContent: readonly string[];
}

export interface StudioTimelineEntry {
  id: string;
  label: string;
  createdAt: string;
  active: boolean;
  position: number;
  operationCount: number;
  snapshot: StudioSnapshot;
}

function now(value?: string): string {
  return value ?? new Date().toISOString();
}

function snapshotId(sequence: number): string {
  return `studio-snapshot:${sequence}`;
}

function toCoreSnapshot(snapshot: StudioSnapshot): CoreStudioSnapshot {
  return createCoreSnapshot(snapshot.composition, snapshot.content);
}

function legacySnapshot(
  composition: PageComposition,
  content: SectionContentState,
  sequence: number,
  options: CreateStudioSnapshotOptions = {},
): StudioSnapshot {
  return {
    id: options.id ?? snapshotId(sequence),
    label: options.label ?? "Studio state",
    createdAt: now(options.createdAt),
    composition,
    content,
    operations: options.operations ?? [],
  };
}

export function createStudioSnapshot(
  composition: PageComposition,
  content: SectionContentState,
  options: CreateStudioSnapshotOptions = {},
): StudioSnapshot {
  return legacySnapshot(composition, content, 0, options);
}

export function createStudioHistory(
  composition: PageComposition,
  content: SectionContentState,
  options: CreateStudioHistoryOptions = {},
): StudioHistory {
  const maxEntries = Math.max(1, Math.floor(options.maxEntries ?? 100));
  const present = legacySnapshot(composition, content, 0, {
    label: options.label ?? "Initial state",
    createdAt: options.createdAt,
  });
  return {
    present,
    past: [],
    future: [],
    maxEntries,
    sequence: 0,
    core: createCoreHistory(createCoreSnapshot(composition, content), maxEntries),
  };
}

function coreDiff(before: StudioSnapshot, after: StudioSnapshot) {
  return summarizeCoreDiff(toCoreSnapshot(before), toCoreSnapshot(after));
}

export function buildStudioSnapshotDiff(
  before: StudioSnapshot,
  after: StudioSnapshot,
): StudioSnapshotDiff {
  const diff = coreDiff(before, after);
  const added = diff.sections.added.map((section) => section.instanceId);
  const removed = diff.sections.removed.map((section) => section.instanceId);
  const changed = [
    ...diff.sections.hiddenChanged.map((item) => item.instanceId),
    ...diff.sections.variantChanged.map((item) => item.instanceId),
  ].filter((id, index, values) => values.indexOf(id) === index);
  const reordered = diff.sections.moved.map((item) => item.instanceId);
  const contentAdded = diff.content.added.map((item) => item.nodeId);
  const contentRemoved = diff.content.removed.map((item) => item.nodeId);
  const contentChanged = diff.content.changed.map((item) => item.nodeId);

  return {
    sections: { added, removed, changed, reordered },
    content: { added: contentAdded, removed: contentRemoved, changed: contentChanged },
    changedSections: [...new Set([...added, ...removed, ...changed, ...reordered])],
    changedContent: [...new Set([...contentAdded, ...contentRemoved, ...contentChanged])],
  };
}

export const summarizeStudioDiff = buildStudioSnapshotDiff;

export function deriveStudioEditOperations(
  before: StudioSnapshot,
  after: StudioSnapshot,
  prefix = "studio-edit",
): readonly EditOperation[] {
  return deriveCoreOperations(toCoreSnapshot(before), toCoreSnapshot(after)).map(
    (operation, index) => ({
      ...operation,
      id: `${prefix}:${index + 1}:${operation.id}`,
    }),
  );
}

export function commitStudioSnapshot(
  history: StudioHistory,
  input: CommitStudioSnapshotInput,
): StudioHistory {
  const draft = legacySnapshot(input.composition, input.content, history.sequence + 1, {
    label: input.label,
    createdAt: input.createdAt,
  });
  const diff = buildStudioSnapshotDiff(history.present, draft);
  if (diff.changedSections.length === 0 && diff.changedContent.length === 0) return history;

  const sequence = history.sequence + 1;
  const operations = input.operations ?? deriveStudioEditOperations(
    history.present,
    draft,
    `studio-snapshot:${sequence}`,
  );
  const present: StudioSnapshot = { ...draft, operations };
  const core = recordCoreSnapshot(
    history.core,
    createCoreSnapshot(input.composition, input.content),
    {
      label: input.label,
      operations,
      timestamp: input.createdAt,
    },
  );

  return {
    ...history,
    present,
    past: [...history.past, history.present].slice(-history.maxEntries),
    future: [],
    sequence,
    core,
  };
}

export function recordStudioSnapshot(
  history: StudioHistory,
  snapshot: StudioSnapshot,
  options: {
    label?: string;
    operations?: readonly EditOperation[];
    createdAt?: string;
  } = {},
): StudioHistory {
  return commitStudioSnapshot(history, {
    composition: snapshot.composition,
    content: snapshot.content,
    label: options.label ?? snapshot.label,
    operations: options.operations ?? snapshot.operations,
    createdAt: options.createdAt ?? snapshot.createdAt,
  });
}

export function commitStudioTransaction(
  history: StudioHistory,
  snapshot: StudioSnapshot,
  operation: EditOperation,
  label: string,
): StudioHistory {
  return recordStudioSnapshot(history, snapshot, { label, operations: [operation] });
}

export function canUndoStudioHistory(history: StudioHistory): boolean {
  return canUndoCoreHistory(history.core) && history.past.length > 0;
}

export function canRedoStudioHistory(history: StudioHistory): boolean {
  return canRedoCoreHistory(history.core) && history.future.length > 0;
}

export function undoStudioHistory(history: StudioHistory): StudioHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    ...history,
    present: previous,
    past: history.past.slice(0, -1),
    future: [history.present, ...history.future].slice(0, history.maxEntries),
    core: undoCoreHistory(history.core),
  };
}

export function redoStudioHistory(history: StudioHistory): StudioHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    ...history,
    present: next,
    past: [...history.past, history.present].slice(-history.maxEntries),
    future: history.future.slice(1),
    core: redoCoreHistory(history.core),
  };
}

export const undoStudioTransaction = undoStudioHistory;
export const redoStudioTransaction = redoStudioHistory;

export function summarizeStudioTransition(
  before: StudioSnapshot,
  after: StudioSnapshot,
): StudioTransitionSummary {
  const diff = buildStudioSnapshotDiff(before, after);
  return {
    compositionChanged: diff.changedSections.length > 0,
    contentChanged: diff.changedContent.length > 0,
    sectionDelta: after.composition.sections.length - before.composition.sections.length,
    changedSectionIds: diff.changedSections,
    changedContentNodeIds: diff.changedContent,
  };
}

export function getStudioTimeline(history: StudioHistory): readonly StudioTimelineEntry[] {
  const snapshots = [...history.past, history.present, ...history.future];
  return snapshots.map((snapshot, position) => ({
    id: snapshot.id,
    label: snapshot.label,
    createdAt: snapshot.createdAt,
    active: snapshot.id === history.present.id,
    position,
    operationCount: snapshot.operations.length,
    snapshot,
  }));
}

export function jumpToStudioSnapshot(
  history: StudioHistory,
  targetId: string,
): StudioHistory {
  const snapshots = [...history.past, history.present, ...history.future];
  const targetIndex = snapshots.findIndex((snapshot) => snapshot.id === targetId);
  if (targetIndex < 0) return history;
  const currentIndex = history.past.length;
  let core = history.core;

  if (targetIndex < currentIndex) {
    for (let index = currentIndex; index > targetIndex; index -= 1) {
      core = undoCoreHistory(core);
    }
  } else if (targetIndex > currentIndex) {
    for (let index = currentIndex; index < targetIndex; index += 1) {
      core = redoCoreHistory(core);
    }
  }

  return {
    ...history,
    present: snapshots[targetIndex],
    past: snapshots.slice(0, targetIndex),
    future: snapshots.slice(targetIndex + 1),
    core,
  };
}
