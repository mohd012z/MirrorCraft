"use client";

import { useState, type MouseEvent } from "react";

import { PreviewCanvas } from "@/app/studio/preview-canvas";
import { StudioCompositionSurface } from "@/app/studio/studio-composition-surface";
import { StudioOperationsSurface } from "@/app/studio/studio-operations-surface";
import type { CanvasSelection } from "@/mirrorcraft/editing/canvas-bridge";

function inferNodeKind(nodeId: string): string {
  if (nodeId.includes("image")) return "asset";
  if (nodeId.includes("cta")) return "child";
  if (nodeId === "hero") return "container";
  return "content";
}

function selectionFromCanvasClick(
  event: MouseEvent<HTMLDivElement>,
): CanvasSelection | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  const element = target.closest<HTMLElement>("[data-mirrorcraft-node]");
  if (!element) return null;

  const nodeId = element.dataset.mirrorcraftNode;
  if (!nodeId) return null;

  const host = event.currentTarget;
  const rect = element.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const selectionRect = {
    x: rect.left - hostRect.left,
    y: rect.top - hostRect.top,
    width: rect.width,
    height: rect.height,
  };
  const viewport = {
    width: host.clientWidth,
    height: host.clientHeight,
  };

  return {
    nodeId,
    kind: inferNodeKind(nodeId),
    sourcePath: "src/app/studio/preview-canvas.tsx",
    rect: selectionRect,
    actions: [],
    descriptor: {
      nodeId,
      tagName: element.tagName.toLowerCase(),
      text: element.textContent ?? undefined,
      href:
        element instanceof HTMLAnchorElement
          ? element.getAttribute("href") ?? undefined
          : undefined,
      attributes: { "data-mirrorcraft-node": nodeId },
      rect: selectionRect,
      viewport,
    },
  };
}

export function StudioWorkspace() {
  const [selection, setSelection] = useState<CanvasSelection | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1 text-xs text-white/60">
          {["Preview", "Design", "Original", "Diff", "Responsive", "Inspect"].map((item, index) => (
            <button
              key={item}
              type="button"
              className={`rounded-md px-3 py-1.5 ${index === 1 ? "bg-white/10 text-white" : "hover:text-white"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-300">Direct edit enabled</span>
          <span className="rounded-md border border-white/10 px-2 py-1 text-white/45">
            Content-aware Web360
          </span>
        </div>
      </div>

      <div onClickCapture={(event) => setSelection(selectionFromCanvasClick(event))}>
        <PreviewCanvas />
      </div>
      <StudioCompositionSurface />
      <StudioOperationsSurface selection={selection} />
    </div>
  );
}
