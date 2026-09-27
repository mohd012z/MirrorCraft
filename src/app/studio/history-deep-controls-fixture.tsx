"use client";

import { useState } from "react";

import { StudioHistoryInspector } from "@/app/studio/studio-history-inspector";
import { useStudioHistoryKeyboard } from "@/app/studio/use-studio-history-keyboard";
import {
  createStudioHistory,
  createStudioSnapshot,
  redoStudioHistory,
  undoStudioHistory,
} from "@/mirrorcraft/studio-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("history-controls", ["hero-centered"]);
const content = createSectionContentState(composition);

export function HistoryDeepControlsFixture() {
  const [history, setHistory] = useState(() =>
    createStudioHistory(createStudioSnapshot(composition, content)),
  );

  useStudioHistoryKeyboard({
    onUndo: () => setHistory((current) => undoStudioHistory(current)),
    onRedo: () => setHistory((current) => redoStudioHistory(current)),
  });

  return (
    <StudioHistoryInspector
      history={history}
      transitionId={history.past.at(-1)?.id ?? null}
      onRestore={(nextHistory) => setHistory(nextHistory)}
    />
  );
}
