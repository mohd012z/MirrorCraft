import Link from "next/link";

import { StudioWorkspace } from "@/app/studio/studio-workspace";

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-[#080a0e] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">MirrorCraft</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Editing Studio</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button type="button" className="rounded-lg border border-white/10 px-3 py-2 text-white/80">Import</button>
            <button type="button" className="rounded-lg border border-white/10 px-3 py-2 text-white/80">Export</button>
            <button type="button" className="rounded-lg border border-white/10 px-3 py-2 text-white/80">Load</button>
            <Link href="/" className="rounded-lg bg-white px-3 py-2 font-semibold text-slate-950">Home</Link>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_280px]">
          <aside className="hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 xl:block">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Navigator</div>
            <nav className="mt-4 space-y-1 text-sm text-white/70">
              {['Pages', 'Layers', 'Components', 'Assets', 'Content', 'Routes', 'Functions', 'Database'].map((item) => (
                <button key={item} type="button" className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5 hover:text-white">
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          <section className="min-w-0">
            <StudioWorkspace />
          </section>

          <aside className="hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 xl:block">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Inspector</div>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              {['Content', 'Layout', 'Style', 'Responsive', 'Behavior', 'Data', 'Access', 'Advanced'].map((item) => (
                <button key={item} type="button" className="flex w-full items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-left hover:bg-white/5">
                  <span>{item}</span><span className="text-white/30">›</span>
                </button>
              ))}
            </div>
          </aside>
        </div>

        <footer className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-xs text-white/60">
          {['AI', 'Map', '360', 'Code', 'Diff', 'Network', 'Console', 'Compile', 'History', 'Publish'].map((item) => (
            <button key={item} type="button" className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white">{item}</button>
          ))}
        </footer>
      </div>
    </main>
  );
}
