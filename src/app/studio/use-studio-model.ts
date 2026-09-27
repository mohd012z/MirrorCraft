"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import {
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
  canUndoStudioHistory,
  canRedoStudioHistory,
  undoStudioHistory,
  redoStudioHistory,
  type StudioHistory,
} from "@/mirrorcraft/studio-history";
import {
  createSectionContentState,
  reconcileSectionContentState,
  toSectionContentWebGraph,
  type SectionContentState,
} from "@/mirrorcraft/section-content";
import {
  createPageComposition,
  type PageComposition,
} from "@/mirrorcraft/section-composer";
import {
  useStudioRecovery,
  type StudioRecoveryController,
} from "@/app/studio/use-studio-recovery";
import { STUDIO_EVENTS, onStudioEvent } from "@/app/studio/studio-bus";
import type { StudioRecoveryRecord } from "@/mirrorcraft/studio-recovery";

export interface StudioModel {
  history: StudioHistory;
  composition: PageComposition;
  content: SectionContentState;
  graph: ReturnType<typeof toSectionContentWebGraph>;
  paletteId: string;
  setPaletteId: (id: string) => void;
  recovery: StudioRecoveryController;
  setHistory: Dispatch<SetStateAction<StudioHistory>>;
  changeComposition: (next: PageComposition, label?: string) => void;
  changeContent: (next: SectionContentState) => void;
  newProject: () => void;
  restoreFrom: (record: StudioRecoveryRecord) => void;
}

export const STUDIO_RECOVERY_PROJECT_ID = "mirrorcraft-studio:home";

const INITIAL_COMPOSITION = createPageComposition("home", [
  "navbar-simple",
  "hero-centered",
  "features-grid",
  "pricing-three",
  "faq-accordion",
  "cta-banner",
  "footer-columns",
]);

const INITIAL_CONTENT = createSectionContentState(INITIAL_COMPOSITION);

/**
 * The single shared studio page model. Both the Classic view (category
 * sections + bottom tab bar) and the added IDE template view consume the same
 * model shape, so the template is an added option, not a replacement.
 */
export function useStudioModel(): StudioModel {
  const [history, setHistory] = useState<StudioHistory>(() =>
    createStudioHistory(createStudioSnapshot(INITIAL_COMPOSITION, INITIAL_CONTENT), 100),
  );
  const [paletteId, setPaletteId] = useState("slate");

  const recovery = useStudioRecovery({
    projectId: STUDIO_RECOVERY_PROJECT_ID,
    history,
    onHistoryChange: setHistory,
  });

  // Undo/redo + I/O requests from the shell (header, bottom bar, template).
  useEffect(() => {
    const offUndo = onStudioEvent(STUDIO_EVENTS.undo, (action) => {
      setHistory((current) => {
        if (
          typeof action === "object" &&
          action !== null &&
          "kind" in action &&
          action.kind === "redo"
        ) {
          return canRedoStudioHistory(current) ? redoStudioHistory(current) : current;
        }
        return canUndoStudioHistory(current) ? undoStudioHistory(current) : current;
      });
    });
    const offIO = onStudioEvent(STUDIO_EVENTS.io, (kind) => {
      if (kind !== "import" && kind !== "export" && kind !== "load") return;
      const panel = document.getElementById("project-io");
      if (!panel) return;
      const names: Record<string, string> = {
        import: "Import Project",
        export: "Export Project",
        load: "Load Project",
      };
      const button = [...panel.querySelectorAll<HTMLButtonElement>("button")].find(
        (el) => el.textContent?.trim() === names[kind],
      );
      button?.click();
    });
    return () => {
      offUndo();
      offIO();
    };
  }, []);

  const composition = history.present.composition;
  const content = history.present.content;

  const graph = useMemo(
    () => toSectionContentWebGraph(composition, content),
    [composition, content],
  );

  const changeComposition = useCallback(
    (next: PageComposition, label = "Update page structure") => {
      setHistory((current) => {
        const nextContent = reconcileSectionContentState(current.present.content, next);
        return recordStudioSnapshot(current, createStudioSnapshot(next, nextContent), { label });
      });
    },
    [],
  );

  const changeContent = useCallback((next: SectionContentState) => {
    setHistory((current) =>
      recordStudioSnapshot(
        current,
        createStudioSnapshot(current.present.composition, next),
        { label: "Edit section content" },
      ),
    );
  }, []);

  const newProject = useCallback(() => {
    const fresh = createPageComposition(`project-${Date.now() % 100000}`, [
      "navbar-simple",
      "hero-centered",
      "features-grid",
      "cta-banner",
      "footer-columns",
    ]);
    setHistory(
      createStudioHistory(
        createStudioSnapshot(fresh, createSectionContentState(fresh)),
        100,
      ),
    );
  }, []);

  const restoreFrom = useCallback((record: StudioRecoveryRecord) => {
    setHistory(
      createStudioHistory(
        createStudioSnapshot(record.snapshot.composition, record.snapshot.content),
        100,
      ),
    );
  }, []);

  return {
    history,
    composition,
    content,
    graph,
    paletteId,
    setPaletteId,
    recovery,
    setHistory,
    changeComposition,
    changeContent,
    newProject,
    restoreFrom,
  };
}
