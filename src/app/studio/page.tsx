"use client";

import Link from "next/link";
import { useState } from "react";

import { StudioWorkspace } from "@/app/studio/studio-workspace";

type IOAction = "import" | "export" | "load";

// The header Import/Export/Load buttons drive the real, tested Project I/O panel
// (studio-project-io-panel) rather than duplicating its file/blob/history logic.
const IO_TARGET: Record<IOAction, string> = {
  import: "Import Project",
  export: "Export Project",
  load: "Load Project",
};

export default function StudioPage() {
  const [panelsOpen, setPanelsOpen] = useState(false);

  function triggerIO(action: IOAction) {
    const panel = document.getElementById("project-io");
    if (!panel) return;
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    const button = [...panel.querySelectorAll<HTMLButtonElement>("button")].find(
      (el) => el.textContent?.trim() === IO_TARGET[action],
    );
    // Defer the click so it lands after the scroll settles and the panel is in view.
    window.setTimeout(() => button?.click(), 350);
  }

  return (
    <main className="min-h-screen bg-[#080a0e] px-3 py-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
                MirrorCraft
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Editing Studio</h1>
            </div>
            {/* Mobile: toggle the Navigator / Inspector panels (hidden on phones otherwise) */}
            <button
              type="button"
              onClick={() => setPanelsOpen((open) => !open)}
              aria-expanded={panelsOpen}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5 xl:hidden"
            >
              {panelsOpen ? "Close panels" : "Panels"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => triggerIO("import")}
              className="h-9 rounded-lg border border-white/10 px-3 text-white/80 hover:bg-white/5 hover:text-white"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => triggerIO("export")}
              className="h-9 rounded-lg border border-white/10 px-3 text-white/80 hover:bg-white/5 hover:text-white"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => triggerIO("load")}
              className="h-9 rounded-lg border border-white/10 px-3 text-white/80 hover:bg-white/5 hover:text-white"
            >
              Load
            </button>
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-lg bg-white px-3 font-semibold text-slate-950 hover:bg-white/90"
            >
              Home
            </Link>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_280px]">
          <aside
            className={`${
              panelsOpen ? "block" : "hidden"
            } rounded-2xl border border-white/10 bg-white/[0.03] p-4 xl:block`}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Navigator
            </div>
            <nav className="mt-4 space-y-1 text-sm text-white/70">
              {["Pages", "Layers", "Components", "Assets", "Content", "Routes", "Functions", "Database"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          <section className="min-w-0">
            <StudioWorkspace />
          </section>

          <aside
            className={`${
              panelsOpen ? "block" : "hidden"
            } rounded-2xl border border-white/10 bg-white/[0.03] p-4 xl:block`}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Inspector
            </div>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              {["Content", "Style", "Layout", "Colors", "Gradient", "Responsive", "Behavior", "Access", "Advanced"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-left hover:bg-white/5"
                >
                  <span>{item}</span>
                  <span className="text-white/30">›</span>
                </button>
              ))}
            </div>
          </aside>
        </div>

        <footer className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-xs text-white/60">
          {["AI", "Map", "360", "Code", "Diff", "Console", "Compile", "History", "Integrations", "Hosting", "Domain", "Security", "Publish"].map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
            >
              {item}
            </button>
          ))}
        </footer>
      </div>
    </main>
  );
}
