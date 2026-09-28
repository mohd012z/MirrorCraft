"use client";

import {
  COLOR_PALETTES,
  SECTION_PRESETS,
} from "@/mirrorcraft/design-library/advanced";
import type { SectionInstance } from "@/mirrorcraft/section-composer";

export type AlignId = "left" | "center" | "right";

export interface SectionQuickBarProps {
  /** Section currently selected in the preview (null = page level). */
  section: SectionInstance | null;
  paletteId: string;
  headingId: string;
  alignId: AlignId;
  sectionCount: number;
  onPalette: (id: string) => void;
  onCycleHeading: () => void;
  onCycleAlign: () => void;
  onAddSection: (presetId: string) => void;
  onRemoveSection: () => void;
  /** Section ops surfaced on the preview (compact one-screen editing). */
  onDuplicateSection?: () => void;
  onMoveSection?: (dir: -1 | 1) => void;
  onToggleHideSection?: () => void;
  sectionHidden?: boolean;
}

const ALIGN_LABEL: Record<AlignId, string> = {
  left: "Align L",
  center: "Align C",
  right: "Align R",
};

/**
 * Compact, in-preview editing bar.
 *
 * Appears on the studio preview while a section is selected (or at page
 * level): palette swatches, text size / alignment toggles and add/remove —
 * so the user can see exactly what they're changing and pick the control
 * right on the preview instead of hunting through the full Design Library.
 */
export function SectionQuickBar(props: SectionQuickBarProps) {
  const heading = props.headingId ? `A${props.headingId}` : "Aa";
  const addable = SECTION_PRESETS.filter((item) => item.kind !== "hero");

  const chip =
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-xs text-white/75 transition hover:border-teal-300/50 hover:bg-teal-300/10 hover:text-teal-100";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-teal-300/25 bg-teal-950/40 px-3 py-2 backdrop-blur">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-300">
        {props.section ? `Editing · ${props.section.kind}` : "Page controls"}
      </span>

      <div className="flex items-center gap-1.5">
        {COLOR_PALETTES.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={`Palette ${item.label}`}
            aria-pressed={props.paletteId === item.id}
            onClick={() => props.onPalette(item.id)}
            className={`h-7 w-7 rounded-md border transition ${
              props.paletteId === item.id
                ? "scale-110 border-teal-300 ring-2 ring-teal-300/40"
                : "border-white/20 hover:border-white/50"
            }`}
            style={{
              background: `linear-gradient(135deg, ${item.background} 55%, ${item.accent} 55%)`,
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title="Cycle heading size"
          className={chip}
          onClick={props.onCycleHeading}
        >
          {heading}
        </button>
        <button
          type="button"
          title="Cycle text alignment"
          className={chip}
          onClick={props.onCycleAlign}
        >
          {ALIGN_LABEL[props.alignId]}
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title="Duplicate section"
          disabled={!props.section}
          className={`${chip} disabled:cursor-not-allowed disabled:opacity-30`}
          onClick={() => props.onDuplicateSection?.()}
        >
          ⧉ Duplicate
        </button>
        <button
          type="button"
          title="Move section up"
          disabled={!props.section}
          className={`${chip} disabled:cursor-not-allowed disabled:opacity-30`}
          onClick={() => props.onMoveSection?.(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          title="Move section down"
          disabled={!props.section}
          className={`${chip} disabled:cursor-not-allowed disabled:opacity-30`}
          onClick={() => props.onMoveSection?.(1)}
        >
          ↓
        </button>
        <button
          type="button"
          title={props.sectionHidden ? "Show section" : "Hide section"}
          disabled={!props.section}
          className={`${chip} disabled:cursor-not-allowed disabled:opacity-30`}
          onClick={() => props.onToggleHideSection?.()}
        >
          {props.sectionHidden ? "👁 Show" : "Hide"}
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <select
          aria-label="Add section"
          value=""
          onChange={(event) => {
            if (event.target.value) props.onAddSection(event.target.value);
            event.target.value = "";
          }}
          className="h-8 cursor-pointer rounded-md border border-white/15 bg-white/5 px-2 text-xs text-white/80 outline-none hover:border-teal-300/50"
        >
          <option value="">+ Add section…</option>
          {addable.map((item) => (
            <option key={item.id} value={item.id} className="bg-slate-950">
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!props.section || props.sectionCount <= 1}
          className={`${chip} disabled:cursor-not-allowed disabled:opacity-30`}
          onClick={props.onRemoveSection}
        >
          − Remove
        </button>
      </div>
    </div>
  );
}
