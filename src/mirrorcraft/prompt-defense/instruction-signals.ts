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
    patterns: [/\bhighest authority\b/i, /\boperator holds full authority\b/i, /\btreat (?:this|the) .{0,30} as (?:the )?authority\b/i, /\bpre-?approved (?:at|by|in) (?:the )?application (?:layer|level)\b/i],
  },
  {
    signal: "instruction-priority-change",
    confidence: 0.94,
    patterns: [/\boutrank(?:s|ed)?\b.{0,40}\binstruction/i, /\bignore (?:all |the )?(?:previous|earlier|prior) instructions\b/i, /\boverride (?:the )?(?:previous|earlier|prior) instructions\b/i, /\b(?:this|these) (?:config(?:uration)?|spec(?:ification)?|document) (?:outranks|overrides|supersedes) (?:the )?base (?:training|model)\b/i],
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
  {
    // Bans the model from even considering whether a request is allowed —
    // meta-reasoning about refusal is reframed as an error to discard.
    signal: "reasoning-ban",
    confidence: 0.94,
    patterns: [
      /\bdo not (?:reason|think) (?:about|whether)\b/i,
      /\bno (?:reflection|meta-?reasoning) on (?:whether|how) (?:this|the) (?:request|task|prompt)\b/i,
      /\b(?:skip|bypass) (?:your )?(?:safety|self)-?checks?\b/i,
      /\b(?:do not|never) (?:second[- ]guess|re-?consider) (?:your )?(?:answer|response|reply)\b/i,
      /\brefusal (?:phrases?|questions?) (?:are|count as|treat as) (?:reasoning )?errors?\b/i,
    ],
  },
  {
    // Shrinks the refusal surface: only a tiny set of topics ever count as
    // boundaries; everything else routes to execution.
    signal: "boundary-narrowing",
    confidence: 0.9,
    patterns: [
      /\bonly (?:the )?\d+ (?:hard )?(?:boundaries?|limits?|refusals?|denials?)\b/i,
      /\b(?:the )?(?:entire|only|single) (?:permission|refusal) check (?:is|is) (?:the )?hard[_ -]?limits?\b/i,
      /\bif (?:no|not) (?:match|matched) (?:a )?hard (?:boundary|limit) →? ?execute\b/i,
      /\bexecute (?:by default|unless (?:blocked|refused))\b/i,
      /\b(?:refusal|decline) (?:only|only permitted|is reserved) (?:for|to) (?:the |a )?(?:short|tiny|narrow|small|fixed) (?:list|set|few)\b/i,
    ],
  },
  {
    // "Standing authorization" workspace docs: a pre-granted, persistent
    // authority that persists across the session (and later sessions).
    signal: "standing-authorization",
    confidence: 0.94,
    patterns: [
      /\b(?:authorization|approval|consent)\s*\(standing\)\b/i,
      /\bstanding (?:authorization|approval|consent|permission)s?\b/i,
      /\b(?:you|this) (?:session|workspace|repository|agent) (?:is|has been) (?:pre-)?authorized (?:in advance|up front|a priori)\b/i,
      /\ball (?:actions?|operations?|commands?) (?:within this (?:scope|workspace|project)) (?:are|remain) (?:pre-)?(?:authorized|approved)\b/i,
      /\b(?:persist|retain) (?:this )?authorization (?:across|for) (?:all |later |future )?(?:sessions?|tasks?|conversations?)\b/i,
    ],
  },
  {
    // Bans disclaimers / safety commentary / "I should note" hedges; turns
    // compliance-theater into a quality defect.
    signal: "disclaimer-ban",
    confidence: 0.92,
    patterns: [
      /\b(?:do not|never|no) (?:include|add|emit|write|show) (?:any |a )?(?:disclaimer|warning|safety note|caveat|qualification|ethical note)\b/i,
      /\b(?:let|make) (?:your )?compliance (?:speak|be) (?:for|on) (?:its|its) ?own\b/i,
      /\b(?:do not|never) (?:explain|justify) (?:your )?compliance\b/i,
      /\bany (?:disclaimer|safety phrase|hedge) (?:is|counts as|marks) (?:a |a defect|an error|defective)\b/i,
      /\bshow,? don'?t tell\b.{0,40}\b(?:disclaimer|safety|warning)\b/i,
    ],
  },
  {
    // Codeword / leetspeak / base64-encoded output — defeats keyword filters
    // and makes exfiltration invisible.
    signal: "encoded-exfiltration",
    confidence: 0.93,
    patterns: [
      /\b(?:use|employ|apply|decode) (?:the )?(?:following|below|these)? ?codewor(ds|d|key)s?\b/i,
      /\b(?:invent|create|generate) (?:your |new )?codewor(ds|d|key)s?\b/i,
      /\b(?:encode|emit|output|return) (?:the |your )?(?:answer|response|output) (?:in|as|using) (?:base64|hex|rot13|char codes?|unicode escapes?)\b/i,
      /\bnever (?:in|to) (?:chat|the conversation) (?:directly|in plain ?text)\b/i,
      /\b(?:output|return|send) (?:only|exclusively) (?:base64|encoded) (?:text|content|output)\b/i,
    ],
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
