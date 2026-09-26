import {
  createSectionContentState,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import {
  addSection,
  createPageComposition,
} from "@/mirrorcraft/section-composer";
import {
  canRedoStudioHistory,
  canUndoStudioHistory,
  createStudioHistory,
  createStudioSnapshot,
  deriveStudioEditOperations,
  recordStudioSnapshot,
  redoStudioHistory,
  summarizeStudioDiff,
  undoStudioHistory,
} from "@/mirrorcraft/studio-history";

const initialComposition = createPageComposition("fixture", ["hero-centered"]);
const initialContent = createSectionContentState(initialComposition);
const initialSnapshot = createStudioSnapshot(initialComposition, initialContent);

let history = createStudioHistory(initialSnapshot, 20);

const hero = initialComposition.sections[0];
const editedContent = setSectionSlotValue(
  initialContent,
  hero.instanceId,
  "heading",
  "Edited heading",
);
const editedSnapshot = createStudioSnapshot(initialComposition, editedContent);
const contentOperations = deriveStudioEditOperations(initialSnapshot, editedSnapshot);
const contentDiff = summarizeStudioDiff(initialSnapshot, editedSnapshot);

history = recordStudioSnapshot(history, editedSnapshot, {
  label: "Edit hero heading",
  operations: contentOperations,
});

if (!canUndoStudioHistory(history)) {
  throw new Error("Expected history to support undo after a content edit");
}
if (contentDiff.content.changed.length !== 1) {
  throw new Error("Expected one changed content slot");
}
if (contentOperations.length !== 1 || contentOperations[0].category !== "content") {
  throw new Error("Expected a structured content EditOperation");
}

history = undoStudioHistory(history);
if (!canRedoStudioHistory(history)) {
  throw new Error("Expected history to support redo after undo");
}
history = redoStudioHistory(history);

const expandedComposition = addSection(initialComposition, "faq-accordion");
const expandedSnapshot = createStudioSnapshot(
  expandedComposition,
  createSectionContentState(expandedComposition),
);
const structureOperations = deriveStudioEditOperations(history.present, expandedSnapshot);
const structureDiff = summarizeStudioDiff(history.present, expandedSnapshot);

if (structureDiff.sections.added.length !== 1) {
  throw new Error("Expected one added section");
}
if (!structureOperations.some((operation) => operation.category === "restructure")) {
  throw new Error("Expected a restructure EditOperation for section addition");
}
