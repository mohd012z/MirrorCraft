"use client";

import { useMemo, useState } from "react";

import { EditableComposedPagePreview } from "@/app/studio/editable-composed-preview";
import { SectionComposerPanel } from "@/app/studio/section-composer-panel";
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

export function StudioCompositionSurface() {
  const [composition, setComposition] = useState<PageComposition>(INITIAL_COMPOSITION);
  const [content, setContent] = useState<SectionContentState>(() =>
    createSectionContentState(INITIAL_COMPOSITION),
  );

  const graph = useMemo(
    () => toSectionContentWebGraph(composition, content),
    [composition, content],
  );

  function changeComposition(next: PageComposition) {
    setComposition(next);
    setContent((current) => reconcileSectionContentState(current, next));
  }

  return (
    <div className="space-y-5">
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
        onContentChange={setContent}
      />
      <SectionComposerPanel
        composition={composition}
        onCompositionChange={changeComposition}
      />
    </div>
  );
}
