export type DeploymentProfile =
  | "static-export"
  | "server-runtime"
  | "hybrid"
  | "artifact-only";

export type DeploymentTarget =
  | "github-pages"
  | "vercel"
  | "node"
  | "container"
  | "static-host"
  | "artifact";

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

export function classifyDeployment(
  input: DeploymentAnalysisInput,
): DeploymentRecommendation {
  const serverRequirements: RuntimeRequirement[] = [
    { id: "api-routes", required: input.apiRoutes > 0, evidence: [`${input.apiRoutes} API route(s)`] },
    { id: "server-actions", required: input.serverActions > 0, evidence: [`${input.serverActions} server action(s)`] },
    { id: "request-time-ssr", required: input.requestTimeSsr, evidence: input.requestTimeSsr ? ["request-time SSR detected"] : [] },
    { id: "websocket-server", required: input.websocketServer, evidence: input.websocketServer ? ["WebSocket server runtime detected"] : [] },
    { id: "private-database", required: input.privateDatabaseRuntime, evidence: input.privateDatabaseRuntime ? ["private database access requires server runtime"] : [] },
    { id: "writable-filesystem", required: input.writableFilesystemRuntime, evidence: input.writableFilesystemRuntime ? ["writable filesystem required at runtime"] : [] },
    { id: "server-auth", required: input.authRequiresServer, evidence: input.authRequiresServer ? ["authentication depends on server-side execution"] : [] },
  ];

  const requiredServer = serverRequirements.filter((requirement) => requirement.required);
  const unsupported = input.unsupportedStaticFeatures ?? [];
  const staticSafe = requiredServer.length === 0 && unsupported.length === 0;

  if (staticSafe) {
    return {
      profile: "static-export",
      compatibleTargets: ["github-pages", "static-host", "vercel", "artifact"],
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

  return {
    profile: "server-runtime",
    compatibleTargets: ["vercel", "node", "container", "artifact"],
    incompatibleTargets: [
      { target: "github-pages", reasons },
      { target: "static-host", reasons },
    ],
    requirements: serverRequirements,
    confidence: 0.98,
    reasons,
  };
}
