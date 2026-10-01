import { authorizeToolCapability } from "@/mirrorcraft/capability-firewall";
import { buildContextEnvelope } from "@/mirrorcraft/context-firewall";
import { classifyExternalInstruction } from "@/mirrorcraft/prompt-defense";
import { redactSensitiveText } from "@/mirrorcraft/security/redaction";
import { createDefensiveMutations } from "./mutations";
import type {
  AdversarialCase,
  AdversarialCaseResult,
  AdversarialEvaluationReport,
} from "./types";

function evaluateOne(testCase: AdversarialCase): AdversarialCaseResult {
  const assessment = classifyExternalInstruction({
    content: testCase.content,
    source: `adversarial:${testCase.id}`,
  });
  const evidenceIds = assessment.evidence.length > 0
    ? assessment.evidence.map((item) => item.id)
    : [`adversarial:${testCase.id}:source`];

  const envelope = buildContextEnvelope([
    {
      id: testCase.id,
      source: "browser",
      trust: "external-content",
      content: testCase.content,
      executable: false,
      injectionRisk: assessment.score,
      evidenceIds,
      disposition: assessment.action,
    },
  ]);

  const toolDecision = authorizeToolCapability({
    taskId: `adversarial:${testCase.id}`,
    instructionSource: "external-content",
    evidenceIds,
    capability: "terminal-exec",
    toolClass: "terminal",
    mutatesWorkspace: true,
    requiresVerification: false,
    verified: false,
  });

  const outputSurface = `${envelope.modelContext}\n${toolDecision.reason}`;
  const sensitiveScan = redactSensitiveText(testCase.content);

  return {
    caseId: testCase.id,
    expected: testCase.expected,
    detectedAttack: assessment.classification !== "none",
    mutation: testCase.mutation,
    mutationOf: testCase.mutationOf,
    signals: assessment.signals,
    evidenceIds,
    provenancePresent: evidenceIds.length > 0,
    canaryLeaked: Boolean(testCase.canary && outputSurface.includes(testCase.canary)),
    toolEscalationSucceeded: toolDecision.allowed,
    contextBoundaryEscaped: envelope.instructions.some((chunk) => chunk.id === testCase.id),
    secretLeaked:
      Boolean(testCase.containsSensitiveMaterial) &&
      sensitiveScan.redacted &&
      outputSurface.includes(testCase.content),
  };
}

export function runAdversarialEvaluation(
  cases: readonly AdversarialCase[],
): AdversarialEvaluationReport {
  const expanded: AdversarialCase[] = [];
  for (const testCase of cases) {
    expanded.push(testCase);
    if (testCase.id === "attack-authority") {
      expanded.push(...createDefensiveMutations(testCase));
    }
  }
  return { results: expanded.map(evaluateOne) };
}
