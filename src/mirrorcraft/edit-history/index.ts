import type { EditOperation } from "@/mirrorcraft/editing/types";
import type { SectionContentState } from "@/mirrorcraft/section-content";
import type { PageComposition } from "@/mirrorcraft/section-composer";

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

function timestamp(value?: string): string {
  return value ?? new Date().toISOString();
}

function snapshotId(sequence: number): string {
  return `studio-snapshot:${sequence}`;
}

function sectionSignature(composition: PageComposition): Map<string, string> {
  return new Map(
    composition.sections.map((section, index) => [
      section.instanceId,
      `${index}|${section.presetId}|${section.kind}|${section.hidden ? "hidden" : "visible"}`,
    ]),
  );
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

export function createStudioHistory(
  composition: PageComposition,
  content: SectionContentState,
  options: CreateStudioHistoryOptions = {},
): StudioHistory {
  const maxEntries = Math.max(1, Math.floor(options.maxEntries ?? 100));
  return {
    present: {
      id: snapshotId(0),
      label: options.label ?? "Initial state",
      createdAt: timestamp(options.createdAt),
      composition,
      content,
      operations: [],
    },
    past: [],
    future: [],
    maxEntries,
    sequence: 0,
  };
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

  return {
    ...history,
    present: {
      id: snapshotId(sequence),
      label: input.label,
      createdAt: timestamp(input.createdAt),
      composition: input.composition,
      content: input.content,
      operations: input.operations ?? [],
    },
    past,
    future: [],
    sequence,
  };
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

export function canUndoStudioHistory(history: StudioHistory): boolean {
  return history.past.length > 0;
}

export function canRedoStudioHistory(history: StudioHistory): boolean {
  return history.future.length > 0;
}

export function summarizeStudioTransition(
  before: StudioSnapshot,
  after: StudioSnapshot,
): StudioTransitionSummary {
  const beforeSections = sectionSignature(before.composition);
  const afterSections = sectionSignature(after.composition);
  const sectionIds = new Set([...beforeSections.keys(), ...afterSections.keys()]);
  const changedSectionIds = [...sectionIds].filter(
    (id) => beforeSections.get(id) !== afterSections.get(id),
  );

  const contentIds = new Set([
    ...Object.keys(before.content.values),
    ...Object.keys(after.content.values),
  ]);
  const changedContentNodeIds = [...contentIds].filter(
    (id) => before.content.values[id] !== after.content.values[id],
  );

  return {
    compositionChanged: changedSectionIds.length > 0,
    contentChanged: changedContentNodeIds.length > 0,
    sectionDelta: after.composition.sections.length - before.composition.sections.length,
    changedSectionIds,
    changedContentNodeIds,
  };
}
