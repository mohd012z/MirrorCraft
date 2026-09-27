"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StudioCategoryTabs } from "@/app/studio/studio-category-tabs";
import { StudioWorkspace } from "@/app/studio/studio-workspace";
import {
  dispatchStudioEvent,
  onStudioEvent,
  STUDIO_EVENTS,
} from "@/app/studio/studio-bus";

export default function StudioPage() {
  const [view, setView] = useState<"classic" | "template">("classic");

  // The bottom bar "IDE" tab (and the template's "‹ Classic" button) switch views.
  useEffect(() => {
    return onStudioEvent(STUDIO_EVENTS.view, (detail) => {
      if (detail === "classic" || detail === "template") setView(detail);
    });
  }, []);

  // Added template view — full IDE (top bar · navigator · canvas · inspector · status bar).
  if (view === "template") {
    return (
      <main className="h-[100svh] overflow-hidden bg-[#0a0e1a] text-white">
        <StudioWorkspace view="template" />
      </main>
    );
  }

  // Classic view (default) — category sections + auto-hiding bottom tab bar.
  return (
    <main className="min-h-screen bg-[#0a0e1a] px-3 pb-28 pt-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Slim header — categories live in the bottom tab bar */}
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-300/15 bg-[#101827] px-4 py-3">
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
              <button
                type="button"
                onClick={() =>
                  dispatchStudioEvent(STUDIO_EVENTS.undo, { kind: "undo" })
                }
                className="h-8 rounded-md px-3 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                ↶ Undo
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatchStudioEvent(STUDIO_EVENTS.undo, { kind: "redo" })
                }
                className="h-8 rounded-md px-3 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                ↷ Redo
              </button>
            </div>
            <span className="inline-flex items-center gap-2 text-xs text-teal-300/90">
              <span className="size-1.5 rounded-full bg-teal-400" />
              Direct edit enabled
            </span>
            <Link
              href="/"
              className="inline-flex h-8 items-center rounded-md bg-teal-400 px-3 text-xs font-semibold text-slate-950 hover:bg-teal-300"
            >
              Home
            </Link>
          </div>
        </header>

        {/* Category sections — navigate from the bottom tab bar */}
        <StudioWorkspace view="classic" />
      </div>

      {/* Bottom tab bar (auto-hides; IDE tab switches to the added template view) */}
      <StudioCategoryTabs />
    </main>
  );
}
