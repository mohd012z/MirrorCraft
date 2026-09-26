import {
  commitStudioTransaction,
  createStudioHistory,
  createStudioSnapshot,
  redoStudioTransaction,
  undoStudioTransaction,
} from "@/mirrorcraft/studio-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";
import type { EditOperation } from "@/mirrorcraft/editing/types";

const composition = createPageComposition("home", ["hero-centered"]);
const content = createSectionContentState(composition);
const snapshot = createStudioSnapshot(composition, content);
const operation: EditOperation = {
  id: "fixture-edit",
  category: "content",
  parameterId: "content.text",
  target: { nodeId: "fixture", kind: "content" },
  before: "Before",
  after: "After",
  viewport: { mode: "all" },
  reversible: true,
  verification: { level: "visual", required: true },
};

const history = createStudioHistory(snapshot);
const committed = commitStudioTransaction(history, snapshot, operation, "Edit heading");
const undone = undoStudioTransaction(committed);
const redone = redoStudioTransaction(undone);

void redone.present;
void redone.past;
void redone.future;
void redone.entries;
