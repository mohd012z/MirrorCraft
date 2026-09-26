import {
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
} from "@/mirrorcraft/studio-history";
import {
  resolveStudioHistoryShortcut,
  type StudioHistoryShortcutInput,
} from "@/mirrorcraft/studio-history/shortcuts";
import {
  restoreStudioCheckpoint,
} from "@/mirrorcraft/studio-history/restore";
import { STUDIO_BASELINE_ID } from "@/mirrorcraft/studio-history/timeline";
import {
  createSectionContentState,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("history-deep", ["hero-centered"]);
const content = createSectionContentState(composition);
let history = createStudioHistory(createStudioSnapshot(composition, content));

const heroId = composition.sections[0].instanceId;
const editedContent = setSectionSlotValue(content, heroId, "heading", "Changed heading");
history = recordStudioSnapshot(
  history,
  createStudioSnapshot(composition, editedContent),
  { label: "Edit heading" },
);

const restored = restoreStudioCheckpoint(history, STUDIO_BASELINE_ID, {
  label: "Restore baseline as new edit",
});

const shortcutInput: StudioHistoryShortcutInput = {
  key: "z",
  metaKey: true,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  editableTarget: false,
};

const action: "undo" | "redo" | null = resolveStudioHistoryShortcut(shortcutInput);
const entryCount: number = restored.entries.length;

void action;
void entryCount;
