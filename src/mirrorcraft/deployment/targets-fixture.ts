import {
  DEPLOYMENT_TARGETS,
  hostingProviderToDeploymentTarget,
  isDeploymentTarget,
  type DeploymentTarget,
} from "@/mirrorcraft/deployment/targets";

const expected: DeploymentTarget[] = [
  "github-pages",
  "github-artifact",
  "cloudflare-pages",
  "vercel",
  "netlify",
  "firebase-hosting",
  "google-cloud-run",
  "node",
  "container",
  "static-host",
  "artifact",
  "local",
];

for (const target of expected) {
  if (!DEPLOYMENT_TARGETS.includes(target)) {
    throw new Error(`Missing canonical deployment target: ${target}`);
  }
  if (!isDeploymentTarget(target)) {
    throw new Error(`Expected canonical target to validate: ${target}`);
  }
}

if (isDeploymentTarget("supabase")) {
  throw new Error("Backend companions must not be accepted as publish targets");
}

if (hostingProviderToDeploymentTarget("github-pages", "static") !== "github-pages") {
  throw new Error("GitHub Pages should map to the canonical GitHub Pages target");
}
if (hostingProviderToDeploymentTarget("cloudflare-pages", "edge") !== "cloudflare-pages") {
  throw new Error("Cloudflare Pages should map to the canonical Cloudflare target");
}
if (hostingProviderToDeploymentTarget("netlify", "serverless") !== "netlify") {
  throw new Error("Netlify should map to the canonical Netlify target");
}
if (hostingProviderToDeploymentTarget("supabase", "serverless") !== null) {
  throw new Error("Supabase is a backend companion, not a deployment target");
}
