import { composePageHtml, accentForPalette } from "@/mirrorcraft/html-export";
import { type PageComposition, type SectionInstance } from "@/mirrorcraft/section-composer";
import type { SectionContentState } from "@/mirrorcraft/section-content";

/**
 * Studio publish/compile — a real, evidence-producing step for the static
 * studio. The browser cannot push to a remote host (no auth/network), so
 * "publish" here means: compile the structured page model into a real
 * standalone static export, verify it, and expose the deployable artifact
 * bundle (index.html + manifest + deploy instructions) for download.
 *
 * This is deliberately honest: a successful compile is real (the HTML is
 * actually generated and checked), and the manifest records exactly what was
 * produced — no fake "deployed to Vercel" claims.
 */

export interface StudioExportCompile {
  ok: boolean;
  html: string;
  pageId: string;
  paletteId: string;
  accent: string;
  branch: string;
  totalSections: number;
  compiledSections: number;
  hiddenSections: number;
  issues: string[];
  bytes: number;
  /** Synchronous djb2 checksum (NOT sha256) of the generated HTML. */
  checksum: string;
  compiledAt: string;
}

export interface DeployFile {
  name: string;
  content: string;
  mime: string;
}

export interface DeployBundle {
  files: DeployFile[];
  manifestJson: string;
}

/* ---------- minimal ZIP writer (stored entries, no compression) ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) << 0);
  const dosDate =
    ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

/**
 * Build a real ZIP archive (stored/uncompressed entries) from named files.
 * Pure + deterministic enough for deploy artifacts; no dependencies.
 */
export function buildDeployZip(files: readonly DeployFile[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local file header signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // method: stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); // compressed size
    lv.setUint32(22, data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // central directory signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true); // local header offset
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central directory
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = offset + centralSize + end.length;
  const zip = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    zip.set(part, cursor);
    cursor += part.length;
  }
  return zip;
}

function djb2(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function visibleSections(composition: PageComposition): SectionInstance[] {
  return composition.sections.filter((section) => !section.hidden);
}

/**
 * Compile the current page model into a standalone static export and verify
 * it. Returns a result carrying real evidence (generated HTML, section counts,
 * and a list of issues when the compile does not pass).
 */
export function compileStudioExport(
  composition: PageComposition,
  content: SectionContentState,
  paletteId: string,
  branch = "main",
): StudioExportCompile {
  const issues: string[] = [];
  const accent = accentForPalette(paletteId);
  const totalSections = composition.sections.length;
  const compiledSections = visibleSections(composition).length;
  const hiddenSections = totalSections - compiledSections;

  if (!composition.pageId) issues.push("page has no id");
  if (compiledSections === 0) issues.push("no visible sections to compile");

  let html = "";
  try {
    html = composePageHtml(composition, content, accent);
  } catch (error) {
    issues.push(`HTML generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Verify the generated markup is a complete, non-empty document.
  if (html) {
    if (!/^<!doctype html>/i.test(html.trim())) issues.push("export missing <!doctype html>");
    if (!html.includes("</html>")) issues.push("export missing </html> closing tag");
    if (!html.includes("<body>")) issues.push("export missing <body>");
    const renderedSections = (html.match(/id="sec-/g) ?? []).length;
    if (renderedSections === 0) issues.push("no sections rendered in the export");
    else if (renderedSections < compiledSections) {
      issues.push(`only ${renderedSections}/${compiledSections} sections rendered`);
    }
  }

  const bytes = new TextEncoder().encode(html).length;
  return {
    ok: issues.length === 0 && html.length > 0,
    html,
    pageId: composition.pageId,
    paletteId,
    accent,
    branch,
    totalSections,
    compiledSections,
    hiddenSections,
    issues,
    bytes,
    checksum: djb2(html),
    compiledAt: new Date().toISOString(),
  };
}

/**
 * Build the deployable artifact bundle for a successful compile: the standalone
 * page, a machine-readable manifest, and plain-language deploy instructions.
 */
export function buildDeployBundle(compile: StudioExportCompile): DeployBundle {
  const manifest = {
    schemaVersion: 1,
    kind: "mirrorcraft-static-export",
    pageId: compile.pageId,
    branch: compile.branch,
    paletteId: compile.paletteId,
    accent: compile.accent,
    sections: { total: compile.totalSections, compiled: compile.compiledSections, hidden: compile.hiddenSections },
    htmlBytes: compile.bytes,
    htmlChecksum: compile.checksum,
    compiledAt: compile.compiledAt,
    deploy: "static — open index.html directly, or upload the folder to GitHub Pages / Netlify / Vercel / any static host",
  };
  const manifestJson = JSON.stringify(manifest, null, 2);

  const deployReadme = [
    `# ${compile.pageId} — MirrorCraft static export`,
    ``,
    `Compiled ${compile.compiledAt} from branch \`${compile.branch}\` (palette: ${compile.paletteId}).`,
    ``,
    `## What's in this export`,
    `- \`index.html\` — self-contained standalone page (${compile.compiledSections} section(s), ${compile.bytes.toLocaleString()} bytes, checksum ${compile.checksum})`,
    `- \`mirrorcraft.json\` — machine-readable manifest`,
    `- \`DEPLOY.md\` — this file`,
    ``,
    `## How to publish`,
    `1. **Fastest:** open \`index.html\` in a browser — it needs no build step or server.`,
    `2. **Static host:** upload this folder to GitHub Pages, Netlify, Vercel, Cloudflare Pages, or S3. No config required (single \`index.html\`).`,
    `3. **Into the MirrorCraft repo:** commit it under \`docs/research/<host>/\` + a \`/demos/<slug>\` route so it appears in the \`/clones\` gallery.`,
    ``,
    `> This export is a faithful static reconstruction. It is not a live deployment — the studio (a static GitHub Pages site) cannot push to a remote host. Take this artifact and host it.`,
  ].join("\n");

  return {
    files: [
      { name: "index.html", content: compile.html, mime: "text/html" },
      { name: "mirrorcraft.json", content: manifestJson, mime: "application/json" },
      { name: "DEPLOY.md", content: deployReadme, mime: "text/markdown" },
    ],
    manifestJson,
  };
}
