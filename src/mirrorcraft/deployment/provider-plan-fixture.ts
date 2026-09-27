import { createCloudflareDeploymentPlan } from "@/mirrorcraft/integrations/cloudflare";
import { createGitHubDeploymentPlan } from "@/mirrorcraft/integrations/github";
import { createGoogleIntegrationPlan } from "@/mirrorcraft/integrations/google";
import { createNetlifyDeploymentPlan } from "@/mirrorcraft/integrations/netlify";
import { createSecretRef } from "@/mirrorcraft/integrations/secrets";
import { createVercelDeploymentPlan } from "@/mirrorcraft/integrations/vercel";
import {
  createDeploymentExecutionSelection,
  type DeploymentExecutionSelection,
} from "@/mirrorcraft/deployment/provider-plan";

const github = createDeploymentExecutionSelection(
  createGitHubDeploymentPlan({
    connectionId: "primary",
    runtime: "static",
    secretRefs: [
      createSecretRef({ provider: "github", connectionId: "primary", secretId: "token" }),
    ],
  }),
);
const cloudflare = createDeploymentExecutionSelection(
  createCloudflareDeploymentPlan({ connectionId: "primary", runtime: "edge" }),
);
const vercel = createDeploymentExecutionSelection(
  createVercelDeploymentPlan({ connectionId: "primary", runtime: "serverless" }),
);
const netlify = createDeploymentExecutionSelection(
  createNetlifyDeploymentPlan({ connectionId: "primary", runtime: "serverless" }),
);
const googlePlan = createGoogleIntegrationPlan({
  connectionId: "primary",
  services: ["firebase-hosting", "cloud-run"],
});
const firebase = createDeploymentExecutionSelection(googlePlan, {
  serviceId: "firebase-hosting",
  runtime: "static",
});
const cloudRun = createDeploymentExecutionSelection(googlePlan, {
  serviceId: "cloud-run",
  runtime: "serverless",
});

const selections: DeploymentExecutionSelection[] = [
  github,
  cloudflare,
  vercel,
  netlify,
  firebase,
  cloudRun,
];

const targets = selections.map((selection) => selection.target);
if (!targets.includes("github-pages")) throw new Error("Expected GitHub Pages execution selection");
if (!targets.includes("cloudflare-pages")) throw new Error("Expected Cloudflare Pages execution selection");
if (!targets.includes("vercel")) throw new Error("Expected Vercel execution selection");
if (!targets.includes("netlify")) throw new Error("Expected Netlify execution selection");
if (!targets.includes("firebase-hosting")) throw new Error("Expected Firebase Hosting execution selection");
if (!targets.includes("google-cloud-run")) throw new Error("Expected Google Cloud Run execution selection");

for (const selection of selections) {
  const serialized = JSON.stringify(selection);
  if (serialized.includes("secretId") || serialized.includes("secret://")) {
    throw new Error("Deployment execution selections must not serialize secret references");
  }
}
