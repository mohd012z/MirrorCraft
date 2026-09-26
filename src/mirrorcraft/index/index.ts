export type IndexKind =
  | "page"
  | "component"
  | "style"
  | "asset"
  | "route"
  | "interaction"
  | "content"
  | "metadata"
  | "network"
  | "relationship";

export interface IntelligenceDocument {
  id: string;
  kind: IndexKind;
  title: string;
  text: string;
  routeId?: string;
  componentId?: string;
  sourcePath?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IntelligenceHit extends IntelligenceDocument {
  score: number;
  matchedTerms: string[];
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_./:-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export class IntelligenceIndex {
  private documents = new Map<string, IntelligenceDocument>();
  private inverted = new Map<string, Set<string>>();

  add(document: IntelligenceDocument): void {
    this.remove(document.id);
    this.documents.set(document.id, document);
    const tokens = new Set(
      tokenize([document.title, document.text, ...(document.tags ?? [])].join(" ")),
    );
    for (const token of tokens) {
      const ids = this.inverted.get(token) ?? new Set<string>();
      ids.add(document.id);
      this.inverted.set(token, ids);
    }
  }

  remove(id: string): void {
    if (!this.documents.has(id)) return;
    this.documents.delete(id);
    for (const [token, ids] of this.inverted) {
      ids.delete(id);
      if (ids.size === 0) this.inverted.delete(token);
    }
  }

  search(query: string, limit = 20): IntelligenceHit[] {
    const terms = [...new Set(tokenize(query))];
    if (terms.length === 0) return [];

    const scores = new Map<string, { score: number; matched: Set<string> }>();
    for (const term of terms) {
      for (const [token, ids] of this.inverted) {
        const exact = token === term;
        const partial = !exact && (token.includes(term) || term.includes(token));
        if (!exact && !partial) continue;
        const contribution = exact ? 3 : 1;
        for (const id of ids) {
          const state = scores.get(id) ?? { score: 0, matched: new Set<string>() };
          state.score += contribution;
          state.matched.add(term);
          scores.set(id, state);
        }
      }
    }

    return [...scores.entries()]
      .map(([id, state]) => ({
        ...this.documents.get(id)!,
        score: state.score + state.matched.size / terms.length,
        matchedTerms: [...state.matched],
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  byKind(kind: IndexKind): IntelligenceDocument[] {
    return [...this.documents.values()].filter((document) => document.kind === kind);
  }

  toJSON(): IntelligenceDocument[] {
    return [...this.documents.values()];
  }
}
