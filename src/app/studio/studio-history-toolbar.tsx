"use client";

import {
  canRedoStudioHistory,
  canUndoStudioHistory,
  type StudioHistory,
} from "@/mirrorcraft/edit-history";

export function StudioHistoryToolbar({
  history,
  onUndo,
  onRedo,
}: {
  history: StudioHistory;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const canUndo = canUndoStudioHistory(history);
  const canRedo = canRedoStudioHistory(history);
  const activeOperations = history.present.operations;
  const contentCount = activeOperations.filter((operation) => operation.category === "content").length;
  const assetCount = activeOperations.filter((operation) => operation.category === "asset").length;
  const structureCount = activeOperations.filter(
    (operation) => operation.category === "restructure" || operation.category === "template",
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-white/55">
      <span className="font-semibold uppercase tracking-[0.14em] text-white/35">History</span>
      <button
        type="button"
        disabled={!canUndo}
        onClick={onUndo}
        className="rounded-md border border-white/10 px-2.5 py-1.5 text-white/70 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↶ Undo
      </button>
      <button
        type="button"
        disabled={!canRedo}
        onClick={onRedo}
        className="rounded-md border border-white/10 px-2.5 py-1.5 text-white/70 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↷ Redo
      </button>
      <span className="min-w-0 flex-1 truncate text-white/45" title={history.present.label}>
        {history.present.label}
      </span>
      {activeOperations.length > 0 ? (
        <div className="flex flex-wrap gap-1 text-[10px] text-white/45">
          {contentCount > 0 ? <span className="rounded border border-white/10 px-1.5 py-0.5">{contentCount} content</span> : null}
          {assetCount > 0 ? <span className="rounded border border-white/10 px-1.5 py-0.5">{assetCount} asset</span> : null}
          {structureCount > 0 ? <span className="rounded border border-white/10 px-1.5 py-0.5">{structureCount} structure</span> : null}
        </div>
      ) : null}
      <span className="rounded-md border border-white/10 px-2 py-1 text-white/35">
        {history.past.length} back · {history.future.length} forward
      </span>
    </div>
  );
}
