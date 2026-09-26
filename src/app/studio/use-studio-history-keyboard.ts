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
  canUndo?: boolean;
  canRedo?: boolean;
}

export function useStudioHistoryKeyboard({
  onUndo,
  onRedo,
  enabled = true,
  canUndo = true,
  canRedo = true,
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
      if (action === "undo" && !canUndo) return;
      if (action === "redo" && !canRedo) return;

      event.preventDefault();
      if (action === "undo") {
        onUndo();
      } else {
        onRedo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canRedo, canUndo, enabled, onRedo, onUndo]);
}
