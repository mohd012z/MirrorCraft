export type AlignmentSeverity = "info" | "warning" | "error";

export interface AlignmentRule {
  id: string;
  description: string;
  severity: AlignmentSeverity;
  appliesTo: RegExp;
  test: (content: string) => boolean;
}

export interface AlignmentFinding {
  ruleId: string;
  severity: AlignmentSeverity;
  file: string;
  message: string;
}

export interface AlignmentReport {
  checkedFiles: number;
  findings: AlignmentFinding[];
  aligned: boolean;
}

export const DEFAULT_ALIGNMENT_RULES: AlignmentRule[] = [
  {
    id: "no-any",
    description: "Avoid explicit TypeScript any in MirrorCraft engine code.",
    severity: "warning",
    appliesTo: /\.tsx?$/,
    test: (content) => !/\bany\b/.test(content),
  },
  {
    id: "named-exports",
    description: "Prefer named exports for engine modules.",
    severity: "info",
    appliesTo: /\.tsx?$/,
    test: (content) => !/export\s+default\s+/.test(content),
  },
  {
    id: "no-secret-literals",
    description: "Do not persist obvious secret-bearing assignments in source.",
    severity: "error",
    appliesTo: /\.(?:ts|tsx|js|jsx|json|ya?ml|toml)$/,
    test: (content) =>
      !/(?:api[_-]?key|token|password|secret)\s*[:=]\s*["'][^"']{12,}["']/i.test(content),
  },
];

export function checkAlignment(
  files: Array<{ path: string; content: string }>,
  rules: AlignmentRule[] = DEFAULT_ALIGNMENT_RULES,
): AlignmentReport {
  const findings: AlignmentFinding[] = [];

  for (const file of files) {
    for (const rule of rules) {
      if (!rule.appliesTo.test(file.path)) continue;
      if (rule.test(file.content)) continue;
      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        file: file.path,
        message: rule.description,
      });
    }
  }

  return {
    checkedFiles: files.length,
    findings,
    aligned: findings.every((finding) => finding.severity !== "error"),
  };
}
