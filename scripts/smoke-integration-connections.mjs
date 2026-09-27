import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import ts from "typescript";

const sourceUrl = new URL(
  "../src/mirrorcraft/integrations/connections.ts",
  import.meta.url,
);
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
    errors
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))
      .join("; "),
  );
}
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText,
).toString("base64")}`;
const connections = await import(moduleUrl);

const providers = {
  providers: {
    github: {
      id: "github",
      label: "GitHub",
      capabilities: ["source-control", "hosting", "custom-domain"],
      authModes: ["oauth", "api-token"],
      requiredScopes: [],
      runtimes: ["static"],
      customDomain: true,
      quota: { freeTier: "unknown", confidence: 0 },
    },
  },
};
const secretRef = {
  scheme: "secret",
  provider: "github",
  connectionId: "github-primary",
  secretId: "oauth-token",
};

let registry = connections.createIntegrationConnectionRegistry();
registry = connections.registerIntegrationConnection(registry, providers, {
  id: "github-primary",
  providerId: "github",
  authMode: "oauth",
  health: "connected",
  capabilities: ["hosting", "source-control", "hosting"],
  secretRefs: [secretRef],
  createdAt: "2026-09-27T00:00:00.000Z",
});

registry = connections.updateIntegrationConnectionHealth(
  registry,
  "github-primary",
  "degraded",
  {
    checkedAt: "2026-09-27T01:00:00.000Z",
    message: "Provider health check needs attention.",
  },
);
const summaries = connections.listIntegrationConnectionSummaries(registry);
assert.equal(summaries.length, 1);
assert.deepEqual(summaries[0].capabilities, ["hosting", "source-control"]);
assert.equal(summaries[0].health, "degraded");
assert.equal(summaries[0].secretCount, 1);
assert.equal(summaries[0].hasSecretMaterial, true);
const summaryJson = JSON.stringify(summaries[0]);
assert.ok(!summaryJson.includes("oauth-token"));
assert.ok(!summaryJson.includes("secretId"));
assert.ok(!summaryJson.includes("secretRefs"));

assert.throws(
  () =>
    connections.registerIntegrationConnection(registry, providers, {
      id: "bad-provider-ref",
      providerId: "github",
      authMode: "oauth",
      health: "connected",
      capabilities: ["hosting"],
      secretRefs: [
        {
          ...secretRef,
          provider: "vercel",
          connectionId: "bad-provider-ref",
        },
      ],
      createdAt: "2026-09-27T00:00:00.000Z",
    }),
  /Secret reference must belong/,
);
assert.throws(
  () =>
    connections.registerIntegrationConnection(registry, providers, {
      id: "bad-capability",
      providerId: "github",
      authMode: "oauth",
      health: "connected",
      capabilities: ["database"],
      createdAt: "2026-09-27T00:00:00.000Z",
    }),
  /does not support capabilities/,
);

console.log("MirrorCraft integration connection smoke passed");
