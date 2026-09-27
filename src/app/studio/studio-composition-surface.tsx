"use client";

import { useMemo, useState, useEffect } from "react";

import { EditableComposedPagePreview } from "@/app/studio/editable-composed-preview";
import { SectionComposerPanel } from "@/app/studio/section-composer-panel";
import { StudioHistoryExperience } from "@/app/studio/studio-history-experience";
import { StudioProjectIOPanel } from "@/app/studio/studio-project-io-panel";
import { StudioRecoveryPanel } from "@/app/studio/studio-recovery-panel";
import { useStudioRecovery } from "@/app/studio/use-studio-recovery";
import { STUDIO_EVENTS, onStudioEvent } from "@/app/studio/studio-bus";
import {
  canRedoStudioHistory,
  canUndoStudioHistory,
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
  redoStudioHistory,
  undoStudioHistory,
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
const STUDIO_RECOVERY_PROJECT_ID = "mirrorcraft-studio:home";

export function StudioCompositionSurface() {
  const [history, setHistory] = useState(() =>
    createStudioHistory(
      createStudioSnapshot(INITIAL_COMPOSITION, INITIAL_CONTENT),
      100,
    ),
  );

  const recovery = useStudioRecovery({
    projectId: STUDIO_RECOVERY_PROJECT_ID,
    history,
    onHistoryChange: setHistory,
  });

  const composition = history.present.composition;
  const content = history.present.content;

  // Compact quick-bar in the studio header drives this surface directly.
  useEffect(() => {
    const offUndo = onStudioEvent(STUDIO_EVENTS.undo, (action) => {
      setHistory((current) => {
        if (typeof action === "object" && action !== null && "kind" in action && action.kind === "redo") {
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

  const graph = useMemo(
    () => toSectionContentWebGraph(composition, content),
    [composition, content],
  );

  function changeComposition(next: PageComposition) {
    setHistory((current) => {
      const nextContent = reconcileSectionContentState(current.present.content, next);
      return recordStudioSnapshot(
        current,
        createStudioSnapshot(next, nextContent),
        { label: "Update page structure" },
      );
    });
  }

  function changeContent(next: SectionContentState) {
    setHistory((current) =>
      recordStudioSnapshot(
        current,
        createStudioSnapshot(current.present.composition, next),
        { label: "Edit section content" },
      ),
    );
  }

  return (
    <div className="space-y-5">
      {/* Preview-first: the composed page is the first thing you see */}
      <EditableComposedPagePreview
        composition={composition}
        content={content}
        onContentChange={changeContent}
        onCompositionChange={changeComposition}
      />
      <SectionComposerPanel
        composition={composition}
        onCompositionChange={changeComposition}
      />

      <StudioProjectIOPanel
        projectId={STUDIO_RECOVERY_PROJECT_ID}
        history={history}
        onHistoryChange={setHistory}
      />
      <StudioHistoryExperience history={history} onHistoryChange={setHistory} />
      <StudioRecoveryPanel controller={recovery} />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-white/50">
        <span>Shared page model</span>
        <div className="flex flex-wrap items-center gap-2">
          <span>composition rev {composition.revision}</span>
          <span>content rev {content.revision}</span>
          <span className="rounded-md border border-white/10 px-2 py-1">WebMap {Object.keys(graph.nodes).length} nodes</span>
          <span className="rounded-md border border-white/10 px-2 py-1">{graph.edges.length} edges</span>
          <span className="rounded-md border border-white/10 px-2 py-1">{history.entries.length} history entries</span>
          <span className="rounded-md border border-white/10 px-2 py-1 text-white/35">⌘/Ctrl+Z · ⇧⌘/Ctrl+Z · Ctrl+Y</span>
        </div>
      </div>
    </div>
  );
}
