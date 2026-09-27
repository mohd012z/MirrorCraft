import {
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
} from "@/mirrorcraft/studio-history";
import { buildStudioTransitionInspection } from "@/mirrorcraft/studio-history/inspection";
import {
  createSectionContentState,
  getSectionSlotNodeId,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("inspect", ["hero-centered"]);
const content = createSectionContentState(composition);
const heroId = composition.sections[0].instanceId;

let history = createStudioHistory(createStudioSnapshot(composition, content));
const nextContent = setSectionSlotValue(content, heroId, "heading", "Inspected heading");
history = recordStudioSnapshot(
  history,
  createStudioSnapshot(composition, nextContent),
  { label: "Edit hero heading", timestamp: "2026-09-26T00:10:00.000Z" },
);

const transition = history.past.at(-1);
if (!transition) throw new Error("Expected a history transition");

const inspection = buildStudioTransitionInspection(transition);
const headingNodeId = getSectionSlotNodeId(heroId, "heading");

if (inspection.operationCount !== 1) throw new Error("Expected one operation");
if (!inspection.reversible) throw new Error("Expected the edit to be reversible");
if (!inspection.affectedNodeIds.includes(headingNodeId)) {
  throw new Error("Expected heading node in affected nodes");
}
if (inspection.diff.content.changed.length !== 1) {
  throw new Error("Expected one changed content value");
}
if (!inspection.verificationLevels.includes("visual")) {
  throw new Error("Expected visual verification requirement");
}
