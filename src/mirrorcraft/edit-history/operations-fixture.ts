import {
  createStudioSnapshot,
  deriveStudioEditOperations,
  summarizeStudioDiff,
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

const composition = createPageComposition("home", ["hero-centered"]);
const content = createSectionContentState(composition);
const before = createStudioSnapshot(composition, content);

const heroId = composition.sections[0].instanceId;
const editedContent = setSectionSlotValue(content, heroId, "heading", "A new heading");
const expandedComposition = addSection(composition, "cta-banner");
const reconciledContent = reconcileSectionContentState(editedContent, expandedComposition);
const next = createStudioSnapshot(expandedComposition, reconciledContent);

const operations = deriveStudioEditOperations(before, next);
const diff = summarizeStudioDiff(before, next);

const operationCount: number = operations.length;
const changedContentCount: number = diff.content.changed.length;
const addedSectionCount: number = diff.sections.added.length;
const reversible: boolean = operations.every((operation) => operation.reversible);

void operationCount;
void changedContentCount;
void addedSectionCount;
void reversible;
