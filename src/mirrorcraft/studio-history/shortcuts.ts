export type StudioHistoryShortcutAction = "undo" | "redo";

export interface StudioHistoryShortcutInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  editableTarget: boolean;
}

export function resolveStudioHistoryShortcut(
  input: StudioHistoryShortcutInput,
): StudioHistoryShortcutAction | null {
  if (input.editableTarget || input.altKey) return null;

  const primaryModifier = input.ctrlKey || input.metaKey;
  if (!primaryModifier) return null;

  const key = input.key.toLowerCase();
  if (key === "z") {
    return input.shiftKey ? "redo" : "undo";
  }

  if (key === "y" && !input.shiftKey) {
    return "redo";
  }

  return null;
}

export function isStudioHistoryEditableTarget(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) return true;

  return Boolean(
    target.closest(
      '[contenteditable="true"], [contenteditable=""], [role="textbox"]',
    ),
  );
}
