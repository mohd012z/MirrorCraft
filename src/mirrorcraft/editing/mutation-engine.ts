import { SECTION_PRESETS } from "@/mirrorcraft/design-library/advanced";
import type { EditOperation, EditValue } from "@/mirrorcraft/editing/types";
import {
  reconcileSectionContentState,
  type SectionContentState,
} from "@/mirrorcraft/section-content";
import {
  replaceSectionVariant,
  type PageComposition,
  type SectionInstance,
} from "@/mirrorcraft/section-composer";
import {
  createStudioSnapshot,
  type StudioSnapshot,
} from "@/mirrorcraft/studio-history";

export interface StudioMutationPlanOptions {
  id: string;
  label: string;
}

export interface StudioMutationPlan {
  id: string;
  label: string;
  before: StudioSnapshot;
  after: StudioSnapshot;
  operations: readonly EditOperation[];
  affectedNodeIds: readonly string[];
  reversible: boolean;
}

interface RestructurePayload {
  action: "add-section" | "remove-section" | "move-section" | "set-hidden";
  instanceId?: string;
  presetId?: string;
  index?: number;
  hidden?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRestructurePayload(value: EditValue | undefined): RestructurePayload | null {
  if (!isRecord(value) || typeof value.action !== "string") return null;
  if (
    value.action !== "add-section" &&
    value.action !== "remove-section" &&
    value.action !== "move-section" &&
    value.action !== "set-hidden"
  ) {
    return null;
  }

  return {
    action: value.action,
    instanceId: typeof value.instanceId === "string" ? value.instanceId : undefined,
    presetId: typeof value.presetId === "string" ? value.presetId : undefined,
    index: typeof value.index === "number" ? value.index : undefined,
    hidden: typeof value.hidden === "boolean" ? value.hidden : undefined,
  };
}

function cloneSnapshot(snapshot: StudioSnapshot): StudioSnapshot {
  return createStudioSnapshot(snapshot.composition, snapshot.content);
}

function snapshotEquals(left: StudioSnapshot, right: StudioSnapshot): boolean {
  if (
    left.composition.pageId !== right.composition.pageId ||
    left.composition.revision !== right.composition.revision ||
    left.content.revision !== right.content.revision ||
    left.composition.sections.length !== right.composition.sections.length
  ) {
    return false;
  }

  for (let index = 0; index < left.composition.sections.length; index += 1) {
    const a = left.composition.sections[index];
    const b = right.composition.sections[index];
    if (
      a.instanceId !== b.instanceId ||
      a.presetId !== b.presetId ||
      a.kind !== b.kind ||
      a.hidden !== b.hidden
    ) {
      return false;
    }
  }

  const leftKeys = Object.keys(left.content.values);
  const rightKeys = Object.keys(right.content.values);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left.content.values[key] === right.content.values[key]);
}

function editValueEquals(actual: string | undefined, expected: EditValue | undefined): boolean {
  if (expected === undefined) return true;
  if (expected === null) return actual === undefined;
  return typeof expected === "string" && actual === expected;
}

function updateContentValue(
  content: SectionContentState,
  operation: EditOperation,
): SectionContentState {
  const current = content.values[operation.target.nodeId];
  if (!editValueEquals(current, operation.before)) {
    throw new Error(`Mutation precondition failed for ${operation.target.nodeId}`);
  }

  if (operation.after !== null && typeof operation.after !== "string") {
    throw new Error(`Content mutation ${operation.id} requires a string or null value`);
  }

  if (operation.after === null) {
    if (current === undefined) return content;
    const values = { ...content.values };
    delete values[operation.target.nodeId];
    return { revision: content.revision + 1, values };
  }

  if (current === operation.after) return content;
  return {
    revision: content.revision + 1,
    values: {
      ...content.values,
      [operation.target.nodeId]: operation.after,
    },
  };
}

function withSections(
  composition: PageComposition,
  sections: SectionInstance[],
): PageComposition {
  const unchanged =
    sections.length === composition.sections.length &&
    sections.every((section, index) => {
      const current = composition.sections[index];
      return (
        current.instanceId === section.instanceId &&
        current.presetId === section.presetId &&
        current.kind === section.kind &&
        current.hidden === section.hidden
      );
    });

  return unchanged
    ? composition
    : {
        ...composition,
        revision: composition.revision + 1,
        sections,
      };
}

function presetKind(presetId: string): SectionInstance["kind"] {
  const preset = SECTION_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown section preset: ${presetId}`);
  return preset.kind;
}

function applyRestructure(
  composition: PageComposition,
  operation: EditOperation,
): PageComposition {
  const after = asRestructurePayload(operation.after);
  const before = asRestructurePayload(operation.before);
  const payload = after ?? before;
  if (!payload) {
    throw new Error(`Invalid restructure payload for ${operation.id}`);
  }

  if (payload.action === "add-section" && after) {
    if (!after.instanceId || !after.presetId || after.index === undefined) {
      throw new Error(`Add-section mutation ${operation.id} is incomplete`);
    }
    if (composition.sections.some((section) => section.instanceId === after.instanceId)) {
      throw new Error(`Section already exists: ${after.instanceId}`);
    }
    const sections = [...composition.sections];
    const index = Math.max(0, Math.min(after.index, sections.length));
    sections.splice(index, 0, {
      instanceId: after.instanceId,
      presetId: after.presetId,
      kind: presetKind(after.presetId),
      hidden: false,
    });
    return withSections(composition, sections);
  }

  if (payload.action === "remove-section" && operation.after === null) {
    const instanceId = before?.instanceId ?? operation.target.nodeId;
    if (!instanceId || !composition.sections.some((section) => section.instanceId === instanceId)) {
      throw new Error(`Unknown section for removal: ${instanceId ?? operation.target.nodeId}`);
    }
    return withSections(
      composition,
      composition.sections.filter((section) => section.instanceId !== instanceId),
    );
  }

  if (payload.action === "move-section" && after) {
    if (after.index === undefined) throw new Error(`Move mutation ${operation.id} is missing an index`);
    const currentIndex = composition.sections.findIndex(
      (section) => section.instanceId === operation.target.nodeId,
    );
    if (currentIndex < 0) throw new Error(`Unknown section: ${operation.target.nodeId}`);
    if (before?.index !== undefined && before.index !== currentIndex) {
      throw new Error(`Mutation precondition failed for ${operation.target.nodeId}`);
    }
    const sections = [...composition.sections];
    const [section] = sections.splice(currentIndex, 1);
    const index = Math.max(0, Math.min(after.index, sections.length));
    sections.splice(index, 0, section);
    return withSections(composition, sections);
  }

  if (payload.action === "set-hidden" && after) {
    if (after.hidden === undefined) {
      throw new Error(`Visibility mutation ${operation.id} is missing hidden state`);
    }
    const current = composition.sections.find(
      (section) => section.instanceId === operation.target.nodeId,
    );
    if (!current) throw new Error(`Unknown section: ${operation.target.nodeId}`);
    if (before?.hidden !== undefined && before.hidden !== current.hidden) {
      throw new Error(`Mutation precondition failed for ${operation.target.nodeId}`);
    }
    return withSections(
      composition,
      composition.sections.map((section) =>
        section.instanceId === operation.target.nodeId
          ? { ...section, hidden: after.hidden ?? section.hidden }
          : section,
      ),
    );
  }

  throw new Error(`Unsupported restructure mutation: ${operation.id}`);
}

function applyOperation(snapshot: StudioSnapshot, operation: EditOperation): StudioSnapshot {
  if (operation.category === "content" || operation.category === "asset") {
    return {
      composition: snapshot.composition,
      content: updateContentValue(snapshot.content, operation),
    };
  }

  if (operation.category === "restructure") {
    const composition = applyRestructure(snapshot.composition, operation);
    const content = reconcileSectionContentState(snapshot.content, composition);
    return { composition, content };
  }

  if (operation.category === "template") {
    const current = snapshot.composition.sections.find(
      (section) => section.instanceId === operation.target.nodeId,
    );
    if (!current) throw new Error(`Unknown section: ${operation.target.nodeId}`);
    if (operation.before !== undefined && operation.before !== current.presetId) {
      throw new Error(`Mutation precondition failed for ${operation.target.nodeId}`);
    }
    if (typeof operation.after !== "string") {
      throw new Error(`Template mutation ${operation.id} requires a preset id`);
    }
    const composition = replaceSectionVariant(
      snapshot.composition,
      operation.target.nodeId,
      operation.after,
    );
    return {
      composition,
      content: reconcileSectionContentState(snapshot.content, composition),
    };
  }

  throw new Error(`Unsupported studio mutation category: ${operation.category}`);
}

export function planStudioMutation(
  snapshot: StudioSnapshot,
  operations: readonly EditOperation[],
  options: StudioMutationPlanOptions,
): StudioMutationPlan {
  if (!options.id.trim()) throw new Error("Studio mutation plan requires an id");
  if (!options.label.trim()) throw new Error("Studio mutation plan requires a label");
  if (operations.length === 0) throw new Error("Studio mutation plan requires at least one operation");

  const before = cloneSnapshot(snapshot);
  let after = cloneSnapshot(snapshot);
  for (const operation of operations) {
    after = applyOperation(after, operation);
  }

  return {
    id: options.id,
    label: options.label,
    before,
    after: cloneSnapshot(after),
    operations: [...operations],
    affectedNodeIds: [...new Set(operations.map((operation) => operation.target.nodeId))],
    reversible: operations.every((operation) => operation.reversible),
  };
}

export function applyStudioMutation(
  snapshot: StudioSnapshot,
  plan: StudioMutationPlan,
): StudioSnapshot {
  if (!snapshotEquals(snapshot, plan.before)) {
    throw new Error(`Studio mutation plan ${plan.id} is stale and cannot be applied`);
  }
  return cloneSnapshot(plan.after);
}

export function rollbackStudioMutation(plan: StudioMutationPlan): StudioSnapshot {
  if (!plan.reversible) {
    throw new Error(`Studio mutation plan ${plan.id} is not reversible`);
  }
  return cloneSnapshot(plan.before);
}
