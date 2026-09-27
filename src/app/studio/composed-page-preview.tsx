"use client";

import {
  SECTION_PRESETS,
  type SectionPreset,
} from "@/mirrorcraft/design-library/advanced";
import type { PageComposition, SectionInstance } from "@/mirrorcraft/section-composer";

function findPreset(presetId: string): SectionPreset {
  const preset = SECTION_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown section preset: ${presetId}`);
  return preset;
}

function SectionPreview({ section }: { section: SectionInstance }) {
  const preset = findPreset(section.presetId);

  if (section.hidden) return null;

  const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-teal-600";
  const shellClass = "border-b border-slate-200 px-6 py-8 md:px-10";

  if (section.kind === "navbar") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className="flex items-center justify-between border-b border-slate-200 px-6 py-4 md:px-10">
        <div className="font-semibold">MirrorCraft</div>
        <div className="flex gap-4 text-sm text-slate-500"><span>Product</span><span>Docs</span><span>Pricing</span></div>
        <button type="button" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Start</button>
      </section>
    );
  }

  if (section.kind === "hero") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={`${shellClass} grid items-center gap-8 md:grid-cols-2`}>
        <div>
          <div className={labelClass}>{preset.label}</div>
          <h3 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Build a page from reusable sections.</h3>
          <p className="mt-4 max-w-xl text-slate-600">The section composer changes the same structure model used by the preview and Web360 projection.</p>
          <button type="button" className="mt-6 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Primary action</button>
        </div>
        <div className="aspect-[4/3] rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-100 to-slate-100" />
      </section>
    );
  }

  if (section.kind === "features" || section.kind === "cards" || section.kind === "pricing" || section.kind === "stats") {
    const count = section.kind === "stats" ? 4 : 3;
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        <div className={labelClass}>{preset.label}</div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {Array.from({ length: count }, (_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold">{preset.kind} {index + 1}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">Reusable content slot rendered from the active section preset.</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.kind === "faq") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        <div className={labelClass}>{preset.label}</div>
        <div className="mt-5 space-y-2">
          {["How does reconstruction work?", "Can sections be reordered?", "Is Web360 preserved?"].map((question) => (
            <div key={question} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium">{question}</div>
          ))}
        </div>
      </section>
    );
  }

  if (section.kind === "testimonial") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={shellClass}>
        <div className={labelClass}>{preset.label}</div>
        <blockquote className="mt-4 max-w-3xl text-2xl font-medium leading-relaxed text-slate-800">“Structured sections stay editable without losing their graph relationships.”</blockquote>
      </section>
    );
  }

  if (section.kind === "cta") {
    return (
      <section data-mirrorcraft-section={section.instanceId} className={`${shellClass} flex flex-col justify-between gap-4 bg-slate-950 text-white md:flex-row md:items-center`}>
        <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">{preset.label}</div><h3 className="mt-2 text-2xl font-bold">Ready to keep building?</h3></div>
        <button type="button" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950">Continue</button>
      </section>
    );
  }

  return (
    <footer data-mirrorcraft-section={section.instanceId} className="grid gap-6 px-6 py-8 text-sm text-slate-500 md:grid-cols-4 md:px-10">
      <div className="font-semibold text-slate-950">MirrorCraft</div><div>Product</div><div>Resources</div><div>Legal</div>
    </footer>
  );
}

export function ComposedPagePreview({ composition }: { composition: PageComposition }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111318] p-3 text-white">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Composed Preview</div><div className="mt-1 text-xs text-white/45">Live from PageComposition revision {composition.revision}</div></div>
        <div className="text-xs text-white/40">{composition.sections.filter((section) => !section.hidden).length} visible sections</div>
      </div>
      <div className="max-h-[760px] overflow-auto rounded-xl bg-slate-50 text-slate-950 shadow-2xl">
        {composition.sections.map((section) => <SectionPreview key={section.instanceId} section={section} />)}
      </div>
    </section>
  );
}
