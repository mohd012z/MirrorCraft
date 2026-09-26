import {
  buildStudioChangeSet,
  type StudioChangeSetStatus,
} from "@/mirrorcraft/change-set";
import {
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
  undoStudioHistory,
} from "@/mirrorcraft/studio-history";
import {
  createSectionContentState,
  getSectionSlotNodeId,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("changeset", ["hero-centered"]);
const content = createSectionContentState(composition);
const heroId = composition.sections[0].instanceId;
const headingNodeId = getSectionSlotNodeId(heroId, "heading");

let history = createStudioHistory(createStudioSnapshot(composition, content));
const edited = setSectionSlotValue(content, heroId, "heading", "Change set heading");
history = recordStudioSnapshot(
  history,
  createStudioSnapshot(composition, edited),
  { label: "Edit hero heading" },
);

const changeSet = buildStudioChangeSet(history);
const status: StudioChangeSetStatus = changeSet.status;

if (status !== "ready") throw new Error("Expected applied edit to produce ready change set");
if (changeSet.operationCount !== 1) throw new Error("Expected one operation");
if (!changeSet.categories.includes("content")) throw new Error("Expected content category");
if (!changeSet.targetNodeIds.includes(headingNodeId)) throw new Error("Expected heading target");
if (!changeSet.verificationLevels.includes("visual")) throw new Error("Expected visual verification");
if (!changeSet.verificationChecks.includes("visual")) throw new Error("Expected visual check");
if (!changeSet.reversible) throw new Error("Expected reversible change set");

const undone = undoStudioHistory(history);
const undoneChangeSet = buildStudioChangeSet(undone);
if (undoneChangeSet.status !== "empty") {
  throw new Error("Undone transitions must not remain in applied change set");
}
