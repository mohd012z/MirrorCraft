"use client";

import { useMemo, useState } from "react";

import {
  SECTION_PRESETS,
  type SectionPreset,
} from "@/mirrorcraft/design-library/advanced";
import {
  addSection,
  createPageComposition,
  deleteSection,
  duplicateSection,
  hideSection,
  moveSection,
  replaceSectionVariant,
  toSectionWebGraph,
  type PageComposition,
  type SectionInstance,
} from "@/mirrorcraft/section-composer";

const DEFAULT_COMPOSITION = createPageComposition("home", [
  "navbar-simple",
  "hero-centered",
  "features-grid",
  "pricing-three",
  "faq-accordion",
  "cta-banner",
  "footer-columns",
]);

function findPreset(presetId: string): SectionPreset {
  const preset = SECTION_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown section preset: ${presetId}`);
  return preset;
}

function variantsFor(section: SectionInstance): SectionPreset[] {
  return SECTION_PRESETS.filter((preset) => preset.kind === section.kind);
}

export interface SectionComposerPanelProps {
  composition?: PageComposition;
  onCompositionChange?: (composition: PageComposition) => void;
}

export function SectionComposerPanel({
  composition: controlledComposition,
  onCompositionChange,
}: SectionComposerPanelProps = {}) {
  const [localComposition, setLocalComposition] = useState<PageComposition>(DEFAULT_COMPOSITION);
  const [presetToAdd, setPresetToAdd] = useState(SECTION_PRESETS[0].id);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const composition = controlledComposition ?? localComposition;

  function commit(next: PageComposition) {
    if (!controlledComposition) setLocalComposition(next);
    onCompositionChange?.(next);
  }

  const graph = useMemo(() => toSectionWebGraph(composition), [composition]);
  const visibleCount = composition.sections.filter((section) => !section.hidden).length;

  function addSelectedSection() {
    commit(addSection(composition, presetToAdd));
  }

  function moveBy(instanceId: string, delta: number) {
    const index = composition.sections.findIndex((section) => section.instanceId === instanceId);
    if (index < 0) return;
    commit(moveSection(composition, instanceId, index + delta));
  }

  function dropBefore(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const targetIndex = composition.sections.findIndex((section) => section.instanceId === targetId);
    if (targetIndex < 0) return;
    commit(moveSection(composition, draggingId, targetIndex));
    setDraggingId(null);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Section Composer</div>
          <h2 className="mt-1 text-lg font-semibold">Build the page structure</h2>
          <p className="mt-1 text-xs text-white/45">
            Add, reorder, duplicate, hide, replace or remove sections while preserving a WebStructure projection.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-white/55">
          <span className="rounded-md border border-white/10 px-2 py-1">rev {composition.revision}</span>
          <span className="rounded-md border border-white/10 px-2 py-1">{visibleCount}/{composition.sections.length} visible</span>
          <span className="rounded-md border border-white/10 px-2 py-1">{Object.keys(graph.nodes).length} graph nodes</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/10 p-3 sm:flex-row">
        <select
          value={presetToAdd}
          onChange={(event) => setPresetToAdd(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
        >
          {SECTION_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.kind} · {preset.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addSelectedSection}
          className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400"
        >
          + Add section
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {composition.sections.map((section, index) => {
          const preset = findPreset(section.presetId);
          const variants = variantsFor(section);
          return (
            <article
              key={section.instanceId}
              draggable
              onDragStart={() => setDraggingId(section.instanceId)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropBefore(section.instanceId)}
              className={`group grid gap-3 rounded-xl border p-3 transition md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center ${
                section.hidden
                  ? "border-white/5 bg-white/[0.02] opacity-50"
                  : "border-white/10 bg-white/[0.04] hover:border-teal-400/40"
              }`}
            >
              <div className="flex size-8 cursor-grab items-center justify-center rounded-md border border-white/10 text-white/35 active:cursor-grabbing" title="Drag to reorder">
                ⋮⋮
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-300">{section.kind}</span>
                  <span className="truncate text-sm font-semibold text-white">{preset.label}</span>
                  {section.hidden ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/45">hidden</span> : null}
                </div>
                <p className="mt-1 truncate text-xs text-white/40">{preset.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {preset.slots.map((slot) => (
                    <span key={slot} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/35">{slot}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {variants.length > 1 ? (
                  <select
                    aria-label={`Replace ${preset.label} variant`}
                    value={section.presetId}
                    onChange={(event) => commit(replaceSectionVariant(composition, section.instanceId, event.target.value))}
                    className="rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none"
                  >
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>{variant.label}</option>
                    ))}
                  </select>
                ) : null}
                <ComposerButton label="↑" title="Move up" disabled={index === 0} onClick={() => moveBy(section.instanceId, -1)} />
                <ComposerButton label="↓" title="Move down" disabled={index === composition.sections.length - 1} onClick={() => moveBy(section.instanceId, 1)} />
                <ComposerButton label="Duplicate" onClick={() => commit(duplicateSection(composition, section.instanceId))} />
                <ComposerButton
                  label={section.hidden ? "Show" : "Hide"}
                  onClick={() => commit(hideSection(composition, section.instanceId, !section.hidden))}
                />
                <ComposerButton
                  label="Delete"
                  danger
                  onClick={() => commit(deleteSection(composition, section.instanceId))}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ComposerButton({
  label,
  onClick,
  title,
  disabled = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "border-rose-400/20 text-rose-300 hover:bg-rose-400/10"
          : "border-white/10 text-white/65 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
