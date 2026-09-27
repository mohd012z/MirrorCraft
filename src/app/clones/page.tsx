import Link from "next/link";
import { listClones } from "@/mirrorcraft/clones-registry";

const REPO = "https://github.com/mohd012z/MirrorCraft";

export const metadata = {
  title: "Clones — MirrorCraft",
  description:
    "Live clones built by MirrorCraft — extraction artifacts, rebuilt pages, and direct-edit studio entry points.",
};

export default function ClonesPage() {
  const clones = listClones();

  return (
    <main className="cf-forge-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ember">
            Built with MirrorCraft
          </p>
          <h1 className="cf-display mt-3 text-4xl font-extrabold leading-tight text-slag sm:text-5xl">
            Clones <span className="text-ember">gallery</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-iron">
            Every card below is a real extraction: design tokens captured from the
            live site, section specs written before building, and a rebuilt page you
            can open and edit directly. New clones appear here automatically once
            their artifacts land in <span className="font-mono text-sm text-slag/90">docs/research/</span>.
          </p>
        </div>

        {clones.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-border bg-ash/40 p-10 text-center">
            <p className="text-sm text-iron">
              No clones in this build yet. Run{" "}
              <span className="font-mono text-spark">/clone-website &lt;url&gt;</span>{" "}
              and commit the repo — the gallery populates from{" "}
              <span className="font-mono text-sm">docs/research/</span> at build time.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {clones.map((clone) => (
              <article
                key={clone.host}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-ash/60 transition-colors hover:border-ember/40"
              >
                <div className="border-b border-border bg-graphite/60 px-5 py-3">
                  <p className="truncate font-mono text-xs text-iron" title={clone.url}>
                    {clone.url}
                  </p>
                </div>
                <div className="flex flex-1 flex-col px-5 py-4">
                  <h2 className="cf-display text-lg font-semibold text-slag">
                    {clone.host}
                  </h2>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-iron">
                    <div className="rounded-md border border-border/60 bg-graphite/40 px-2.5 py-1.5">
                      <dt className="text-iron/70">Token keys</dt>
                      <dd className="font-mono text-slag">{clone.tokenKeys}</dd>
                    </div>
                    <div className="rounded-md border border-border/60 bg-graphite/40 px-2.5 py-1.5">
                      <dt className="text-iron/70">Section specs</dt>
                      <dd className="font-mono text-slag">{clone.specFiles}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    {clone.demoSlug ? (
                      <Link
                        href={`/demos/${clone.demoSlug}`}
                        className="inline-flex h-9 items-center rounded-md bg-ember px-4 text-sm font-semibold text-primary-foreground transition hover:bg-spark"
                      >
                        View clone
                      </Link>
                    ) : (
                      <span className="inline-flex h-9 items-center rounded-md border border-dashed border-border px-4 text-sm text-iron/70">
                        specs only
                      </span>
                    )}
                    <Link
                      href={`/studio?clone=${encodeURIComponent(clone.host)}`}
                      className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-slag transition hover:border-ember/50 hover:text-spark"
                    >
                      Direct edit
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
          <p className="text-sm text-iron">
            Want a clone here?{" "}
            <Link href="/" className="text-spark underline-offset-2 hover:underline">
              Paste the URL
            </Link>{" "}
            on the landing page — or{" "}
            <a
              href={`${REPO}/generate`}
              className="text-spark underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              make a template copy
            </a>{" "}
            and run <span className="font-mono text-sm">/clone-website</span>.
          </p>
          <Link
            href="/"
            className="text-sm text-slag transition-colors hover:text-spark"
          >
            ← Back to MirrorCraft
          </Link>
        </div>
      </div>
    </main>
  );
}
