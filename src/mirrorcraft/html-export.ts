import {
  COLOR_PALETTES,
  SECTION_PRESETS,
  type SectionPreset,
} from "@/mirrorcraft/design-library/advanced";
import {
  getSectionSlotValue,
  type SectionContentState,
} from "@/mirrorcraft/section-content";
import type { PageComposition, SectionInstance } from "@/mirrorcraft/section-composer";

export interface ExportedHtml {
  html: string;
  pageId: string;
}

function requirePreset(presetId: string): SectionPreset {
  const preset = SECTION_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown section preset: ${presetId}`);
  return preset;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Treat a slot value that looks like an image URL as an image, else text. */
function isImageUrl(value: string): boolean {
  return /^(https?:)?\/\/\S+\.(png|jpe?g|webp|gif|svg)(\?\S*)?$/i.test(value.trim());
}

function renderSlot(
  content: SectionContentState,
  section: SectionInstance,
  slot: string,
): string {
  const value = (getSectionSlotValue(content, section.instanceId, slot) ?? "").trim();
  if (!value) return "";
  if (isImageUrl(value)) {
    return `<img src="${escapeHtml(value)}" alt="${escapeHtml(slot)}" style="width:100%;border-radius:12px;object-fit:cover" />`;
  }
  return escapeHtml(value);
}

function renderSection(
  content: SectionContentState,
  section: SectionInstance,
  accent: string,
): string {
  const preset = requirePreset(section.presetId);
  const s = (slot: string) => renderSlot(content, section, slot);
  const id = `sec-${section.kind}-${section.instanceId}`;

  switch (section.kind) {
    case "navbar":
      return `<nav id="${id}" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 40px;border-bottom:1px solid #e2e8f0">
  <div style="font-weight:600">${s("brand")}</div>
  <div style="font-size:14px;color:#64748b">${s("links")}</div>
  <a href="#" style="background:#0f172a;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none">${s("primaryAction")}</a>
</nav>`;

    case "hero": {
      const mediaSlot = preset.slots.includes("dashboardPreview") ? "dashboardPreview" : "media";
      const media = preset.slots.includes(mediaSlot) ? s(mediaSlot) : "";
      return `<section id="${id}" style="display:grid;gap:40px;grid-template-columns:1fr 1fr;align-items:center;padding:64px 40px;border-bottom:1px solid #e2e8f0">
  <div>
    ${preset.slots.includes("eyebrow") ? `<div style="font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${accent}">${s("eyebrow")}</div>` : ""}
    <h1 style="margin:12px 0 0;font-size:48px;font-weight:700;letter-spacing:-.02em">${s("heading")}</h1>
    <p style="margin:16px 0 0;max-width:40rem;color:#475569">${s("copy")}</p>
    <a href="#" style="display:inline-block;margin-top:24px;background:${accent};color:#fff;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none">${s("actions")}</a>
  </div>
  ${media ? `<div>${media}</div>` : ""}
</section>`;
    }

    case "features":
    case "cards":
    case "stats": {
      const items = s("items").split("·").map((x) => x.trim()).filter(Boolean);
      const cards = items
        .map(
          (item) =>
            `<div style="border:1px solid #e2e8f0;background:#fff;border-radius:16px;padding:24px;font-weight:500;box-shadow:0 1px 2px rgba(0,0,0,.05)">${escapeHtml(item)}</div>`,
        )
        .join("\n    ");
      return `<section id="${id}" style="padding:64px 40px;border-bottom:1px solid #e2e8f0">
  ${preset.slots.includes("heading") ? `<div style="font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${accent}">${s("heading")}</div>` : ""}
  ${preset.slots.includes("copy") ? `<p style="margin:8px 0 0;color:#64748b">${s("copy")}</p>` : ""}
  <div style="display:grid;gap:20px;grid-template-columns:repeat(3,1fr);margin-top:24px">${cards}</div>
</section>`;
    }

    case "pricing": {
      const plans = s("plans").split("·").map((x) => x.trim()).filter(Boolean);
      const tiers = plans
        .map(
          (plan) =>
            `<div style="border:1px solid #e2e8f0;background:#fff;border-radius:16px;padding:24px;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.05)">${escapeHtml(plan)}</div>`,
        )
        .join("\n    ");
      return `<section id="${id}" style="padding:64px 40px;border-bottom:1px solid #e2e8f0">
  <div style="font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${accent}">${s("heading")}</div>
  <p style="margin:8px 0 0;color:#64748b">${s("copy")}</p>
  ${preset.slots.includes("billingToggle") ? `<span style="display:inline-block;margin-top:16px;border:1px solid #e2e8f0;background:#fff;border-radius:999px;padding:4px 12px;font-size:12px">${s("billingToggle")}</span>` : ""}
  <div style="display:grid;gap:20px;grid-template-columns:repeat(3,1fr);margin-top:24px">${tiers}</div>
</section>`;
    }

    case "faq": {
      const items = s("items").split("·").map((x) => x.trim()).filter(Boolean);
      const rows = items
        .map(
          (item) =>
            `<div style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:16px;font-weight:500">${escapeHtml(item)}</div>`,
        )
        .join("\n  ");
      return `<section id="${id}" style="padding:64px 40px;border-bottom:1px solid #e2e8f0;max-width:48rem">
  <div style="font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${accent}">${s("heading")}</div>
  <p style="margin:8px 0 0;color:#64748b">${s("copy")}</p>
  <div style="display:flex;flex-direction:column;gap:12px;margin-top:24px">${rows}</div>
</section>`;
    }

    case "testimonial":
      return `<section id="${id}" style="padding:64px 40px;border-bottom:1px solid #e2e8f0">
  <blockquote style="margin:0;font-size:24px;line-height:1.5;color:#1e293b">“${s("quote")}”</blockquote>
  <div style="display:flex;align-items:center;gap:8px;margin-top:16px;color:#64748b;font-size:14px">
    ${preset.slots.includes("avatar") ? s("avatar") : ""}
    <span><strong style="color:#1e293b">${s("name")}</strong> · ${s("role")}</span>
  </div>
</section>`;

    case "cta":
      return `<section id="${id}" style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;background:#0f172a;color:#fff;padding:64px 40px">
  <div>
    <h2 style="margin:0;font-size:32px;font-weight:700">${s("heading")}</h2>
    ${preset.slots.includes("copy") ? `<p style="margin:8px 0 0;color:rgba(255,255,255,.6)">${s("copy")}</p>` : ""}
  </div>
  <a href="#" style="background:${accent};color:#fff;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none">${s("primaryAction") || s("actions")}</a>
</section>`;

    default: {
      const groups = s("linkGroups").split("·").map((x) => x.trim()).filter(Boolean);
      const cols = groups
        .map(
          (g) =>
            `<div><div style="font-weight:600;color:#0f172a">${escapeHtml(g.split(" ")[0])}</div><div style="margin-top:8px;color:#64748b;font-size:13px">${escapeHtml(g)}</div></div>`,
        )
        .join("\n  ");
      return `<footer id="${id}" style="display:grid;gap:24px;grid-template-columns:repeat(4,1fr);padding:40px;color:#64748b">
  <div style="font-weight:600;color:#0f172a">${s("brand")}</div>
  ${cols}
  <div style="grid-column:1/-1;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:13px">
    <span>${s("social")}</span><span>${s("legal")}</span>
  </div>
</footer>`;
    }
  }
}

const BASE_CSS = `
    *,*::before,*::after{box-sizing:border-box}
    html,body{margin:0;padding:0}
    body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#0f172a;background:#f8fafc;-webkit-font-smoothing:antialiased}
    img{max-width:100%}
    a:focus,button:focus{outline:2px solid ${"/*accent*/"};outline-offset:2px}
  `;

export function composePageHtml(
  composition: PageComposition,
  content: SectionContentState,
  accent = "#0d9488",
): string {
  const body = composition.sections
    .filter((section) => !section.hidden)
    .map((section) => renderSection(content, section, accent))
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(composition.pageId)} — MirrorCraft</title>
<style>${BASE_CSS.replace("/*accent*/", accent)}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function accentForPalette(paletteId: string): string {
  return COLOR_PALETTES.find((item) => item.id === paletteId)?.accent ?? "#0d9488";
}
