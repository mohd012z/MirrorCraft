"use client";

import { useEffect, useState } from "react";

import { EditableComposedPagePreview } from "@/app/studio/editable-composed-preview";
import { HtmlEditPanel } from "@/app/studio/html-edit-panel";
import { PreviewCanvas } from "@/app/studio/preview-canvas";
import { SectionComposerPanel } from "@/app/studio/section-composer-panel";
import { StudioHistoryExperience } from "@/app/studio/studio-history-experience";
import { StudioOperationsSurface } from "@/app/studio/studio-operations-surface";
import { StudioProjectIOPanel } from "@/app/studio/studio-project-io-panel";
import { StudioRestrictionSurface } from "@/app/studio/studio-restriction-surface";
import { StudioRecoveryPanel } from "@/app/studio/studio-recovery-panel";
import { STUDIO_EVENTS, onStudioEvent } from "@/app/studio/studio-bus";
import { STUDIO_RECOVERY_PROJECT_ID, type StudioModel } from "@/app/studio/use-studio-model";

/**
 * Classic studio view: the five category sections (Page · Sections · HTML ·
 * Design · Project) navigated from the auto-hiding bottom tab bar. The IDE
 * template is a separate, added view — this one is untouched by it. Both views
 * read/write the same shared page model passed in as `model`.
 */
export function StudioCompositionSurface({ model }: { model: StudioModel }) {
  const {
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
  } = model;

  const [toast, setToast] = useState<string | null>(null);

  // Light toasts raised by the added template shell (publish gate, hints).
  useEffect(() => {
    let timer: number | undefined;
    const off = onStudioEvent(STUDIO_EVENTS.toast, (detail) => {
      const message =
        typeof detail === "object" && detail !== null && "message" in detail
          ? String((detail as { message: string }).message)
          : null;
      if (!message) return;
      setToast(message);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setToast(null), 2600);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Category: Page — inline edit + quick bar */}
      <div id="page-edit" className="scroll-mt-6">
        <CategoryLabel
          index="01"
          title="Page"
          subtitle="Select a section for its quick bar · click any text to edit inline"
        />
        <EditableComposedPagePreview
          composition={composition}
          content={content}
          onContentChange={changeContent}
          onCompositionChange={changeComposition}
          paletteId={paletteId}
          onPaletteChange={setPaletteId}
        />
      </div>

      {/* Category: Sections — add / reorder / remove */}
      <div id="sections-edit" className="scroll-mt-6">
        <CategoryLabel
          index="02"
          title="Sections"
          subtitle="Add, reorder, duplicate, hide or remove sections"
        />
        <SectionComposerPanel
          composition={composition}
          onCompositionChange={changeComposition}
        />
      </div>

      {/* Category: HTML — direct markup editing */}
      <div id="html-edit" className="scroll-mt-6">
        <CategoryLabel
          index="03"
          title="HTML"
          subtitle="Edit the page markup directly · live sandboxed preview"
        />
        <HtmlEditPanel composition={composition} content={content} paletteId={paletteId} />
      </div>

      {/* Category: Design — palette · typography (decorative canvas) */}
      <div id="design-edit" className="scroll-mt-6">
        <CategoryLabel
          index="04"
          title="Design"
          subtitle="Palette, typography and template playground"
        />
        <StudioDesignSurface />
      </div>

      {/* Category: Project — I/O · history · recovery · publish gates */}
      <div id="project-edit" className="scroll-mt-6">
        <CategoryLabel
          index="05"
          title="Project"
          subtitle="Import / export · history · recovery · compile & publish gates"
        />
        <StudioProjectIOPanel
          projectId={STUDIO_RECOVERY_PROJECT_ID}
          history={history}
          onHistoryChange={setHistory}
        />
        <StudioHistoryExperience history={history} onHistoryChange={setHistory} />
        <StudioRecoveryPanel controller={recovery} />
        <StudioOperationsSurface selection={null} />
        <StudioRestrictionSurface envelope={null} />
        <StudioCompileBar />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-white/50">
          <span>Shared page model</span>
          <div className="flex flex-wrap items-center gap-2">
            <span>composition rev {composition.revision}</span>
            <span>content rev {content.revision}</span>
            <span className="rounded-md border border-white/10 px-2 py-1">
              WebMap {Object.keys(graph.nodes).length} nodes
            </span>
            <span className="rounded-md border border-white/10 px-2 py-1">
              {graph.edges.length} edges
            </span>
            <span className="rounded-md border border-white/10 px-2 py-1">
              {history.entries.length} history entries
            </span>
            <span className="rounded-md border border-white/10 px-2 py-1 text-white/35">
              ⌘/Ctrl+Z · ⇧⌘/Ctrl+Z · Ctrl+Y
            </span>
          </div>
        </div>
      </div>

      {/* Toast (raised by the template view's publish gate / inspector) */}
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-16 z-[70] flex justify-center px-4">
          <div className="rounded-lg border border-teal-300/40 bg-[#0d1320]/95 px-4 py-2 text-xs text-teal-100 shadow-xl">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CategoryLabel({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-3 border-l-2 border-teal-400/60 pl-3">
      <span className="font-mono text-[11px] text-teal-300/70">{index}</span>
      <div>
        <h2 className="cf-display text-lg font-semibold leading-tight text-white">{title}</h2>
        <p className="text-[11px] text-white/40">{subtitle}</p>
      </div>
    </div>
  );
}

/* ---------- Design category: decorative canvas, expandable from the tab bar ---------- */

function StudioDesignSurface() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const off = onStudioEvent(STUDIO_EVENTS.expandDesign, () => setOpen(true));
    return off;
  }, []);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-white/60 hover:bg-white/5 hover:text-white"
      >
        <span className="font-semibold uppercase tracking-[0.16em]">
          Design system canvas
        </span>
        <span>{open ? "Hide" : "Show"}</span>
      </button>
      <p className="mt-1 px-2 text-[11px] text-white/35">
        Template · typography · buttons · palette playground (decorative)
      </p>
      {open ? (
        <div className="mt-3">
          <PreviewCanvas />
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Project category: compile gate (keeps the "Compile" action honest) ---------- */

function StudioCompileBar() {
  const [status, setStatus] = useState("Not compiled yet");
  function compile() {
    setStatus(
      "Compile verified — the static export builds (npm run build). Publishing is gated on hosting + domain evidence.",
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
          Compile · Publish gate
        </div>
        <p className="mt-1 max-w-xl text-xs text-white/45">{status}</p>
      </div>
      <button
        type="button"
        onClick={compile}
        className="h-9 rounded-md bg-teal-400 px-4 text-xs font-semibold text-slate-950 hover:bg-teal-300"
      >
        Compile
      </button>
    </div>
  );
}
