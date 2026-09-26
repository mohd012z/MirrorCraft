"use client";

import { PreviewCanvas } from "@/app/studio/preview-canvas";
import { StudioCompositionSurface } from "@/app/studio/studio-composition-surface";

export function StudioWorkspace() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1 text-xs text-white/60">
          {['Preview', 'Design', 'Original', 'Diff', 'Responsive', 'Inspect'].map((item, index) => (
            <button key={item} type="button" className={`rounded-md px-3 py-1.5 ${index === 1 ? 'bg-white/10 text-white' : 'hover:text-white'}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-300">Direct edit enabled</span>
          <span className="rounded-md border border-white/10 px-2 py-1 text-white/45">Content-aware Web360</span>
        </div>
      </div>

      <PreviewCanvas />
      <StudioCompositionSurface />
    </div>
  );
}
