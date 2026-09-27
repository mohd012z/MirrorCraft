"use client";

import { useMemo, useState } from "react";

import { accentForPalette, composePageHtml } from "@/mirrorcraft/html-export";
import type { SectionContentState } from "@/mirrorcraft/section-content";
import type { PageComposition } from "@/mirrorcraft/section-composer";

/**
 * Direct HTML editing surface.
 *
 * Shows the real, standalone HTML generated from the structured page model
 * (composition + content + palette). The user can edit the markup freely,
 * see a live sandboxed preview, copy it, or download it. "Sync from sections"
 * regenerates the HTML from the structured model whenever the other tabs change.
 */
export function HtmlEditPanel({
  composition,
  content,
  paletteId,
}: {
  composition: PageComposition;
  content: SectionContentState;
  paletteId: string;
}) {
  const accent = accentForPalette(paletteId);
  const generated = useMemo(
    () => composePageHtml(composition, content, accent),
    [composition, content, accent],
  );

  // Derived state: the manual override (hand edits) shadows the generated
  // HTML; "Sync from sections" clears it. No effect-based syncing needed.
  const [manual, setManual] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dirty = manual !== null;
  const html = manual ?? generated;

  async function copy() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${composition.pageId}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section id="html-edit" className="rounded-2xl border border-teal-300/20 bg-[#111318] p-3 text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
            Direct HTML Edit
          </div>
          <div className="mt-1 text-xs text-white/45">
            {html.length.toLocaleString()} chars · edits are local to this tab ·
            {dirty ? " hand-edited" : " synced from sections"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setManual(null)}
            className="h-8 rounded-md border border-white/10 px-3 text-xs text-white/75 hover:bg-white/5 hover:text-white"
          >
            ⇄ Sync from sections
          </button>
          <button
            type="button"
            onClick={copy}
            className="h-8 rounded-md border border-white/10 px-3 text-xs text-white/75 hover:bg-white/5 hover:text-white"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button
            type="button"
            onClick={download}
            className="h-8 rounded-md bg-teal-400 px-3 text-xs font-semibold text-slate-950 hover:bg-teal-300"
          >
            Download .html
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex min-h-[320px] flex-col">
          <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            <span>Markup</span>
            <span className="font-mono text-white/25">page.html</span>
          </div>
          <textarea
            value={html}
            spellCheck={false}
            onChange={(event) => setManual(event.target.value)}
            aria-label="Page HTML source"
            className="min-h-[300px] w-full flex-1 resize-none rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[12px] leading-relaxed text-teal-50 outline-none focus:border-teal-400"
          />
        </div>

        <div className="flex min-h-[320px] flex-col">
          <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            <span>Live preview</span>
            <span className="text-white/25">sandboxed · no scripts</span>
          </div>
          <iframe
            title="HTML live preview"
            sandbox="allow-same-origin"
            srcDoc={html}
            className="w-full flex-1 rounded-lg border border-white/10 bg-white"
            style={{ minHeight: 300 }}
          />
        </div>
      </div>
    </section>
  );
}
