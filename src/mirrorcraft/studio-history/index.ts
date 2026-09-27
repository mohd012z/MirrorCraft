import type { EditOperation } from "@/mirrorcraft/editing/types";
import type { SectionContentState } from "@/mirrorcraft/section-content";
import type {
  PageComposition,
  SectionInstance,
} from "@/mirrorcraft/section-composer";

export interface StudioSnapshot {
  composition: PageComposition;
  content: SectionContentState;
}

export interface SectionMoveDiff {
  instanceId: string;
  from: number;
  to: number;
}

export interface SectionBooleanDiff {
  instanceId: string;
  before: boolean;
  after: boolean;
}

export interface SectionVariantDiff {
  instanceId: string;
  before: string;
  after: string;
}

export interface ContentValueDiff {
  nodeId: string;
  before?: string;
  after?: string;
}

export interface StudioDiffSummary {
  sections: {
    added: SectionInstance[];
    removed: SectionInstance[];
    moved: SectionMoveDiff[];
    hiddenChanged: SectionBooleanDiff[];
    variantChanged: SectionVariantDiff[];
  };
  content: {
    added: ContentValueDiff[];
    removed: ContentValueDiff[];
    changed: ContentValueDiff[];
  };
  compositionRevisionDelta: number;
  contentRevisionDelta: number;
}

export interface StudioHistoryTransition {
  id: string;
  label: string;
  before: StudioSnapshot;
  after: StudioSnapshot;
  operations: readonly EditOperation[];
  timestamp: string;
}

export interface StudioHistory {
  present: StudioSnapshot;
  past: readonly StudioHistoryTransition[];
  future: readonly StudioHistoryTransition[];
  entries: readonly StudioHistoryTransition[];
  limit: number;
  sequence: number;
}

export interface RecordStudioSnapshotOptions {
  label: string;
  operations?: readonly EditOperation[];
  timestamp?: string;
}

function cloneComposition(composition: PageComposition): PageComposition {
  return {
    ...composition,
    sections: composition.sections.map((section) => ({ ...section })),
  };
}

function cloneContent(content: SectionContentState): SectionContentState {
  return {
    ...content,
    values: { ...content.values },
  };
}

export function createStudioSnapshot(
  composition: PageComposition,
  content: SectionContentState,
): StudioSnapshot {
  return {
    composition: cloneComposition(composition),
    content: cloneContent(content),
  };
}

function cloneSnapshot(snapshot: StudioSnapshot): StudioSnapshot {
  return createStudioSnapshot(snapshot.composition, snapshot.content);
}

export function createStudioHistory(
  initial: StudioSnapshot,
  limit = 100,
): StudioHistory {
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("Studio history limit must be at least 1");
  }

  return {
    present: cloneSnapshot(initial),
    past: [],
    future: [],
    entries: [],
    limit: Math.floor(limit),
    sequence: 0,
  };
}

function hasDiff(diff: StudioDiffSummary): boolean {
  return (
    diff.sections.added.length > 0 ||
    diff.sections.removed.length > 0 ||
    diff.sections.moved.length > 0 ||
    diff.sections.hiddenChanged.length > 0 ||
    diff.sections.variantChanged.length > 0 ||
    diff.content.added.length > 0 ||
    diff.content.removed.length > 0 ||
    diff.content.changed.length > 0
  );
}

function transitionId(sequence: number): string {
  return `studio-change-${sequence}`;
}

export function recordStudioSnapshot(
  history: StudioHistory,
  next: StudioSnapshot,
  options: RecordStudioSnapshotOptions,
): StudioHistory {
  const nextSnapshot = cloneSnapshot(next);
  const diff = summarizeStudioDiff(history.present, nextSnapshot);
  if (!hasDiff(diff)) return history;

  const sequence = history.sequence + 1;
  const operations = options.operations ?? deriveStudioEditOperations(history.present, nextSnapshot);
  const transition: StudioHistoryTransition = {
    id: transitionId(sequence),
    label: options.label,
    before: cloneSnapshot(history.present),
    after: nextSnapshot,
    operations,
    timestamp: options.timestamp ?? new Date().toISOString(),
  };
  const past = [...history.past, transition].slice(-history.limit);
  const entries = [...history.past, transition].slice(-history.limit);

  return {
    ...history,
    present: nextSnapshot,
    past,
    future: [],
    entries,
    sequence,
  };
}

export function canUndoStudioHistory(history: StudioHistory): boolean {
  return history.past.length > 0;
}

export function canRedoStudioHistory(history: StudioHistory): boolean {
  return history.future.length > 0;
}

export function undoStudioHistory(history: StudioHistory): StudioHistory {
  const transition = history.past.at(-1);
  if (!transition) return history;

  return {
    ...history,
    present: cloneSnapshot(transition.before),
    past: history.past.slice(0, -1),
    future: [transition, ...history.future].slice(0, history.limit),
  };
}

export function redoStudioHistory(history: StudioHistory): StudioHistory {
  const transition = history.future[0];
  if (!transition) return history;

  return {
    ...history,
    present: cloneSnapshot(transition.after),
    past: [...history.past, transition].slice(-history.limit),
    future: history.future.slice(1),
  };
}

function relativeSharedPositions(
  before: PageComposition,
  after: PageComposition,
): {
  beforeIndex: Map<string, number>;
  afterIndex: Map<string, number>;
} {
  const beforeIds = new Set(before.sections.map((section) => section.instanceId));
  const afterIds = new Set(after.sections.map((section) => section.instanceId));
  const shared = new Set([...beforeIds].filter((id) => afterIds.has(id)));
  const beforeShared = before.sections
    .map((section) => section.instanceId)
    .filter((id) => shared.has(id));
  const afterShared = after.sections
    .map((section) => section.instanceId)
    .filter((id) => shared.has(id));

  return {
    beforeIndex: new Map(beforeShared.map((id, index) => [id, index])),
    afterIndex: new Map(afterShared.map((id, index) => [id, index])),
  };
}

export function summarizeStudioDiff(
  before: StudioSnapshot,
  after: StudioSnapshot,
): StudioDiffSummary {
  const beforeById = new Map(
    before.composition.sections.map((section, index) => [section.instanceId, { section, index }]),
  );
  const afterById = new Map(
    after.composition.sections.map((section, index) => [section.instanceId, { section, index }]),
  );
  const relative = relativeSharedPositions(before.composition, after.composition);

  const added = after.composition.sections.filter((section) => !beforeById.has(section.instanceId));
  const removed = before.composition.sections.filter((section) => !afterById.has(section.instanceId));
  const moved: SectionMoveDiff[] = [];
  const hiddenChanged: SectionBooleanDiff[] = [];
  const variantChanged: SectionVariantDiff[] = [];

  for (const [instanceId, beforeItem] of beforeById) {
    const afterItem = afterById.get(instanceId);
    if (!afterItem) continue;

    const beforeRelativeIndex = relative.beforeIndex.get(instanceId);
    const afterRelativeIndex = relative.afterIndex.get(instanceId);
    if (
      beforeRelativeIndex !== undefined &&
      afterRelativeIndex !== undefined &&
      beforeRelativeIndex !== afterRelativeIndex
    ) {
      moved.push({ instanceId, from: beforeItem.index, to: afterItem.index });
    }
    if (beforeItem.section.hidden !== afterItem.section.hidden) {
      hiddenChanged.push({
        instanceId,
        before: beforeItem.section.hidden,
        after: afterItem.section.hidden,
      });
    }
    if (beforeItem.section.presetId !== afterItem.section.presetId) {
      variantChanged.push({
        instanceId,
        before: beforeItem.section.presetId,
        after: afterItem.section.presetId,
      });
    }
  }

  const beforeKeys = new Set(Object.keys(before.content.values));
  const afterKeys = new Set(Object.keys(after.content.values));
  const contentAdded: ContentValueDiff[] = [];
  const contentRemoved: ContentValueDiff[] = [];
  const contentChanged: ContentValueDiff[] = [];

  for (const nodeId of afterKeys) {
    if (!beforeKeys.has(nodeId)) {
      contentAdded.push({ nodeId, after: after.content.values[nodeId] });
      continue;
    }
    const beforeValue = before.content.values[nodeId];
    const afterValue = after.content.values[nodeId];
    if (beforeValue !== afterValue) {
      contentChanged.push({ nodeId, before: beforeValue, after: afterValue });
    }
  }

  for (const nodeId of beforeKeys) {
    if (!afterKeys.has(nodeId)) {
      contentRemoved.push({ nodeId, before: before.content.values[nodeId] });
    }
  }

  return {
    sections: { added, removed, moved, hiddenChanged, variantChanged },
    content: { added: contentAdded, removed: contentRemoved, changed: contentChanged },
    compositionRevisionDelta: after.composition.revision - before.composition.revision,
    contentRevisionDelta: after.content.revision - before.content.revision,
  };
}

function allViewport() {
  return { mode: "all" as const };
}

function operationId(index: number, nodeId: string): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `studio-op-${index + 1}-${safe}`;
}

function isMediaNode(nodeId: string): boolean {
  return /:slot:(media|dashboardPreview|avatar)$/.test(nodeId);
}

function parentSectionId(nodeId: string): string {
  return nodeId.split(":slot:")[0];
}

export function deriveStudioEditOperations(
  before: StudioSnapshot,
  after: StudioSnapshot,
): EditOperation[] {
  const diff = summarizeStudioDiff(before, after);
  const operations: EditOperation[] = [];
  const addedIds = new Set(diff.sections.added.map((section) => section.instanceId));
  const removedIds = new Set(diff.sections.removed.map((section) => section.instanceId));

  function addOperation(operation: Omit<EditOperation, "id">) {
    operations.push({
      ...operation,
      id: operationId(operations.length, operation.target.nodeId),
    });
  }

  for (const section of diff.sections.added) {
    const index = after.composition.sections.findIndex((item) => item.instanceId === section.instanceId);
    addOperation({
      category: "restructure",
      parameterId: "restructure.operation",
      target: { nodeId: `page:${after.composition.pageId}`, kind: "page" },
      before: null,
      after: {
        action: "add-section",
        instanceId: section.instanceId,
        presetId: section.presetId,
        index,
      },
      viewport: allViewport(),
      reversible: true,
      reason: "Section added in Studio Composer",
      verification: { level: "full", required: true },
    });
  }

  for (const section of diff.sections.removed) {
    const index = before.composition.sections.findIndex((item) => item.instanceId === section.instanceId);
    addOperation({
      category: "restructure",
      parameterId: "restructure.operation",
      target: { nodeId: section.instanceId, kind: "container" },
      before: {
        action: "remove-section",
        instanceId: section.instanceId,
        presetId: section.presetId,
        index,
      },
      after: null,
      viewport: allViewport(),
      reversible: true,
      reason: "Section removed in Studio Composer",
      verification: { level: "full", required: true },
    });
  }

  for (const item of diff.sections.moved) {
    addOperation({
      category: "restructure",
      parameterId: "restructure.operation",
      target: { nodeId: item.instanceId, kind: "container" },
      before: { action: "move-section", index: item.from },
      after: { action: "move-section", index: item.to },
      viewport: allViewport(),
      reversible: true,
      reason: "Section reordered in Studio Composer",
      verification: { level: "visual", required: true },
    });
  }

  for (const item of diff.sections.hiddenChanged) {
    addOperation({
      category: "restructure",
      parameterId: "restructure.operation",
      target: { nodeId: item.instanceId, kind: "container" },
      before: { action: "set-hidden", hidden: item.before },
      after: { action: "set-hidden", hidden: item.after },
      viewport: allViewport(),
      reversible: true,
      reason: "Section visibility changed in Studio Composer",
      verification: { level: "visual", required: true },
    });
  }

  for (const item of diff.sections.variantChanged) {
    addOperation({
      category: "template",
      parameterId: "template.apply",
      target: { nodeId: item.instanceId, kind: "container" },
      before: item.before,
      after: item.after,
      viewport: allViewport(),
      reversible: true,
      reason: "Section template variant changed",
      verification: { level: "full", required: true },
    });
  }

  const contentChanges: Array<{
    item: ContentValueDiff;
    changeKind: "added" | "removed" | "changed";
  }> = [
    ...diff.content.added.map((item) => ({ item, changeKind: "added" as const })),
    ...diff.content.removed.map((item) => ({ item, changeKind: "removed" as const })),
    ...diff.content.changed.map((item) => ({ item, changeKind: "changed" as const })),
  ];

  for (const { item, changeKind } of contentChanges) {
    const instanceId = parentSectionId(item.nodeId);
    if (addedIds.has(instanceId) || removedIds.has(instanceId)) continue;

    const media = isMediaNode(item.nodeId);
    addOperation({
      category: media ? "asset" : "content",
      parameterId: media ? "asset.image" : "content.text",
      target: { nodeId: item.nodeId, kind: "content" },
      before: item.before ?? null,
      after: item.after ?? null,
      viewport: allViewport(),
      reversible: true,
      reason:
        changeKind === "added"
          ? "Section slot added by template change"
          : changeKind === "removed"
            ? "Section slot removed by template change"
            : media
              ? "Section media changed by direct edit"
              : "Section content changed by direct edit",
      verification: { level: "visual", required: true },
      metadata: { changeKind },
    });
  }

  return operations;
}

export function commitStudioTransaction(
  history: StudioHistory,
  snapshot: StudioSnapshot,
  operation: EditOperation,
  label: string,
): StudioHistory {
  return recordStudioSnapshot(history, snapshot, {
    label,
    operations: [operation],
  });
}

export const undoStudioTransaction = undoStudioHistory;
export const redoStudioTransaction = redoStudioHistory;
