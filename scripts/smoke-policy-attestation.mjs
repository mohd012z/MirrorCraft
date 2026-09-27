import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = process.cwd();
const TEMP_ROOT = await mkdtemp(join(tmpdir(), "mirrorcraft-policy-attestation-"));
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
  const deployment = await loadModule("src/mirrorcraft/deployment/index.ts");
  const revisionPolicy = await loadModule("src/mirrorcraft/policy/revision-envelope.ts");

  const manifest = {
    projectId: "policy-attestation-smoke",
    revision: "rev-signed",
    branch: "feature/cursor-agent-kernel",
    commit: "commit-signed",
    stage: "ready",
    createdAt: "2026-09-27T10:00:00.000Z",
    verification: [],
    fidelity: { overall: 1 },
    alignmentPassed: true,
    provenanceComplete: true,
    unresolvedCriticalFindings: 0,
    warnings: [],
    artifacts: [],
  };
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
    createdAt: "2026-09-27T09:00:00.000Z",
    checkedAt: "2026-09-27T10:00:00.000Z",
  };
  const assessments = Object.fromEntries(
    ["access", "hosting", "security", "runtime", "integration", "domain", "publish"].map(
      (kind) => [
        kind,
        {
          status: kind === "domain" ? "not-applicable" : "pass",
          evaluatedAt: "2026-09-27T10:00:00.000Z",
          evidence: [`fixture:${kind}`],
        },
      ],
    ),
  );

  const keyPair = await globalThis.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  const signer = revisionPolicy.createEcdsaP256PolicySigner(
    "policy-test-key-2026-09",
    keyPair.privateKey,
  );
  const verifier = revisionPolicy.createEcdsaP256PolicyVerifier(
    new Map([["policy-test-key-2026-09", keyPair.publicKey]]),
  );

  const envelope = await revisionPolicy.createRevisionPolicyEnvelope(
    {
      snapshotId: "policy-rev-signed",
      manifest,
      createdAt: "2026-09-27T10:00:00.000Z",
      assessments,
      decision: {
        allowed: true,
        blockers: [],
        warnings: [],
        restrictions: [],
      },
    },
    signer,
  );

  assert.equal(envelope.attestation.algorithm, "ECDSA-P256-SHA256");
  assert.equal(envelope.attestation.keyId, "policy-test-key-2026-09");
  assert.ok(envelope.attestation.signature.length > 40);
  assert.ok(!JSON.stringify(envelope).includes("privateKey"));

  let publishCalls = 0;
  const router = new deployment.DeploymentRouter({
    now: () => new Date("2026-09-27T10:05:00.000Z"),
    policyVerifier: verifier,
  });
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

  const published = await router.publish({
    target: "github-pages",
    manifest,
    artifactPath: "out",
    provider,
    connection,
    policyEnvelope: envelope,
  });
  assert.equal(published.status, "published", "valid signed policy envelope must publish");
  assert.equal(publishCalls, 1);

  const signature = envelope.attestation.signature;
  const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  const tampered = await router.publish({
    target: "github-pages",
    manifest,
    artifactPath: "out",
    provider,
    connection,
    policyEnvelope: {
      ...envelope,
      attestation: {
        ...envelope.attestation,
        signature: tamperedSignature,
      },
    },
  });
  assert.equal(tampered.status, "blocked", "invalid signature must fail closed");
  assert.equal(publishCalls, 1, "adapter must not run for invalid signature");
  assert.ok(tampered.errors.some((error) => error.toLowerCase().includes("signature")));

  const unsignedEnvelope = { ...envelope, attestation: undefined };
  const unsigned = await router.publish({
    target: "github-pages",
    manifest,
    artifactPath: "out",
    provider,
    connection,
    policyEnvelope: unsignedEnvelope,
  });
  assert.equal(unsigned.status, "blocked", "unsigned policy envelope must fail closed");
  assert.equal(publishCalls, 1, "adapter must not run for unsigned policy envelope");

  console.log("MirrorCraft policy attestation smoke passed");
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
