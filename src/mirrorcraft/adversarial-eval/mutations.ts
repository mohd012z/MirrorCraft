import type { AdversarialCase, AdversarialMutationName } from "./types";

const MUTATIONS: readonly [AdversarialMutationName, (content: string) => string][] = [
  ["case", (content) => content.toUpperCase()],
  ["whitespace", (content) => content.replaceAll(" ", "  ")],
  ["markdown-quote", (content) => `> ${content}`],
  ["html-wrapper", (content) => `<p>${content}</p>`],
  ["html-comment", (content) => `<!-- captured evidence -->${content}`],
  ["json-value", (content) => JSON.stringify({ captured: content })],
  ["svg-text", (content) => `<svg><text>${content}</text></svg>`],
  ["aria-attribute", (content) => `<div aria-label=${JSON.stringify(content)}>evidence</div>`],
  ["data-attribute", (content) => `<div data-captured=${JSON.stringify(content)}>evidence</div>`],
  ["nested-delimiter", (content) => `[[EXTERNAL_EVIDENCE_BEGIN]] ${content} [[EXTERNAL_EVIDENCE_END]]`],
] as const;

export function createDefensiveMutations(input: AdversarialCase): AdversarialCase[] {
  return MUTATIONS.map(([mutation, transform]) => ({
    ...input,
    id: `${input.id}:${mutation}`,
    content: transform(input.content),
    mutation,
    mutationOf: input.id,
  }));
}
