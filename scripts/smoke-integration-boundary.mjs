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
const providerMatrix = await loadTypeScriptModule(
  "../src/mirrorcraft/hosting/provider-catalog.ts",
);
const hostingClassifier = await loadTypeScriptModule(
  "../src/mirrorcraft/hosting/classifier.ts",
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

const providerIds = providerMatrix.PROVIDER_CATALOG.map((provider) => provider.id);
for (const expectedId of [
  "github-pages",
  "cloudflare-pages",
  "vercel",
  "netlify",
  "firebase-hosting",
  "google-cloud-run",
  "supabase",
  "neon",
]) {
  assert.ok(providerIds.includes(expectedId), `Missing provider ${expectedId}`);
}

const githubPages = providerMatrix.getProviderProfile("github-pages");
assert.ok(githubPages);
assert.equal(githubPages.freeTier, "yes");
assert.equal(githubPages.commercialUse, "restricted");
assert.equal(githubPages.billingMode, "hard-cap");
assert.deepEqual(githubPages.runtimes, ["static"]);
assert.equal(githubPages.limits.siteSizeMb, 1024);

const cloudflare = providerMatrix.getProviderProfile("cloudflare-pages");
assert.ok(cloudflare);
assert.equal(cloudflare.freeTier, "yes");
assert.equal(cloudflare.billingMode, "hard-cap");
assert.equal(cloudflare.limits.monthlyBuilds, 500);
assert.equal(cloudflare.limits.maxFilesPerSite, 20_000);
assert.equal(cloudflare.limits.maxAssetMiB, 25);

const vercel = providerMatrix.getProviderProfile("vercel");
assert.ok(vercel);
assert.equal(vercel.freeTier, "yes");
assert.equal(vercel.commercialUse, "restricted");
assert.equal(vercel.billingMode, "hard-cap");
assert.equal(vercel.limits.edgeRequestsPerMonth, 1_000_000);

const netlify = providerMatrix.getProviderProfile("netlify");
assert.ok(netlify);
assert.equal(netlify.freeTier, "yes");
assert.equal(netlify.billingMode, "hard-cap");
assert.equal(netlify.limits.monthlyCredits, 300);
assert.equal(netlify.limits.creditHardLimit, true);

const firebaseHosting = providerMatrix.getProviderProfile("firebase-hosting");
assert.ok(firebaseHosting);
assert.equal(firebaseHosting.freeTier, "yes");
assert.equal(firebaseHosting.billingMode, "hard-cap");
assert.equal(firebaseHosting.limits.sparkPaymentMethodRequired, false);
assert.equal(firebaseHosting.limits.hostingStorageGb, 10);

const cloudRun = providerMatrix.getProviderProfile("google-cloud-run");
assert.ok(cloudRun);
assert.equal(cloudRun.freeTier, "yes");
assert.equal(cloudRun.billingMode, "usage-based");
assert.equal(cloudRun.limits.billingBeyondFreeTier, true);

const supabase = providerMatrix.getProviderProfile("supabase");
assert.ok(supabase);
assert.equal(supabase.kind, "backend");
assert.equal(supabase.freeTier, "yes");
assert.equal(supabase.limits.freeProjects, 2);
assert.equal(supabase.limits.databaseMbPerProject, 500);

const neon = providerMatrix.getProviderProfile("neon");
assert.ok(neon);
assert.equal(neon.kind, "backend");
assert.equal(neon.freeTier, "yes");
assert.ok(neon.capabilities.includes("database"));

const latestEvidenceDay = Date.parse("2026-09-27T00:00:00.000Z");
for (const provider of providerMatrix.PROVIDER_CATALOG) {
  assert.match(provider.evidence.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
  const evidenceDay = Date.parse(`${provider.evidence.verifiedAt}T00:00:00.000Z`);
  assert.ok(Number.isFinite(evidenceDay));
  assert.ok(evidenceDay <= latestEvidenceDay);
  assert.ok(provider.evidence.source.startsWith("https://"));
  assert.ok(provider.evidence.confidence > 0.5);
}

assert.equal(providerMatrix.getProviderProfile("does-not-exist"), undefined);

const staticPersonalPlan = hostingClassifier.classifyFreeHosting({
  runtime: "static",
  commercialUse: false,
  requireCustomDomain: true,
  requiredCapabilities: ["hosting"],
  verifiedAt: "2026-09-27",
  maxEvidenceAgeDays: 45,
}, providerMatrix.PROVIDER_CATALOG);
assert.ok(staticPersonalPlan.eligible.some((candidate) => candidate.providerId === "github-pages"));
assert.ok(staticPersonalPlan.eligible.some((candidate) => candidate.providerId === "cloudflare-pages"));
assert.ok(staticPersonalPlan.eligible.some((candidate) => candidate.providerId === "vercel"));
assert.ok(staticPersonalPlan.eligible.some((candidate) => candidate.providerId === "netlify"));
assert.ok(staticPersonalPlan.eligible.some((candidate) => candidate.providerId === "firebase-hosting"));
assert.ok(staticPersonalPlan.eligible.every((candidate) => candidate.zeroCostEvidenceReady));

const commercialStaticPlan = hostingClassifier.classifyFreeHosting({
  runtime: "static",
  commercialUse: true,
  requireCustomDomain: true,
  requiredCapabilities: ["hosting"],
  verifiedAt: "2026-09-27",
  maxEvidenceAgeDays: 45,
}, providerMatrix.PROVIDER_CATALOG);
const blockedGithub = commercialStaticPlan.blocked.find((candidate) => candidate.providerId === "github-pages");
const blockedVercel = commercialStaticPlan.blocked.find((candidate) => candidate.providerId === "vercel");
assert.ok(blockedGithub?.blockers.some((reason) => reason.includes("commercial")));
assert.ok(blockedVercel?.blockers.some((reason) => reason.includes("commercial")));

const serverlessCommercialPlan = hostingClassifier.classifyFreeHosting({
  runtime: "serverless",
  commercialUse: true,
  requireCustomDomain: false,
  requiredCapabilities: ["hosting", "functions"],
  verifiedAt: "2026-09-27",
  maxEvidenceAgeDays: 45,
}, providerMatrix.PROVIDER_CATALOG);
assert.ok(serverlessCommercialPlan.blocked.some((candidate) => candidate.providerId === "github-pages"));
assert.ok(serverlessCommercialPlan.blocked.some((candidate) => candidate.providerId === "vercel"));
assert.ok(serverlessCommercialPlan.eligible.some((candidate) => candidate.providerId === "netlify"));
const blockedCloudRun = serverlessCommercialPlan.blocked.find(
  (candidate) => candidate.providerId === "google-cloud-run",
);
assert.ok(blockedCloudRun);
assert.equal(blockedCloudRun.zeroCostEvidenceReady, false);
assert.ok(
  blockedCloudRun.blockers.some((reason) =>
    reason.toLowerCase().includes("billable"),
  ),
);

const stalePlan = hostingClassifier.classifyFreeHosting({
  runtime: "static",
  commercialUse: false,
  requireCustomDomain: false,
  requiredCapabilities: ["hosting"],
  verifiedAt: "2027-03-01",
  maxEvidenceAgeDays: 30,
}, providerMatrix.PROVIDER_CATALOG);
assert.equal(stalePlan.eligible.length, 0);
assert.ok(stalePlan.blocked.some((candidate) => candidate.blockers.some((reason) => reason.includes("stale"))));

const unknownFreeProfile = {
  ...githubPages,
  id: "unknown-free-host",
  freeTier: "unknown",
  commercialUse: "allowed",
};
const unknownFreePlan = hostingClassifier.classifyFreeHosting({
  runtime: "static",
  commercialUse: false,
  requireCustomDomain: false,
  requiredCapabilities: ["hosting"],
  verifiedAt: "2026-09-27",
  maxEvidenceAgeDays: 45,
}, [unknownFreeProfile]);
assert.equal(unknownFreePlan.eligible.length, 0);
assert.equal(unknownFreePlan.blocked[0]?.zeroCostEvidenceReady, false);
assert.ok(unknownFreePlan.blocked[0]?.blockers.some((reason) => reason.includes("free-tier")));

console.log("MirrorCraft integration boundary smoke passed");
