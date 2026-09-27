"use client";

import { useState } from "react";

import { StudioRecoveryPanel } from "@/app/studio/studio-recovery-panel";
import { useStudioRecovery } from "@/app/studio/use-studio-recovery";
import {
  createStudioHistory,
  createStudioSnapshot,
} from "@/mirrorcraft/studio-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("recovery-ui", ["hero-centered"]);
const content = createSectionContentState(composition);
const initialHistory = createStudioHistory(createStudioSnapshot(composition, content));

export function StudioRecoveryFixture() {
  const [history, setHistory] = useState(initialHistory);
  const recovery = useStudioRecovery({
    projectId: "recovery-ui-project",
    history,
    onHistoryChange: setHistory,
    autosaveDelayMs: 25,
  });

  return <StudioRecoveryPanel controller={recovery} />;
}
