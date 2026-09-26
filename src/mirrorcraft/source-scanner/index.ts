import type { DeploymentAnalysisInput } from "@/mirrorcraft/deployment-classifier";

export interface SourceFileInput {
  path: string;
  content: string;
}

export interface RuntimeEvidence {
  kind:
    | "route"
    | "dynamic-route"
    | "api-route"
    | "server-action"
    | "ssr"
    | "websocket"
    | "database"
    | "filesystem-write"
    | "server-auth"
    | "static-limitation";
  path: string;
  line?: number;
  summary: string;
  confidence: number;
}

export interface SourceRuntimeAnalysis extends DeploymentAnalysisInput {
  evidence: RuntimeEvidence[];
}

const DATABASE_PATTERNS: RegExp[] = [
  /\b(prisma|drizzle|mongoose|pg|mysql2|better-sqlite3)\b/i,
  /\b(createClient|createServerClient)\s*\(/,
  /DATABASE_URL|POSTGRES_URL|MYSQL_URL|MONGODB_URI/i,
];

const SERVER_AUTH_PATTERNS: RegExp[] = [
  /\b(getServerSession|auth\s*\(|cookies\s*\(|headers\s*\()\b/,
  /next-auth|@auth\//i,
  /createServerClient\s*\(/,
];

const FILE_WRITE_PATTERNS: RegExp[] = [
  /\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync)\s*\(/,
  /from\s+["']node:fs["']|from\s+["']fs["']/,
];

function lineFor(content: string, index: number): number {
  return content.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function addEvidence(
  evidence: RuntimeEvidence[],
  file: SourceFileInput,
  kind: RuntimeEvidence["kind"],
  regex: RegExp,
  summary: string,
  confidence: number,
): boolean {
  regex.lastIndex = 0;
  const match = regex.exec(file.content);
  if (!match) return false;
  evidence.push({
    kind,
    path: file.path,
    line: lineFor(file.content, match.index),
    summary,
    confidence,
  });
  return true;
}

function isPageRoute(path: string): boolean {
  return /(?:^|\/)app\/(?!api\/).+\/(?:page|route)\.(?:ts|tsx|js|jsx)$/.test(path) ||
    /(?:^|\/)pages\/(?!api\/).+\.(?:ts|tsx|js|jsx)$/.test(path);
}

function isApiRoute(path: string): boolean {
  return /(?:^|\/)app\/api\/.+\/route\.(?:ts|js)$/.test(path) ||
    /(?:^|\/)pages\/api\/.+\.(?:ts|js)$/.test(path);
}

function isDynamicRoute(path: string): boolean {
  return /\[[^\]]+\]/.test(path);
}

export function scanSourceRuntime(files: SourceFileInput[]): SourceRuntimeAnalysis {
  const evidence: RuntimeEvidence[] = [];
  let routes = 0;
  let dynamicRoutes = 0;
  let apiRoutes = 0;
  let serverActions = 0;
  let requestTimeSsr = false;
  let websocketServer = false;
  let privateDatabaseRuntime = false;
  let writableFilesystemRuntime = false;
  let authRequiresServer = false;
  const unsupportedStaticFeatures = new Set<string>();

  for (const file of files) {
    if (isPageRoute(file.path)) {
      routes += 1;
      evidence.push({
        kind: isDynamicRoute(file.path) ? "dynamic-route" : "route",
        path: file.path,
        summary: isDynamicRoute(file.path) ? "Dynamic route path detected." : "Page route detected.",
        confidence: 0.99,
      });
      if (isDynamicRoute(file.path)) dynamicRoutes += 1;
    }

    if (isApiRoute(file.path)) {
      apiRoutes += 1;
      evidence.push({
        kind: "api-route",
        path: file.path,
        summary: "Next.js API/route handler detected.",
        confidence: 0.99,
      });
    }

    if (addEvidence(evidence, file, "server-action", /["']use server["']\s*;?/, "Server Action directive detected.", 0.99)) {
      serverActions += 1;
    }

    const ssrDetected =
      addEvidence(evidence, file, "ssr", /\bgetServerSideProps\b/, "getServerSideProps requires request-time server rendering.", 0.99) ||
      addEvidence(evidence, file, "ssr", /\bexport\s+const\s+dynamic\s*=\s*["']force-dynamic["']/, "force-dynamic route detected.", 0.98) ||
      addEvidence(evidence, file, "ssr", /\bnoStore\s*\(|\bunstable_noStore\s*\(/, "No-store server rendering signal detected.", 0.95);
    requestTimeSsr = requestTimeSsr || ssrDetected;

    const websocketDetected =
      addEvidence(evidence, file, "websocket", /\bWebSocketServer\s*\(|\bnew\s+Server\s*\([^)]*websocket/i, "WebSocket server implementation detected.", 0.97) ||
      addEvidence(evidence, file, "websocket", /from\s+["']ws["']|require\(["']ws["']\)/, "ws server package reference detected.", 0.9);
    websocketServer = websocketServer || websocketDetected;

    if (!privateDatabaseRuntime) {
      for (const pattern of DATABASE_PATTERNS) {
        if (addEvidence(evidence, file, "database", pattern, "Server-side database/runtime client signal detected.", 0.85)) {
          privateDatabaseRuntime = true;
          break;
        }
      }
    }

    if (!writableFilesystemRuntime) {
      for (const pattern of FILE_WRITE_PATTERNS) {
        if (addEvidence(evidence, file, "filesystem-write", pattern, "Writable filesystem runtime signal detected.", 0.88)) {
          writableFilesystemRuntime = true;
          break;
        }
      }
    }

    if (!authRequiresServer) {
      for (const pattern of SERVER_AUTH_PATTERNS) {
        if (addEvidence(evidence, file, "server-auth", pattern, "Server-side authentication/session signal detected.", 0.86)) {
          authRequiresServer = true;
          break;
        }
      }
    }

    if (/\bImageResponse\b|opengraph-image\.(?:ts|tsx|js|jsx)$/.test(file.content) || /opengraph-image\.(?:ts|tsx|js|jsx)$/.test(file.path)) {
      unsupportedStaticFeatures.add("runtime-generated image response");
      evidence.push({
        kind: "static-limitation",
        path: file.path,
        summary: "Runtime-generated image response may require server execution.",
        confidence: 0.8,
      });
    }
  }

  return {
    routes,
    dynamicRoutes,
    apiRoutes,
    serverActions,
    requestTimeSsr,
    websocketServer,
    privateDatabaseRuntime,
    writableFilesystemRuntime,
    authRequiresServer,
    unsupportedStaticFeatures: [...unsupportedStaticFeatures],
    evidence,
  };
}
