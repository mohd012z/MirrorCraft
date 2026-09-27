export * from "@/mirrorcraft/design-library/advanced";

export type TemplateId =
  | "saas"
  | "dashboard"
  | "portfolio"
  | "commerce"
  | "docs"
  | "editorial"
  | "agency"
  | "minimal";

export interface TemplatePreset {
  id: TemplateId;
  label: string;
  description: string;
  heading: string;
  copy: string;
  cta: string;
  surfaceClass: string;
  heroClass: string;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  { id: "saas", label: "SaaS", description: "Product-led hero", heading: "Build products faster.", copy: "A focused product landing layout with strong hierarchy and conversion-oriented actions.", cta: "Start building", surfaceClass: "bg-white", heroClass: "md:grid-cols-2" },
  { id: "dashboard", label: "Dashboard", description: "Dense application shell", heading: "Everything at a glance.", copy: "Compact information hierarchy for products, analytics, operations and internal tools.", cta: "Open dashboard", surfaceClass: "bg-slate-50", heroClass: "md:grid-cols-[1.2fr_0.8fr]" },
  { id: "portfolio", label: "Portfolio", description: "Visual-first presentation", heading: "Selected work, clearly presented.", copy: "A spacious portfolio direction for projects, case studies, creative work and personal brands.", cta: "View projects", surfaceClass: "bg-stone-50", heroClass: "md:grid-cols-2" },
  { id: "commerce", label: "Commerce", description: "Product and purchase focused", heading: "Designed to convert.", copy: "Commerce structure for products, collections, benefits and high-clarity purchase actions.", cta: "Shop collection", surfaceClass: "bg-orange-50", heroClass: "md:grid-cols-[0.9fr_1.1fr]" },
  { id: "docs", label: "Docs", description: "Documentation and knowledge", heading: "Find the answer quickly.", copy: "Documentation-oriented hierarchy for guides, APIs, references and technical knowledge bases.", cta: "Read the docs", surfaceClass: "bg-zinc-50", heroClass: "md:grid-cols-[1.15fr_0.85fr]" },
  { id: "editorial", label: "Editorial", description: "Content-led storytelling", heading: "Stories deserve breathing room.", copy: "Editorial composition for news, publications, long-form content and feature stories.", cta: "Read latest", surfaceClass: "bg-amber-50", heroClass: "md:grid-cols-[1.25fr_0.75fr]" },
  { id: "agency", label: "Agency", description: "Services and outcomes", heading: "Ideas into outcomes.", copy: "A bold services layout for agencies, consultancies and project-based businesses.", cta: "Start a project", surfaceClass: "bg-violet-50", heroClass: "md:grid-cols-2" },
  { id: "minimal", label: "Minimal", description: "Reduced visual noise", heading: "Less interface. More message.", copy: "A restrained layout with simple hierarchy, generous whitespace and minimal decoration.", cta: "Explore", surfaceClass: "bg-white", heroClass: "md:grid-cols-[1.3fr_0.7fr]" },
];

export interface FontPreset {
  id: string;
  label: string;
  family: string;
  className: string;
}

export const FONT_PRESETS: FontPreset[] = [
  { id: "sans", label: "Modern Sans", family: "ui-sans-serif, system-ui, sans-serif", className: "font-sans" },
  { id: "serif", label: "Editorial Serif", family: "Georgia, Cambria, serif", className: "font-serif" },
  { id: "mono", label: "Technical Mono", family: "ui-monospace, SFMono-Regular, monospace", className: "font-mono" },
  { id: "humanist", label: "Humanist", family: "Trebuchet MS, ui-sans-serif, sans-serif", className: "font-sans" },
  { id: "geometric", label: "Geometric", family: "Arial, Helvetica, ui-sans-serif, sans-serif", className: "font-sans" },
  { id: "classic", label: "Classic", family: "Times New Roman, Times, serif", className: "font-serif" },
];

export const FONT_SIZE_PRESETS = [
  { id: "xs", label: "XS", px: 24, className: "text-2xl md:text-3xl" },
  { id: "sm", label: "S", px: 32, className: "text-3xl md:text-4xl" },
  { id: "md", label: "M", px: 40, className: "text-4xl md:text-5xl" },
  { id: "lg", label: "L", px: 48, className: "text-5xl md:text-6xl" },
  { id: "xl", label: "XL", px: 60, className: "text-6xl md:text-7xl" },
] as const;

export const FONT_WEIGHT_PRESETS = [
  { id: "regular", label: "Regular", className: "font-normal" },
  { id: "medium", label: "Medium", className: "font-medium" },
  { id: "semibold", label: "Semibold", className: "font-semibold" },
  { id: "bold", label: "Bold", className: "font-bold" },
  { id: "black", label: "Black", className: "font-black" },
] as const;

export type ButtonStyleId = "solid" | "outline" | "soft" | "pill" | "glass" | "gradient" | "minimal";

export interface ButtonStylePreset {
  id: ButtonStyleId;
  label: string;
  className: string;
}

export const BUTTON_STYLE_PRESETS: ButtonStylePreset[] = [
  { id: "solid", label: "Solid", className: "rounded-lg bg-slate-950 px-5 py-3 text-white shadow-sm" },
  { id: "outline", label: "Outline", className: "rounded-lg border border-slate-300 bg-transparent px-5 py-3 text-slate-950" },
  { id: "soft", label: "Soft", className: "rounded-xl bg-slate-100 px-5 py-3 text-slate-950" },
  { id: "pill", label: "Pill", className: "rounded-full bg-slate-950 px-6 py-3 text-white shadow-md" },
  { id: "glass", label: "Glass", className: "rounded-xl border border-white/40 bg-white/50 px-5 py-3 text-slate-950 shadow-lg backdrop-blur" },
  { id: "gradient", label: "Gradient", className: "rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-3 text-white shadow-lg" },
  { id: "minimal", label: "Minimal", className: "rounded-md px-1 py-2 text-slate-950 underline decoration-slate-300 underline-offset-4" },
];

export interface IconPreset {
  id: string;
  label: string;
  glyph: string;
}

export const ICON_PRESETS: IconPreset[] = [
  { id: "none", label: "None", glyph: "" },
  { id: "arrow-right", label: "Arrow Right", glyph: "→" },
  { id: "arrow-up-right", label: "Arrow Up Right", glyph: "↗" },
  { id: "chevron", label: "Chevron", glyph: "›" },
  { id: "plus", label: "Plus", glyph: "+" },
  { id: "spark", label: "Spark", glyph: "✦" },
  { id: "star", label: "Star", glyph: "★" },
  { id: "check", label: "Check", glyph: "✓" },
  { id: "play", label: "Play", glyph: "▶" },
  { id: "bolt", label: "Bolt", glyph: "⚡" },
  { id: "search", label: "Search", glyph: "⌕" },
  { id: "external", label: "External", glyph: "↗" },
];

export const RADIUS_PRESETS = [
  { id: "square", label: "Square", className: "rounded-none" },
  { id: "small", label: "Small", className: "rounded-md" },
  { id: "medium", label: "Medium", className: "rounded-xl" },
  { id: "large", label: "Large", className: "rounded-2xl" },
  { id: "pill", label: "Pill", className: "rounded-full" },
] as const;

export const GRADIENT_PRESETS = [
  { id: "none", label: "None", className: "" },
  { id: "violet", label: "Violet", className: "bg-gradient-to-br from-violet-100 via-white to-indigo-100" },
  { id: "sunset", label: "Sunset", className: "bg-gradient-to-br from-orange-100 via-rose-50 to-violet-100" },
  { id: "ocean", label: "Ocean", className: "bg-gradient-to-br from-cyan-100 via-blue-50 to-indigo-100" },
  { id: "forest", label: "Forest", className: "bg-gradient-to-br from-emerald-100 via-lime-50 to-white" },
  { id: "graphite", label: "Graphite", className: "bg-gradient-to-br from-slate-100 via-zinc-50 to-white" },
] as const;
