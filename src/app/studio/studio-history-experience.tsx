"use client";

import { useState } from "react";

import { StudioHistoryInspector } from "@/app/studio/studio-history-inspector";
import { StudioHistoryTimeline } from "@/app/studio/studio-history-timeline";
import { StudioHistoryToolbar } from "@/app/studio/studio-history-toolbar";
import { useStudioHistoryKeyboard } from "@/app/studio/use-studio-history-keyboard";
import {
  redoStudioHistory,
  undoStudioHistory,
  type StudioHistory,
} from "@/mirrorcraft/studio-history";
import { restoreStudioCheckpoint } from "@/mirrorcraft/studio-history/restore";
import {
  jumpToStudioSnapshot,
  STUDIO_BASELINE_ID,
} from "@/mirrorcraft/studio-history/timeline";

export function StudioHistoryExperience({
  history,
  onHistoryChange,
}: {
  history: StudioHistory;
  onHistoryChange: (history: StudioHistory) => void;
}) {
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(
    history.past.at(-1)?.id ?? null,
  );

  function applyHistory(next: StudioHistory) {
    onHistoryChange(next);
    setSelectedTransitionId(next.past.at(-1)?.id ?? null);
  }

  function undo() {
    applyHistory(undoStudioHistory(history));
  }

  function redo() {
    applyHistory(redoStudioHistory(history));
  }

  function jump(targetId: string) {
    const next = jumpToStudioSnapshot(history, targetId);
    onHistoryChange(next);
    setSelectedTransitionId(targetId === STUDIO_BASELINE_ID ? null : targetId);
  }

  function restore(targetId: string) {
    const next = restoreStudioCheckpoint(history, targetId, {
      label: "Restore checkpoint",
    });
    applyHistory(next);
  }

  useStudioHistoryKeyboard({ onUndo: undo, onRedo: redo });

  return (
    <div className="space-y-3">
      <StudioHistoryToolbar history={history} onUndo={undo} onRedo={redo} />
      <StudioHistoryTimeline
        history={history}
        onJump={jump}
        onRestore={restore}
      />
      <StudioHistoryInspector
        history={history}
        transitionId={selectedTransitionId}
        onRestore={applyHistory}
      />
    </div>
  );
}
