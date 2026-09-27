/**
 * Build-time registry of cloned sites.
 *
 * Scans docs/research/<host>/ (extraction artifacts) and src/app/demos/
 * (built clone routes) at build time so the site can list real clones
 * without a backend — compatible with the GitHub Pages static export.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface CloneEntry {
  host: string;
  url: string;
  specFiles: number;
  tokenKeys: number;
  /** Slug under src/app/demos when a built clone route exists, else null. */
  demoSlug: string | null;
}

function readDirNames(path: string): string[] {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export function listClones(): CloneEntry[] {
  const root = join(process.cwd(), "docs", "research");
  const hosts = readDirNames(root);
  const demos = readDirNames(join(process.cwd(), "src", "app", "demos"));

  return hosts
    .map((host) => {
      const dir = join(root, host);
      const specFiles = readDirNames(join(dir, "components")).filter((f) =>
        f.endsWith(".md"),
      ).length;

      let tokenKeys = 0;
      let url = `https://${host}`;
      const tokensPath = join(dir, "tokens.json");
      if (existsSync(tokensPath)) {
        try {
          const tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
          tokenKeys = Object.keys(tokens).length;
          if (typeof tokens.url === "string") url = tokens.url;
        } catch {
          // Malformed tokens.json — keep the host-derived URL.
        }
      }

      const candidates = [
        host.replace(/\.[^.]+$/, "").toLowerCase(),
        host.toLowerCase().replace(/\./g, "-"),
      ];
      const demoSlug = demos.find((slug) => candidates.includes(slug)) ?? null;

      return { host, url, specFiles, tokenKeys, demoSlug };
    })
    .sort((a, b) => a.host.localeCompare(b.host));
}
