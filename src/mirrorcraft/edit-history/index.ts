import type { EditOperation, EditValue } from "@/mirrorcraft/editing/types";
import type { SectionContentState } from "@/mirrorcraft/section-content";
import type { PageComposition, SectionInstance } from "@/mirrorcraft/section-composer";

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

interface SectionState {
  section: SectionInstance;
  index: number;
}

function timestamp(value?: string): string {
  return value ?? new Date().toISOString();
}

function snapshotId(sequence: number): string {
  return `studio-snapshot:${sequence}`;
}

function sectionStates(composition: PageComposition): Map<string, SectionState> {
  return new Map(
    composition.sections.map((section, index) => [section.instanceId, { section, index }]),
  );
}

function sectionSignature(section: SectionInstance): string {
  return `${section.presetId}|${section.kind}|${section.hidden ? "hidden" : "visible"}`;
}

function sectionValue(state: SectionState | undefined): EditValue {
  if (!state) return null;
  return {
    instanceId: state.section.instanceId,
    presetId: state.section.presetId,
    kind: state.section.kind,
    hidden: state.section.hidden,
    order: state.index,
  };
}

function sameWorkspaceState(
  snapshot: StudioSnapshot,
  composition: PageComposition,
  content: SectionContentState,
): boolean {
  const summary = summarizeStudioTransition(snapshot, {
    ...snapshot,
    composition,
    content,
  });
  return !summary.compositionChanged && !summary.contentChanged;
}

function operationId(prefix: string, category: "section" | "content", sequence: number): string {
  return `${prefix}:${category}:${sequence}`;
}

export function createStudioSnapshot(
  composition: PageComposition,
  content: SectionContentState,
  options: CreateStudioSnapshotOptions = {},
): StudioSnapshot {
  return {
    id: options.id ?? "studio-snapshot:standalone",
    label: options.label ?? "Studio state",
    createdAt: timestamp(options.createdAt),
    composition,
    content,
    operations: options.operations ?? [],
  };
}

export function createStudioHistory(
  composition: PageComposition,
  content: SectionContentState,
  options: CreateStudioHistoryOptions = {},
): StudioHistory {
  const maxEntries = Math.max(1, Math.floor(options.maxEntries ?? 100));
  return {
    present: createStudioSnapshot(composition, content, {
      id: snapshotId(0),
      label: options.label ?? "Initial state",
      createdAt: options.createdAt,
    }),
    past: [],
    future: [],
    maxEntries,
    sequence: 0,
  };
}

export function buildStudioSnapshotDiff(
  before: StudioSnapshot,
  after: StudioSnapshot,
): StudioSnapshotDiff {
  const beforeSections = sectionStates(before.composition);
  const afterSections = sectionStates(after.composition);
  const beforeIds = new Set(beforeSections.keys());
  const afterIds = new Set(afterSections.keys());

  const added = [...afterIds].filter((id) => !beforeIds.has(id));
  const removed = [...beforeIds].filter((id) => !afterIds.has(id));
  const shared = [...beforeIds].filter((id) => afterIds.has(id));
  const changed = shared.filter((id) => {
    const beforeState = beforeSections.get(id);
    const afterState = afterSections.get(id);
    return Boolean(
      beforeState &&
        afterState &&
        sectionSignature(beforeState.section) !== sectionSignature(afterState.section),
    );
  });
  const reordered = shared.filter((id) => {
    const beforeState = beforeSections.get(id);
    const afterState = afterSections.get(id);
    return Boolean(beforeState && afterState && beforeState.index !== afterState.index);
  });

  const beforeContentIds = new Set(Object.keys(before.content.values));
  const afterContentIds = new Set(Object.keys(after.content.values));
  const contentAdded = [...afterContentIds].filter((id) => !beforeContentIds.has(id));
  const contentRemoved = [...beforeContentIds].filter((id) => !afterContentIds.has(id));
  const contentChanged = [...beforeContentIds].filter(
    (id) => afterContentIds.has(id) && before.content.values[id] !== after.content.values[id],
  );

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
  const diff = buildStudioSnapshotDiff(before, after);
  const beforeSections = sectionStates(before.composition);
  const afterSections = sectionStates(after.composition);
  const operations: EditOperation[] = [];
  let sequence = 1;

  for (const nodeId of diff.changedSections) {
    const beforeState = beforeSections.get(nodeId);
    const afterState = afterSections.get(nodeId);
    operations.push({
      id: operationId(prefix, "section", sequence++),
      category: "restructure",
      parameterId: "restructure.operation",
      target: { nodeId, kind: "container" },
      before: sectionValue(beforeState),
      after: sectionValue(afterState),
      viewport: { mode: "all" },
      reversible: true,
      reason: beforeState ? (afterState ? "section-updated" : "section-removed") : "section-added",
      verification: { level: "visual", required: true },
      metadata: {
        added: diff.sections.added.includes(nodeId),
        removed: diff.sections.removed.includes(nodeId),
        changed: diff.sections.changed.includes(nodeId),
        reordered: diff.sections.reordered.includes(nodeId),
      },
    });
  }

  for (const nodeId of diff.changedContent) {
    const beforeValue = before.content.values[nodeId] ?? null;
    const afterValue = after.content.values[nodeId] ?? null;
    operations.push({
      id: operationId(prefix, "content", sequence++),
      category: "content",
      parameterId: "content.text",
      target: { nodeId, kind: "content" },
      before: beforeValue,
      after: afterValue,
      viewport: { mode: "all" },
      reversible: true,
      reason:
        beforeValue === null
          ? "content-added"
          : afterValue === null
            ? "content-removed"
            : "content-edited",
      verification: { level: "visual", required: true },
    });
  }

  return operations;
}

export function commitStudioSnapshot(
  history: StudioHistory,
  input: CommitStudioSnapshotInput,
): StudioHistory {
  if (sameWorkspaceState(history.present, input.composition, input.content)) {
    return history;
  }

  const sequence = history.sequence + 1;
  const past = [...history.past, history.present].slice(-history.maxEntries);
  const draft = createStudioSnapshot(input.composition, input.content, {
    id: snapshotId(sequence),
    label: input.label,
    createdAt: input.createdAt,
  });
  const operations = input.operations ?? deriveStudioEditOperations(
    history.present,
    draft,
    `studio-snapshot:${sequence}`,
  );

  return {
    ...history,
    present: { ...draft, operations },
    past,
    future: [],
    sequence,
  };
}

export function recordStudioSnapshot(
  history: StudioHistory,
  snapshot: StudioSnapshot,
  options: { label?: string; operations?: readonly EditOperation[]; createdAt?: string } = {},
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

export function undoStudioHistory(history: StudioHistory): StudioHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;

  return {
    ...history,
    present: previous,
    past: history.past.slice(0, -1),
    future: [history.present, ...history.future].slice(0, history.maxEntries),
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
  };
}

export const undoStudioTransaction = undoStudioHistory;
export const redoStudioTransaction = redoStudioHistory;

export function canUndoStudioHistory(history: StudioHistory): boolean {
  return history.past.length > 0;
}

export function canRedoStudioHistory(history: StudioHistory): boolean {
  return history.future.length > 0;
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
  snapshotIdToActivate: string,
): StudioHistory {
  const snapshots = [...history.past, history.present, ...history.future];
  const targetIndex = snapshots.findIndex((snapshot) => snapshot.id === snapshotIdToActivate);
  if (targetIndex < 0) return history;

  const target = snapshots[targetIndex];
  if (target.id === history.present.id) return history;

  return {
    ...history,
    present: target,
    past: snapshots.slice(0, targetIndex),
    future: snapshots.slice(targetIndex + 1),
  };
}

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
