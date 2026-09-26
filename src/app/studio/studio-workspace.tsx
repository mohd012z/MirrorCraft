"use client";

import { useMemo, useState } from "react";

import { ComposedPagePreview } from "@/app/studio/composed-page-preview";
import { PreviewCanvas } from "@/app/studio/preview-canvas";
import { SectionComposerPanel } from "@/app/studio/section-composer-panel";
import {
  createPageComposition,
  toSectionWebGraph,
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

export function StudioWorkspace() {
  const [composition, setComposition] = useState<PageComposition>(INITIAL_COMPOSITION);
  const graph = useMemo(() => toSectionWebGraph(composition), [composition]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1 text-xs text-white/60">
          {['Preview', 'Design', 'Original', 'Diff', 'Responsive', 'Inspect'].map((item, index) => (
            <button key={item} type="button" className={`rounded-md px-3 py-1.5 ${index === 1 ? 'bg-white/10 text-white' : 'hover:text-white'}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-300">Direct edit enabled</span>
          <span className="rounded-md border border-white/10 px-2 py-1 text-white/45">WebMap {Object.keys(graph.nodes).length} nodes</span>
        </div>
      </div>

      <PreviewCanvas />
      <ComposedPagePreview composition={composition} />
      <SectionComposerPanel composition={composition} onCompositionChange={setComposition} />
    </div>
  );
}
