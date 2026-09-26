"use client";

import { useState } from "react";

import {
  SECTION_PRESETS,
  type SectionPreset,
} from "@/mirrorcraft/design-library/advanced";
import {
  getSectionSlotNodeId,
  getSectionSlotValue,
  setSectionSlotValue,
  type SectionContentState,
} from "@/mirrorcraft/section-content";
import type { PageComposition, SectionInstance } from "@/mirrorcraft/section-composer";

interface SlotSelection {
  instanceId: string;
  slot: string;
  label: string;
}

function requirePreset(presetId: string): SectionPreset {
  const preset = SECTION_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown section preset: ${presetId}`);
  return preset;
}

function slotValue(content: SectionContentState, section: SectionInstance, slot: string): string {
  return getSectionSlotValue(content, section.instanceId, slot) ?? "";
}

export function EditableComposedPagePreview({
  composition,
  content,
  onContentChange,
}: {
  composition: PageComposition;
  content: SectionContentState;
  onContentChange: (next: SectionContentState) => void;
}) {
  const [selection, setSelection] = useState<SlotSelection | null>(null);
  const [draft, setDraft] = useState("");

  function selectSlot(section: SectionInstance, slot: string, label?: string) {
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

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111318] p-3 text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Editable Composed Preview</div>
          <div className="mt-1 text-xs text-white/45">Click section content directly · composition rev {composition.revision} · content rev {content.revision}</div>
        </div>
        <div className="text-xs text-white/40">{composition.sections.filter((section) => !section.hidden).length} visible sections</div>
      </div>

      <div className="max-h-[760px] overflow-auto rounded-xl bg-slate-50 text-slate-950 shadow-2xl">
        {composition.sections.map((section) => (
          <EditableSection
            key={section.instanceId}
            section={section}
            content={content}
            onSelectSlot={selectSlot}
          />
        ))}
      </div>

      {selection ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 sm:flex-row sm:items-center">
          <div className="min-w-36">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">Direct edit</div>
            <div className="mt-1 truncate text-xs text-white/50">{selection.label}</div>
          </div>
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyDraft();
              if (event.key === "Escape") setSelection(null);
            }}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
          />
          <button type="button" onClick={applyDraft} className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white">Apply</button>
          <button type="button" onClick={() => setSelection(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70">Cancel</button>
        </div>
      ) : null}
    </section>
  );
}

function EditableSection({
  section,
  content,
  onSelectSlot,
}: {
  section: SectionInstance;
  content: SectionContentState;
  onSelectSlot: (section: SectionInstance, slot: string, label?: string) => void;
}) {
  if (section.hidden) return null;
  const preset = requirePreset(section.presetId);
  const shellClass = "border-b border-slate-200 px-6 py-8 md:px-10";
  const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-violet-600";

  if (section.kind === "navbar") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 md:px-10">
        <EditableText section={section} slot="brand" content={content} onSelect={onSelectSlot} className="font-semibold" />
        <EditableText section={section} slot="links" content={content} onSelect={onSelectSlot} className="text-sm text-slate-500" />
        <EditableText section={section} slot="primaryAction" content={content} onSelect={onSelectSlot} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white" />
      </section>
    );
  }

  if (section.kind === "hero") {
    const mediaSlot = preset.slots.includes("dashboardPreview") ? "dashboardPreview" : "media";
    return (
      <section data-mirrorcraft-section={section.instanceId} className={`${shellClass} ${preset.layoutClass}`}>
        <div>
          {preset.slots.includes("eyebrow") ? <EditableText section={section} slot="eyebrow" content={content} onSelect={onSelectSlot} className={labelClass} /> : null}
          <EditableText section={section} slot="heading" content={content} onSelect={onSelectSlot} className="mt-3 block text-3xl font-bold tracking-tight md:text-5xl" />
          <EditableText section={section} slot="copy" content={content} onSelect={onSelectSlot} className="mt-4 block max-w-xl text-slate-600" />
          <EditableText section={section} slot="actions" content={content} onSelect={onSelectSlot} className="mt-6 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white" />
        </div>
        {preset.slots.includes(mediaSlot) ? (
          <EditableMedia section={section} slot={mediaSlot} content={content} onSelect={onSelectSlot} />
        ) : null}
      </section>
    );
  }

  if (section.kind === "features" || section.kind === "cards" || section.kind === "stats") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        {preset.slots.includes("heading") ? <EditableText section={section} slot="heading" content={content} onSelect={onSelectSlot} className={`${labelClass} block`} /> : null}
        {preset.slots.includes("copy") ? <EditableText section={section} slot="copy" content={content} onSelect={onSelectSlot} className="mt-2 block max-w-2xl text-sm text-slate-500" /> : null}
        <EditableText section={section} slot="items" content={content} onSelect={onSelectSlot} className="mt-5 block rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium shadow-sm" />
      </section>
    );
  }

  if (section.kind === "pricing") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        <EditableText section={section} slot="heading" content={content} onSelect={onSelectSlot} className={`${labelClass} block`} />
        <EditableText section={section} slot="copy" content={content} onSelect={onSelectSlot} className="mt-2 block text-sm text-slate-500" />
        <EditableText section={section} slot="billingToggle" content={content} onSelect={onSelectSlot} className="mt-4 inline-block rounded-full border border-slate-200 bg-white px-3 py-1 text-xs" />
        <EditableText section={section} slot="plans" content={content} onSelect={onSelectSlot} className="mt-5 block rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold shadow-sm" />
      </section>
    );
  }

  if (section.kind === "faq") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        <EditableText section={section} slot="heading" content={content} onSelect={onSelectSlot} className={`${labelClass} block`} />
        <EditableText section={section} slot="copy" content={content} onSelect={onSelectSlot} className="mt-2 block text-sm text-slate-500" />
        <EditableText section={section} slot="items" content={content} onSelect={onSelectSlot} className="mt-5 block rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium" />
      </section>
    );
  }

  if (section.kind === "testimonial") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        <EditableText section={section} slot="quote" content={content} onSelect={onSelectSlot} className="block max-w-3xl text-2xl font-medium leading-relaxed text-slate-800" />
        <div className="mt-4 flex gap-2 text-sm text-slate-500">
          <EditableText section={section} slot="name" content={content} onSelect={onSelectSlot} className="font-semibold text-slate-800" />
          <EditableText section={section} slot="role" content={content} onSelect={onSelectSlot} />
        </div>
      </section>
    );
  }

  if (section.kind === "cta") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={`${shellClass} flex flex-col justify-between gap-4 bg-slate-950 text-white md:flex-row md:items-center`}>
        <div>
          <EditableText section={section} slot="heading" content={content} onSelect={onSelectSlot} className="block text-2xl font-bold" />
          {preset.slots.includes("copy") ? <EditableText section={section} slot="copy" content={content} onSelect={onSelectSlot} className="mt-2 block text-sm text-white/60" /> : null}
        </div>
        <EditableText section={section} slot={preset.slots.includes("primaryAction") ? "primaryAction" : "actions"} content={content} onSelect={onSelectSlot} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950" />
      </section>
    );
  }

  return (
    <footer data-mirrorcraft-section={section.instanceId} className="grid gap-6 px-6 py-8 text-sm text-slate-500 md:grid-cols-4 md:px-10">
      <EditableText section={section} slot="brand" content={content} onSelect={onSelectSlot} className="font-semibold text-slate-950" />
      <EditableText section={section} slot="linkGroups" content={content} onSelect={onSelectSlot} />
      <EditableText section={section} slot="social" content={content} onSelect={onSelectSlot} />
      <EditableText section={section} slot="legal" content={content} onSelect={onSelectSlot} />
    </footer>
  );
}

function EditableText({
  section,
  slot,
  content,
  onSelect,
  className = "",
}: {
  section: SectionInstance;
  slot: string;
  content: SectionContentState;
  onSelect: (section: SectionInstance, slot: string, label?: string) => void;
  className?: string;
}) {
  const value = slotValue(content, section, slot);
  return (
    <button
      type="button"
      data-mirrorcraft-node={getSectionSlotNodeId(section.instanceId, slot)}
      onClick={() => onSelect(section, slot, `${section.kind} · ${slot}`)}
      className={`cursor-text text-left outline-none ring-violet-500/0 transition hover:ring-2 hover:ring-violet-500/30 focus:ring-2 focus:ring-violet-500/50 ${className}`}
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
      onClick={() => onSelect(section, slot, `${section.kind} · ${slot} URL`)}
      className="aspect-[4/3] w-full rounded-2xl border border-slate-200 bg-cover bg-center shadow-sm outline-none ring-violet-500/0 transition hover:ring-2 hover:ring-violet-500/30 focus:ring-2 focus:ring-violet-500/50"
      style={{ backgroundImage: `url(${value})` }}
    />
  );
}
