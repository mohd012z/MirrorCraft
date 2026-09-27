import type { EditOperation } from "@/mirrorcraft/editing/types";
import { classifyAccess } from "@/mirrorcraft/intake/access-policy";
import type { IntegrationConnectionSummary } from "@/mirrorcraft/integrations/connections";
import {
  combineRestrictionDecisions,
  createRestrictionDecision,
  restrictionsFromAccessDecision,
  restrictionsFromDeploymentExecution,
  restrictionsFromDomainPlan,
  restrictionsFromEditOperation,
  restrictionsFromIntegrationConnection,
  restrictionsFromSerializedState,
  type RestrictionDecision,
} from "@/mirrorcraft/policy/restrictions";

const accessBlocked = restrictionsFromAccessDecision(
  classifyAccess({ hasCaptcha: true }),
);
if (accessBlocked.allowed) {
  throw new Error("Bot challenge must produce a blocking restriction");
}

const publicAccess = restrictionsFromAccessDecision(classifyAccess({}));
if (!publicAccess.allowed) {
  throw new Error("Public access should remain allowed");
}

const explicitBlock: RestrictionDecision = createRestrictionDecision([
  {
    code: "deployment-policy-blocked",
    scope: "deployment",
    severity: "block",
    message: "Fixture policy denied deployment.",
    evidence: ["fixture"],
  },
]);

const targetMismatch = restrictionsFromDeploymentExecution({
  target: "vercel",
  provider: {
    providerId: "github",
    connectionId: "primary",
    runtime: "static",
    executionMode: "runtime-connector",
    warnings: [],
  },
});
if (targetMismatch.allowed) {
  throw new Error("Provider/target mismatch must be blocked");
}

const combined = combineRestrictionDecisions(publicAccess, explicitBlock);
if (combined.allowed || combined.blockers.length !== 1) {
  throw new Error("Combined restriction decision must fail closed");
}

const accessEdit: EditOperation = {
  id: "access-edit",
  category: "access",
  parameterId: "access.state",
  target: { nodeId: "paywall", kind: "component" },
  before: "locked",
  after: "unlocked",
  viewport: { mode: "all" },
  reversible: true,
  verification: { level: "full", required: true },
};
if (
  restrictionsFromEditOperation({
    operation: accessEdit,
    authorizedProject: false,
  }).allowed
) {
  throw new Error("Access-state edits require an authorized project");
}

const expiredConnection: IntegrationConnectionSummary = {
  id: "github-primary",
  providerId: "github",
  authMode: "oauth",
  health: "expired",
  capabilities: ["source-control", "hosting"],
  hasSecretMaterial: true,
  secretCount: 1,
  createdAt: "2026-09-27T00:00:00.000Z",
};
if (restrictionsFromIntegrationConnection(expiredConnection).allowed) {
  throw new Error("Expired integration connection must block execution");
}

const unverifiedDomain = restrictionsFromDomainPlan({
  providerId: "cloudflare",
  mode: "custom-domain",
  hostname: "example.test",
  apex: "example.test",
  dnsRecords: [],
  ownershipVerified: false,
  verification: { status: "pending", evidence: [] },
  blockers: [],
  warnings: [],
});
if (unverifiedDomain.allowed) {
  throw new Error("Unverified custom domain must block publication");
}

const secretLeak = restrictionsFromSerializedState(
  "Authorization: Bearer fixture_restriction_secret_1234567890",
);
if (secretLeak.allowed) {
  throw new Error("Serialized secret material must produce a blocking restriction");
}
