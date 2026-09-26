"use client";

import { useMemo, useState } from "react";

import { EditableComposedPagePreview } from "@/app/studio/editable-composed-preview";
import { SectionComposerPanel } from "@/app/studio/section-composer-panel";
import { StudioHistoryExperience } from "@/app/studio/studio-history-experience";
import { StudioRecoveryPanel } from "@/app/studio/studio-recovery-panel";
import { useStudioRecovery } from "@/app/studio/use-studio-recovery";
import {
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
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
      <StudioRecoveryPanel controller={recovery} />
      <StudioHistoryExperience history={history} onHistoryChange={setHistory} />

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

      <EditableComposedPagePreview
        composition={composition}
        content={content}
        onContentChange={changeContent}
      />
      <SectionComposerPanel
        composition={composition}
        onCompositionChange={changeComposition}
      />
    </div>
  );
}
