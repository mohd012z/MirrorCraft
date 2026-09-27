"use client";

import type { Dispatch, SetStateAction } from "react";

import type { StudioHistory } from "@/mirrorcraft/studio-history";

export interface StudioProjectIOPanelProps {
  projectId: string;
  history: StudioHistory;
  onHistoryChange: Dispatch<SetStateAction<StudioHistory>>;
}

export function StudioProjectIOPanel({
  projectId,
  history,
}: StudioProjectIOPanelProps) {
  return (
    <section
      id="project-io"
      className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/80">
            Project I/O
          </div>
          <p className="mt-1 text-sm text-white/55">
            {projectId} · {history.present.composition.pageId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70"
          >
            Import Project
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70"
          >
            Export Project
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70"
          >
            Load Project
          </button>
        </div>
      </div>
    </section>
  );
}
