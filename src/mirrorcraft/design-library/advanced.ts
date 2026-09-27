export type SectionKind =
  | "navbar"
  | "hero"
  | "features"
  | "cards"
  | "stats"
  | "pricing"
  | "testimonial"
  | "faq"
  | "cta"
  | "footer";

export interface SectionPreset {
  id: string;
  kind: SectionKind;
  label: string;
  description: string;
  slots: string[];
  layoutClass: string;
}

export const SECTION_PRESETS: SectionPreset[] = [
  { id: "navbar-simple", kind: "navbar", label: "Simple Navbar", description: "Logo, links and one action", slots: ["brand", "links", "primaryAction"], layoutClass: "flex items-center justify-between" },
  { id: "navbar-centered", kind: "navbar", label: "Centered Navbar", description: "Centered navigation with split actions", slots: ["brand", "links", "actions"], layoutClass: "grid grid-cols-[1fr_auto_1fr] items-center" },
  { id: "hero-centered", kind: "hero", label: "Centered Hero", description: "Centered copy with strong call to action", slots: ["eyebrow", "heading", "copy", "actions", "media"], layoutClass: "mx-auto max-w-4xl text-center" },
  { id: "split-media", kind: "hero", label: "Split Media Hero", description: "Copy and media side by side", slots: ["heading", "copy", "actions", "media"], layoutClass: "grid items-center gap-10 md:grid-cols-2" },
  { id: "features-grid", kind: "features", label: "Feature Grid", description: "Reusable feature cards", slots: ["heading", "copy", "items"], layoutClass: "grid gap-5 md:grid-cols-3" },
  { id: "cards-masonry", kind: "cards", label: "Card Collection", description: "Flexible card collection", slots: ["heading", "items"], layoutClass: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" },
  { id: "stats-band", kind: "stats", label: "Stats Band", description: "Compact metrics strip", slots: ["items"], layoutClass: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4" },
  { id: "pricing-three", kind: "pricing", label: "Three Tier Pricing", description: "Three comparable plans", slots: ["heading", "copy", "plans", "billingToggle"], layoutClass: "grid gap-5 lg:grid-cols-3" },
  { id: "testimonial-feature", kind: "testimonial", label: "Featured Testimonial", description: "Large quote with supporting identity", slots: ["quote", "name", "role", "avatar"], layoutClass: "grid items-center gap-8 md:grid-cols-[0.8fr_1.2fr]" },
  { id: "faq-accordion", kind: "faq", label: "FAQ Accordion", description: "Question and answer list", slots: ["heading", "copy", "items"], layoutClass: "mx-auto max-w-3xl space-y-3" },
  { id: "cta-split", kind: "cta", label: "Split CTA", description: "Message with aligned action", slots: ["heading", "copy", "actions"], layoutClass: "flex flex-col justify-between gap-6 md:flex-row md:items-center" },
  { id: "footer-columns", kind: "footer", label: "Column Footer", description: "Brand, links and utility content", slots: ["brand", "linkGroups", "social", "legal"], layoutClass: "grid gap-8 md:grid-cols-[1.2fr_repeat(3,1fr)]" },
  { id: "hero-dashboard", kind: "hero", label: "Dashboard Hero", description: "Product copy with application preview", slots: ["heading", "copy", "actions", "dashboardPreview"], layoutClass: "grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]" },
  { id: "cta-banner", kind: "cta", label: "CTA Banner", description: "Compact full-width action banner", slots: ["heading", "primaryAction"], layoutClass: "flex flex-wrap items-center justify-between gap-4" },
];

export function findSectionPreset(kind: SectionKind, id: string): SectionPreset | undefined {
  return SECTION_PRESETS.find((preset) => preset.kind === kind && preset.id === id);
}

export const LINE_HEIGHT_PRESETS = [
  { id: "tight", label: "Tight", value: 1.05, className: "leading-[1.05]" },
  { id: "snug", label: "Snug", value: 1.2, className: "leading-tight" },
  { id: "normal", label: "Normal", value: 1.5, className: "leading-normal" },
  { id: "relaxed", label: "Relaxed", value: 1.7, className: "leading-relaxed" },
  { id: "loose", label: "Loose", value: 2, className: "leading-loose" },
] as const;

export const LETTER_SPACING_PRESETS = [
  { id: "tighter", label: "Tighter", className: "tracking-tighter" },
  { id: "tight", label: "Tight", className: "tracking-tight" },
  { id: "normal", label: "Normal", className: "tracking-normal" },
  { id: "wide", label: "Wide", className: "tracking-wide" },
  { id: "widest", label: "Widest", className: "tracking-widest" },
] as const;

export const TEXT_ALIGN_PRESETS = [
  { id: "left", label: "Left", className: "text-left" },
  { id: "center", label: "Center", className: "text-center" },
  { id: "right", label: "Right", className: "text-right" },
  { id: "justify", label: "Justify", className: "text-justify" },
] as const;

export const BUTTON_SIZE_PRESETS = [
  { id: "xs", label: "XS", className: "px-3 py-1.5 text-xs" },
  { id: "sm", label: "Small", className: "px-4 py-2 text-sm" },
  { id: "md", label: "Medium", className: "px-5 py-3 text-sm" },
  { id: "lg", label: "Large", className: "px-6 py-3.5 text-base" },
  { id: "xl", label: "XL", className: "px-8 py-4 text-lg" },
] as const;

export const BUTTON_SHADOW_PRESETS = [
  { id: "none", label: "None", className: "shadow-none" },
  { id: "sm", label: "Soft", className: "shadow-sm" },
  { id: "md", label: "Medium", className: "shadow-md" },
  { id: "lg", label: "Large", className: "shadow-lg" },
  { id: "xl", label: "Float", className: "shadow-xl" },
] as const;

export const ICON_POSITION_PRESETS = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "only", label: "Icon Only" },
] as const;

export const SPACING_PRESETS = [
  { id: "compact", label: "Compact", section: "py-8 md:py-12", gap: "gap-3" },
  { id: "dense", label: "Dense", section: "py-12 md:py-16", gap: "gap-4" },
  { id: "balanced", label: "Balanced", section: "py-16 md:py-20", gap: "gap-6" },
  { id: "airy", label: "Airy", section: "py-20 md:py-28", gap: "gap-8" },
  { id: "editorial", label: "Editorial", section: "py-24 md:py-36", gap: "gap-10" },
] as const;

export const COLOR_PALETTES = [
  { id: "slate", label: "Slate", background: "#ffffff", foreground: "#0f172a", accent: "#7c3aed", muted: "#64748b" },
  { id: "graphite", label: "Graphite", background: "#f8fafc", foreground: "#18181b", accent: "#27272a", muted: "#71717a" },
  { id: "ocean", label: "Ocean", background: "#f0f9ff", foreground: "#0c4a6e", accent: "#0284c7", muted: "#64748b" },
  { id: "forest", label: "Forest", background: "#f0fdf4", foreground: "#14532d", accent: "#16a34a", muted: "#64748b" },
  { id: "sunset", label: "Sunset", background: "#fff7ed", foreground: "#7c2d12", accent: "#ea580c", muted: "#78716c" },
  { id: "violet", label: "Violet", background: "#faf5ff", foreground: "#3b0764", accent: "#7c3aed", muted: "#6b7280" },
  { id: "rose", label: "Rose", background: "#fff1f2", foreground: "#881337", accent: "#e11d48", muted: "#78716c" },
  { id: "midnight", label: "Midnight", background: "#09090b", foreground: "#fafafa", accent: "#8b5cf6", muted: "#a1a1aa" },
] as const;

export const BACKGROUND_PRESETS = [
  { id: "plain", label: "Plain", className: "bg-white" },
  { id: "soft-grid", label: "Soft Grid", className: "bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:32px_32px]" },
  { id: "radial", label: "Radial Glow", className: "bg-[radial-gradient(circle_at_top,#ede9fe,transparent_45%)]" },
  { id: "dark", label: "Dark", className: "bg-slate-950 text-white" },
] as const;

export const MOTION_PRESETS = [
  { id: "none", label: "None", className: "" },
  { id: "soft", label: "Soft", className: "transition-all duration-200 ease-out" },
  { id: "smooth", label: "Smooth", className: "transition-all duration-300 ease-in-out" },
  { id: "springy", label: "Springy", className: "transition-transform duration-300 ease-out hover:-translate-y-0.5" },
] as const;
