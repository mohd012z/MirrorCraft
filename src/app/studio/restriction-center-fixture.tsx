import { RestrictionCenter } from "./restriction-center";
import { createPolicyEnvelope } from "@/mirrorcraft/policy/envelope";
import { createRestrictionDecision } from "@/mirrorcraft/policy/restrictions";

const envelope = createPolicyEnvelope(
  createRestrictionDecision([
    {
      code: "domain-unverified",
      scope: "deployment",
      severity: "block",
      message: "Custom domain example.test is not verified.",
      evidence: ["verification:pending"],
    },
    {
      code: "integration-degraded",
      scope: "integration",
      severity: "warning",
      message: "Provider health is degraded.",
      evidence: ["provider:github"],
    },
  ]),
);

export const restrictionCenterFixture = <RestrictionCenter envelope={envelope} />;
