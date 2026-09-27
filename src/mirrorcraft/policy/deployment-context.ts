import type { DomainPlan } from "@/mirrorcraft/domain/types";
import type { IntegrationConnectionSummary } from "@/mirrorcraft/integrations/connections";
import {
  combineRestrictionDecisions,
  createRestrictionDecision,
  restrictionsFromDomainPlan,
  restrictionsFromIntegrationConnection,
  type DeploymentRestrictionProvider,
  type RestrictionDecision,
  type RestrictionInput,
} from "@/mirrorcraft/policy/restrictions";

export interface DeploymentContextRestrictionInput {
  provider?: DeploymentRestrictionProvider;
  connection?: IntegrationConnectionSummary;
  customDomain?: string;
  domainPlan?: DomainPlan;
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function connectionContextRestrictions(
  input: DeploymentContextRestrictionInput,
): RestrictionDecision {
  if (!input.provider) {
    if (!input.connection) return createRestrictionDecision([]);
    return createRestrictionDecision([
      {
        code: "integration-not-ready",
        scope: "integration",
        severity: "block",
        message:
          "Deployment connection context was supplied without matching provider execution metadata.",
        evidence: [`connection:${input.connection.id}`],
      },
    ]);
  }

  if (!input.connection) {
    return createRestrictionDecision([
      {
        code: "integration-not-ready",
        scope: "integration",
        severity: "block",
        message:
          `Deployment provider ${input.provider.providerId} requires validated connection context before execution.`,
        evidence: [`connection:${input.provider.connectionId}`],
      },
    ]);
  }

  const restrictions: RestrictionInput[] = [];
  if (
    input.connection.id !== input.provider.connectionId ||
    input.connection.providerId !== input.provider.providerId
  ) {
    restrictions.push({
      code: "integration-not-ready",
      scope: "integration",
      severity: "block",
      message:
        "Deployment connection context does not match the selected provider execution metadata.",
      evidence: [
        `provider:${input.provider.providerId}`,
        `connection:${input.provider.connectionId}`,
        `context-provider:${input.connection.providerId}`,
        `context-connection:${input.connection.id}`,
      ],
    });
  }

  return combineRestrictionDecisions(
    createRestrictionDecision(restrictions),
    restrictionsFromIntegrationConnection(input.connection),
  );
}

function domainContextRestrictions(
  input: DeploymentContextRestrictionInput,
): RestrictionDecision {
  const customDomain = input.customDomain
    ? normalizeHostname(input.customDomain)
    : undefined;

  if (!customDomain) {
    if (!input.domainPlan) return createRestrictionDecision([]);
    return createRestrictionDecision([
      {
        code: "domain-plan-blocked",
        scope: "deployment",
        severity: "block",
        message:
          "A domain plan was supplied without selecting a custom domain for this deployment.",
        evidence: [`hostname:${input.domainPlan.hostname}`],
      },
    ]);
  }

  if (!input.domainPlan) {
    return createRestrictionDecision([
      {
        code: "domain-plan-blocked",
        scope: "deployment",
        severity: "block",
        message:
          `Custom domain ${customDomain} requires a verified domain plan before deployment.`,
        evidence: [`hostname:${customDomain}`],
      },
    ]);
  }

  const planHostname = normalizeHostname(input.domainPlan.hostname);
  if (
    input.domainPlan.mode !== "custom-domain" ||
    planHostname !== customDomain
  ) {
    return createRestrictionDecision([
      {
        code: "domain-plan-blocked",
        scope: "deployment",
        severity: "block",
        message:
          "The verified domain plan does not match the selected custom domain.",
        evidence: [
          `requested:${customDomain}`,
          `planned:${planHostname}`,
          `mode:${input.domainPlan.mode}`,
        ],
      },
    ]);
  }

  return restrictionsFromDomainPlan(input.domainPlan);
}

export function restrictionsFromDeploymentContext(
  input: DeploymentContextRestrictionInput,
): RestrictionDecision {
  return combineRestrictionDecisions(
    connectionContextRestrictions(input),
    domainContextRestrictions(input),
  );
}
