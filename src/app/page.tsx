import Link from "next/link";

import { CloneUrlBar } from "@/components/clone-url-bar";
import { PipelineSection } from "@/components/pipeline-section";
import { listClones } from "@/mirrorcraft/clones-registry";

const REPO = "https://github.com/mohd012z/MirrorCraft";

export default function Home() {
  const clones = listClones();

  return (
    <div className="cf-forge-bg relative min-h-screen overflow-x-hidden">
      <div className="cf-blueprint pointer-events-none absolute inset-0" aria-hidden />

      {/* Slim top bar */}
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <Link href="/" className="cf-display text-lg font-semibold tracking-tight text-slag">
          <span className="text-ember">Mirror</span>Craft
        </Link>
        <nav className="flex items-center gap-4 text-sm text-iron">
          <Link href="/clones" className="transition-colors hover:text-slag">
            Clones
          </Link>
          <Link href="/studio" className="transition-colors hover:text-slag">
            Studio
          </Link>
          <Link
            href={REPO}
            className="inline-flex h-9 items-center rounded-md border border-border bg-secondary/60 px-3 text-slag transition-colors hover:border-ember/40 hover:text-spark"
          >
            GitHub
          </Link>
        </nav>
      </header>

      {/* Hero — centered, URL bar is the centerpiece */}
      <section className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-20 pt-14 text-center md:pt-24">
        <p className="cf-rise font-mono text-xs uppercase tracking-[0.25em] text-ember">
          AI-assisted website reconstruction
        </p>
        <h1 className="cf-rise cf-rise-delay-1 cf-display mt-5 max-w-3xl text-5xl font-extrabold leading-[0.98] text-slag sm:text-6xl md:text-7xl">
          Mirror any page.
          <br />
          <span className="text-ember">Craft</span> it again.
        </h1>
        <p className="cf-rise cf-rise-delay-2 mt-6 max-w-xl text-base leading-relaxed text-iron sm:text-lg">
          Point MirrorCraft at a permitted website and it extracts design
          tokens, assets, and section specs — then rebuilds a clean, editable
          Next.js clone in parallel.
        </p>

        <div className="cf-rise cf-rise-delay-3 mt-10 flex w-full justify-center">
          <div className="w-full max-w-xl text-left">
            <CloneUrlBar />
          </div>
        </div>

        <div className="cf-rise cf-rise-delay-4 mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/studio"
            className="inline-flex h-11 items-center justify-center rounded-md bg-ember px-6 text-sm font-semibold text-primary-foreground transition hover:bg-spark"
          >
            Open the studio
          </Link>
          <Link
            href="/clones"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-transparent px-6 text-sm font-medium text-slag transition hover:border-ember/50 hover:text-spark"
          >
            Browse built clones
          </Link>
        </div>

        <p className="cf-rise cf-rise-delay-4 mt-6 font-mono text-xs text-iron">
          npm run setup · /clone-website &lt;url&gt;
        </p>
      </section>

      {/* Clone shelf — live artifacts, not static copy */}
      {clones.length > 0 ? (
        <section className="relative border-t border-border/70 px-6 py-16 md:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="cf-display text-2xl font-bold text-slag">Recently built</h2>
              <Link href="/clones" className="text-sm text-spark underline-offset-2 hover:underline">
                Full gallery →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clones.slice(0, 3).map((clone) => (
                <Link
                  key={clone.host}
                  href={clone.demoSlug ? `/demos/${clone.demoSlug}` : "/clones"}
                  className="group rounded-xl border border-border bg-ash/60 p-5 text-left transition-colors hover:border-ember/50"
                >
                  <p className="truncate font-mono text-xs text-iron">{clone.url}</p>
                  <p className="cf-display mt-2 text-lg font-semibold text-slag group-hover:text-spark">
                    {clone.host}
                  </p>
                  <p className="mt-1 text-xs text-iron">
                    {clone.tokenKeys} token keys · {clone.specFiles} section spec
                    {clone.specFiles === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Pipeline — animated: comet travels the track, nodes ignite in turn */}
      <section className="relative border-t border-border/70 px-6 py-16 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="cf-display text-2xl font-bold text-slag md:text-3xl">
                One command, full pipeline
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-iron md:text-base">
                The <code className="text-spark">/clone-website</code> skill walks
                the page like a foreman — inspect, specify, dispatch builders.
              </p>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-iron">
              mirrorcraft://pipeline
            </span>
          </div>
          <div className="mt-10">
            <PipelineSection />
          </div>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-iron">
            Works with the agents you already use — Cursor, Claude Code, Codex,
            Copilot, Windsurf, OpenCode, Gemini CLI, Aider.{" "}
            <span className="text-slag/80">
              Clone only sites you own or have permission to reproduce.
            </span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/70 px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-iron">
          <p>
            <span className="cf-display font-semibold text-slag">
              <span className="text-ember">Mirror</span>Craft
            </span>
            <span className="mx-2">·</span>
            MIT · inspired by{" "}
            <a
              href="https://github.com/JCodesMore/ai-website-cloner-template"
              target="_blank"
              rel="noreferrer"
              className="text-slag underline-offset-2 hover:text-spark hover:underline"
            >
              JCodesMore
            </a>
          </p>
          <Link href={REPO} className="text-slag transition-colors hover:text-spark">
            Star the repo →
          </Link>
        </div>
      </footer>
    </div>
  );
}
