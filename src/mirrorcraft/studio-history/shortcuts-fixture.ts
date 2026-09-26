import {
  isStudioHistoryEditableTarget,
  resolveStudioHistoryShortcut,
  type StudioHistoryShortcutAction,
} from "@/mirrorcraft/studio-history/shortcuts";

const undo: StudioHistoryShortcutAction | null = resolveStudioHistoryShortcut({
  key: "z",
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  editableTarget: false,
});
const redoShiftZ: StudioHistoryShortcutAction | null = resolveStudioHistoryShortcut({
  key: "Z",
  ctrlKey: false,
  metaKey: true,
  shiftKey: true,
  altKey: false,
  editableTarget: false,
});
const redoY: StudioHistoryShortcutAction | null = resolveStudioHistoryShortcut({
  key: "y",
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  editableTarget: false,
});
const ignoredEditable: StudioHistoryShortcutAction | null = resolveStudioHistoryShortcut({
  key: "z",
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  editableTarget: true,
});

if (undo !== "undo") throw new Error("Ctrl+Z must resolve to undo");
if (redoShiftZ !== "redo") throw new Error("Cmd+Shift+Z must resolve to redo");
if (redoY !== "redo") throw new Error("Ctrl+Y must resolve to redo");
if (ignoredEditable !== null) throw new Error("Editable targets must keep native undo/redo");

void isStudioHistoryEditableTarget;
