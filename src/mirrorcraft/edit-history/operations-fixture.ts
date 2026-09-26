import {
  buildStudioSnapshotDiff,
  createStudioHistory,
  deriveStudioEditOperations,
  type StudioSnapshot,
} from "@/mirrorcraft/edit-history";
import {
  createSectionContentState,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import {
  addSection,
  createPageComposition,
} from "@/mirrorcraft/section-composer";

const composition = createPageComposition("home", ["hero-centered"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(composition, content, { createdAt: "2026-09-26T00:00:00.000Z" });

const heroId = composition.sections[0].instanceId;
const editedContent = setSectionSlotValue(content, heroId, "heading", "A new heading");
const expandedComposition = addSection(composition, "cta-banner");

const next: StudioSnapshot = {
  ...history.present,
  id: "studio-snapshot:fixture",
  label: "Fixture change",
  composition: expandedComposition,
  content: editedContent,
};

const operations = deriveStudioEditOperations(history.present, next, "fixture");
const diff = buildStudioSnapshotDiff(history.present, next);

const operationCount: number = operations.length;
const changedContentCount: number = diff.changedContent.length;
const changedSectionCount: number = diff.changedSections.length;
const reversible: boolean = operations.every((operation) => operation.reversible);

void operationCount;
void changedContentCount;
void changedSectionCount;
void reversible;
