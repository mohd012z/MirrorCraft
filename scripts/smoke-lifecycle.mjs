import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const ROOT = process.cwd();
const TEMP_ROOT = await mkdtemp(join(tmpdir(), "mirrorcraft-lifecycle-"));
const emitted = new Map();

async function exists(path) {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

async function resolveSource(specifier, parentSource) {
  let base;
  if (specifier.startsWith("@/")) {
    base = join(ROOT, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(dirname(parentSource), specifier);
  } else {
    return null;
  }

  const extension = extname(base);
  const candidates = extension
    ? [base]
    : [
        `${base}.ts`,
        `${base}.tsx`,
        join(base, "index.ts"),
        join(base, "index.tsx"),
      ];

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }

  throw new Error(`Unable to resolve ${specifier} from ${parentSource}`);
}

function outputPathFor(sourcePath) {
  const rel = relative(ROOT, sourcePath).replace(/\.(?:ts|tsx)$/, ".mjs");
  return join(TEMP_ROOT, rel);
}

async function emitTypeScriptModule(sourcePath) {
  const absolute = resolve(sourcePath);
  const cached = emitted.get(absolute);
  if (cached) return cached;

  const outputPath = outputPathFor(absolute);
  emitted.set(absolute, outputPath);

  const source = await readFile(absolute, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
    },
    reportDiagnostics: true,
  });

  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new Error(
      `${sourcePath} transpile failed: ${errors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))
        .join("; ")}`,
    );
  }

  let output = transpiled.outputText;
  const importPattern = /(from\s+|import\s*)(["'])([^"']+)\2/g;
  const replacements = [];

  for (const match of output.matchAll(importPattern)) {
    const specifier = match[3];
    const dependencySource = await resolveSource(specifier, absolute);
    if (!dependencySource) continue;

    const dependencyOutput = await emitTypeScriptModule(dependencySource);
    let rewritten = relative(dirname(outputPath), dependencyOutput).replaceAll("\\", "/");
    if (!rewritten.startsWith(".")) rewritten = `./${rewritten}`;

    const offset = match.index + match[0].lastIndexOf(specifier);
    replacements.push({ start: offset, end: offset + specifier.length, value: rewritten });
  }

  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, replacement.start)}${replacement.value}${output.slice(replacement.end)}`;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
  return outputPath;
}

async function loadModule(relativeSourcePath) {
  const sourcePath = join(ROOT, relativeSourcePath);
  const outputPath = await emitTypeScriptModule(sourcePath);
  return import(pathToFileURL(outputPath).href);
}

async function findPlaintextMatches(directory, needle) {
  const excludedDirectories = new Set([
    ".git",
    ".next",
    "node_modules",
    "out",
    "coverage",
  ]);
  const textExtensions = new Set([
    "",
    ".css",
    ".html",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".mjs",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
  ]);
  const matches = [];

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) await walk(path);
        continue;
      }
      if (!entry.isFile() || !textExtensions.has(extname(entry.name))) continue;

      try {
        const content = await readFile(path, "utf8");
        if (content.includes(needle)) matches.push(relative(ROOT, path));
      } catch {
        // Ignore unreadable or non-text files.
      }
    }
  }

  await walk(directory);
  return matches;
}

try {
  const hosting = await loadModule("src/mirrorcraft/hosting/from-source.ts");
  const redaction = await loadModule("src/mirrorcraft/security/redaction.ts");
  const domain = await loadModule("src/mirrorcraft/domain/planner.ts");
  const secrets = await loadModule("src/mirrorcraft/integrations/secrets.ts");
  const sectionComposer = await loadModule("src/mirrorcraft/section-composer/index.ts");
  const sectionContent = await loadModule("src/mirrorcraft/section-content/index.ts");
  const studioHistory = await loadModule("src/mirrorcraft/studio-history/index.ts");
  const mutationEngine = await loadModule("src/mirrorcraft/editing/mutation-engine.ts");
  const publish = await loadModule("src/mirrorcraft/publish/index.ts");

  const commonOptions = {
    requireCustomDomain: false,
    verifiedAt: "2026-09-27",
    maxEvidenceAgeDays: 45,
  };

  const staticResult = hosting.classifyFreeHostingFromSource(
    [
      {
        path: "app/page.tsx",
        content: "export default function Page(){ return <main>Static</main>; }",
      },
    ],
    { ...commonOptions, commercialUse: false },
  );
  assert.equal(staticResult.runtime, "static");
  assert.ok(staticResult.plan);
  assert.ok(
    staticResult.plan.eligible.some(
      (candidate) => candidate.providerId === "github-pages",
    ),
  );
  assert.ok(
    staticResult.plan.eligible.some(
      (candidate) => candidate.providerId === "cloudflare-pages",
    ),
  );

  const serverlessResult = hosting.classifyFreeHostingFromSource(
    [
      {
        path: "app/page.tsx",
        content: "export default function Page(){ return <main>Serverless</main>; }",
      },
      {
        path: "app/api/health/route.ts",
        content: "export async function GET(){ return new Response('ok'); }",
      },
    ],
    { ...commonOptions, commercialUse: true },
  );
  assert.equal(serverlessResult.runtime, "serverless");
  assert.ok(serverlessResult.plan);
  assert.ok(
    serverlessResult.plan.blocked.some(
      (candidate) => candidate.providerId === "github-pages",
    ),
  );
  assert.ok(
    serverlessResult.plan.blocked.some(
      (candidate) => candidate.providerId === "vercel",
    ),
  );
  assert.ok(
    serverlessResult.plan.eligible.some(
      (candidate) => candidate.providerId === "netlify",
    ),
  );

  const serverResult = hosting.classifyFreeHostingFromSource(
    [
      {
        path: "server/socket.ts",
        content:
          "import { WebSocketServer } from 'ws'; export const socketServer = new WebSocketServer({ port: 8080 });",
      },
    ],
    { ...commonOptions, commercialUse: true },
  );
  assert.equal(serverResult.runtime, "server");
  assert.ok(serverResult.plan);
  assert.equal(serverResult.plan.eligible.length, 0);
  assert.ok(serverResult.blockers.length > 0);

  const composition = sectionComposer.createPageComposition("lifecycle", [
    "hero-centered",
  ]);
  const content = sectionContent.createSectionContentState(composition);
  const snapshot = studioHistory.createStudioSnapshot(composition, content);
  const heroId = composition.sections[0].instanceId;
  const headingNodeId = sectionContent.getSectionSlotNodeId(heroId, "heading");
  const originalHeading = content.values[headingNodeId];
  const mutationPlan = mutationEngine.planStudioMutation(
    snapshot,
    [
      {
        id: "lifecycle-content-edit",
        category: "content",
        parameterId: "content.text",
        target: { nodeId: headingNodeId, kind: "content" },
        before: originalHeading,
        after: "Lifecycle verified heading",
        viewport: { mode: "all" },
        reversible: true,
        verification: { level: "visual", required: true },
      },
    ],
    { id: "lifecycle-mutation", label: "Lifecycle content edit" },
  );
  const appliedSnapshot = mutationEngine.applyStudioMutation(snapshot, mutationPlan);
  assert.equal(
    appliedSnapshot.content.values[headingNodeId],
    "Lifecycle verified heading",
  );
  const rolledBackSnapshot = mutationEngine.rollbackStudioMutation(mutationPlan);
  assert.equal(rolledBackSnapshot.content.values[headingNodeId], originalHeading);

  const domainPlan = domain.createCustomDomainPlan({
    providerId: "cloudflare",
    hostname: "example.test",
    includeWww: true,
    providerRecords: [
      {
        type: "CNAME",
        name: "@",
        value: "mirrorcraft-demo.pages.dev",
        purpose: "provider-routing",
      },
    ],
  });
  const failedDomain = domain.applyDomainVerification(domainPlan, {
    status: "failed",
    checkedAt: "2026-09-27T00:00:00.000Z",
    evidence: ["lifecycle:dns-mismatch"],
  });
  assert.equal(failedDomain.ownershipVerified, false);
  assert.equal(failedDomain.verification.status, "failed");

  const fakeSecret = [
    "mc",
    "lifecycle",
    randomBytes(18).toString("hex"),
  ].join("_");
  const redacted = redaction.redactSensitiveText(
    `Authorization: Bearer ${fakeSecret}\napi_key=${fakeSecret}`,
  );
  assert.equal(redacted.redacted, true);
  assert.ok(!redacted.text.includes(fakeSecret));

  const secretRef = secrets.createSecretRef({
    provider: "github",
    connectionId: "lifecycle",
    secretId: "deployment-token",
  });

  const unreadyManifest = {
    projectId: "lifecycle-project",
    revision: "rev-1",
    branch: "feature/lifecycle",
    commit: "deadbeef",
    stage: "verified",
    createdAt: "2026-09-27T00:00:00.000Z",
    verification: [
      {
        id: "build",
        label: "Build",
        required: true,
        status: "failed",
        evidence: ["fixture failure"],
      },
    ],
    fidelity: { overall: 0.99 },
    alignmentPassed: true,
    provenanceComplete: true,
    unresolvedCriticalFindings: 0,
    warnings: [],
    artifacts: [],
  };
  const publishDecision = publish.evaluatePublish(unreadyManifest);
  assert.equal(publishDecision.allowed, false);
  assert.ok(
    publishDecision.blockers.some((blocker) =>
      blocker.includes("fully verified ready state"),
    ),
  );

  let publisherCalled = false;
  const publishGate = new publish.PublishGate({
    async publish(manifest, target) {
      publisherCalled = true;
      return {
        location: `fixture://${target}`,
        revision: manifest.revision,
      };
    },
  });
  await assert.rejects(
    () => publishGate.execute(unreadyManifest, "preview"),
    /Publish blocked/,
  );
  assert.equal(publisherCalled, false);

  const report = JSON.stringify({
    staticResult,
    serverlessResult,
    serverResult,
    mutation: {
      applied: appliedSnapshot.content.values[headingNodeId],
      rolledBack: rolledBackSnapshot.content.values[headingNodeId],
    },
    failedDomain,
    credential: secretRef,
    redacted,
    publishDecision,
  });
  assert.ok(!report.includes(fakeSecret));
  assert.match(report, /"scheme":"secret"/);

  const repositorySecretMatches = await findPlaintextMatches(ROOT, fakeSecret);
  assert.deepEqual(repositorySecretMatches, []);

  console.log("MirrorCraft lifecycle smoke passed");
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
