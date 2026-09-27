/**
 * Client-safe clone seeds.
 *
 * The studio is a client component, so it cannot read docs/research at runtime
 * (the server-side registry in clones-registry.ts can). This module is the
 * client mirror of that registry: one hand-written seed per committed clone,
 * kept in sync with docs/research/<host>/ and src/app/demos/<slug>/.
 *
 * When the landing bar opens the studio with ?clone=<host>:
 *   - known host  → the studio seeds itself with the REAL cloned content
 *                   (same text the /demos/<slug> preview shows), so editing
 *                   starts on the actual page, not a placeholder;
 *   - unknown host → an honest empty scaffold (no fake content) with the
 *                   /clone-website command to run in the user's agent.
 */
import { createPageComposition, type PageComposition } from "@/mirrorcraft/section-composer";
import {
  createSectionContentState,
  setSectionSlotValue,
  type SectionContentState,
} from "@/mirrorcraft/section-content";

export interface CloneSeed {
  /** Stable page id used for instance ids + recovery keying. */
  pageId: string;
  host: string;
  url: string;
  /** Demo route slug under src/app/demos, when a built clone exists. */
  demoSlug: string | null;
  /** Presets, in page order, that the clone is composed from. */
  presetIds: readonly string[];
  /** nodeId → value overrides (nodeId = `<instanceId>:slot:<slot>`). */
  overrides: Record<string, string>;
}

/** `<instanceId>:slot:<slot>` key for sequence-1 of a preset on a page. */
function nodeId(pageId: string, presetId: string, slotName: string): string {
  return `section:${pageId}:${presetId}:1:slot:${slotName}`;
}

/**
 * The only clone committed to the repo today (example.com). Its page is a
 * centered heading + two paragraphs + a "Learn more" link + a footer note, so
 * it maps onto a centered hero plus a column footer.
 */
export const EXAMPLE_SEED: CloneSeed = {
  pageId: "example",
  host: "example.com",
  url: "https://example.com",
  demoSlug: "example",
  presetIds: ["hero-centered", "footer-columns"],
  overrides: {
    [nodeId("example", "hero-centered", "eyebrow")]: "Cloned · example.com",
    [nodeId("example", "hero-centered", "heading")]: "Example Domain",
    [nodeId("example", "hero-centered", "copy")]:
      "This domain is for use in documentation examples without needing permission. Avoid use in operations.",
    [nodeId("example", "hero-centered", "actions")]: "Learn more",
    [nodeId("example", "footer-columns", "brand")]: "MirrorCraft",
    [nodeId("example", "footer-columns", "linkGroups")]: "Clone gallery",
    [nodeId("example", "footer-columns", "social")]: "",
    [nodeId("example", "footer-columns", "legal")]: "← back to clone gallery",
  },
};

/**
 * v0.app (Vercel) — light-theme marketing page. Maps onto navbar + centered
 * hero (the prompt box) + a features grid (template gallery) + CTA + footer.
 */
export const V0_SEED: CloneSeed = {
  pageId: "v0-app",
  host: "v0.app",
  url: "https://v0.app/",
  demoSlug: "v0-app",
  presetIds: ["navbar-simple", "hero-centered", "features-grid", "cta-split", "footer-columns"],
  overrides: {
    [nodeId("v0-app", "navbar-simple", "brand")]: "v0",
    [nodeId("v0-app", "navbar-simple", "links")]: "New Chat · Templates ▾",
    [nodeId("v0-app", "navbar-simple", "primaryAction")]: "Sign Up",
    [nodeId("v0-app", "hero-centered", "eyebrow")]: "v0 by Vercel",
    [nodeId("v0-app", "hero-centered", "heading")]: "What do you want to create?",
    [nodeId("v0-app", "hero-centered", "copy")]:
      "Ask v0 to build… · v0 Max — Contact Form · Image Editor · Mini Game · Finance Calculator",
    [nodeId("v0-app", "hero-centered", "actions")]: "Start with a template",
    [nodeId("v0-app", "hero-centered", "media")]: "",
    [nodeId("v0-app", "features-grid", "heading")]: "Start with a template",
    [nodeId("v0-app", "features-grid", "copy")]: "Apps and Games · Landing Pages · Components · Dashboards · Browse all",
    [nodeId("v0-app", "features-grid", "items")]:
      "Image Generation Playground (6.6K · 737) · Brillance SaaS Landing Page (14.5K · 2.1K) · 3D Gallery Photography Template (3.5K · 882) · Optimus — the AI platform to build and ship (9.3K · 1.5K)",
    [nodeId("v0-app", "cta-split", "heading")]: "Start building with v0",
    [nodeId("v0-app", "cta-split", "copy")]: "Go from idea to production in seconds with smart, secure infrastructure",
    [nodeId("v0-app", "cta-split", "actions")]: "Get Started",
    [nodeId("v0-app", "footer-columns", "brand")]: "v0",
    [nodeId("v0-app", "footer-columns", "linkGroups")]: "Templates · Enterprise · Pricing · iOS · Students · FAQ",
    [nodeId("v0-app", "footer-columns", "social")]: "",
    [nodeId("v0-app", "footer-columns", "legal")]: "← back to clone gallery",
  },
};

export const CLONE_SEEDS: CloneSeed[] = [EXAMPLE_SEED, V0_SEED];

/** Normalize a host/url-ish value and match it against the known seeds. */
export function seedForHost(value: string | null | undefined): CloneSeed | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  if (!cleaned) return null;
  return (
    CLONE_SEEDS.find((seed) => seed.host === cleaned || seed.pageId === cleaned) ?? null
  );
}

export interface SeededState {
  composition: PageComposition;
  content: SectionContentState;
}

/** Build a composition + content state seeded with the clone's real text. */
export function createSeededState(seed: CloneSeed): SeededState {
  const composition = createPageComposition(seed.pageId, seed.presetIds);
  let content = createSectionContentState(composition);
  for (const [key, value] of Object.entries(seed.overrides)) {
    const sep = key.indexOf(":slot:");
    if (sep < 0) continue;
    const instanceId = key.slice(0, sep);
    const slotName = key.slice(sep + ":slot:".length);
    try {
      content = setSectionSlotValue(content, instanceId, slotName, value);
    } catch {
      // Slot not present for this preset — skip.
    }
  }
  return { composition, content };
}

/**
 * Honest empty scaffold for a host with no committed clone yet: one hero that
 * names the target and tells the user how to populate it, plus a footer.
 * No fabricated content from the real site.
 */
export function createScaffoldState(host: string): SeededState {
  const pageId = host.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "new-clone";
  const composition = createPageComposition(pageId, ["hero-centered", "footer-columns"]);
  let content = createSectionContentState(composition);
  const overrides: Record<string, string> = {
    [nodeId(pageId, "hero-centered", "eyebrow")]: `New project · ${host}`,
    [nodeId(pageId, "hero-centered", "heading")]: host,
    [nodeId(pageId, "hero-centered", "copy")]:
      `This is an empty scaffold for ${host}. Run /clone-website https://${host} in your coding ` +
      "agent (Cursor, Claude Code, …) to extract the real page, then import its project " +
      "bundle under Project → Import Project. You can also start building the page here now.",
    [nodeId(pageId, "hero-centered", "actions")]: "Open clone gallery",
    [nodeId(pageId, "footer-columns", "brand")]: "MirrorCraft",
    [nodeId(pageId, "footer-columns", "linkGroups")]: "Clones · Studio · Docs",
    [nodeId(pageId, "footer-columns", "social")]: "",
    [nodeId(pageId, "footer-columns", "legal")]: `target: https://${host}`,
  };
  for (const [key, value] of Object.entries(overrides)) {
    const sep = key.indexOf(":slot:");
    if (sep < 0) continue;
    try {
      content = setSectionSlotValue(content, key.slice(0, sep), key.slice(sep + ":slot:".length), value);
    } catch {
      // skip
    }
  }
  return { composition, content };
}
