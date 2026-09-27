import Link from "next/link";

const REPO = "https://github.com/mohd012z/MirrorCraft";

export default function Home() {
  return (
    <div className="cf-forge-bg relative min-h-screen overflow-x-hidden">
      <div className="cf-blueprint pointer-events-none absolute inset-0" aria-hidden />

      {/* Hero — brand + one idea + CTA + visual */}
      <header className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-6 pb-16 pt-8 md:px-10">
        <nav className="cf-rise flex items-center justify-between gap-4">
          <span className="cf-display text-lg font-semibold tracking-tight text-slag md:text-xl">
            Clone<span className="text-ember">Forge</span>
          </span>
          <div className="flex items-center gap-3 text-sm text-iron">
            <Link
              href="/demos/example"
              className="transition-colors hover:text-slag"
            >
              Smoke demo
            </Link>
            <Link
              href={`${REPO}#readme`}
              className="transition-colors hover:text-slag"
            >
              Docs
            </Link>
            <Link
              href={REPO}
              className="inline-flex h-9 items-center rounded-md border border-border bg-secondary/60 px-3 text-slag transition-colors hover:border-ember/40 hover:text-spark"
            >
              GitHub
            </Link>
          </div>
        </nav>

        <div className="mt-auto grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-10">
          <div>
            <p className="cf-rise cf-rise-delay-1 cf-display text-5xl font-extrabold leading-[0.95] text-slag sm:text-6xl md:text-7xl lg:text-[5.25rem]">
              Clone
              <span className="text-ember">Forge</span>
            </p>
            <h1 className="cf-rise cf-rise-delay-2 mt-6 max-w-xl text-xl font-medium leading-snug text-slag/95 sm:text-2xl">
              Turn any live page into a clean Next.js codebase.
            </h1>
            <p className="cf-rise cf-rise-delay-3 mt-4 max-w-md text-base leading-relaxed text-iron">
              Your agent inspects the site, extracts tokens and assets, writes
              specs, then builds sections in parallel — Cursor-first, works with
              Claude Code and friends.
            </p>
            <div className="cf-rise cf-rise-delay-4 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`${REPO}/generate`}
                className="inline-flex h-11 items-center justify-center rounded-md bg-ember px-5 text-sm font-semibold text-primary-foreground transition hover:bg-spark"
              >
                Use this template
              </Link>
              <Link
                href={REPO}
                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-transparent px-5 text-sm font-medium text-slag transition hover:border-ember/50 hover:text-spark"
              >
                ★ Star on GitHub
              </Link>
            </div>
            <p className="cf-rise cf-rise-delay-4 mt-5 font-mono text-xs text-iron">
              npm run setup · /clone-website &lt;url&gt;
            </p>
          </div>

          {/* Signature visual: forge pipeline */}
          <div
            className="cf-rise cf-rise-delay-2 relative mx-auto w-full max-w-md lg:max-w-none"
            aria-hidden
          >
            <div className="relative overflow-hidden rounded-xl border border-border bg-ash/90 shadow-[0_0_80px_-20px_rgb(224_122_61_/_0.45)]">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="size-2.5 rounded-full bg-iron/40" />
                <span className="size-2.5 rounded-full bg-iron/40" />
                <span className="size-2.5 rounded-full bg-ember/80 cf-ember-glow" />
                <span className="ml-2 font-mono text-[11px] text-iron">
                  forge://pipeline
                </span>
              </div>
              <div className="relative space-y-3 p-5 font-mono text-[12px] leading-relaxed sm:text-[13px]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 overflow-hidden opacity-40">
                  <div className="cf-scan-line h-12 bg-gradient-to-b from-transparent via-ember/30 to-transparent" />
                </div>
                <PipelineLine step="01" label="recon" detail="screenshot · tokens · interactions" />
                <PipelineLine step="02" label="extract" detail="fonts · assets · getComputedStyle" />
                <PipelineLine step="03" label="spec" detail="docs/research/components/*.md" />
                <PipelineLine step="04" label="build" detail="parallel worktrees → Next.js" />
                <PipelineLine step="05" label="qa" detail="visual diff · npm run build" hot />
                <div className="mt-4 rounded-md border border-ember/30 bg-ember/10 px-3 py-2 text-spark">
                  ready · replace this page with your clone
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="relative border-t border-border/80 px-6 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="cf-display text-3xl font-bold text-slag md:text-4xl">
            One command. Full pipeline.
          </h2>
          <p className="mt-3 max-w-xl text-iron">
            The <code className="text-spark">/clone-website</code> skill walks
            the page like a foreman — inspect, specify, dispatch builders.
          </p>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: "Reconnaissance",
                d: "Screenshots, design tokens, hover/scroll/responsive sweeps via browser MCP.",
              },
              {
                t: "Specs, not vibes",
                d: "Every section gets a written contract with real CSS values before anyone builds.",
              },
              {
                t: "Parallel forge",
                d: "Builder agents in worktrees assemble components; you merge and ship.",
              },
            ].map((item) => (
              <li key={item.t} className="border-l border-ember/40 pl-4">
                <h3 className="cf-display text-lg font-semibold text-slag">
                  {item.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-iron">{item.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Agents */}
      <section className="relative border-t border-border/80 px-6 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="cf-display text-3xl font-bold text-slag md:text-4xl">
            Built for the agents you already use
          </h2>
          <p className="mt-3 max-w-xl text-iron">
            Cursor is first-class. Claude Code, Codex, Copilot, Windsurf, and
            more pick up the same skill and{" "}
            <code className="text-spark">AGENTS.md</code>.
          </p>
          <ul className="mt-10 flex flex-wrap gap-2">
            {[
              "Cursor",
              "Claude Code",
              "Codex",
              "GitHub Copilot",
              "Windsurf",
              "OpenCode",
              "Gemini CLI",
              "Aider",
            ].map((name) => (
              <li
                key={name}
                className="rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm text-slag"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Ethics + footer */}
      <section className="relative border-t border-border/80 px-6 py-16 md:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="cf-display text-2xl font-bold text-slag">
            Use it for good
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-iron">
            Migrate your own site, recover lost source, or learn from production
            layouts. Not for phishing, impersonation, or stealing brand assets.
            Check site terms before you scrape.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-sm text-iron">
            <p>
              <span className="cf-display font-semibold text-slag">
                Clone<span className="text-ember">Forge</span>
              </span>
              <span className="mx-2">·</span>
              MIT · inspired by{" "}
              <Link
                href="https://github.com/JCodesMore/ai-website-cloner-template"
                className="text-slag underline-offset-2 hover:text-spark hover:underline"
              >
                JCodesMore
              </Link>
            </p>
            <Link href={REPO} className="text-slag hover:text-spark">
              Star the repo →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function PipelineLine({
  step,
  label,
  detail,
  hot,
}: {
  step: string;
  label: string;
  detail: string;
  hot?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span className={hot ? "text-ember" : "text-iron"}>{step}</span>
      <div>
        <span className={hot ? "text-spark" : "text-slag"}>{label}</span>
        <span className="text-iron"> — {detail}</span>
      </div>
    </div>
  );
}
