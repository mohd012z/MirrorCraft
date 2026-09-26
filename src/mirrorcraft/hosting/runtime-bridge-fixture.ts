import type { DeploymentRecommendation } from "@/mirrorcraft/deployment-classifier";
import { deriveHostingRuntime } from "@/mirrorcraft/hosting/runtime-bridge";
import type { SourceRuntimeAnalysis } from "@/mirrorcraft/source-scanner";

const STATIC_RECOMMENDATION = {
  profile: "static-export",
  compatibleTargets: ["github-pages"],
  incompatibleTargets: [],
  requirements: [],
  confidence: 0.98,
  reasons: ["static"],
} satisfies DeploymentRecommendation;

const SERVER_RECOMMENDATION = {
  profile: "server-runtime",
  compatibleTargets: ["vercel"],
  incompatibleTargets: [],
  requirements: [],
  confidence: 0.98,
  reasons: ["server"],
} satisfies DeploymentRecommendation;

const BASE_ANALYSIS = {
  routes: 1,
  dynamicRoutes: 0,
  apiRoutes: 0,
  serverActions: 0,
  requestTimeSsr: false,
  websocketServer: false,
  privateDatabaseRuntime: false,
  writableFilesystemRuntime: false,
  authRequiresServer: false,
  evidence: [],
} satisfies SourceRuntimeAnalysis;

export const STATIC_RUNTIME = deriveHostingRuntime(
  STATIC_RECOMMENDATION,
  BASE_ANALYSIS,
);

export const SERVERLESS_RUNTIME = deriveHostingRuntime(
  SERVER_RECOMMENDATION,
  {
    ...BASE_ANALYSIS,
    apiRoutes: 1,
  },
);

export const SERVER_RUNTIME = deriveHostingRuntime(
  SERVER_RECOMMENDATION,
  {
    ...BASE_ANALYSIS,
    websocketServer: true,
  },
);

const staticLiteral: "static" = STATIC_RUNTIME;
const serverlessLiteral: "serverless" = SERVERLESS_RUNTIME;
const serverLiteral: "server" = SERVER_RUNTIME;

void staticLiteral;
void serverlessLiteral;
void serverLiteral;
