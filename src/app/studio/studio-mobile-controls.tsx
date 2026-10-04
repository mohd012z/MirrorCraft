"use client";

import { useEffect, useMemo, useState } from "react";

import { dispatchStudioEvent, onStudioEvent, STUDIO_EVENTS } from "@/app/studio/studio-bus";
import type { StudioModel } from "@/app/studio/use-studio-model";
import { COLOR_PALETTES, SECTION_PRESETS } from "@/mirrorcraft/design-library/advanced";
import {
  getSectionSlotValue,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import {
  addSection,
  duplicateSection,
  hideSection,
  moveSection,
} from "@/mirrorcraft/section-composer";

interface SelectedSlot {
  instanceId: string;
  slot: string;
  label: string;
}

type MobilePanel = "navigator" | "inspector" | null;

function panelTitle(panel: Exclude<MobilePanel, null>): string {
  return panel === "navigator" ? "Navigator" : "Inspector";
}

function slotKey(instanceId: string, slot: string): string {
  return JSON.stringify([instanceId, slot]);
}

function parseSlotKey(value: string): { instanceId: string; slot: string } | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === "string" &&
      typeof parsed[1] === "string"
    ) {
      return { instanceId: parsed[0], slot: parsed[1] };
    }
  } catch {
    // Ignore malformed UI values.
  }
  return null;
}

export function StudioMobileControls({ model }: { model: StudioModel }) {
  const [panel, setPanel] = useState<MobilePanel>(null);
  const [slot, setSlot] = useState<SelectedSlot | null>(null);
  const [draft, setDraft] = useState("");
  const [addPresetId, setAddPresetId] = useState(SECTION_PRESETS[0]?.id ?? "");

  useEffect(() => {
    return onStudioEvent(STUDIO_EVENTS.selectSlot, (detail) => {
      if (typeof detail !== "object" || detail === null || !("instanceId" in detail)) return;
      const value = detail as { instanceId?: unknown; slot?: unknown; label?: unknown };
      if (typeof value.instanceId !== "string" || typeof value.slot !== "string") return;
      const next = {
        instanceId: value.instanceId,
        slot: value.slot,
        label: typeof value.label === "string" ? value.label : value.slot,
      };
      setSlot(next);
      setDraft(getSectionSlotValue(model.content, next.instanceId, next.slot) ?? "");
    });
  }, [model.content]);

  useEffect(() => {
    if (!slot) return;
    setDraft(getSectionSlotValue(model.content, slot.instanceId, slot.slot) ?? "");
  }, [model.content, slot]);

  const visibleSections = useMemo(
    () => model.composition.sections.filter((section) => !section.hidden),
    [model.composition.sections],
  );

  function selectSlot(instanceId: string, slotName: string, label: string) {
    const next = { instanceId, slot: slotName, label };
    setSlot(next);
    setDraft(getSectionSlotValue(model.content, instanceId, slotName) ?? "");
    dispatchStudioEvent(STUDIO_EVENTS.selectSlot, next);
  }

  function applyDraft() {
    if (!slot) return;
    model.changeContent(setSectionSlotValue(model.content, slot.instanceId, slot.slot, draft));
  }

  function addSelectedSection() {
    if (!addPresetId) return;
    const preset = SECTION_PRESETS.find((item) => item.id === addPresetId);
    if (!preset) return;
    model.changeComposition(
      addSection(model.composition, preset.id),
      `Add ${preset.label}`,
    );
  }

  const selectedSectionIndex = slot
    ? model.composition.sections.findIndex((section) => section.instanceId === slot.instanceId)
    : -1;
  const selectedSection = selectedSectionIndex >= 0
    ? model.composition.sections[selectedSectionIndex]
    : null;

  return (
    <>
      <div className="fixed inset-x-2 z-[65] flex items-center gap-1 rounded-xl border border-teal-300/25 bg-[#0b1220]/95 p-1.5 shadow-2xl backdrop-blur lg:hidden" style={{ bottom: "calc(3rem + env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={() => setPanel("navigator")}
          className="h-9 flex-1 rounded-lg border border-white/10 px-2 text-xs font-semibold text-white/80 active:bg-white/10"
        >
          Navigator
        </button>
        <button
          type="button"
          onClick={() => setPanel("inspector")}
          className="h-9 flex-1 rounded-lg border border-white/10 px-2 text-xs font-semibold text-white/80 active:bg-white/10"
        >
          Inspector
        </button>
        <button
          type="button"
          onClick={() => dispatchStudioEvent(STUDIO_EVENTS.drawer, "project")}
          className="h-9 flex-1 rounded-lg bg-teal-400 px-2 text-xs font-semibold text-slate-950 active:bg-teal-300"
        >
          Publish
        </button>
      </div>

      {panel ? (
        <div
          className="fixed inset-0 z-[80] flex bg-black/60 backdrop-blur-sm lg:hidden"
          data-mobile-panel={panel}
          role="dialog"
          aria-modal="true"
          aria-label={`${panelTitle(panel)} panel`}
        >
          <div className="ml-auto flex h-full w-[88vw] max-w-sm flex-col border-l border-teal-300/20 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300">
                  {panelTitle(panel)}
                </p>
                <p className="mt-0.5 max-w-[240px] truncate text-[11px] text-white/40">
                  {slot?.label ?? model.composition.pageId}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Close ${panelTitle(panel).toLowerCase()}`}
                onClick={() => setPanel(null)}
                className="h-9 rounded-lg border border-white/10 px-3 text-xs text-white/70 active:bg-white/10"
              >
                ✕ Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-24">
              {panel === "navigator" ? (
                <div className="space-y-4">
                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold text-white/85">Project</h3>
                      <button
                        type="button"
                        onClick={() => {
                          model.newProject();
                          setSlot(null);
                          setDraft("");
                        }}
                        className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/70 active:bg-white/10"
                      >
                        ＋ New
                      </button>
                    </div>
                    <p className="truncate font-mono text-[11px] text-teal-200/80">{model.composition.pageId}</p>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <h3 className="mb-2 text-xs font-semibold text-white/85">Sections</h3>
                    <div className="space-y-1.5">
                      {model.composition.sections.map((section) => {
                        const preset = SECTION_PRESETS.find((item) => item.id === section.presetId);
                        const slots = preset?.slots ?? [];
                        return (
                          <div key={section.instanceId} className="rounded-lg border border-white/8 bg-black/10 p-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const firstSlot = slots[0];
                                  if (firstSlot) selectSlot(section.instanceId, firstSlot, `${section.kind} · ${firstSlot}`);
                                }}
                                className="min-w-0 flex-1 truncate text-left text-xs font-medium text-white/75"
                              >
                                {preset?.label ?? section.presetId}
                              </button>
                              <button
                                type="button"
                                aria-label={`${section.hidden ? "Show" : "Hide"} ${preset?.label ?? section.presetId}`}
                                onClick={() => model.changeComposition(
                                  hideSection(model.composition, section.instanceId, !section.hidden),
                                  section.hidden ? "Show section" : "Hide section",
                                )}
                                className="h-8 w-9 rounded-md border border-white/10 text-xs text-white/60 active:bg-white/10"
                              >
                                {section.hidden ? "○" : "●"}
                              </button>
                            </div>
                            {!section.hidden && slots.length > 0 ? (
                              <div className="mt-1.5 flex gap-1 overflow-x-auto pb-1">
                                {slots.map((slotName) => (
                                  <button
                                    key={slotName}
                                    type="button"
                                    onClick={() => selectSlot(section.instanceId, slotName, `${section.kind} · ${slotName}`)}
                                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] ${
                                      slot?.instanceId === section.instanceId && slot.slot === slotName
                                        ? "bg-teal-400/15 text-teal-200 ring-1 ring-teal-300/30"
                                        : "bg-white/5 text-white/50"
                                    }`}
                                  >
                                    {slotName}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <h3 className="mb-2 text-xs font-semibold text-white/85">Add component</h3>
                    <div className="flex gap-2">
                      <select
                        value={addPresetId}
                        onChange={(event) => setAddPresetId(event.target.value)}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111827] px-2 text-xs text-white outline-none"
                      >
                        {SECTION_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>{preset.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addSelectedSection}
                        className="h-9 rounded-lg bg-teal-400 px-3 text-xs font-semibold text-slate-950 active:bg-teal-300"
                      >
                        Add
                      </button>
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <h3 className="mb-2 text-xs font-semibold text-white/85">Tools</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => dispatchStudioEvent(STUDIO_EVENTS.drawer, "code")} className="h-9 rounded-lg border border-white/10 text-xs text-white/70">Code</button>
                      <button type="button" onClick={() => dispatchStudioEvent(STUDIO_EVENTS.drawer, "history")} className="h-9 rounded-lg border border-white/10 text-xs text-white/70">History</button>
                      <button type="button" onClick={() => dispatchStudioEvent(STUDIO_EVENTS.drawer, "map")} className="h-9 rounded-lg border border-white/10 text-xs text-white/70">Map</button>
                      <button type="button" onClick={() => dispatchStudioEvent(STUDIO_EVENTS.drawer, "context360")} className="h-9 rounded-lg border border-white/10 text-xs text-white/70">360°</button>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-4">
                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <h3 className="mb-2 text-xs font-semibold text-white/85">Element</h3>
                    <select
                      value={slot ? slotKey(slot.instanceId, slot.slot) : ""}
                      onChange={(event) => {
                        const parsed = parseSlotKey(event.target.value);
                        if (!parsed) {
                          setSlot(null);
                          setDraft("");
                          return;
                        }
                        const section = model.composition.sections.find((item) => item.instanceId === parsed.instanceId);
                        selectSlot(parsed.instanceId, parsed.slot, `${section?.kind ?? "section"} · ${parsed.slot}`);
                      }}
                      className="h-10 w-full rounded-lg border border-white/10 bg-[#111827] px-2 text-xs text-white outline-none"
                    >
                      <option value="">— select a layer —</option>
                      {visibleSections.flatMap((section) => {
                        const preset = SECTION_PRESETS.find((item) => item.id === section.presetId);
                        return (preset?.slots ?? []).map((slotName) => (
                          <option key={`${section.instanceId}:${slotName}`} value={slotKey(section.instanceId, slotName)}>
                            {section.kind}/{slotName}
                          </option>
                        ));
                      })}
                    </select>

                    {slot ? (
                      <div className="mt-3">
                        <textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          rows={5}
                          className="w-full rounded-lg border border-white/10 bg-black/30 p-2 font-mono text-xs text-teal-50 outline-none focus:border-teal-400"
                        />
                        <button type="button" onClick={applyDraft} className="mt-2 h-9 w-full rounded-lg bg-teal-400 text-xs font-semibold text-slate-950 active:bg-teal-300">
                          Apply to canvas
                        </button>
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <h3 className="mb-2 text-xs font-semibold text-white/85">Layout</h3>
                    {selectedSection ? (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          disabled={selectedSectionIndex <= 0}
                          onClick={() => model.changeComposition(moveSection(model.composition, selectedSection.instanceId, selectedSectionIndex - 1), "Move section")}
                          className="h-9 rounded-lg border border-white/10 text-xs text-white/70 disabled:opacity-30"
                        >
                          ↑ Up
                        </button>
                        <button
                          type="button"
                          disabled={selectedSectionIndex >= model.composition.sections.length - 1}
                          onClick={() => model.changeComposition(moveSection(model.composition, selectedSection.instanceId, selectedSectionIndex + 1), "Move section")}
                          className="h-9 rounded-lg border border-white/10 text-xs text-white/70 disabled:opacity-30"
                        >
                          ↓ Down
                        </button>
                        <button
                          type="button"
                          onClick={() => model.changeComposition(duplicateSection(model.composition, selectedSection.instanceId), "Duplicate section")}
                          className="h-9 rounded-lg border border-white/10 text-xs text-white/70"
                        >
                          Copy
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-white/40">Select an element first.</p>
                    )}
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <h3 className="mb-2 text-xs font-semibold text-white/85">Palette</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_PALETTES.map((palette) => (
                        <button
                          key={palette.id}
                          type="button"
                          aria-label={`Palette ${palette.label}`}
                          onClick={() => model.setPaletteId(palette.id)}
                          className={`h-10 rounded-lg border transition ${model.paletteId === palette.id ? "border-teal-300 ring-1 ring-teal-300/50" : "border-white/15"}`}
                          style={{ background: `linear-gradient(135deg, ${palette.background} 55%, ${palette.accent} 55%)` }}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <h3 className="mb-2 text-xs font-semibold text-white/85">Responsive preview</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(["auto", "portrait", "landscape", "desktop"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => dispatchStudioEvent(STUDIO_EVENTS.viewport, mode)}
                          className="h-9 rounded-lg border border-white/10 text-xs capitalize text-white/70"
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <h3 className="mb-2 text-xs font-semibold text-white/85">Evidence</h3>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-white/55">
                      <div className="rounded-lg bg-white/5 p-2"><strong className="block text-sm text-white/80">{Object.keys(model.graph.nodes).length}</strong>nodes</div>
                      <div className="rounded-lg bg-white/5 p-2"><strong className="block text-sm text-white/80">{model.graph.edges.length}</strong>edges</div>
                      <div className="rounded-lg bg-white/5 p-2"><strong className="block text-sm text-white/80">{model.history.entries.length}</strong>changes</div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
