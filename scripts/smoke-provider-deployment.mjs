import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const ROOT = process.cwd();
const TEMP_ROOT = await mkdtemp(join(tmpdir(), "mirrorcraft-provider-deploy-"));
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
  return join(
    TEMP_ROOT,
    relative(ROOT, sourcePath).replace(/\.(?:ts|tsx)$/, ".mjs"),
  );
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
  const outputPath = await emitTypeScriptModule(join(ROOT, relativeSourcePath));
  return import(pathToFileURL(outputPath).href);
}

try {
  const bridge = await loadModule("src/mirrorcraft/deployment/provider-plan.ts");
  const deployment = await loadModule("src/mirrorcraft/deployment/index.ts");
  const github = await loadModule("src/mirrorcraft/integrations/github.ts");
  const google = await loadModule("src/mirrorcraft/integrations/google.ts");
  const secrets = await loadModule("src/mirrorcraft/integrations/secrets.ts");
  const revisionPolicy = await loadModule("src/mirrorcraft/policy/revision-envelope.ts");

  const secretRef = secrets.createSecretRef({
    provider: "github",
    connectionId: "primary",
    secretId: "deployment-token",
  });
  const githubPlan = github.createGitHubDeploymentPlan({
    connectionId: "primary",
    runtime: "static",
    secretRefs: [secretRef],
  });
  const selection = bridge.createDeploymentExecutionSelection(githubPlan);
  assert.equal(selection.target, "github-pages");
  assert.equal(selection.executionMode, "runtime-connector");
  assert.ok(!JSON.stringify(selection).includes("deployment-token"));
  assert.ok(!JSON.stringify(selection).includes("secretId"));

  const manifest = {
    projectId: "provider-smoke",
    revision: "rev-1",
    branch: "feature/provider-smoke",
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
  const assessmentKinds = [
    "access",
    "hosting",
    "security",
    "runtime",
    "integration",
    "domain",
    "publish",
  ];
  const assessments = Object.fromEntries(
    assessmentKinds.map((kind) => [
      kind,
      {
        status: kind === "domain" ? "not-applicable" : "pass",
        evaluatedAt: "2026-09-27T00:00:00.000Z",
        evidence: [`provider-fixture:${kind}`],
      },
    ]),
  );
  const policyEnvelope = await revisionPolicy.createRevisionPolicyEnvelope({
    snapshotId: "provider-policy-rev-1",
    manifest,
    createdAt: "2026-09-27T00:00:00.000Z",
    assessments,
    decision: {
      allowed: true,
      blockers: [],
      warnings: [],
      restrictions: [],
    },
  });
  const request = bridge.buildDeploymentRequest(
    selection,
    manifest,
    "out",
    {
      repository: "mohd012z/MirrorCraft",
      branch: "main",
      policyEnvelope,
    },
  );
  const serializedRequest = JSON.stringify(request);
  assert.ok(!serializedRequest.includes("deployment-token"));
  assert.ok(!serializedRequest.includes("secretId"));
  assert.equal(request.provider.providerId, "github");
  assert.equal(
    request.policyEnvelope?.snapshotId,
    "provider-policy-rev-1",
    "deployment request builder must preserve the revision policy envelope",
  );

  const router = new deployment.DeploymentRouter();
  const blocked = await router.publish(request);
  assert.equal(blocked.status, "blocked");
  assert.ok(
    blocked.errors.some((error) =>
      error.includes("No deployment adapter registered for github-pages"),
    ),
  );

  const googlePlan = google.createGoogleIntegrationPlan({
    connectionId: "google-primary",
    services: ["firebase-hosting", "cloud-run"],
  });
  const firebase = bridge.createDeploymentExecutionSelection(googlePlan, {
    serviceId: "firebase-hosting",
    runtime: "static",
  });
  const cloudRun = bridge.createDeploymentExecutionSelection(googlePlan, {
    serviceId: "cloud-run",
    runtime: "serverless",
  });
  assert.equal(firebase.target, "firebase-hosting");
  assert.equal(cloudRun.target, "google-cloud-run");
  assert.throws(
    () => bridge.createDeploymentExecutionSelection(googlePlan),
    /explicit hosting service and runtime/,
  );

  console.log("MirrorCraft provider deployment bridge smoke passed");
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
