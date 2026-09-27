"use client";

import { useMemo, useState, useEffect } from "react";

import { EditableComposedPagePreview } from "@/app/studio/editable-composed-preview";
import { HtmlEditPanel } from "@/app/studio/html-edit-panel";
import { PreviewCanvas } from "@/app/studio/preview-canvas";
import { SectionComposerPanel } from "@/app/studio/section-composer-panel";
import { StudioHistoryExperience } from "@/app/studio/studio-history-experience";
import { StudioOperationsSurface } from "@/app/studio/studio-operations-surface";
import { StudioProjectIOPanel } from "@/app/studio/studio-project-io-panel";
import { StudioRestrictionSurface } from "@/app/studio/studio-restriction-surface";
import { StudioRecoveryPanel } from "@/app/studio/studio-recovery-panel";
import { TemplateStudio } from "@/app/studio/template-studio";
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
  const [paletteId, setPaletteId] = useState("slate");
  const [toast, setToast] = useState<string | null>(null);

  // Light toasts from the template shell (publish gate, inspector hints).
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

  function changeComposition(next: PageComposition, label = "Update page structure") {
    setHistory((current) => {
      const nextContent = reconcileSectionContentState(current.present.content, next);
      return recordStudioSnapshot(
        current,
        createStudioSnapshot(next, nextContent),
        { label },
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
    <TemplateStudio
      composition={composition}
      content={content}
      graph={graph}
      historyEntries={history.entries.length}
      onCompositionChange={changeComposition}
      onContentChange={changeContent}
      onRestore={(record) =>
        setHistory(
          createStudioHistory(
            createStudioSnapshot(record.snapshot.composition, record.snapshot.content),
            100,
          ),
        )
      }
      onNewProject={() => {
        const nextComposition = createPageComposition(`project-${Date.now() % 100000}`, [
          "navbar-simple",
          "hero-centered",
          "features-grid",
          "cta-banner",
          "footer-columns",
        ]);
        setHistory(
          createStudioHistory(
            createStudioSnapshot(nextComposition, createSectionContentState(nextComposition)),
            100,
          ),
        );
      }}
    >
      <div className="space-y-5 px-3 py-4 lg:px-5">
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
        <HtmlEditPanel
          composition={composition}
          content={content}
          paletteId={paletteId}
        />
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

      {/* Toast (publish gate / inspector hints) */}
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-12 z-[70] flex justify-center px-4">
          <div className="rounded-lg border border-teal-300/40 bg-[#0d1320]/95 px-4 py-2 text-xs text-teal-100 shadow-xl">
            {toast}
          </div>
        </div>
      ) : null}
      </div>
    </TemplateStudio>
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
