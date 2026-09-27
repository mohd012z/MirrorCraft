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
    | "edge-runtime"
    | "node-runtime"
    | "cache-components"
    | "runtime-conflict"
    | "websocket"
    | "database"
    | "filesystem-read"
    | "filesystem-write"
    | "server-auth"
    | "static-limitation";
  path: string;
  line?: number;
  summary: string;
  confidence: number;
}

export interface SourceRuntimeAnalysis extends DeploymentAnalysisInput {
  /** Optional for backwards-compatible callers; scanSourceRuntime always emits these fields. */
  edgeRuntime?: boolean;
  edgeRuntimeFiles?: number;
  nodeRuntimeFiles?: number;
  mixedRuntime?: boolean;
  cacheComponents?: boolean;
  runtimeConflicts?: string[];
  evidence: RuntimeEvidence[];
}

type NextRuntime = "edge" | "nodejs";

const DATABASE_PATTERNS: RegExp[] = [
  /\b(prisma|drizzle|mongoose|pg|mysql2|better-sqlite3)\b/i,
  /\bcreateServerClient\s*\(/,
  /DATABASE_URL|POSTGRES_URL|MYSQL_URL|MONGODB_URI/i,
];

const SERVER_AUTH_PATTERNS: RegExp[] = [
  /\bgetServerSession\b/,
  /\bauth\s*\(/,
  /\bcookies\s*\(/,
  /\bheaders\s*\(/,
  /next-auth|@auth\//i,
  /createServerClient\s*\(/,
];

const FILE_WRITE_PATTERNS: RegExp[] = [
  /\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync)\s*\(/,
  /import\s+(?!type\b)[^;]*\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync)\b[^;]*from\s+["'](?:node:)?fs(?:\/promises)?["']/,
];

const FILESYSTEM_RUNTIME_PATTERNS: RegExp[] = [
  /\b(readFile|readFileSync|createReadStream|readdir|readdirSync|stat|statSync|access|accessSync)\s*\(/,
  /import\s+(?!type\b)[^;]*from\s+["'](?:node:)?fs(?:\/promises)?["']/,
  /require\(["'](?:node:)?fs(?:\/promises)?["']\)/,
];

const RUNTIME_EXPORT_PATTERN =
  /\bexport\s+const\s+runtime\s*=\s*["'](edge|nodejs)["']\s*;?/;
const CACHE_COMPONENTS_PATTERN = /\bcacheComponents\s*:\s*true\b/;
const REQUEST_RUNTIME_PATTERN =
  /\bgetServerSideProps\b|\bexport\s+const\s+dynamic\s*=\s*["']force-dynamic["']|\bnoStore\s*\(|\bunstable_noStore\s*\(/;

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function directoryOf(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  return index < 0 ? "" : normalized.slice(0, index);
}

function explicitRuntime(content: string): NextRuntime | null {
  const match = RUNTIME_EXPORT_PATTERN.exec(content);
  return match?.[1] === "edge" || match?.[1] === "nodejs"
    ? match[1]
    : null;
}

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
  return /(?:^|\/)app\/(?!api\/)(?:.+\/)?page\.(?:ts|tsx|js|jsx)$/.test(path) ||
    /(?:^|\/)pages\/(?!api\/)(?:.+\/)?(?:index|[^/]+)\.(?:ts|tsx|js|jsx)$/.test(path);
}

function isApiRoute(path: string): boolean {
  return /(?:^|\/)app\/(?:.+\/)?route\.(?:ts|js)$/.test(path) ||
    /(?:^|\/)pages\/api\/.+\.(?:ts|js)$/.test(path);
}

function isAppLayout(path: string): boolean {
  return /(?:^|\/)app\/(?:.+\/)?layout\.(?:ts|tsx|js|jsx)$/.test(path) ||
    /(?:^|\/)app\/layout\.(?:ts|tsx|js|jsx)$/.test(path);
}

function isDynamicRoute(path: string): boolean {
  return /\[[^\]]+\]/.test(path);
}

function inheritedRuntime(
  path: string,
  layoutRuntimes: ReadonlyMap<string, NextRuntime>,
): NextRuntime | null {
  let directory = directoryOf(path);
  while (directory) {
    const runtime = layoutRuntimes.get(directory);
    if (runtime) return runtime;
    const separator = directory.lastIndexOf("/");
    if (separator < 0) break;
    directory = directory.slice(0, separator);
  }
  return null;
}

function effectiveRuntimeForRoute(
  file: SourceFileInput,
  layoutRuntimes: ReadonlyMap<string, NextRuntime>,
): NextRuntime | null {
  return explicitRuntime(file.content) ?? inheritedRuntime(file.path, layoutRuntimes);
}

export function scanSourceRuntime(files: SourceFileInput[]): SourceRuntimeAnalysis {
  const evidence: RuntimeEvidence[] = [];
  const normalizedFiles = files.map((file) => ({
    ...file,
    path: normalizePath(file.path),
  }));
  const layoutRuntimes = new Map<string, NextRuntime>();
  let cacheComponents = false;
  let cacheComponentsPath: string | null = null;

  for (const file of normalizedFiles) {
    if (isAppLayout(file.path)) {
      const runtime = explicitRuntime(file.content);
      if (runtime) layoutRuntimes.set(directoryOf(file.path), runtime);
    }
    if (/^(?:.+\/)?next\.config\.(?:ts|js|mjs|cjs)$/.test(file.path) && CACHE_COMPONENTS_PATTERN.test(file.content)) {
      cacheComponents = true;
      cacheComponentsPath ??= file.path;
      addEvidence(
        evidence,
        file,
        "cache-components",
        CACHE_COMPONENTS_PATTERN,
        "Next.js Cache Components are enabled.",
        0.99,
      );
    }
  }

  let routes = 0;
  let dynamicRoutes = 0;
  let apiRoutes = 0;
  let serverActions = 0;
  let requestTimeSsr = false;
  let edgeRuntimeFiles = 0;
  let nodeRuntimeFiles = 0;
  let explicitEdgeSeen = false;
  let websocketServer = false;
  let privateDatabaseRuntime = false;
  let writableFilesystemRuntime = false;
  let authRequiresServer = false;
  const unsupportedStaticFeatures = new Set<string>();
  const runtimeConflicts: string[] = [];

  for (const file of normalizedFiles) {
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

    const configuredRuntime = explicitRuntime(file.content);
    if (configuredRuntime === "edge") {
      explicitEdgeSeen = true;
      addEvidence(
        evidence,
        file,
        "edge-runtime",
        RUNTIME_EXPORT_PATTERN,
        "Explicit Next.js Edge runtime segment configuration detected.",
        0.99,
      );
    }

    const runtimeBearingRoute = isPageRoute(file.path) || isApiRoute(file.path);
    if (runtimeBearingRoute) {
      const effectiveRuntime = effectiveRuntimeForRoute(file, layoutRuntimes);
      if (effectiveRuntime === "edge") {
        edgeRuntimeFiles += 1;
        if (configuredRuntime !== "edge") {
          evidence.push({
            kind: "edge-runtime",
            path: file.path,
            summary: "Route inherits Edge runtime from an ancestor layout.",
            confidence: 0.97,
          });
        }
      } else if (
        effectiveRuntime === "nodejs" ||
        isApiRoute(file.path) ||
        REQUEST_RUNTIME_PATTERN.test(file.content)
      ) {
        nodeRuntimeFiles += 1;
        evidence.push({
          kind: "node-runtime",
          path: file.path,
          summary:
            effectiveRuntime === "nodejs"
              ? "Node.js runtime route detected."
              : "Route requires the default Node.js/serverless runtime.",
          confidence: 0.96,
        });
      }
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

    let fileWritesRuntime = false;
    for (const pattern of FILE_WRITE_PATTERNS) {
      if (addEvidence(evidence, file, "filesystem-write", pattern, "Writable filesystem runtime signal detected.", 0.92)) {
        fileWritesRuntime = true;
        writableFilesystemRuntime = true;
        break;
      }
    }

    if (!fileWritesRuntime) {
      for (const pattern of FILESYSTEM_RUNTIME_PATTERNS) {
        if (addEvidence(evidence, file, "filesystem-read", pattern, "Read-only filesystem runtime signal detected.", 0.86)) {
          unsupportedStaticFeatures.add("runtime filesystem access");
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

    if (/\bImageResponse\b/.test(file.content) || /opengraph-image\.(?:ts|tsx|js|jsx)$/.test(file.path)) {
      unsupportedStaticFeatures.add("runtime-generated image response");
      evidence.push({
        kind: "static-limitation",
        path: file.path,
        summary: "Runtime-generated image response may require server execution.",
        confidence: 0.8,
      });
    }
  }

  const edgeRuntime = edgeRuntimeFiles > 0 || explicitEdgeSeen;
  const mixedRuntime = edgeRuntimeFiles > 0 && nodeRuntimeFiles > 0;

  if (cacheComponents && edgeRuntime) {
    runtimeConflicts.push("cache-components-edge-runtime");
    evidence.push({
      kind: "runtime-conflict",
      path: cacheComponentsPath ?? "next.config",
      summary: "Cache Components are incompatible with the configured Edge runtime.",
      confidence: 0.99,
    });
  }

  return {
    routes,
    dynamicRoutes,
    apiRoutes,
    serverActions,
    requestTimeSsr,
    edgeRuntime,
    edgeRuntimeFiles,
    nodeRuntimeFiles,
    mixedRuntime,
    cacheComponents,
    runtimeConflicts,
    websocketServer,
    privateDatabaseRuntime,
    writableFilesystemRuntime,
    authRequiresServer,
    unsupportedStaticFeatures: [...unsupportedStaticFeatures],
    evidence,
  };
}
