"use client";

import { useCallback, useMemo, useState } from "react";

import { EditableComposedPagePreview } from "@/app/studio/editable-composed-preview";
import { SectionComposerPanel } from "@/app/studio/section-composer-panel";
import { StudioHistoryInspector } from "@/app/studio/studio-history-inspector";
import { StudioHistoryTimeline } from "@/app/studio/studio-history-timeline";
import { StudioHistoryToolbar } from "@/app/studio/studio-history-toolbar";
import { useStudioHistoryKeyboard } from "@/app/studio/use-studio-history-keyboard";
import {
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
  redoStudioHistory,
  undoStudioHistory,
} from "@/mirrorcraft/studio-history";
import {
  restoreStudioCheckpoint,
} from "@/mirrorcraft/studio-history/restore";
import { jumpToStudioSnapshot } from "@/mirrorcraft/studio-history/timeline";
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
    createStudioHistory(
      createStudioSnapshot(INITIAL_COMPOSITION, INITIAL_CONTENT),
      100,
    ),
  );

  const composition = history.present.composition;
  const content = history.present.content;

  const graph = useMemo(
    () => toSectionContentWebGraph(composition, content),
    [composition, content],
  );

  const undo = useCallback(() => {
    setHistory((current) => undoStudioHistory(current));
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => redoStudioHistory(current));
  }, []);

  useStudioHistoryKeyboard({ onUndo: undo, onRedo: redo });

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

  function restoreCheckpoint(checkpointId: string) {
    setHistory((current) =>
      restoreStudioCheckpoint(current, checkpointId, {
        label: "Restore history checkpoint",
      }),
    );
  }

  return (
    <div className="space-y-5">
      <StudioHistoryToolbar
        history={history}
        onUndo={undo}
        onRedo={redo}
      />

      <StudioHistoryTimeline
        history={history}
        onJump={(transitionId) =>
          setHistory((current) => jumpToStudioSnapshot(current, transitionId))
        }
        onRestore={restoreCheckpoint}
      />

      <StudioHistoryInspector
        history={history}
        onRestore={(nextHistory) => setHistory(nextHistory)}
      />

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
