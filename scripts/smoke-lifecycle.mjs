import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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

try {
  const hosting = await loadModule("src/mirrorcraft/hosting/from-source.ts");
  const redaction = await loadModule("src/mirrorcraft/security/redaction.ts");
  const domain = await loadModule("src/mirrorcraft/domain/planner.ts");

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

  const fakeSecret = "mc_lifecycle_fake_secret_93d7740f";
  const redacted = redaction.redactSensitiveText(
    `Authorization: Bearer ${fakeSecret}`,
  );
  assert.equal(redacted.redacted, true);
  assert.ok(!redacted.text.includes(fakeSecret));

  const report = JSON.stringify({
    staticResult,
    serverlessResult,
    serverResult,
    failedDomain,
    redacted,
  });
  assert.ok(!report.includes(fakeSecret));

  console.log("MirrorCraft lifecycle smoke passed");
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
