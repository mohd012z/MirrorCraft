"use client";

import type { StudioRecoveryController } from "@/app/studio/use-studio-recovery";

function savedLabel(savedAt: string | null): string {
  if (!savedAt) return "Not saved yet";
  const parsed = new Date(savedAt);
  if (!Number.isFinite(parsed.getTime())) return savedAt;
  return parsed.toLocaleString();
}

export function StudioRecoveryPanel({
  controller,
}: {
  controller: StudioRecoveryController;
}) {
  if (controller.status === "checking") {
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-white/45">
        Checking local Studio recovery…
      </section>
    );
  }

  if (controller.status === "available" && controller.record) {
    return (
      <section className="rounded-xl border border-teal-300/20 bg-teal-300/[0.06] p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-200">
              Recovery available
            </div>
            <div className="mt-1 text-sm font-semibold text-white/85">
              A newer local Studio draft was found.
            </div>
            <div className="mt-1 text-xs leading-5 text-white/45">
              Saved {savedLabel(controller.record.savedAt)} · {controller.record.historyEntryCount} previous history entries. Autosave is paused until you choose.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={controller.discard}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white/85"
            >
              Discard saved draft
            </button>
            <button
              type="button"
              onClick={controller.restore}
              className="rounded-lg border border-teal-200/20 bg-teal-200/10 px-3 py-2 text-xs font-semibold text-teal-100 transition hover:bg-teal-200/15"
            >
              Restore draft
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (controller.status === "invalid") {
    return (
      <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">
              Recovery ignored
            </div>
            <div className="mt-1 text-xs text-white/45">
              {controller.error ?? "The local recovery record could not be validated."}
            </div>
          </div>
          <button
            type="button"
            onClick={controller.discard}
            className="rounded-lg border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-200/15"
          >
            Clear invalid recovery
          </button>
        </div>
      </section>
    );
  }

  if (controller.status === "error") {
    return (
      <section className="rounded-xl border border-rose-300/20 bg-rose-300/[0.05] px-3 py-2 text-xs text-rose-100/75">
        Local autosave is unavailable: {controller.error ?? "storage error"}. Studio editing remains active.
      </section>
    );
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] px-3 py-2 text-xs text-white/45">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-300/70" aria-hidden="true" />
        <span>Local autosave on</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/35">
        <span>{savedLabel(controller.lastSavedAt)}</span>
        <span className="rounded-md border border-white/10 px-2 py-1">
          non-secret Studio snapshot only
        </span>
      </div>
    </section>
  );
}
