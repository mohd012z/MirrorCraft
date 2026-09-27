"use client";

import { useState } from "react";

import {
  COLOR_PALETTES,
  SECTION_PRESETS,
} from "@/mirrorcraft/design-library/advanced";
import type { SectionPreset } from "@/mirrorcraft/design-library/advanced";
import {
  getSectionSlotNodeId,
  getSectionSlotValue,
  setSectionSlotValue,
  type SectionContentState,
} from "@/mirrorcraft/section-content";
import {
  addSection,
  deleteSection,
  type PageComposition,
  type SectionInstance,
} from "@/mirrorcraft/section-composer";
import { SectionQuickBar, type AlignId } from "@/app/studio/section-quickbar";

function requirePreset(presetId: string): SectionPreset {
  const preset = SECTION_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown section preset: ${presetId}`);
  return preset;
}

function slotValue(content: SectionContentState, section: SectionInstance, slot: string): string {
  return getSectionSlotValue(content, section.instanceId, slot) ?? "";
}

/** Compact heading sizes cycled by the quick bar. */
const HEADING_SIZES = [
  { id: "S", className: "text-2xl md:text-3xl" },
  { id: "M", className: "text-3xl md:text-4xl" },
  { id: "L", className: "text-3xl md:text-5xl" },
  { id: "XL", className: "text-4xl md:text-6xl" },
] as const;

const ALIGN_ORDER: AlignId[] = ["left", "center", "right"];

export function EditableComposedPagePreview({
  composition,
  content,
  onContentChange,
  onCompositionChange,
  paletteId,
  onPaletteChange,
}: {
  composition: PageComposition;
  content: SectionContentState;
  onContentChange: (next: SectionContentState) => void;
  onCompositionChange: (next: PageComposition) => void;
  paletteId: string;
  onPaletteChange: (id: string) => void;
}) {
  const [selection, setSelection] = useState<{
    instanceId: string;
    slot: string;
    label: string;
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [alignId, setAlignId] = useState<AlignId>("left");
  const [headingId, setHeadingId] = useState<string>("L");

  const palette = COLOR_PALETTES.find((item) => item.id === paletteId) ?? COLOR_PALETTES[0];
  const heading = HEADING_SIZES.find((item) => item.id === headingId) ?? HEADING_SIZES[2];

  function cycleHeading() {
    const index = HEADING_SIZES.findIndex((item) => item.id === headingId);
    setHeadingId(HEADING_SIZES[(index + 1) % HEADING_SIZES.length].id);
  }

  function cycleAlign() {
    setAlignId((current) => {
      const index = ALIGN_ORDER.indexOf(current);
      return ALIGN_ORDER[(index + 1) % ALIGN_ORDER.length];
    });
  }

  function selectSlot(section: SectionInstance, slot: string, label?: string) {
    setSelectedSectionId(section.instanceId);
    setSelection({ instanceId: section.instanceId, slot, label: label ?? slot });
    setDraft(slotValue(content, section, slot));
  }

  function applyDraft() {
    if (!selection) return;
    onContentChange(
      setSectionSlotValue(content, selection.instanceId, selection.slot, draft),
    );
    setSelection(null);
  }

  const selectedSection = composition.sections.find(
    (item) => item.instanceId === selectedSectionId,
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111318] p-3 text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
            Editable Composed Preview
          </div>
          <div className="mt-1 text-xs text-white/45">
            Hover a section to select it · click any text to edit inline · quick bar below
          </div>
        </div>
        <div className="text-xs text-white/40">
          {composition.sections.filter((section) => !section.hidden).length} visible sections
        </div>
      </div>

      {/* Quick bar — compact controls right on the preview */}
      <div className="mb-3">
        <SectionQuickBar
          section={selectedSection ?? null}
          paletteId={paletteId}
          headingId={headingId}
          alignId={alignId}
          sectionCount={composition.sections.length}
          onPalette={onPaletteChange}
          onCycleHeading={cycleHeading}
          onCycleAlign={cycleAlign}
          onAddSection={(presetId) => {
            const index = selectedSection
              ? composition.sections.findIndex(
                  (item) => item.instanceId === selectedSection.instanceId,
                ) + 1
              : composition.sections.length;
            onCompositionChange(addSection(composition, presetId, index));
            setSelectedSectionId(null);
          }}
          onRemoveSection={() => {
            if (!selectedSection) return;
            onCompositionChange(deleteSection(composition, selectedSection.instanceId));
            setSelectedSectionId(null);
            setSelection(null);
          }}
        />
      </div>

      {selection ? (
        <div className="flex items-center justify-between gap-4 text-xs text-white/60">
          <span>Selected element — {selection.label}</span>
          <span>Enter to apply · Esc to cancel</span>
        </div>
      ) : null}
      <div
        className="max-h-[760px] overflow-auto rounded-xl bg-slate-50 text-slate-950 shadow-2xl"
        style={{ "--mc-accent": palette.accent, textAlign: alignId } as React.CSSProperties}
      >
        {composition.sections.map((section) => (
          <SectionShell
            key={section.instanceId}
            section={section}
            content={content}
            headingClass={heading.className}
            selected={selectedSectionId === section.instanceId}
            onSelectSection={() => setSelectedSectionId(section.instanceId)}
            onSelectSlot={selectSlot}
          />
        ))}

        {selection ? (
          <div className="m-4 flex flex-col gap-2 rounded-xl border border-teal-400/40 bg-white p-3 text-slate-950 shadow-lg sm:flex-row sm:items-center">
            <div className="min-w-36">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-600">
                Direct edit
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">{selection.label}</div>
            </div>
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyDraft();
                if (event.key === "Escape") setSelection(null);
              }}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500"
            />
            <button type="button" onClick={applyDraft} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">
              Apply
            </button>
            <button type="button" onClick={() => setSelection(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------- section structure (kept, with selection shell) ---------- */

function SectionShell({
  section,
  content,
  headingClass,
  selected,
  onSelectSection,
  onSelectSlot,
}: {
  section: SectionInstance;
  content: SectionContentState;
  headingClass: string;
  selected: boolean;
  onSelectSection: () => void;
  onSelectSlot: (section: SectionInstance, slot: string, label?: string) => void;
}) {
  if (section.hidden) return null;
  const preset = requirePreset(section.presetId);
  return (
    <div
      className={`group/section relative transition ${
        selected ? "z-10 ring-2 ring-inset ring-teal-500" : "hover:ring-1 hover:ring-inset hover:ring-teal-400/60"
      }`}
      onClick={() => {
        if (!selected) onSelectSection();
      }}
    >
      {selected ? (
        <span className="absolute -top-2.5 right-3 z-20 rounded-md bg-teal-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
          {section.kind} selected
        </span>
      ) : (
        <span className="absolute -top-2 right-3 z-20 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 shadow transition group-hover/section:opacity-100">
          {section.kind} · select
        </span>
      )}
      <SectionBody
        section={section}
        preset={preset}
        content={content}
        headingClass={headingClass}
        onSelect={onSelectSlot}
      />
    </div>
  );
}

function SectionBody({
  section,
  preset,
  content,
  headingClass,
  onSelect,
}: {
  section: SectionInstance;
  preset: SectionPreset;
  content: SectionContentState;
  headingClass: string;
  onSelect: (section: SectionInstance, slot: string, label?: string) => void;
}) {
  const shellClass = "border-b border-slate-200 px-6 py-8 md:px-10";
  const labelClass = "text-xs font-semibold uppercase tracking-[0.16em]";

  if (section.kind === "navbar") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 md:px-10">
        <EditableText section={section} slot="brand" content={content} onSelect={onSelect} className="font-semibold" />
        <EditableText section={section} slot="links" content={content} onSelect={onSelect} className="text-sm text-slate-500" />
        <EditableText section={section} slot="primaryAction" content={content} onSelect={onSelect} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white" />
      </section>
    );
  }

  if (section.kind === "hero") {
    const mediaSlot = preset.slots.includes("dashboardPreview") ? "dashboardPreview" : "media";
    return (
      <section data-mirrorcraft-section={section.instanceId} className={`${shellClass} ${preset.layoutClass}`}>
        <div>
          {preset.slots.includes("eyebrow") ? <EditableText section={section} slot="eyebrow" content={content} onSelect={onSelect} className={labelClass} /> : null}
          <EditableText section={section} slot="heading" content={content} onSelect={onSelect} className={`mt-3 block font-bold tracking-tight ${headingClass}`} />
          <EditableText section={section} slot="copy" content={content} onSelect={onSelect} className="mt-4 block max-w-xl text-slate-600" />
          <EditableText section={section} slot="actions" content={content} onSelect={onSelect} className="mt-6 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: "var(--mc-accent, #0d9488)" }} />
        </div>
        {preset.slots.includes(mediaSlot) ? (
          <EditableMedia section={section} slot={mediaSlot} content={content} onSelect={onSelect} />
        ) : null}
      </section>
    );
  }

  if (section.kind === "features" || section.kind === "cards" || section.kind === "stats") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        {preset.slots.includes("heading") ? <EditableText section={section} slot="heading" content={content} onSelect={onSelect} className={`${labelClass} block`} /> : null}
        {preset.slots.includes("copy") ? <EditableText section={section} slot="copy" content={content} onSelect={onSelect} className="mt-2 block max-w-2xl text-sm text-slate-500" /> : null}
        <EditableText section={section} slot="items" content={content} onSelect={onSelect} className="mt-5 block rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium shadow-sm" />
      </section>
    );
  }

  if (section.kind === "pricing") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        <EditableText section={section} slot="heading" content={content} onSelect={onSelect} className={`${labelClass} block`} />
        <EditableText section={section} slot="copy" content={content} onSelect={onSelect} className="mt-2 block text-sm text-slate-500" />
        <EditableText section={section} slot="billingToggle" content={content} onSelect={onSelect} className="mt-4 inline-block rounded-full border border-slate-200 bg-white px-3 py-1 text-xs" />
        <EditableText section={section} slot="plans" content={content} onSelect={onSelect} className="mt-5 block rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold shadow-sm" />
      </section>
    );
  }

  if (section.kind === "faq") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        <EditableText section={section} slot="heading" content={content} onSelect={onSelect} className={`${labelClass} block`} />
        <EditableText section={section} slot="copy" content={content} onSelect={onSelect} className="mt-2 block text-sm text-slate-500" />
        <EditableText section={section} slot="items" content={content} onSelect={onSelect} className="mt-5 block rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium" />
      </section>
    );
  }

  if (section.kind === "testimonial") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        <EditableText section={section} slot="quote" content={content} onSelect={onSelect} className="block max-w-3xl text-2xl font-medium leading-relaxed text-slate-800" />
        <div className="mt-4 flex gap-2 text-sm text-slate-500">
          <EditableText section={section} slot="name" content={content} onSelect={onSelect} className="font-semibold text-slate-800" />
          <EditableText section={section} slot="role" content={content} onSelect={onSelect} />
        </div>
      </section>
    );
  }

  if (section.kind === "cta") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={`${shellClass} flex flex-col justify-between gap-4 bg-slate-950 text-white md:flex-row md:items-center`}>
        <div>
          <EditableText section={section} slot="heading" content={content} onSelect={onSelect} className="block text-2xl font-bold" />
          {preset.slots.includes("copy") ? <EditableText section={section} slot="copy" content={content} onSelect={onSelect} className="mt-2 block text-sm text-white/60" /> : null}
        </div>
        <EditableText section={section} slot={preset.slots.includes("primaryAction") ? "primaryAction" : "actions"} content={content} onSelect={onSelect} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: "var(--mc-accent, #0d9488)" }} />
      </section>
    );
  }

  return (
    <footer data-mirrorcraft-section={section.instanceId} className="grid gap-6 px-6 py-8 text-sm text-slate-500 md:grid-cols-4 md:px-10">
      <EditableText section={section} slot="brand" content={content} onSelect={onSelect} className="font-semibold text-slate-950" />
      <EditableText section={section} slot="linkGroups" content={content} onSelect={onSelect} />
      <EditableText section={section} slot="social" content={content} onSelect={onSelect} />
      <EditableText section={section} slot="legal" content={content} onSelect={onSelect} />
    </footer>
  );
}

function EditableText({
  section,
  slot,
  content,
  onSelect,
  className = "",
  style,
}: {
  section: SectionInstance;
  slot: string;
  content: SectionContentState;
  onSelect: (section: SectionInstance, slot: string, label?: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const value = slotValue(content, section, slot);
  return (
    <button
      type="button"
      data-mirrorcraft-node={getSectionSlotNodeId(section.instanceId, slot)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(section, slot, `${section.kind} · ${slot}`);
      }}
      style={style}
      className={`cursor-text text-left outline-none ring-teal-500/0 transition hover:ring-2 hover:ring-teal-500/40 focus:ring-2 focus:ring-teal-500/60 ${className}`}
    >
      {value}
    </button>
  );
}

function EditableMedia({
  section,
  slot,
  content,
  onSelect,
}: {
  section: SectionInstance;
  slot: string;
  content: SectionContentState;
  onSelect: (section: SectionInstance, slot: string, label?: string) => void;
}) {
  const value = slotValue(content, section, slot);
  return (
    <button
      type="button"
      aria-label={`Edit ${slot}`}
      data-mirrorcraft-node={getSectionSlotNodeId(section.instanceId, slot)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(section, slot, `${section.kind} · ${slot} URL`);
      }}
      className="aspect-[4/3] w-full rounded-2xl border border-slate-200 bg-cover bg-center shadow-sm outline-none ring-teal-500/0 transition hover:ring-2 hover:ring-teal-500/40 focus:ring-2 focus:ring-teal-500/60"
      style={{ backgroundImage: `url(${value})` }}
    />
  );
}
