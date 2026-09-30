#!/usr/bin/env node

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import dns from "node:dns/promises";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const targetArg = args.find((arg) => !arg.startsWith("--"));
const deep = args.includes("--deep");
const maxPagesArg = args.find((arg) => arg.startsWith("--max-pages="));
const maxPages = Math.max(1, Math.min(50, Number(maxPagesArg?.split("=")[1] ?? (deep ? 10 : 1))));

if (!targetArg) {
  console.error("Usage: npm run clone:url -- https://example.com [--deep] [--max-pages=10]");
  process.exit(1);
}

function normalizeUrl(value) {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http/https URLs are supported.');
  url.hash = '';
  return url;
}

function isPrivateIpv4(ip) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isPrivateIpv6(ip) {
  const normalized = ip.toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
}

async function assertPublicTarget(url) {
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) throw new Error('Localhost targets are blocked.');

  if (net.isIP(host)) {
    if ((net.isIPv4(host) && isPrivateIpv4(host)) || (net.isIPv6(host) && isPrivateIpv6(host))) {
      throw new Error('Private-network targets are blocked.');
    }
    return;
  }

  const records = await dns.lookup(host, { all: true });
  if (!records.length) throw new Error('Target hostname did not resolve.');
  for (const record of records) {
    if ((record.family === 4 && isPrivateIpv4(record.address)) || (record.family === 6 && isPrivateIpv6(record.address))) {
      throw new Error('Target resolves to a private/local network address and is blocked.');
    }
  }
}

function slug(value) {
  return value
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9.-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 100) || 'site';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sameOriginLink(raw, base) {
  try {
    const url = new URL(raw, base);
    url.hash = '';
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.origin !== new URL(base).origin) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function extractPage(page, requestedUrl) {
  const response = await page.goto(requestedUrl, { waitUntil: 'networkidle', timeout: 45000 });
  const status = response?.status() ?? 0;

  const challenge = await page.evaluate(() => {
    const text = document.body?.innerText?.toLowerCase() ?? '';
    const hasPasswordField = Boolean(document.querySelector('input[type="password"]'));
    const hasCaptcha = Boolean(
      document.querySelector('iframe[src*="captcha" i], [class*="captcha" i], [id*="captcha" i]')
    ) || /verify you are human|checking your browser|captcha/.test(text);
    const hasSubscriptionCopy = /subscribe to continue|subscription required|become a member to continue|paywall/.test(text);
    return { hasPasswordField, hasCaptcha, hasSubscriptionCopy };
  });

  if (status === 401 || status === 403) throw new Error(`Capture blocked by HTTP ${status}.`);
  if (challenge.hasCaptcha) throw new Error('Bot challenge detected; MirrorCraft will not bypass anti-bot controls.');
  if (challenge.hasPasswordField) throw new Error('Authentication gate detected; this runtime only captures publicly rendered pages.');
  if (challenge.hasSubscriptionCopy) throw new Error('Subscription-gated content detected; capture stopped.');

  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 350));
    window.scrollTo(0, 0);
  });

  const data = await page.evaluate(() => {
    const absolute = (value) => {
      try { return value ? new URL(value, document.baseURI).href : null; } catch { return null; }
    };

    const selectorFor = (element) => {
      if (!(element instanceof Element)) return '';
      if (element.id) return `#${CSS.escape(element.id)}`;
      const parts = [];
      let current = element;
      while (current && current.nodeType === 1 && parts.length < 5) {
        let part = current.tagName.toLowerCase();
        if (current.classList.length) part += `.${[...current.classList].slice(0, 2).map((name) => CSS.escape(name)).join('.')}`;
        const parent = current.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter((child) => child.tagName === current.tagName);
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
        parts.unshift(part);
        current = parent;
      }
      return parts.join(' > ');
    };

    const nodes = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .slice(0, 5000)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          selector: selectorFor(el),
          tag: el.tagName.toLowerCase(),
          text: (el.children.length === 0 ? el.textContent : '')?.trim().slice(0, 500) || undefined,
          role: el.getAttribute('role') || undefined,
          ariaLabel: el.getAttribute('aria-label') || undefined,
          box: {
            x: Math.round(rect.x + window.scrollX),
            y: Math.round(rect.y + window.scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          style: {
            display: style.display,
            position: style.position,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            color: style.color,
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            margin: style.margin,
            padding: style.padding,
            gap: style.gap,
            flexDirection: style.flexDirection,
            gridTemplateColumns: style.gridTemplateColumns,
          },
        };
      });

    const assets = [...document.querySelectorAll('img, source, video, audio, link[rel="stylesheet"], script[src]')]
      .map((el) => {
        const raw = el.getAttribute('src') || el.getAttribute('href');
        return absolute(raw);
      })
      .filter(Boolean);

    const cssUrls = [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean);
    const links = [...document.querySelectorAll('a[href]')].map((a) => absolute(a.getAttribute('href'))).filter(Boolean);

    const meta = {};
    for (const tag of document.querySelectorAll('meta[name], meta[property]')) {
      const key = tag.getAttribute('name') || tag.getAttribute('property');
      if (key) meta[key] = tag.getAttribute('content') || '';
    }

    return {
      finalUrl: location.href,
      title: document.title,
      lang: document.documentElement.lang || null,
      html: document.documentElement.outerHTML,
      bodyText: document.body?.innerText?.slice(0, 200000) ?? '',
      assets: [...new Set([...assets, ...cssUrls])],
      links: [...new Set(links)],
      meta,
      nodes,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      documentSize: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    };
  });

  return { status, ...data };
}

async function run() {
  const target = normalizeUrl(targetArg);
  await assertPublicTarget(target);

  const projectSlug = slug(target.host + target.pathname);
  const outputDir = path.resolve('mirrorcraft-output', projectSlug);
  const pagesDir = path.join(outputDir, 'pages');
  const shotsDir = path.join(outputDir, 'screenshots');
  await mkdir(pagesDir, { recursive: true });
  await mkdir(shotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const queue = [target.href];
  const visited = new Set();
  const captures = [];

  try {
    while (queue.length && captures.length < maxPages) {
      const next = queue.shift();
      if (!next || visited.has(next)) continue;
      visited.add(next);

      console.log(`[MirrorCraft] capture ${captures.length + 1}/${maxPages}: ${next}`);
      const captured = await extractPage(page, next);
      const index = captures.length;
      const baseName = index === 0 ? 'index' : `page-${index + 1}`;
      const screenshotPath = path.join(shotsDir, `${baseName}.png`);
      const htmlPath = path.join(pagesDir, `${baseName}.html`);

      await page.screenshot({ path: screenshotPath, fullPage: true });
      await writeFile(htmlPath, captured.html, 'utf8');

      const routeLinks = captured.links
        .map((raw) => sameOriginLink(raw, captured.finalUrl))
        .filter(Boolean)
        .filter((url) => !/\.(?:png|jpe?g|gif|webp|svg|pdf|zip|mp4|mp3|woff2?|ttf)(?:\?|$)/i.test(url));

      if (deep) {
        for (const link of routeLinks) {
          if (!visited.has(link) && !queue.includes(link) && queue.length + captures.length < maxPages * 4) queue.push(link);
        }
      }

      captures.push({
        ...captured,
        html: undefined,
        screenshot: path.relative(outputDir, screenshotPath).replaceAll('\\', '/'),
        savedHtml: path.relative(outputDir, htmlPath).replaceAll('\\', '/'),
        hash: sha256(captured.html),
      });
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: target.href,
    mode: deep ? 'deep' : 'single-page',
    pagesCaptured: captures.length,
    pages: captures,
  };

  await writeFile(path.join(outputDir, 'mirrorcraft.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const summary = {
    project: projectSlug,
    outputDir,
    pagesCaptured: captures.length,
    assetsDiscovered: new Set(captures.flatMap((item) => item.assets)).size,
    nodesIndexed: captures.reduce((sum, item) => sum + item.nodes.length, 0),
  };

  console.log('\n[MirrorCraft] capture complete');
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error(`\n[MirrorCraft] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
