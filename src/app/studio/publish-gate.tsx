"use client";

import { useMemo, useState } from "react";

import { saveBytesWithAndroidBridge } from "@/app/studio/android-bridge";
import {
  buildDeployBundle,
  buildDeployZip,
  compileStudioExport,
  type StudioExportCompile,
} from "@/mirrorcraft/studio-publish";
import type { PageComposition } from "@/mirrorcraft/section-composer";
import type { SectionContentState } from "@/mirrorcraft/section-content";

/**
 * Compile · Publish gate — the single evidence-producing publish path.
 * Compile is bound to an exact structured-model fingerprint; any project,
 * content, palette, or branch change makes previous evidence stale.
 */
export function PublishGate({
  composition,
  content,
  paletteId,
  branch,
}: {
  composition: PageComposition;
  content: SectionContentState;
  paletteId: string;
  branch: string;
}) {
  const [compile, setCompile] = useState<StudioExportCompile | null>(null);
  const [compiledFor, setCompiledFor] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const modelKey = useMemo(() => {
    const values = Object.entries(content.values).sort(([left], [right]) => left.localeCompare(right));
    return JSON.stringify({
      pageId: composition.pageId,
      sections: composition.sections.map((section) => ({
        instanceId: section.instanceId,
        presetId: section.presetId,
        kind: section.kind,
        hidden: section.hidden,
      })),
      values,
      paletteId,
      branch,
    });
  }, [composition.pageId, composition.sections, content.values, paletteId, branch]);

  const stale = compile !== null && compiledFor !== modelKey;

  function runCompile() {
    setCompile(compileStudioExport(composition, content, paletteId, branch));
    setCompiledFor(modelKey);
    setDownloaded(false);
  }

  function downloadArtifact() {
    if (!compile || !compile.ok || stale) return;
    const bundle = buildDeployBundle(compile);
    const zip = buildDeployZip(bundle.files);
    const filename = `${compile.pageId || "page"}-mirrorcraft-export.zip`;

    if (saveBytesWithAndroidBridge(filename, zip, "application/zip")) {
      setDownloaded(true);
      return;
    }

    const blob = new Blob([zip], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setDownloaded(true);
  }

  const canPublish = compile?.ok === true && !stale;

  return (
    <div className="space-y-3" data-publish-gate="true">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
          Compile · Publish gate
        </div>
        <p className="mt-1 max-w-xl text-xs leading-5 text-white/45">
          Compile runs the current page model through the static-export composer and
          verifies it. Publish is enabled only for that exact current snapshot and
          downloads a real ZIP artifact; it does not claim a remote deployment.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runCompile}
          className="h-9 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-white/80 transition hover:border-teal-300/40 hover:bg-white/5 hover:text-white"
        >
          ⚙ Compile
        </button>
        <button
          type="button"
          onClick={downloadArtifact}
          disabled={!canPublish}
          className="h-9 rounded-md bg-teal-400 px-4 text-xs font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {downloaded ? "Publish again ↓" : "Publish (download artifact)"}
        </button>
        {stale && compile ? (
          <span className="text-[11px] text-amber-300">
            Stale — the project changed after this compile. Re-compile.
          </span>
        ) : null}
      </div>

      {compile ? (
        <div
          className={`rounded-xl border p-3 ${
            compile.ok ? "border-teal-300/25 bg-teal-400/[0.04]" : "border-rose-400/30 bg-rose-500/[0.05]"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className={compile.ok ? "text-teal-300" : "text-rose-300"}>
              {compile.ok ? "✓ Compiled" : "✕ Compile failed"}
            </span>
            {stale ? <span className="text-[11px] font-normal text-amber-300">(stale)</span> : null}
          </div>

          {compile.ok ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-white/55 sm:grid-cols-3">
              <div>
                <dt className="text-white/30">Sections</dt>
                <dd>{compile.compiledSections} compiled · {compile.hiddenSections} hidden</dd>
              </div>
              <div>
                <dt className="text-white/30">Size</dt>
                <dd>{compile.bytes.toLocaleString()} bytes</dd>
              </div>
              <div>
                <dt className="text-white/30">Checksum</dt>
                <dd className="font-mono">{compile.checksum}</dd>
              </div>
              <div>
                <dt className="text-white/30">Branch</dt>
                <dd>{compile.branch}</dd>
              </div>
              <div>
                <dt className="text-white/30">Palette</dt>
                <dd>{compile.paletteId}</dd>
              </div>
              <div>
                <dt className="text-white/30">At</dt>
                <dd>{new Date(compile.compiledAt).toLocaleString()}</dd>
              </div>
            </dl>
          ) : (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-[11px] text-rose-200/80">
              {compile.issues.map((issue, index) => <li key={index}>{issue}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-xs text-white/40">
          Not compiled yet — run Compile to produce evidence.
        </p>
      )}
    </div>
  );
}
