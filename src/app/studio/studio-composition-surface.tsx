"use client";

import { useMemo, useState } from "react";

import { EditableComposedPagePreview } from "@/app/studio/editable-composed-preview";
import { SectionComposerPanel } from "@/app/studio/section-composer-panel";
import { StudioHistoryToolbar } from "@/app/studio/studio-history-toolbar";
import {
  commitStudioSnapshot,
  createStudioHistory,
  redoStudioHistory,
  undoStudioHistory,
} from "@/mirrorcraft/edit-history";
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

export function StudioCompositionSurface() {
  const [history, setHistory] = useState(() =>
    createStudioHistory(INITIAL_COMPOSITION, INITIAL_CONTENT, {
      maxEntries: 100,
      label: "Initial studio state",
    }),
  );

  const composition = history.present.composition;
  const content = history.present.content;

  const graph = useMemo(
    () => toSectionContentWebGraph(composition, content),
    [composition, content],
  );

  function changeComposition(next: PageComposition) {
    setHistory((current) => {
      const nextContent = reconcileSectionContentState(current.present.content, next);
      return commitStudioSnapshot(current, {
        composition: next,
        content: nextContent,
        label: "Update page structure",
      });
    });
  }

  function changeContent(next: SectionContentState) {
    setHistory((current) =>
      commitStudioSnapshot(current, {
        composition: current.present.composition,
        content: next,
        label: "Edit section content",
      }),
    );
  }

  return (
    <div className="space-y-5">
      <StudioHistoryToolbar
        history={history}
        onUndo={() => setHistory((current) => undoStudioHistory(current))}
        onRedo={() => setHistory((current) => redoStudioHistory(current))}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-white/50">
        <span>Shared page model</span>
        <div className="flex flex-wrap items-center gap-2">
          <span>composition rev {composition.revision}</span>
          <span>content rev {content.revision}</span>
          <span className="rounded-md border border-white/10 px-2 py-1">WebMap {Object.keys(graph.nodes).length} nodes</span>
          <span className="rounded-md border border-white/10 px-2 py-1">{graph.edges.length} edges</span>
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
