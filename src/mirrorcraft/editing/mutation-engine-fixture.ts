import type { EditOperation } from "@/mirrorcraft/editing/types";
import {
  applyStudioMutation,
  planStudioMutation,
  rollbackStudioMutation,
  type StudioMutationPlan,
} from "@/mirrorcraft/editing/mutation-engine";
import {
  createStudioSnapshot,
  type StudioSnapshot,
} from "@/mirrorcraft/studio-history";
import {
  createSectionContentState,
  getSectionSlotNodeId,
} from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("mutation", ["hero-centered"]);
const content = createSectionContentState(composition);
const snapshot: StudioSnapshot = createStudioSnapshot(composition, content);
const heroId = composition.sections[0].instanceId;
const headingNodeId = getSectionSlotNodeId(heroId, "heading");
const beforeHeading = content.values[headingNodeId];

const operation: EditOperation = {
  id: "mutation-content-edit",
  category: "content",
  parameterId: "content.text",
  target: { nodeId: headingNodeId, kind: "content" },
  before: beforeHeading,
  after: "Atomic heading",
  viewport: { mode: "all" },
  reversible: true,
  verification: { level: "visual", required: true },
};

const plan: StudioMutationPlan = planStudioMutation(snapshot, [operation], {
  id: "mutation-plan",
  label: "Edit hero heading atomically",
});
const applied = applyStudioMutation(snapshot, plan);
const rolledBack = rollbackStudioMutation(plan);

if (applied.content.values[headingNodeId] !== "Atomic heading") {
  throw new Error("Mutation should apply the planned content value");
}
if (rolledBack.content.values[headingNodeId] !== beforeHeading) {
  throw new Error("Rollback should restore the original content value");
}
