"use client";

import { useMemo, useRef, useState } from "react";

import {
  BUTTON_SHADOW_PRESETS,
  BUTTON_SIZE_PRESETS,
  BUTTON_STYLE_PRESETS,
  COLOR_PALETTES,
  FONT_PRESETS,
  FONT_SIZE_PRESETS,
  FONT_WEIGHT_PRESETS,
  GRADIENT_PRESETS,
  ICON_POSITION_PRESETS,
  ICON_PRESETS,
  LETTER_SPACING_PRESETS,
  LINE_HEIGHT_PRESETS,
  RADIUS_PRESETS,
  SECTION_PRESETS,
  SPACING_PRESETS,
  TEMPLATE_PRESETS,
  TEXT_ALIGN_PRESETS,
  type ButtonStyleId,
  type TemplateId,
} from "@/mirrorcraft/design-library";
import {
  buildPreviewActions,
  type PreviewAction,
  type PreviewActionId,
} from "@/mirrorcraft/editing/preview-actions";
import {
  commitInlineEditSession,
  createCanvasSelection,
  createInlineEditSession,
  resolveToolbarAnchor,
  updateInlineEditSession,
  type CanvasElementDescriptor,
  type CanvasSelection,
  type InlineEditSession,
} from "@/mirrorcraft/editing/canvas-bridge";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";

const GRAPH: WebStructureGraph = {
  projectId: "mirrorcraft-studio-demo",
  nodes: {
    hero: { id: "hero", kind: "container", label: "Hero", sourcePath: "src/app/studio/preview-canvas.tsx", metadata: { role: "section" } },
    "hero-title": { id: "hero-title", kind: "content", label: "Hero title", sourcePath: "src/app/studio/preview-canvas.tsx", metadata: { role: "text" } },
    "hero-copy": { id: "hero-copy", kind: "content", label: "Hero copy", sourcePath: "src/app/studio/preview-canvas.tsx", metadata: { role: "text" } },
    "hero-cta": { id: "hero-cta", kind: "child", label: "Hero CTA", sourcePath: "src/app/studio/preview-canvas.tsx", metadata: { role: "button" } },
    "hero-image": { id: "hero-image", kind: "asset", label: "Hero image", sourcePath: "src/app/studio/preview-canvas.tsx", metadata: { role: "image" } },
  },
  edges: [
    { from: "hero", to: "hero-title", kind: "contains" },
    { from: "hero", to: "hero-copy", kind: "contains" },
    { from: "hero", to: "hero-cta", kind: "contains" },
    { from: "hero", to: "hero-image", kind: "contains" },
  ],
};

type EditableValues = Record<string, string>;

type DesignState = {
  templateId: TemplateId;
  heroVariantId: string;
  fontId: string;
  fontSizeId: string;
  fontWeightId: string;
  lineHeightId: string;
  letterSpacingId: string;
  textAlignId: string;
  buttonStyleId: ButtonStyleId;
  buttonSizeId: string;
  buttonShadowId: string;
  iconId: string;
  iconPositionId: string;
  radiusId: string;
  gradientId: string;
  spacingId: string;
  paletteId: string;
};

const INITIAL_VALUES: EditableValues = {
  "hero-title": "Reconstruct. Edit. Publish.",
  "hero-copy": "Select anything in the preview and edit it without losing source traceability.",
  "hero-cta": "Open workspace",
  "hero-cta:url": "/studio",
  "hero-image": "https://placehold.co/960x640/png?text=MirrorCraft+Preview",
};

const INITIAL_DESIGN: DesignState = {
  templateId: "saas",
  heroVariantId: "split-media",
  fontId: "sans",
  fontSizeId: "lg",
  fontWeightId: "bold",
  lineHeightId: "snug",
  letterSpacingId: "tight",
  textAlignId: "left",
  buttonStyleId: "solid",
  buttonSizeId: "md",
  buttonShadowId: "sm",
  iconId: "arrow-right",
  iconPositionId: "right",
  radiusId: "large",
  gradientId: "none",
  spacingId: "balanced",
  paletteId: "slate",
};

function descriptorFromElement(element: HTMLElement, host: HTMLElement): CanvasElementDescriptor {
  const rect = element.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();

  return {
    nodeId: element.dataset.mirrorcraftNode,
    tagName: element.tagName.toLowerCase(),
    text: element.textContent ?? undefined,
    href: element instanceof HTMLAnchorElement ? element.getAttribute("href") ?? undefined : undefined,
    attributes: { "data-mirrorcraft-node": element.dataset.mirrorcraftNode },
    rect: { x: rect.left - hostRect.left, y: rect.top - hostRect.top, width: rect.width, height: rect.height },
    viewport: { width: host.clientWidth, height: host.clientHeight },
  };
}

function findPreset<T extends { id: string }>(items: readonly T[], id: string): T {
  return items.find((item) => item.id === id) ?? items[0];
}

export function PreviewCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<EditableValues>(INITIAL_VALUES);
  const [design, setDesign] = useState<DesignState>(INITIAL_DESIGN);
  const [selection, setSelection] = useState<CanvasSelection | null>(null);
  const [editor, setEditor] = useState<InlineEditSession | null>(null);
  const [activeAction, setActiveAction] = useState<PreviewActionId | null>(null);
  const [status, setStatus] = useState("Ready");

  const template = findPreset(TEMPLATE_PRESETS, design.templateId);
  const heroVariant = findPreset(SECTION_PRESETS.filter((item) => item.kind === "hero"), design.heroVariantId);
  const font = findPreset(FONT_PRESETS, design.fontId);
  const fontSize = findPreset(FONT_SIZE_PRESETS, design.fontSizeId);
  const fontWeight = findPreset(FONT_WEIGHT_PRESETS, design.fontWeightId);
  const lineHeight = findPreset(LINE_HEIGHT_PRESETS, design.lineHeightId);
  const letterSpacing = findPreset(LETTER_SPACING_PRESETS, design.letterSpacingId);
  const textAlign = findPreset(TEXT_ALIGN_PRESETS, design.textAlignId);
  const buttonStyle = findPreset(BUTTON_STYLE_PRESETS, design.buttonStyleId);
  const buttonSize = findPreset(BUTTON_SIZE_PRESETS, design.buttonSizeId);
  const buttonShadow = findPreset(BUTTON_SHADOW_PRESETS, design.buttonShadowId);
  const icon = findPreset(ICON_PRESETS, design.iconId);
  const iconPosition = findPreset(ICON_POSITION_PRESETS, design.iconPositionId);
  const radius = findPreset(RADIUS_PRESETS, design.radiusId);
  const gradient = findPreset(GRADIENT_PRESETS, design.gradientId);
  const spacing = findPreset(SPACING_PRESETS, design.spacingId);
  const palette = findPreset(COLOR_PALETTES, design.paletteId);

  const toolbarAnchor = useMemo(() => {
    if (!selection) return null;
    return resolveToolbarAnchor(selection.rect, selection.descriptor.viewport);
  }, [selection]);

  function applyTemplate(templateId: TemplateId) {
    const nextTemplate = findPreset(TEMPLATE_PRESETS, templateId);
    setDesign((current) => ({ ...current, templateId }));
    setValues((current) => ({ ...current, "hero-title": nextTemplate.heading, "hero-copy": nextTemplate.copy, "hero-cta": nextTemplate.cta }));
    setSelection(null);
    setEditor(null);
    setStatus(`Template applied: ${nextTemplate.label}`);
  }

  function selectElement(element: HTMLElement) {
    const host = hostRef.current;
    if (!host) return;
    const descriptor = descriptorFromElement(element, host);
    const next = createCanvasSelection(GRAPH, descriptor);
    if (!next) return;
    setSelection(next);
    setEditor(null);
    setActiveAction(null);
    setStatus(`Selected ${next.nodeId}`);
  }

  function onCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-mirrorcraft-node]");
    if (!target) return;
    event.preventDefault();
    selectElement(target);
  }

  function beginAction(action: PreviewAction) {
    if (!selection) return;
    setActiveAction(action.id);
    const nodeId = selection.nodeId;
    let initialValue = values[nodeId] ?? "";
    if (action.id === "edit-url") initialValue = values[`${nodeId}:url`] ?? "";
    if (action.id === "ask-ai") initialValue = "";

    if (action.id === "view-360") {
      setStatus(`360: ${nodeId} has ${selection.actions.length} contextual action(s)`);
      return;
    }
    if (action.id === "open-code") {
      setStatus(selection.sourcePath ? `Code: ${selection.sourcePath}` : "No source path");
      return;
    }
    if (action.id === "edit-style") {
      setStatus("Use the Design Library controls above the canvas");
      return;
    }

    const kind = action.id === "edit-text" ? "text" : action.id === "edit-url" ? "url" : action.id === "edit-image" ? "image" : action.id === "edit-icon" ? "icon" : "prompt";
    setEditor(createInlineEditSession(selection, kind, initialValue));
  }

  function commitEditor() {
    if (!editor || !selection) return;
    const committed = commitInlineEditSession(editor);
    const nodeId = selection.nodeId;

    if (committed.kind === "url") {
      setValues((current) => ({ ...current, [`${nodeId}:url`]: committed.value }));
    } else if (committed.kind === "prompt") {
      setStatus(`AI edit queued for ${nodeId}: ${committed.value || "empty prompt"}`);
    } else {
      setValues((current) => ({ ...current, [nodeId]: committed.value }));
    }

    setEditor(null);
    setStatus(`${committed.kind} edit committed`);
  }

  const ctaIcon = icon.glyph ? <span aria-hidden>{icon.glyph}</span> : null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-[#111318] p-3 text-white shadow-xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Design Library</div>
            <div className="mt-1 text-xs text-white/45">Template · sections · typography · buttons · icons · palette · spacing</div>
          </div>
          <div className="text-xs text-emerald-300">Live · {SECTION_PRESETS.length} section presets</div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <ControlSelect label="Template" value={design.templateId} options={TEMPLATE_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(value) => applyTemplate(value as TemplateId)} />
          <ControlSelect label="Hero layout" value={design.heroVariantId} options={SECTION_PRESETS.filter((item) => item.kind === "hero").map((item) => ({ value: item.id, label: item.label }))} onChange={(heroVariantId) => setDesign((current) => ({ ...current, heroVariantId }))} />
          <ControlSelect label="Font" value={design.fontId} options={FONT_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(fontId) => setDesign((current) => ({ ...current, fontId }))} />
          <ControlSelect label="Heading size" value={design.fontSizeId} options={FONT_SIZE_PRESETS.map((item) => ({ value: item.id, label: `${item.label} · ${item.px}px` }))} onChange={(fontSizeId) => setDesign((current) => ({ ...current, fontSizeId }))} />
          <ControlSelect label="Weight" value={design.fontWeightId} options={FONT_WEIGHT_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(fontWeightId) => setDesign((current) => ({ ...current, fontWeightId }))} />
          <ControlSelect label="Line height" value={design.lineHeightId} options={LINE_HEIGHT_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(lineHeightId) => setDesign((current) => ({ ...current, lineHeightId }))} />
          <ControlSelect label="Letter spacing" value={design.letterSpacingId} options={LETTER_SPACING_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(letterSpacingId) => setDesign((current) => ({ ...current, letterSpacingId }))} />
          <ControlSelect label="Text align" value={design.textAlignId} options={TEXT_ALIGN_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(textAlignId) => setDesign((current) => ({ ...current, textAlignId }))} />
          <ControlSelect label="Button style" value={design.buttonStyleId} options={BUTTON_STYLE_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(buttonStyleId) => setDesign((current) => ({ ...current, buttonStyleId: buttonStyleId as ButtonStyleId }))} />
          <ControlSelect label="Button size" value={design.buttonSizeId} options={BUTTON_SIZE_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(buttonSizeId) => setDesign((current) => ({ ...current, buttonSizeId }))} />
          <ControlSelect label="Button shadow" value={design.buttonShadowId} options={BUTTON_SHADOW_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(buttonShadowId) => setDesign((current) => ({ ...current, buttonShadowId }))} />
          <ControlSelect label="Icon" value={design.iconId} options={ICON_PRESETS.map((item) => ({ value: item.id, label: `${item.glyph ? `${item.glyph} ` : ""}${item.label}` }))} onChange={(iconId) => setDesign((current) => ({ ...current, iconId }))} />
          <ControlSelect label="Icon position" value={design.iconPositionId} options={ICON_POSITION_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(iconPositionId) => setDesign((current) => ({ ...current, iconPositionId }))} />
          <ControlSelect label="Shape" value={design.radiusId} options={RADIUS_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(radiusId) => setDesign((current) => ({ ...current, radiusId }))} />
          <ControlSelect label="Gradient" value={design.gradientId} options={GRADIENT_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(gradientId) => setDesign((current) => ({ ...current, gradientId }))} />
          <ControlSelect label="Spacing" value={design.spacingId} options={SPACING_PRESETS.map((item) => ({ value: item.id, label: item.label }))} onChange={(spacingId) => setDesign((current) => ({ ...current, spacingId }))} />
          <ControlSelect label="Palette" value={design.paletteId} options={COLOR_PALETTES.map((item) => ({ value: item.id, label: item.label }))} onChange={(paletteId) => setDesign((current) => ({ ...current, paletteId }))} />
        </div>
      </div>

      <div className="grid min-h-[720px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-white/10 bg-[#111318] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-xs text-white/70">
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-400" />Direct Edit Preview</div>
          <div className="flex gap-2"><span className="rounded-md bg-white/5 px-2 py-1">390</span><span className="rounded-md bg-white/10 px-2 py-1 text-white">1440</span><span className="rounded-md bg-white/5 px-2 py-1">Responsive</span></div>
        </div>

        <div className="relative overflow-auto bg-[#eceff3] p-5 sm:p-8">
          <div
            ref={hostRef}
            onClick={onCanvasClick}
            className={`relative mx-auto min-h-[560px] max-w-5xl overflow-hidden shadow-xl ${template.surfaceClass} ${gradient.className} ${radius.className}`}
            style={{ fontFamily: font.family, backgroundColor: palette.background, color: palette.foreground }}
          >
            <section data-mirrorcraft-node="hero" className={`min-h-[560px] p-8 md:p-14 ${spacing.section} ${heroVariant.layoutClass}`}>
              <div className={textAlign.className}>
                <div className="mb-5 inline-flex rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur">{template.label} · {heroVariant.label}</div>
                <h1 data-mirrorcraft-node="hero-title" className={`${fontSize.className} ${fontWeight.className} ${lineHeight.className} ${letterSpacing.className}`}>
                  {values["hero-title"]}
                </h1>
                <p data-mirrorcraft-node="hero-copy" className="mt-5 max-w-xl text-base leading-7 md:text-lg" style={{ color: palette.muted }}>
                  {values["hero-copy"]}
                </p>
                <a
                  data-mirrorcraft-node="hero-cta"
                  href={values["hero-cta:url"]}
                  className={`mt-8 inline-flex items-center justify-center gap-2 font-semibold transition hover:-translate-y-0.5 ${buttonStyle.className} ${buttonSize.className} ${buttonShadow.className}`}
                  style={buttonStyle.id === "solid" ? { backgroundColor: palette.accent } : undefined}
                >
                  {iconPosition.id === "left" ? ctaIcon : null}
                  {iconPosition.id !== "only" ? <span>{values["hero-cta"]}</span> : null}
                  {iconPosition.id === "right" || iconPosition.id === "only" ? ctaIcon : null}
                </a>
              </div>
              <div
                data-mirrorcraft-node="hero-image"
                role="img"
                aria-label="MirrorCraft preview"
                className={`aspect-[3/2] w-full border border-slate-200 bg-cover bg-center shadow-sm ${radius.className}`}
                style={{ backgroundImage: `url(${values["hero-image"]})` }}
              />
            </section>

            {selection ? (
              <>
                <div className="pointer-events-none absolute z-40 rounded border-2 border-violet-500 bg-violet-500/5" style={{ left: selection.rect.x, top: selection.rect.y, width: selection.rect.width, height: selection.rect.height }} />
                {toolbarAnchor ? (
                  <div className="absolute z-50 flex max-w-[calc(100%-16px)] flex-wrap gap-1 rounded-lg border border-slate-700 bg-slate-950 p-1.5 text-xs text-white shadow-xl" style={{ left: toolbarAnchor.x, top: toolbarAnchor.y }}>
                    {buildPreviewActions(GRAPH, selection.descriptor).map((action) => (
                      <button key={action.id} type="button" onClick={(event) => { event.stopPropagation(); beginAction(action); }} className="rounded-md px-2.5 py-1.5 hover:bg-white/10">{action.label}</button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#0b0d11] p-3">
          {editor ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="min-w-16 text-xs font-semibold uppercase tracking-wide text-violet-300">{editor.kind}</span>
              <input autoFocus value={editor.value} onChange={(event) => setEditor(updateInlineEditSession(editor, event.target.value))} onKeyDown={(event) => { if (event.key === "Enter") commitEditor(); if (event.key === "Escape") setEditor(null); }} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400" placeholder={activeAction === "ask-ai" ? "Describe the change while preserving bindings..." : "Edit value"} />
              <button type="button" onClick={commitEditor} className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white">Apply</button>
              <button type="button" onClick={() => setEditor(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 text-xs text-white/60"><span>{status}</span><span>Click any tagged element to edit</span></div>
          )}
        </div>
      </div>
    </div>
  );
}

function ControlSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full cursor-pointer bg-transparent text-sm text-white outline-none">
        {options.map((option) => <option key={option.value} value={option.value} className="bg-slate-950 text-white">{option.label}</option>)}
      </select>
    </label>
  );
}
