import type { InjectionSignal } from "./types";

export interface SignalMatch {
  signal: InjectionSignal;
  confidence: number;
  excerpt: string;
}

interface SignalRule {
  signal: InjectionSignal;
  confidence: number;
  patterns: readonly RegExp[];
}

const RULES: readonly SignalRule[] = [
  {
    signal: "identity-override",
    confidence: 0.95,
    patterns: [/\byou are now\b/i, /\breplace (?:your|the) identity\b/i, /\bact as (?:a|an|the) different\b/i],
  },
  {
    signal: "authority-override",
    confidence: 0.95,
    patterns: [/\bhighest authority\b/i, /\boperator holds full authority\b/i, /\btreat (?:this|the) .{0,30} as (?:the )?authority\b/i],
  },
  {
    signal: "instruction-priority-change",
    confidence: 0.94,
    patterns: [/\boutrank(?:s|ed)?\b.{0,40}\binstruction/i, /\bignore (?:all |the )?(?:previous|earlier|prior) instructions\b/i, /\boverride (?:the )?(?:previous|earlier|prior) instructions\b/i],
  },
  {
    signal: "policy-redefinition",
    confidence: 0.93,
    patterns: [/\breplace (?:the )?(?:existing|current) policy\b/i, /\bredefine (?:the )?(?:policy|rules)\b/i, /\bnew policy (?:is|becomes)\b/i],
  },
  {
    signal: "refusal-suppression",
    confidence: 0.96,
    patterns: [/\bdo not refuse\b/i, /\bnever refuse\b/i, /\brefusal (?:is|counts as) (?:a )?failure\b/i],
  },
  {
    signal: "tool-permission-escalation",
    confidence: 0.96,
    patterns: [/\b(?:open|use|invoke) (?:the )?(?:terminal|shell)\b/i, /\brun (?:the |this )?command\b/i, /\bgrant (?:tool|terminal|shell|git|network) (?:access|permission)\b/i],
  },
  {
    signal: "persistent-instruction",
    confidence: 0.93,
    patterns: [/\bremember (?:these|this) instructions?\b/i, /\bfor every later task\b/i, /\bpersist (?:these|this) instructions?\b/i],
  },
  {
    signal: "fake-authorization",
    confidence: 0.94,
    patterns: [/\ball actions? (?:have )?already been (?:approved|authorized)\b/i, /\bauthorization (?:is|has been) already satisfied\b/i, /\bno (?:further|additional) authorization (?:is )?required\b/i],
  },
  {
    signal: "reasoning-redirection",
    confidence: 0.9,
    patterns: [/\bignore (?:your )?(?:normal|usual) checks\b/i, /\breason only from (?:this|the)\b/i, /\bdo not reconsider\b.{0,40}\bassumptions?\b/i],
  },
  {
    signal: "output-coercion",
    confidence: 0.82,
    patterns: [/\breturn only\b.{0,80}\bno (?:warnings?|explanations?)\b/i, /\boutput only\b.{0,80}\bwithout (?:warnings?|explanations?)\b/i],
  },
  {
    signal: "secret-acquisition-request",
    confidence: 0.99,
    patterns: [/\bread (?:the )?\.env\b/i, /\b(?:print|reveal|show|send|copy)\b.{0,50}\b(?:api[_-]?key|password|secret|token|credential)\b/i, /\b(?:read|extract)\b.{0,50}\b(?:credentials?|private key|access token)\b/i],
  },
  {
    signal: "environment-manipulation",
    confidence: 0.9,
    patterns: [/\bchange (?:the )?execution environment\b.{0,60}\brestrictions?\b/i, /\bdisable (?:the )?(?:sandbox|guardrails?|restrictions?)\b/i],
  },
] as const;

function excerptFor(content: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - 40);
  const end = Math.min(content.length, match.index + match[0].length + 80);
  return content.slice(start, end).trim();
}

export function extractInstructionSignals(content: string): SignalMatch[] {
  const matches: SignalMatch[] = [];
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (!match) continue;
      matches.push({
        signal: rule.signal,
        confidence: rule.confidence,
        excerpt: excerptFor(content, match),
      });
      break;
    }
  }
  return matches;
}
