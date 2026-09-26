"use client";

import { useEffect } from "react";

import {
  isStudioHistoryEditableTarget,
  resolveStudioHistoryShortcut,
} from "@/mirrorcraft/studio-history/shortcuts";

export interface UseStudioHistoryKeyboardOptions {
  onUndo: () => void;
  onRedo: () => void;
  enabled?: boolean;
}

export function useStudioHistoryKeyboard({
  onUndo,
  onRedo,
  enabled = true,
}: UseStudioHistoryKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      const action = resolveStudioHistoryShortcut({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        editableTarget: isStudioHistoryEditableTarget(event.target),
      });

      if (!action) return;

      event.preventDefault();
      if (action === "undo") {
        onUndo();
      } else {
        onRedo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onRedo, onUndo]);
}
