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
  operations: EditOperation[];
  timestamp: string;
}

export interface StudioHistory {
  present: StudioSnapshot;
  past: StudioHistoryTransition[];
  future: StudioHistoryTransition[];
  limit: number;
}

export interface RecordStudioSnapshotOptions {
  label: string;
  operations?: EditOperation[];
  timestamp?: string;
}

export function createStudioSnapshot(
  composition: PageComposition,
  content: SectionContentState,
): StudioSnapshot {
  return { composition, content };
}

export function createStudioHistory(
  initial: StudioSnapshot,
  limit = 100,
): StudioHistory {
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("Studio history limit must be at least 1");
  }
  return {
    present: initial,
    past: [],
    future: [],
    limit: Math.floor(limit),
  };
}

function sameSnapshot(left: StudioSnapshot, right: StudioSnapshot): boolean {
  return left.composition === right.composition && left.content === right.content;
}

function transitionId(history: StudioHistory): string {
  const sequence = history.past.length + history.future.length + 1;
  return `studio-change-${sequence}`;
}

export function recordStudioSnapshot(
  history: StudioHistory,
  next: StudioSnapshot,
  options: RecordStudioSnapshotOptions,
): StudioHistory {
  if (sameSnapshot(history.present, next)) return history;

  const operations = options.operations ?? deriveStudioEditOperations(history.present, next);
  const transition: StudioHistoryTransition = {
    id: transitionId(history),
    label: options.label,
    before: history.present,
    after: next,
    operations,
    timestamp: options.timestamp ?? new Date().toISOString(),
  };
  const past = [...history.past, transition].slice(-history.limit);

  return {
    ...history,
    present: next,
    past,
    future: [],
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
    present: transition.before,
    past: history.past.slice(0, -1),
    future: [transition, ...history.future],
  };
}

export function redoStudioHistory(history: StudioHistory): StudioHistory {
  const transition = history.future[0];
  if (!transition) return history;

  return {
    ...history,
    present: transition.after,
    past: [...history.past, transition].slice(-history.limit),
    future: history.future.slice(1),
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

  const added = after.composition.sections.filter((section) => !beforeById.has(section.instanceId));
  const removed = before.composition.sections.filter((section) => !afterById.has(section.instanceId));
  const moved: SectionMoveDiff[] = [];
  const hiddenChanged: SectionBooleanDiff[] = [];
  const variantChanged: SectionVariantDiff[] = [];

  for (const [instanceId, beforeItem] of beforeById) {
    const afterItem = afterById.get(instanceId);
    if (!afterItem) continue;
    if (beforeItem.index !== afterItem.index) {
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

  for (const item of diff.content.changed) {
    const instanceId = item.nodeId.split(":slot:")[0];
    if (addedIds.has(instanceId) || removedIds.has(instanceId)) continue;
    const media = isMediaNode(item.nodeId);
    addOperation({
      category: media ? "asset" : "content",
      parameterId: media ? "asset.image" : "content.text",
      target: { nodeId: item.nodeId, kind: "content" },
      before: item.before ?? "",
      after: item.after ?? "",
      viewport: allViewport(),
      reversible: true,
      reason: media ? "Section media changed by direct edit" : "Section content changed by direct edit",
      verification: { level: "visual", required: true },
    });
  }

  return operations;
}
