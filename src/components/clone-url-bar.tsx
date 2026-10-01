"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * URL entry point for the landing page.
 *
 * GitHub Pages remains a static export, so the browser cannot launch Chromium
 * itself. The URL bar therefore prepares the first-party local MirrorCraft
 * runtime command. That runtime uses Playwright to capture a permitted public
 * website into mirrorcraft-output/<site>/ and can optionally crawl same-origin
 * routes. The studio remains available for reviewing committed/generated work.
 */
export function CloneUrlBar() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function hostFrom(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    let candidate = trimmed;
    if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
    try {
      return new URL(candidate).host.toLowerCase();
    } catch {
      return "";
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Paste a website URL first.");
      setTarget(null);
      return;
    }
    let candidate = trimmed;
    if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
    try {
      const parsed = new URL(candidate);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
      setTarget(`${parsed.protocol}//${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`);
      setError(null);
      setCopied(false);
    } catch {
      setError("That does not look like a valid URL — try something like acme.com.");
      setTarget(null);
    }
  }

  const runtimeCommand = target ? `npm run clone:url -- ${target} --deep --max-pages=10` : null;

  async function copyRuntimeCommand() {
    if (!runtimeCommand) return;
    try {
      await navigator.clipboard.writeText(runtimeCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked in non-secure contexts; command remains visible.
    }
  }

  const studioHref = target ? `/studio?clone=${encodeURIComponent(hostFrom(target))}` : null;

  return (
    <div className="mt-8 w-full max-w-xl">
      <form onSubmit={submit} className="flex w-full items-stretch gap-2">
        <div
          className="flex min-w-0 flex-1 cursor-text items-center gap-2 rounded-md border border-border bg-ash/80 px-3 backdrop-blur transition-colors focus-within:border-ember/50"
          onClick={(event) => {
            const field = event.currentTarget.querySelector("input");
            field?.focus();
            field?.select();
          }}
        >
          <span className="font-mono text-sm text-iron" aria-hidden>
            https://
          </span>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="paste any permitted public website URL"
            aria-label="Website URL to clone"
            autoComplete="off"
            className="h-12 w-full bg-transparent text-base text-slag outline-none placeholder:text-iron/70"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-ember px-5 text-sm font-semibold text-primary-foreground transition hover:bg-spark"
        >
          Prepare clone
        </button>
      </form>

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      {target && runtimeCommand ? (
        <div className="cf-rise mt-3 rounded-md border border-ember/30 bg-ember/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-iron">
                Local Playwright runtime
              </p>
              <p className="mt-1 break-all font-mono text-xs text-slag">{runtimeCommand}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {studioHref ? (
                <Link
                  href={studioHref}
                  className="rounded-md bg-ember px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-spark"
                >
                  Open studio →
                </Link>
              ) : null}
              <button
                type="button"
                onClick={copyRuntimeCommand}
                className="rounded-md border border-ember/40 px-3 py-1.5 text-xs font-semibold text-spark transition hover:bg-ember/20"
              >
                {copied ? "Copied ✓" : "Copy runtime command"}
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-iron sm:grid-cols-4">
            <span className="rounded border border-white/10 px-2 py-1">DOM + text</span>
            <span className="rounded border border-white/10 px-2 py-1">computed styles</span>
            <span className="rounded border border-white/10 px-2 py-1">assets + routes</span>
            <span className="rounded border border-white/10 px-2 py-1">full-page shots</span>
          </div>

          <ol className="mt-3 space-y-1 text-xs leading-relaxed text-iron">
            <li>
              1 · <span className="font-mono text-slag/90">npm run setup</span> once to install
              dependencies and Playwright browsers
            </li>
            <li>2 · Run the command above from the MirrorCraft repository</li>
            <li>
              3 · Evidence is written to <span className="font-mono text-slag/90">mirrorcraft-output/&lt;site&gt;/</span>
            </li>
            <li>4 · Feed the manifest into reconstruction / verification / repair stages</li>
          </ol>

          <p className="mt-3 border-t border-ember/20 pt-3 text-[11px] leading-relaxed text-iron/80">
            The public GitHub Pages UI is intentionally static; browser capture runs locally where
            Chromium is available. The runtime blocks localhost/private-network targets and stops on
            authentication, subscription, or anti-bot gates rather than bypassing them. Only clone
            sites you own or have permission to reproduce.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-iron/80">
          Want to inspect the current examples?{" "}
          <Link href="/clones" className="text-spark underline-offset-2 hover:underline">
            See live clones
          </Link>
          {" · "}
          <Link href="/studio" className="text-spark underline-offset-2 hover:underline">
            or open the editing studio
          </Link>
        </p>
      )}
    </div>
  );
}
