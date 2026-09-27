import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import ts from "typescript";

async function loadTypeScriptModule(relativePath) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    reportDiagnostics: true,
  });

  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new Error(
      `${relativePath} transpile failed: ${errors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))
        .join("; ")}`,
    );
  }

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
  return import(moduleUrl);
}

const scanner = await loadTypeScriptModule(
  "../src/mirrorcraft/source-scanner/index.ts",
);
const deployment = await loadTypeScriptModule(
  "../src/mirrorcraft/deployment-classifier/index.ts",
);
const runtimeBridge = await loadTypeScriptModule(
  "../src/mirrorcraft/hosting/runtime-bridge.ts",
);
const deploymentTargets = await loadTypeScriptModule(
  "../src/mirrorcraft/deployment/targets.ts",
);

function classify(files) {
  const analysis = scanner.scanSourceRuntime(files);
  const recommendation = deployment.classifyDeployment(analysis);
  const runtime = runtimeBridge.deriveHostingRuntime(recommendation, analysis);
  return { analysis, recommendation, runtime };
}

const nestedRoute = classify([
  {
    path: "app/status/route.ts",
    content: "export async function GET(){ return new Response('ok'); }",
  },
]);
assert.equal(nestedRoute.analysis.apiRoutes, 1);
assert.equal(nestedRoute.recommendation.profile, "server-runtime");
assert.equal(nestedRoute.runtime, "serverless");
assert.ok(nestedRoute.recommendation.compatibleTargets.includes("vercel"));
assert.ok(nestedRoute.recommendation.compatibleTargets.includes("netlify"));
assert.ok(nestedRoute.recommendation.compatibleTargets.includes("google-cloud-run"));
assert.ok(
  nestedRoute.recommendation.incompatibleTargets.some(
    (entry) => entry.target === "github-pages",
  ),
);

const edgeRoute = classify([
  {
    path: "app/api/edge/route.ts",
    content:
      "export const runtime = 'edge'; export async function GET(){ return new Response('edge'); }",
  },
]);
assert.equal(edgeRoute.analysis.apiRoutes, 1);
assert.equal(edgeRoute.analysis.edgeRuntime, true);
assert.ok(
  edgeRoute.analysis.evidence.some((entry) => entry.kind === "edge-runtime"),
);
assert.equal(edgeRoute.recommendation.profile, "server-runtime");
assert.equal(edgeRoute.runtime, "edge");
for (const target of ["cloudflare-pages", "vercel", "netlify"]) {
  assert.ok(
    edgeRoute.recommendation.compatibleTargets.includes(target),
    `Expected edge deployment compatibility for ${target}`,
  );
}
for (const target of ["github-pages", "firebase-hosting"]) {
  assert.ok(
    edgeRoute.recommendation.incompatibleTargets.some(
      (entry) => entry.target === target,
    ),
    `Expected explicit edge runtime to block ${target}`,
  );
}

const browserSupabase = classify([
  {
    path: "app/page.tsx",
    content:
      "import { createClient } from '@supabase/supabase-js'; const supabase = createClient('https://example.test', 'anon'); export default function Page(){ return <main>Client</main>; }",
  },
]);
assert.equal(browserSupabase.analysis.privateDatabaseRuntime, false);
assert.equal(browserSupabase.recommendation.profile, "static-export");
assert.equal(browserSupabase.runtime, "static");
for (const target of [
  "github-pages",
  "cloudflare-pages",
  "vercel",
  "netlify",
  "firebase-hosting",
  "static-host",
  "artifact",
]) {
  assert.ok(
    browserSupabase.recommendation.compatibleTargets.includes(target),
    `Expected static deployment compatibility for ${target}`,
  );
}

const readOnlyFilesystem = classify([
  {
    path: "app/page.tsx",
    content: "export default function Page(){ return <main>Read only</main>; }",
  },
  {
    path: "lib/content.ts",
    content:
      "import { readFile } from 'node:fs/promises'; export async function load(){ return readFile('content.txt', 'utf8'); }",
  },
]);
assert.equal(readOnlyFilesystem.analysis.writableFilesystemRuntime, false);
assert.ok(
  readOnlyFilesystem.analysis.unsupportedStaticFeatures.includes(
    "runtime filesystem access",
  ),
);
assert.equal(readOnlyFilesystem.recommendation.profile, "server-runtime");
assert.equal(readOnlyFilesystem.runtime, "serverless");
assert.ok(readOnlyFilesystem.recommendation.compatibleTargets.includes("netlify"));
assert.ok(
  readOnlyFilesystem.recommendation.compatibleTargets.includes("google-cloud-run"),
);

const writableFilesystem = classify([
  {
    path: "lib/save.ts",
    content:
      "import { writeFile as save } from 'node:fs/promises'; export async function persist(){ return save('state.json', '{}'); }",
  },
]);
assert.equal(writableFilesystem.analysis.writableFilesystemRuntime, true);
assert.equal(writableFilesystem.recommendation.profile, "server-runtime");
assert.equal(writableFilesystem.runtime, "server");
assert.ok(writableFilesystem.recommendation.compatibleTargets.includes("node"));
assert.ok(writableFilesystem.recommendation.compatibleTargets.includes("container"));
assert.ok(!writableFilesystem.recommendation.compatibleTargets.includes("netlify"));

assert.equal(
  deploymentTargets.hostingProviderToDeploymentTarget("github-pages", "static"),
  "github-pages",
);
assert.equal(
  deploymentTargets.hostingProviderToDeploymentTarget("cloudflare-pages", "edge"),
  "cloudflare-pages",
);
assert.equal(
  deploymentTargets.hostingProviderToDeploymentTarget("netlify", "serverless"),
  "netlify",
);
assert.equal(
  deploymentTargets.hostingProviderToDeploymentTarget("firebase-hosting", "static"),
  "firebase-hosting",
);
assert.equal(
  deploymentTargets.hostingProviderToDeploymentTarget("cloud-run", "server"),
  "google-cloud-run",
);
assert.equal(
  deploymentTargets.hostingProviderToDeploymentTarget("supabase", "serverless"),
  null,
);
assert.equal(deploymentTargets.isDeploymentTarget("container"), true);
assert.equal(deploymentTargets.isDeploymentTarget("supabase"), false);

console.log("MirrorCraft runtime classifier smoke passed");
