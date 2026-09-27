"use client";

import Link from "next/link";

import { StudioWorkspace } from "@/app/studio/studio-workspace";
import { dispatchStudioEvent, STUDIO_EVENTS } from "@/app/studio/studio-bus";

const QUICK_ACTIONS = [
  { id: "import", label: "Import", action: "import" as const },
  { id: "export", label: "Export", action: "export" as const },
  { id: "load", label: "Load", action: "load" as const },
];

const HISTORY_ACTIONS = [
  { id: "undo", label: "Undo" },
  { id: "redo", label: "Redo" },
];

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-[#0a0e1a] px-3 py-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Header — brand + compact quickbar */}
        <header className="mb-4 rounded-2xl border border-teal-300/15 bg-[#101827] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="cf-display text-lg font-semibold tracking-tight"
              >
                <span className="text-teal-300">Mirror</span>Craft
              </Link>
              <span className="text-white/20">·</span>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-300">
                  Studio
                </div>
                <h1 className="text-lg font-semibold leading-tight">
                  Editing Studio
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
                {QUICK_ACTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => dispatchStudioEvent(STUDIO_EVENTS.io, item.action)}
                    className="h-8 rounded-md px-3 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
                {HISTORY_ACTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      dispatchStudioEvent(STUDIO_EVENTS.undo, {
                        kind: item.id,
                      })
                    }
                    className="h-8 rounded-md px-3 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <Link
                href="/"
                className="inline-flex h-8 items-center rounded-md bg-teal-400 px-3 text-xs font-semibold text-slate-950 hover:bg-teal-300"
              >
                Home
              </Link>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              Full toolset
            </span>
            {["AI", "Map", "360", "Code", "Diff", "Console", "Compile", "History", "Integrations", "Hosting", "Domain", "Security", "Publish"].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  title={`${item} — available in the panels below`}
                  className="inline-flex h-6 items-center rounded-full border border-white/10 px-2.5 text-[11px] text-white/45 transition hover:border-teal-300/40 hover:bg-white/5 hover:text-white/80"
                >
                  {item}
                </button>
              ),
            )}
            <span className="ml-auto text-[11px] text-teal-300/80">
              Direct edit enabled
            </span>
          </div>
        </header>

        {/* Preview-first editing workspace */}
        <StudioWorkspace />
      </div>
    </main>
  );
}
