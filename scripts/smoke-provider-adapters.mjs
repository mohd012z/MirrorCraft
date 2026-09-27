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

const github = await loadTypeScriptModule(
  "../src/mirrorcraft/integrations/github.ts",
);
const cloudflare = await loadTypeScriptModule(
  "../src/mirrorcraft/integrations/cloudflare.ts",
);
const vercel = await loadTypeScriptModule(
  "../src/mirrorcraft/integrations/vercel.ts",
);
const netlify = await loadTypeScriptModule(
  "../src/mirrorcraft/integrations/netlify.ts",
);
const supabase = await loadTypeScriptModule(
  "../src/mirrorcraft/integrations/supabase.ts",
);
const neon = await loadTypeScriptModule(
  "../src/mirrorcraft/integrations/neon.ts",
);

function secretRef(provider, connectionId = "primary", secretId = "token") {
  return {
    scheme: "secret",
    provider,
    connectionId,
    secretId,
  };
}

assert.equal(github.GITHUB_PROVIDER_DESCRIPTOR.id, "github");
assert.deepEqual(github.GITHUB_PROVIDER_DESCRIPTOR.runtimes, ["static"]);
const githubPlan = github.createGitHubDeploymentPlan({
  connectionId: "primary",
  runtime: "static",
  secretRefs: [secretRef("github")],
});
assert.equal(githubPlan.providerId, "github");
assert.equal(githubPlan.executionMode, "runtime-connector");
assert.equal(githubPlan.requiresSecretResolver, true);
assert.ok(githubPlan.requiredCapabilities.includes("hosting"));
assert.throws(
  () =>
    github.createGitHubDeploymentPlan({
      connectionId: "primary",
      runtime: "serverless",
      secretRefs: [],
    }),
  /does not support runtime/,
);
assert.throws(
  () =>
    github.createGitHubDeploymentPlan({
      connectionId: "primary",
      runtime: "static",
      secretRefs: [secretRef("vercel")],
    }),
  /github secret references/,
);

assert.equal(cloudflare.CLOUDFLARE_PROVIDER_DESCRIPTOR.id, "cloudflare");
assert.ok(cloudflare.CLOUDFLARE_PROVIDER_DESCRIPTOR.runtimes.includes("edge"));
const cloudflarePlan = cloudflare.createCloudflareDeploymentPlan({
  connectionId: "primary",
  runtime: "edge",
  secretRefs: [secretRef("cloudflare")],
});
assert.ok(cloudflarePlan.requiredCapabilities.includes("functions"));
assert.equal(cloudflarePlan.executionMode, "runtime-connector");

assert.equal(vercel.VERCEL_PROVIDER_DESCRIPTOR.id, "vercel");
assert.ok(vercel.VERCEL_PROVIDER_DESCRIPTOR.runtimes.includes("serverless"));
const vercelPlan = vercel.createVercelDeploymentPlan({
  connectionId: "primary",
  runtime: "serverless",
  secretRefs: [secretRef("vercel")],
});
assert.ok(vercelPlan.requiredCapabilities.includes("functions"));
assert.ok(vercelPlan.warnings.some((warning) => warning.includes("commercial")));

assert.equal(netlify.NETLIFY_PROVIDER_DESCRIPTOR.id, "netlify");
const netlifyPlan = netlify.createNetlifyDeploymentPlan({
  connectionId: "primary",
  runtime: "serverless",
  secretRefs: [secretRef("netlify")],
});
assert.equal(netlifyPlan.providerId, "netlify");
assert.ok(netlifyPlan.requiredCapabilities.includes("hosting"));

assert.equal(supabase.SUPABASE_PROVIDER_DESCRIPTOR.id, "supabase");
const supabaseDbOnly = supabase.createSupabaseBackendPlan({
  connectionId: "primary",
  capabilities: ["database"],
  secretRefs: [secretRef("supabase")],
});
assert.deepEqual(supabaseDbOnly.capabilities, ["database"]);
const supabaseFull = supabase.createSupabaseBackendPlan({
  connectionId: "primary",
  capabilities: ["database", "auth", "storage", "database"],
  secretRefs: [secretRef("supabase")],
});
assert.deepEqual(supabaseFull.capabilities, ["database", "auth", "storage"]);
assert.throws(
  () =>
    supabase.createSupabaseBackendPlan({
      connectionId: "primary",
      capabilities: ["auth"],
      secretRefs: [],
    }),
  /requires database/,
);

assert.equal(neon.NEON_PROVIDER_DESCRIPTOR.id, "neon");
const neonPlan = neon.createNeonBackendPlan({
  connectionId: "primary",
  secretRefs: [secretRef("neon")],
});
assert.deepEqual(neonPlan.capabilities, ["database"]);
assert.equal(neonPlan.executionMode, "runtime-connector");

for (const plan of [
  githubPlan,
  cloudflarePlan,
  vercelPlan,
  netlifyPlan,
  supabaseDbOnly,
  supabaseFull,
  neonPlan,
]) {
  const serialized = JSON.stringify(plan);
  assert.ok(!serialized.includes("access_token="));
  assert.ok(!serialized.includes("client_secret="));
  assert.ok(!serialized.includes("password="));
}

console.log("MirrorCraft provider adapter smoke passed");
