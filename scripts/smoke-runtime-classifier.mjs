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

console.log("MirrorCraft runtime classifier smoke passed");
