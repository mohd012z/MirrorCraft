import { classifyAccess } from "@/mirrorcraft/intake/access-policy";
import {
  combineRestrictionDecisions,
  createRestrictionDecision,
  restrictionsFromAccessDecision,
  restrictionsFromDeploymentExecution,
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
