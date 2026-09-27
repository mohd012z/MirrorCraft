"use client";

import { useState } from "react";

import { StudioCompositionSurface } from "@/app/studio/studio-composition-surface";
import { StudioOperationsSurface } from "@/app/studio/studio-operations-surface";
import { StudioRestrictionSurface } from "@/app/studio/studio-restriction-surface";
import { PreviewCanvas } from "@/app/studio/preview-canvas";
import type { CanvasSelection } from "@/mirrorcraft/editing/canvas-bridge";
import type { PolicyEnvelope } from "@/mirrorcraft/policy/envelope";

export interface StudioWorkspaceProps {
  policyEnvelope?: PolicyEnvelope | null;
}

/**
 * Preview-first editing workspace:
 *   1. The shared page model — project I/O, history, composed preview with
 *      the in-preview quick bar, and the section composer (real editing).
 *   2. Structured operations / restrictions (inspector, hosting, publish).
 *   3. A collapsible decorative design-system canvas (template playground).
 */
export function StudioWorkspace({
  policyEnvelope = null,
}: StudioWorkspaceProps = {}) {
  const [showDesignSystem, setShowDesignSystem] = useState(false);
  const selection = null as CanvasSelection | null;

  return (
    <div className="space-y-4">
      <StudioCompositionSurface />
      <StudioOperationsSurface selection={selection} />
      <StudioRestrictionSurface envelope={policyEnvelope} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <button
          type="button"
          onClick={() => setShowDesignSystem((open) => !open)}
          aria-expanded={showDesignSystem}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-white/60 hover:bg-white/5 hover:text-white"
        >
          <span className="font-semibold uppercase tracking-[0.16em]">
            Design system canvas
          </span>
          <span>{showDesignSystem ? "Hide" : "Show"}</span>
        </button>
        <p className="mt-1 px-2 text-[11px] text-white/35">
          Template · typography · buttons · palette playground (decorative)
        </p>
        {showDesignSystem ? (
          <div className="mt-3">
            <PreviewCanvas />
          </div>
        ) : null}
      </div>
    </div>
  );
}
