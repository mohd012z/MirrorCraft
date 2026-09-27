import type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";

export type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";

export type DeploymentProfile =
  | "static-export"
  | "server-runtime"
  | "hybrid"
  | "artifact-only";

export interface RuntimeRequirement {
  id: string;
  required: boolean;
  evidence: string[];
}

export interface DeploymentAnalysisInput {
  routes: number;
  dynamicRoutes: number;
  apiRoutes: number;
  serverActions: number;
  requestTimeSsr: boolean;
  /** Explicit `export const runtime = "edge"` evidence from source scanning. */
  edgeRuntime?: boolean;
  websocketServer: boolean;
  privateDatabaseRuntime: boolean;
  writableFilesystemRuntime: boolean;
  authRequiresServer: boolean;
  unsupportedStaticFeatures?: string[];
}

export interface DeploymentRecommendation {
  profile: DeploymentProfile;
  compatibleTargets: DeploymentTarget[];
  incompatibleTargets: Array<{ target: DeploymentTarget; reasons: string[] }>;
  requirements: RuntimeRequirement[];
  confidence: number;
  reasons: string[];
}

const STATIC_COMPATIBLE_TARGETS: readonly DeploymentTarget[] = [
  "github-pages",
  "github-artifact",
  "cloudflare-pages",
  "vercel",
  "netlify",
  "firebase-hosting",
  "static-host",
  "artifact",
  "local",
];

const EDGE_COMPATIBLE_TARGETS: readonly DeploymentTarget[] = [
  "github-artifact",
  "cloudflare-pages",
  "vercel",
  "netlify",
  "artifact",
  "local",
];

const SERVERLESS_COMPATIBLE_TARGETS: readonly DeploymentTarget[] = [
  "github-artifact",
  "vercel",
  "netlify",
  "google-cloud-run",
  "node",
  "container",
  "artifact",
  "local",
];

const DEDICATED_SERVER_COMPATIBLE_TARGETS: readonly DeploymentTarget[] = [
  "github-artifact",
  "node",
  "container",
  "artifact",
  "local",
];

function copyTargets(targets: readonly DeploymentTarget[]): DeploymentTarget[] {
  return [...targets];
}

export function classifyDeployment(
  input: DeploymentAnalysisInput,
): DeploymentRecommendation {
  const serverRequirements: RuntimeRequirement[] = [
    { id: "api-routes", required: input.apiRoutes > 0, evidence: [`${input.apiRoutes} API route(s)`] },
    { id: "server-actions", required: input.serverActions > 0, evidence: [`${input.serverActions} server action(s)`] },
    { id: "request-time-ssr", required: input.requestTimeSsr, evidence: input.requestTimeSsr ? ["request-time SSR detected"] : [] },
    { id: "edge-runtime", required: input.edgeRuntime === true, evidence: input.edgeRuntime ? ["explicit Edge runtime requested"] : [] },
    { id: "websocket-server", required: input.websocketServer, evidence: input.websocketServer ? ["WebSocket server runtime detected"] : [] },
    { id: "private-database", required: input.privateDatabaseRuntime, evidence: input.privateDatabaseRuntime ? ["private database access requires server runtime"] : [] },
    { id: "writable-filesystem", required: input.writableFilesystemRuntime, evidence: input.writableFilesystemRuntime ? ["writable filesystem required at runtime"] : [] },
    { id: "server-auth", required: input.authRequiresServer, evidence: input.authRequiresServer ? ["authentication depends on server-side execution"] : [] },
  ];

  const requiredServer = serverRequirements.filter((requirement) => requirement.required);
  const unsupported = input.unsupportedStaticFeatures ?? [];
  const staticSafe =
    requiredServer.length === 0 &&
    unsupported.length === 0 &&
    input.edgeRuntime !== true;

  if (staticSafe) {
    return {
      profile: "static-export",
      compatibleTargets: copyTargets(STATIC_COMPATIBLE_TARGETS),
      incompatibleTargets: [],
      requirements: serverRequirements,
      confidence: 0.98,
      reasons: [
        "No required server runtime features were detected.",
        `${input.routes} route(s) can be treated as static/client-rendered output.`,
      ],
    };
  }

  const reasons = [
    ...requiredServer.flatMap((requirement) => requirement.evidence),
    ...unsupported.map((feature) => `Static export limitation: ${feature}`),
  ];
  const requiresDedicatedServer =
    input.websocketServer || input.writableFilesystemRuntime;

  if (requiresDedicatedServer) {
    return {
      profile: "server-runtime",
      compatibleTargets: copyTargets(DEDICATED_SERVER_COMPATIBLE_TARGETS),
      incompatibleTargets: [
        { target: "github-pages", reasons },
        { target: "cloudflare-pages", reasons },
        { target: "vercel", reasons },
        { target: "netlify", reasons },
        { target: "firebase-hosting", reasons },
        { target: "google-cloud-run", reasons },
        { target: "static-host", reasons },
      ],
      requirements: serverRequirements,
      confidence: 0.98,
      reasons,
    };
  }

  if (input.edgeRuntime === true) {
    return {
      profile: "server-runtime",
      compatibleTargets: copyTargets(EDGE_COMPATIBLE_TARGETS),
      incompatibleTargets: [
        { target: "github-pages", reasons },
        { target: "firebase-hosting", reasons },
        { target: "google-cloud-run", reasons },
        { target: "node", reasons },
        { target: "container", reasons },
        { target: "static-host", reasons },
      ],
      requirements: serverRequirements,
      confidence: 0.99,
      reasons,
    };
  }

  return {
    profile: "server-runtime",
    compatibleTargets: copyTargets(SERVERLESS_COMPATIBLE_TARGETS),
    incompatibleTargets: [
      { target: "github-pages", reasons },
      { target: "cloudflare-pages", reasons },
      { target: "firebase-hosting", reasons },
      { target: "static-host", reasons },
    ],
    requirements: serverRequirements,
    confidence: 0.98,
    reasons,
  };
}
