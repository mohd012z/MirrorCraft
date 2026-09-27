export type GrepMode = "exact" | "regex" | "semantic" | "hybrid";

export interface GrepQuery {
  text: string;
  mode?: GrepMode;
  include?: string[];
  exclude?: string[];
  caseSensitive?: boolean;
  maxResults?: number;
}

export interface GrepMatch {
  path: string;
  line?: number;
  column?: number;
  excerpt: string;
  score: number;
  symbol?: string;
  nodeId?: string;
  reason: "exact" | "regex" | "semantic" | "reference" | "dependency";
}

export interface GrepIndexEntry {
  path: string;
  content: string;
  symbols?: string[];
  nodeIds?: string[];
  dependencies?: string[];
}

function normalize(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLowerCase();
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_$-]+/)
    .filter(Boolean);
}

function semanticScore(query: string, candidate: string): number {
  const q = new Set(tokenize(query));
  const c = new Set(tokenize(candidate));
  if (q.size === 0 || c.size === 0) return 0;
  let shared = 0;
  for (const token of q) if (c.has(token)) shared += 1;
  return shared / q.size;
}

export class GrepEngine {
  constructor(private readonly entries: GrepIndexEntry[]) {}

  search(query: GrepQuery): GrepMatch[] {
    const mode = query.mode ?? "hybrid";
    const caseSensitive = query.caseSensitive ?? false;
    const maxResults = query.maxResults ?? 100;
    const include = query.include ?? [];
    const exclude = query.exclude ?? [];
    const needle = normalize(query.text, caseSensitive);
    const matches: GrepMatch[] = [];

    let pattern: RegExp | undefined;
    if (mode === "regex" || mode === "hybrid") {
      try {
        pattern = new RegExp(query.text, caseSensitive ? "g" : "gi");
      } catch {
        pattern = undefined;
      }
    }

    for (const entry of this.entries) {
      if (include.length > 0 && !include.some((part) => entry.path.includes(part))) continue;
      if (exclude.some((part) => entry.path.includes(part))) continue;

      const lines = entry.content.split(/\r?\n/);
      lines.forEach((line, index) => {
        const haystack = normalize(line, caseSensitive);

        if ((mode === "exact" || mode === "hybrid") && haystack.includes(needle)) {
          matches.push({
            path: entry.path,
            line: index + 1,
            column: Math.max(1, haystack.indexOf(needle) + 1),
            excerpt: line.trim(),
            score: 1,
            reason: "exact",
          });
        }

        if (pattern && (mode === "regex" || mode === "hybrid")) {
          pattern.lastIndex = 0;
          if (pattern.test(line)) {
            matches.push({
              path: entry.path,
              line: index + 1,
              excerpt: line.trim(),
              score: 0.95,
              reason: "regex",
            });
          }
        }

        if (mode === "semantic" || mode === "hybrid") {
          const score = semanticScore(query.text, line);
          if (score >= 0.6) {
            matches.push({
              path: entry.path,
              line: index + 1,
              excerpt: line.trim(),
              score,
              reason: "semantic",
            });
          }
        }
      });

      for (const symbol of entry.symbols ?? []) {
        const symbolScore = semanticScore(query.text, symbol);
        if (symbolScore >= 0.7 || normalize(symbol, caseSensitive).includes(needle)) {
          matches.push({
            path: entry.path,
            excerpt: symbol,
            score: Math.max(0.8, symbolScore),
            symbol,
            reason: "reference",
          });
        }
      }

      for (const dependency of entry.dependencies ?? []) {
        if (normalize(dependency, caseSensitive).includes(needle)) {
          matches.push({
            path: entry.path,
            excerpt: dependency,
            score: 0.82,
            reason: "dependency",
          });
        }
      }
    }

    return matches
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path) || (a.line ?? 0) - (b.line ?? 0))
      .filter((match, index, all) =>
        index === all.findIndex((candidate) =>
          candidate.path === match.path &&
          candidate.line === match.line &&
          candidate.excerpt === match.excerpt &&
          candidate.reason === match.reason,
        ),
      )
      .slice(0, maxResults);
  }
}
