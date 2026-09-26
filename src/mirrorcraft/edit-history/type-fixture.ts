import {
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
  redoStudioHistory,
  summarizeStudioDiff,
  undoStudioHistory,
} from "@/mirrorcraft/studio-history";
import {
  createSectionContentState,
  reconcileSectionContentState,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import {
  addSection,
  createPageComposition,
} from "@/mirrorcraft/section-composer";

const initialComposition = createPageComposition("home", ["hero-centered"]);
const initialContent = createSectionContentState(initialComposition);
const initialSnapshot = createStudioSnapshot(initialComposition, initialContent);
const history = createStudioHistory(initialSnapshot, 50);

const changedComposition = addSection(initialComposition, "cta-banner");
const editedContent = setSectionSlotValue(
  initialContent,
  initialComposition.sections[0].instanceId,
  "heading",
  "Edited heading",
);
const changedContent = reconcileSectionContentState(editedContent, changedComposition);
const changedSnapshot = createStudioSnapshot(changedComposition, changedContent);

const committed = recordStudioSnapshot(history, changedSnapshot, {
  label: "Edit hero and add CTA",
});
const undone = undoStudioHistory(committed);
const redone = redoStudioHistory(undone);
const summary = summarizeStudioDiff(history.present, committed.present);

const undoCount: number = undone.future.length;
const redoCount: number = redone.past.length;
const sectionDelta: number = summary.sections.added.length - summary.sections.removed.length;
const changedNodes: readonly string[] = summary.content.changed.map((item) => item.nodeId);

void undoCount;
void redoCount;
void sectionDelta;
void changedNodes;
