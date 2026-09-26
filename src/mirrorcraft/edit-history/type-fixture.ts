import {
  commitStudioSnapshot,
  createStudioHistory,
  redoStudioHistory,
  summarizeStudioTransition,
  undoStudioHistory,
} from "@/mirrorcraft/edit-history";
import {
  createSectionContentState,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import {
  addSection,
  createPageComposition,
} from "@/mirrorcraft/section-composer";

const initialComposition = createPageComposition("home", ["hero-centered"]);
const initialContent = createSectionContentState(initialComposition);

const history = createStudioHistory(initialComposition, initialContent, {
  maxEntries: 50,
  label: "Initial state",
});

const changedComposition = addSection(initialComposition, "cta-banner");
const changedContent = setSectionSlotValue(
  initialContent,
  initialComposition.sections[0].instanceId,
  "heading",
  "Edited heading",
);

const committed = commitStudioSnapshot(history, {
  composition: changedComposition,
  content: changedContent,
  label: "Edit hero and add CTA",
});

const undone = undoStudioHistory(committed);
const redone = redoStudioHistory(undone);
const summary = summarizeStudioTransition(history.present, committed.present);

const undoLabel: string = undone.present.label;
const redoLabel: string = redone.present.label;
const sectionDelta: number = summary.sectionDelta;
const changedNodes: readonly string[] = summary.changedContentNodeIds;

void undoLabel;
void redoLabel;
void sectionDelta;
void changedNodes;
