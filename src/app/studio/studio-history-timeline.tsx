"use client";

import {
  getStudioTimeline,
  type StudioHistory,
} from "@/mirrorcraft/edit-history";

function operationSummary(history: StudioHistory, snapshotId: string): string {
  const snapshot = getStudioTimeline(history).find((entry) => entry.id === snapshotId)?.snapshot;
  if (!snapshot || snapshot.operations.length === 0) return "checkpoint";

  const categories = [...new Set(snapshot.operations.map((operation) => operation.category))];
  return categories.join(" · ");
}

export function StudioHistoryTimeline({
  history,
  onJump,
}: {
  history: StudioHistory;
  onJump: (snapshotId: string) => void;
}) {
  const timeline = getStudioTimeline(history);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
            History Timeline
          </div>
          <div className="mt-1 text-xs text-white/40">
            Jump to any checkpoint without replaying every intermediate edit.
          </div>
        </div>
        <div className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/40">
          {timeline.length} checkpoints
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch gap-2">
          {timeline.map((entry, index) => {
            const summary = operationSummary(history, entry.id);
            const time = entry.createdAt.includes("T")
              ? entry.createdAt.slice(11, 16)
              : entry.createdAt;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onJump(entry.id)}
                aria-current={entry.active ? "step" : undefined}
                className={`group relative w-48 rounded-xl border p-3 text-left transition ${
                  entry.active
                    ? "border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.08)]"
                    : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${entry.active ? "text-cyan-200" : "text-white/30"}`}>
                    {entry.active ? "Current" : `#${index + 1}`}
                  </span>
                  <span className="text-[10px] text-white/25">{time}</span>
                </div>

                <div className="mt-2 truncate text-sm font-semibold text-white/85" title={entry.label}>
                  {entry.label}
                </div>
                <div className="mt-1 truncate text-[11px] text-white/35" title={summary}>
                  {summary}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-white/30">
                  <span>{entry.operationCount} ops</span>
                  <span>{entry.snapshot.composition.sections.length} sections</span>
                </div>

                {index < timeline.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-2.5 top-1/2 h-px w-3 bg-white/10"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
