import type { IntegrationRuntime } from "@/mirrorcraft/integrations/types";

export const DEPLOYMENT_TARGETS = [
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
] as const;

export type DeploymentTarget = (typeof DEPLOYMENT_TARGETS)[number];

const DEPLOYMENT_TARGET_SET = new Set<string>(DEPLOYMENT_TARGETS);

export function isDeploymentTarget(value: string): value is DeploymentTarget {
  return DEPLOYMENT_TARGET_SET.has(value);
}

export function hostingProviderToDeploymentTarget(
  providerId: string,
  runtime: IntegrationRuntime,
): DeploymentTarget | null {
  const normalized = providerId.trim().toLowerCase();

  if ((normalized === "github" || normalized === "github-pages") && runtime === "static") {
    return "github-pages";
  }

  if (
    (normalized === "cloudflare" || normalized === "cloudflare-pages") &&
    (runtime === "static" || runtime === "edge")
  ) {
    return "cloudflare-pages";
  }

  if (
    normalized === "vercel" &&
    (runtime === "static" || runtime === "edge" || runtime === "serverless")
  ) {
    return "vercel";
  }

  if (
    normalized === "netlify" &&
    (runtime === "static" || runtime === "edge" || runtime === "serverless")
  ) {
    return "netlify";
  }

  if (normalized === "firebase-hosting" && (runtime === "static" || runtime === "client")) {
    return "firebase-hosting";
  }

  if (
    (normalized === "cloud-run" || normalized === "google-cloud-run") &&
    (runtime === "serverless" || runtime === "server")
  ) {
    return "google-cloud-run";
  }

  return null;
}
