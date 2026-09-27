"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * URL entry point for the landing page.
 *
 * GitHub Pages is a static export — the browser can't fetch the target site,
 * so "Clone" prepares the exact /clone-website command for the user's coding
 * agent AND opens the studio in-browser: committed clones (e.g. example.com)
 * load their real content directly into the editable studio; any other host
 * opens an honest empty scaffold. The input row is fully tappable (the whole
 * box focuses the field) and uses a 16px mobile font so phones don't zoom.
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
      setTarget(`${parsed.protocol}//${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`.replace(/^https?:\/\//, "https://"));
      setError(null);
      setCopied(false);
    } catch {
      setError("That does not look like a valid URL — try something like acme.com.");
      setTarget(null);
    }
  }

  async function copyCommand() {
    if (!target) return;
    try {
      await navigator.clipboard.writeText(`/clone-website ${target}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (non-secure context) — the command is visible to copy manually.
    }
  }

  const studioHref = target ? `/studio?clone=${encodeURIComponent(hostFrom(target))}` : null;

  return (
    <div className="mt-8 w-full max-w-xl">
      <form onSubmit={submit} className="flex w-full items-stretch gap-2">
        {/* The whole row is the tap target — tapping the prefix focuses the field too. */}
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
            placeholder="paste any permitted website URL"
            aria-label="Website URL to clone"
            autoComplete="off"
            className="h-12 w-full bg-transparent text-base text-slag outline-none placeholder:text-iron/70"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-ember px-5 text-sm font-semibold text-primary-foreground transition hover:bg-spark"
        >
          Clone
        </button>
      </form>

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      {target ? (
        <div className="cf-rise mt-3 rounded-md border border-ember/30 bg-ember/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-sm text-spark">
              /clone-website <span className="text-slag">{target}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {studioHref ? (
                <Link
                  href={studioHref}
                  className="rounded-md bg-ember px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-spark"
                >
                  Open in studio →
                </Link>
              ) : null}
              <button
                type="button"
                onClick={copyCommand}
                className="rounded-md border border-ember/40 px-3 py-1.5 text-xs font-semibold text-spark transition hover:bg-ember/20"
              >
                {copied ? "Copied ✓" : "Copy command"}
              </button>
            </div>
          </div>
          <ol className="mt-3 space-y-1 text-xs leading-relaxed text-iron">
            <li>
              1 · <span className="font-mono text-slag/90">npm run setup</span> in a fresh
              template copy of this repo
            </li>
            <li>2 · Open the folder in Cursor or Claude Code (browser tool required)</li>
            <li>
              3 · Paste the command above — the agent extracts, builds, and you preview
              locally
            </li>
          </ol>
          <p className="mt-3 border-t border-ember/20 pt-3 text-[11px] leading-relaxed text-iron/80">
            “Open in studio” loads a committed clone straight into the editable
            studio (example.com today). Brand-new hosts open an empty scaffold —
            real extraction of the target runs in your coding agent, not on this
            static site. Only clone sites you own or have permission to reproduce.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-iron/80">
          Not doing it in your own agent?{" "}
          <Link href="/clones" className="text-spark underline-offset-2 hover:underline">
            See a live clone built this way
          </Link>
          {" · "}
          <Link href="/studio" className="text-spark underline-offset-2 hover:underline">
            or try the direct-edit studio
          </Link>
        </p>
      )}
    </div>
  );
}
