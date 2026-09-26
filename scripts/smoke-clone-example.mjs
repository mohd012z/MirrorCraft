#!/usr/bin/env node
/**
 * Smoke test: extract https://example.com via Playwright and write research artifacts.
 * Proves browser extraction works before a full /clone-website run.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs/research/example.com");
const shotDir = join(root, "docs/design-references/example.com");
const url = "https://example.com";

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, "components"), { recursive: true });
mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: "networkidle" });

await page.screenshot({ path: join(shotDir, "desktop.png"), fullPage: true });

const data = await page.evaluate(() => {
  const body = document.body;
  const h1 = document.querySelector("h1");
  const p = document.querySelector("p");
  const a = document.querySelector("a");
  const pick = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim(),
      href: el.getAttribute("href"),
      css: {
        color: s.color,
        backgroundColor: s.backgroundColor,
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        marginTop: s.marginTop,
        marginBottom: s.marginBottom,
        textAlign: s.textAlign,
        maxWidth: s.maxWidth,
        padding: s.padding,
      },
    };
  };
  const bodyStyle = getComputedStyle(body);
  return {
    title: document.title,
    body: {
      backgroundColor: bodyStyle.backgroundColor,
      color: bodyStyle.color,
      fontFamily: bodyStyle.fontFamily,
      margin: bodyStyle.margin,
      display: bodyStyle.display,
    },
    h1: pick(h1),
    p: pick(p),
    a: pick(a),
  };
});

await browser.close();

writeFileSync(join(outDir, "tokens.json"), JSON.stringify(data, null, 2));

const spec = `# example.com — Main content

**URL:** ${url}
**INTERACTION MODEL:** static (no scroll/hover-driven UI)

## Layout
- Centered block on white page
- Single \`h1\`, one \`p\`, one link

## Tokens (computed)
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

## Builder brief
Rebuild as a Next.js page at \`/demos/example\` matching computed styles above.
Use real copy from the live site. No inventing content.
`;

writeFileSync(join(outDir, "components/main.md"), spec);

console.log("✓ Smoke extraction complete");
console.log(`  tokens: docs/research/example.com/tokens.json`);
console.log(`  spec:   docs/research/example.com/components/main.md`);
console.log(`  shot:   docs/design-references/example.com/desktop.png`);
console.log(`  title:  ${data.title}`);
console.log(`  h1:     ${data.h1?.text}`);
