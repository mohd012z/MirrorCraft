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

const redaction = await loadTypeScriptModule(
  "../src/mirrorcraft/security/redaction.ts",
);
const secrets = await loadTypeScriptModule(
  "../src/mirrorcraft/integrations/secrets.ts",
);
const registryModule = await loadTypeScriptModule(
  "../src/mirrorcraft/integrations/registry.ts",
);
const googleModule = await loadTypeScriptModule(
  "../src/mirrorcraft/integrations/providers/google.ts",
);

const sensitiveText = [
  "Authorization: Bearer abc.def.ghi-super-secret",
  "DATABASE_URL=postgres://demo:db-password@db.example.test/prod",
  "client_secret=oauth-client-secret-value",
  "Cookie: session=private-session-value; theme=dark",
  "-----BEGIN PRIVATE KEY-----",
  "private-key-material",
  "-----END PRIVATE KEY-----",
].join("\n");

const redacted = redaction.redactSensitiveText(sensitiveText);
assert.equal(redacted.redacted, true);
assert.ok(redacted.count >= 5);
assert.ok(redacted.categories.includes("bearer-token"));
assert.ok(redacted.categories.includes("database-url"));
assert.ok(redacted.categories.includes("credential-assignment"));
assert.ok(redacted.categories.includes("cookie"));
assert.ok(redacted.categories.includes("private-key"));
assert.ok(!redacted.text.includes("abc.def.ghi-super-secret"));
assert.ok(!redacted.text.includes("db-password"));
assert.ok(!redacted.text.includes("oauth-client-secret-value"));
assert.ok(!redacted.text.includes("private-session-value"));
assert.ok(!redacted.text.includes("private-key-material"));

const secretRef = secrets.createSecretRef({
  provider: "google",
  connectionId: "primary",
  secretId: "oauth-access-token",
});
assert.equal(
  secrets.serializeSecretRef(secretRef),
  "secret://google/primary/oauth-access-token",
);
assert.equal(secrets.isSecretRef(secretRef), true);
assert.deepEqual(
  secrets.parseSecretRef("secret://google/primary/oauth-access-token"),
  secretRef,
);
assert.throws(
  () => secrets.parseSecretRef("https://example.test/not-a-secret"),
  /Invalid MirrorCraft secret reference/,
);

let registry = registryModule.createIntegrationRegistry();
registry = registryModule.registerIntegrationProvider(registry, {
  id: "google",
  label: "Google",
  capabilities: ["oauth", "hosting"],
  authModes: ["oauth"],
  requiredScopes: [],
  runtimes: ["client", "serverless"],
  customDomain: true,
  quota: {
    freeTier: "yes",
    confidence: 1,
  },
});

const google = registryModule.getIntegrationProvider(registry, "google");
assert.ok(google);
assert.equal(google.quota.freeTier, "unknown");
assert.ok(google.quota.confidence <= 0.5);

assert.throws(
  () =>
    registryModule.registerIntegrationProvider(registry, {
      id: "google",
      label: "Duplicate Google",
      capabilities: [],
      authModes: ["none"],
      requiredScopes: [],
      runtimes: ["client"],
      customDomain: false,
      quota: { freeTier: "unknown", confidence: 0 },
    }),
  /already registered/,
);

assert.equal(googleModule.GOOGLE_PROVIDER_DESCRIPTOR.id, "google");
assert.equal(googleModule.GOOGLE_PROVIDER_DESCRIPTOR.quota.freeTier, "unknown");
assert.ok(
  googleModule.GOOGLE_PROVIDER_DESCRIPTOR.quota.source.includes(
    "cloud.google.com/run/pricing",
  ),
);
assert.ok(
  googleModule.GOOGLE_SERVICE_CATALOG.some(
    (service) => service.id === "firebase-hosting",
  ),
);
assert.ok(
  googleModule.GOOGLE_SERVICE_CATALOG.some(
    (service) => service.id === "cloud-run",
  ),
);

const googlePlan = googleModule.createGoogleIntegrationPlan({
  connectionId: "primary",
  services: ["google-oauth", "firebase-hosting", "google-oauth"],
  secretRefs: [secretRef],
  requestedScopes: ["openid", "email", "email"],
});
assert.deepEqual(googlePlan.services, ["google-oauth", "firebase-hosting"]);
assert.deepEqual(googlePlan.requestedScopes, ["openid", "email"]);
assert.equal(googlePlan.requiresSecretResolver, true);
assert.equal(googlePlan.providerId, "google");
assert.ok(!JSON.stringify(googlePlan).includes("oauth-client-secret-value"));

assert.throws(
  () =>
    googleModule.createGoogleIntegrationPlan({
      connectionId: "bad-provider",
      services: ["google-oauth"],
      secretRefs: [
        {
          scheme: "secret",
          provider: "github",
          connectionId: "primary",
          secretId: "token",
        },
      ],
      requestedScopes: [],
    }),
  /must use google secret references/,
);

console.log("MirrorCraft integration boundary smoke passed");
