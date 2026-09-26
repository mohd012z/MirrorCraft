"use client";

import {
  buildStudioTransitionInspection,
} from "@/mirrorcraft/studio-history/inspection";
import {
  restoreStudioCheckpoint,
} from "@/mirrorcraft/studio-history/restore";
import type {
  StudioHistory,
} from "@/mirrorcraft/studio-history";

function categoryLabel(category: string): string {
  return category.replace(/-/g, " ");
}

export function StudioHistoryInspector({
  history,
  transitionId,
  onRestore,
}: {
  history: StudioHistory;
  transitionId?: string | null;
  onRestore?: (history: StudioHistory) => void;
}) {
  const selectedTransitionId = transitionId ?? history.past.at(-1)?.id ?? null;
  const transition = selectedTransitionId
    ? history.entries.find((entry) => entry.id === selectedTransitionId)
    : undefined;

  if (!transition) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-white">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
          Change Inspector
        </div>
        <div className="mt-2 text-sm font-semibold text-white/80">Baseline</div>
        <p className="mt-1 text-xs leading-5 text-white/40">
          Make or select a history change to inspect its structured operations, affected nodes and verification requirements.
        </p>
      </section>
    );
  }

  const inspection = buildStudioTransitionInspection(transition);
  const canRestore = inspection.reversible && Boolean(onRestore);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
            Change Inspector
          </div>
          <h3 className="mt-1 text-sm font-semibold text-white/85">{inspection.label}</h3>
          <div className="mt-1 text-[11px] text-white/30">{inspection.timestamp}</div>
        </div>
        {onRestore ? (
          <button
            type="button"
            disabled={!canRestore}
            onClick={() =>
              onRestore(
                restoreStudioCheckpoint(history, transition.id, {
                  label: `Restore ${transition.label}`,
                }),
              )
            }
            className="rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-300/15 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Restore as new edit
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Metric label="Operations" value={inspection.operationCount} />
        <Metric label="Affected nodes" value={inspection.affectedNodeIds.length} />
        <Metric
          label="Content changes"
          value={
            inspection.diff.content.added.length +
            inspection.diff.content.removed.length +
            inspection.diff.content.changed.length
          }
        />
        <Metric
          label="Reversible"
          value={inspection.reversible ? "Yes" : "No"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <InspectorGroup title="Categories">
          <div className="flex flex-wrap gap-1.5">
            {inspection.categories.map((category) => (
              <span
                key={category}
                className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] capitalize text-white/55"
              >
                {categoryLabel(category)}
              </span>
            ))}
          </div>
        </InspectorGroup>

        <InspectorGroup title="Verification">
          <div className="flex flex-wrap gap-1.5">
            {inspection.verificationLevels.map((level) => (
              <span
                key={level}
                className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.06] px-2 py-1 text-[11px] text-cyan-100/70"
              >
                {level}
              </span>
            ))}
          </div>
        </InspectorGroup>
      </div>

      <InspectorGroup title="Affected nodes" className="mt-4">
        <div className="max-h-32 space-y-1 overflow-auto rounded-lg border border-white/5 bg-black/10 p-2 font-mono text-[10px] text-white/45">
          {inspection.affectedNodeIds.map((nodeId) => (
            <div key={nodeId} className="truncate" title={nodeId}>{nodeId}</div>
          ))}
        </div>
      </InspectorGroup>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Sections added" value={inspection.diff.sections.added.length} />
        <Metric label="Sections removed" value={inspection.diff.sections.removed.length} />
        <Metric label="Sections moved" value={inspection.diff.sections.moved.length} />
        <Metric label="Variants changed" value={inspection.diff.sections.variantChanged.length} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-white/25">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white/70">{value}</div>
    </div>
  );
}

function InspectorGroup({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
        {title}
      </div>
      {children}
    </div>
  );
}
