import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = process.cwd();
const TEMP_ROOT = await mkdtemp(join(tmpdir(), "mirrorcraft-restrictions-"));
const emitted = new Map();

async function exists(path) {
  try {
    return (await stat(path)).isFile();
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

  const candidates = extname(base)
    ? [base]
    : [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error(`Unable to resolve ${specifier} from ${parentSource}`);
}

function outputPathFor(sourcePath) {
  return join(TEMP_ROOT, relative(ROOT, sourcePath).replace(/\.(?:ts|tsx)$/, ".mjs"));
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
      errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("; "),
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
  const outputPath = await emitTypeScriptModule(join(ROOT, relativeSourcePath));
  return import(pathToFileURL(outputPath).href);
}

try {
  const restrictions = await loadModule("src/mirrorcraft/policy/restrictions.ts");
  const access = await loadModule("src/mirrorcraft/intake/access-policy.ts");
  const deployment = await loadModule("src/mirrorcraft/deployment/index.ts");
  const revisionPolicy = await loadModule("src/mirrorcraft/policy/revision-envelope.ts");

  const publicDecision = restrictions.restrictionsFromAccessDecision(access.classifyAccess({}));
  assert.equal(publicDecision.allowed, true);

  const challengeDecision = restrictions.restrictionsFromAccessDecision(
    access.classifyAccess({ hasCaptcha: true }),
  );
  assert.equal(challengeDecision.allowed, false);
  assert.equal(challengeDecision.blockers[0].code, "access-capture-blocked");

  const accessEdit = restrictions.restrictionsFromEditOperation({
    authorizedProject: false,
    operation: {
      id: "runtime-access-edit",
      category: "access",
      parameterId: "access.state",
      target: { nodeId: "paywall", kind: "component" },
      before: "locked",
      after: "unlocked",
      viewport: { mode: "all" },
      reversible: true,
      verification: { level: "full", required: true },
    },
  });
  assert.equal(accessEdit.allowed, false);
  assert.equal(accessEdit.blockers[0].code, "edit-access-state-unauthorized");

  const expiredConnection = restrictions.restrictionsFromIntegrationConnection({
    id: "github-primary",
    providerId: "github",
    authMode: "oauth",
    health: "expired",
    capabilities: ["source-control", "hosting"],
    hasSecretMaterial: true,
    secretCount: 1,
    createdAt: "2026-09-27T00:00:00.000Z",
  });
  assert.equal(expiredConnection.allowed, false);
  assert.equal(expiredConnection.blockers[0].code, "integration-not-ready");

  const pendingDomain = restrictions.restrictionsFromDomainPlan({
    providerId: "cloudflare",
    mode: "custom-domain",
    hostname: "example.test",
    apex: "example.test",
    dnsRecords: [],
    ownershipVerified: false,
    verification: { status: "pending", evidence: [] },
    blockers: [],
    warnings: [],
  });
  assert.equal(pendingDomain.allowed, false);
  assert.equal(pendingDomain.blockers[0].code, "domain-unverified");

  const fakeSecret = `runtime_${"restriction"}_secret_1234567890`;
  const secretDecision = restrictions.restrictionsFromSerializedState(
    `Authorization: Bearer ${fakeSecret}`,
  );
  assert.equal(secretDecision.allowed, false);
  assert.equal(secretDecision.blockers[0].code, "secret-boundary-violation");
  assert.ok(!JSON.stringify(secretDecision).includes(fakeSecret));

  const mismatch = restrictions.restrictionsFromDeploymentExecution({
    target: "vercel",
    provider: {
      providerId: "github",
      connectionId: "primary",
      runtime: "static",
      executionMode: "runtime-connector",
      warnings: [],
    },
  });
  assert.equal(mismatch.allowed, false);
  assert.equal(mismatch.blockers[0].code, "deployment-target-mismatch");

  const policyBlock = restrictions.createRestrictionDecision([
    {
      code: "deployment-policy-blocked",
      scope: "deployment",
      severity: "block",
      message: "Fixture policy denied deployment.",
      evidence: ["fixture"],
    },
  ]);

  const manifest = {
    projectId: "restriction-smoke",
    revision: "rev-1",
    branch: "feature/restriction-smoke",
    commit: "fixture",
    stage: "ready",
    createdAt: "2026-09-27T00:00:00.000Z",
    verification: [],
    fidelity: { overall: 1 },
    alignmentPassed: true,
    provenanceComplete: true,
    unresolvedCriticalFindings: 0,
    warnings: [],
    artifacts: [],
  };

  const unreadyManifest = {
    ...manifest,
    revision: "rev-unready",
    stage: "verified",
    verification: [
      {
        id: "build",
        label: "Build",
        required: true,
        status: "failed",
        evidence: ["fixture failure"],
      },
    ],
  };

  let publishCalls = 0;
  const router = new deployment.DeploymentRouter();
  router.register({
    target: "github-pages",
    validate: () => [],
    publish: async (request) => {
      publishCalls += 1;
      return {
        target: request.target,
        status: "published",
        revision: request.manifest.revision,
        location: "https://example.invalid",
        evidence: ["fixture-adapter"],
        errors: [],
      };
    },
  });

  const provider = {
    providerId: "github",
    connectionId: "primary",
    runtime: "static",
    executionMode: "runtime-connector",
    warnings: [],
  };
  const connection = {
    id: "primary",
    providerId: "github",
    authMode: "oauth",
    health: "connected",
    capabilities: ["source-control", "hosting"],
    hasSecretMaterial: true,
    secretCount: 1,
    createdAt: "2026-09-27T00:00:00.000Z",
    checkedAt: "2026-09-27T09:00:00.000Z",
  };
  const validPolicyEnvelope = await revisionPolicy.createRevisionPolicyEnvelope({
    snapshotId: "policy-rev-1",
    manifest,
    createdAt: "2026-09-27T09:00:00.000Z",
    decision: restrictions.createRestrictionDecision([]),
  });
  assert.ok(Object.isFrozen(validPolicyEnvelope));
  assert.ok(/^sha256:[0-9a-f]{64}$/.test(validPolicyEnvelope.digest));

  const blocked = await router.publish({
    target: "github-pages",
    manifest,
    artifactPath: "out",
    provider,
    connection,
    restrictions: policyBlock,
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(publishCalls, 0);
  assert.ok(blocked.errors.includes("Fixture policy denied deployment."));

  const missingProvider = await router.publish({
    target: "github-pages",
    manifest,
    artifactPath: "out",
  });
  assert.equal(missingProvider.status, "blocked");
  assert.equal(publishCalls, 0);

  const missingConnection = await router.publish({
    target: "github-pages",
    manifest,
    artifactPath: "out",
    provider,
  });
  assert.equal(missingConnection.status, "blocked");
  assert.equal(publishCalls, 0);
  assert.ok(
    missingConnection.errors.some((message) =>
      message.includes("connection context"),
    ),
  );

  const unready = await router.publish({
    target: "github-pages",
    manifest: unreadyManifest,
    artifactPath: "out",
    provider,
    connection,
  });
  assert.equal(unready.status, "blocked");
  assert.equal(publishCalls, 0);
  assert.ok(
    unready.errors.some((message) =>
      message.includes("fully verified ready state"),
    ),
  );

  const missingDomainPlan = await router.publish({
    target: "github-pages",
    manifest,
    artifactPath: "out",
    customDomain: "example.test",
    provider,
    connection,
  });
  assert.equal(missingDomainPlan.status, "blocked");
  assert.equal(publishCalls, 0);
  assert.ok(
    missingDomainPlan.errors.some((message) =>
      message.includes("verified domain plan"),
    ),
  );

  const published = await router.publish({
    target: "github-pages",
    manifest,
    artifactPath: "out",
    provider,
    connection,
    policyEnvelope: validPolicyEnvelope,
  });
  assert.equal(published.status, "published");
  assert.equal(publishCalls, 1);

  console.log("MirrorCraft restriction smoke passed");
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
