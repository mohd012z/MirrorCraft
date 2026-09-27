import {
  createPolicyEnvelope,
  type RestrictionResolutionKind,
} from "@/mirrorcraft/policy/envelope";
import { createRestrictionDecision } from "@/mirrorcraft/policy/restrictions";

const accessBlock = createRestrictionDecision([
  {
    code: "access-capture-blocked",
    scope: "access",
    severity: "block",
    message: "Authentication required.",
    evidence: ["auth-required"],
  },
]);
const domainBlock = createRestrictionDecision([
  {
    code: "domain-unverified",
    scope: "deployment",
    severity: "block",
    message: "Domain not verified.",
    evidence: ["verification:pending"],
  },
]);
const degraded = createRestrictionDecision([
  {
    code: "integration-degraded",
    scope: "integration",
    severity: "warning",
    message: "Connection degraded.",
  },
]);

const envelope = createPolicyEnvelope(accessBlock, domainBlock, degraded);
if (envelope.allowed) throw new Error("Policy envelope must fail closed");
if (envelope.byScope.access.length !== 1) {
  throw new Error("Expected access restriction grouping");
}
if (envelope.byScope.deployment.length !== 1) {
  throw new Error("Expected deployment restriction grouping");
}
if (envelope.warnings.length !== 1 || envelope.blockers.length !== 2) {
  throw new Error("Expected blocker/warning summary");
}

const resolutionKinds = new Set<RestrictionResolutionKind>(
  envelope.resolutions.map((resolution) => resolution.kind),
);
if (!resolutionKinds.has("provide-authorized-access")) {
  throw new Error("Access restriction should explain authorized-access resolution");
}
if (!resolutionKinds.has("verify-domain")) {
  throw new Error("Domain restriction should explain verification resolution");
}
if (!envelope.resolutions.every((resolution) => resolution.bypass === false)) {
  throw new Error("Restriction resolutions must never expose bypass actions");
}
