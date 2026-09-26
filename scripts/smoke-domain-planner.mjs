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

const domain = await loadTypeScriptModule(
  "../src/mirrorcraft/domain/planner.ts",
);

const providerSubdomain = domain.createProviderSubdomainPlan({
  providerId: "cloudflare",
  hostname: "mirrorcraft-demo.pages.dev",
});
assert.equal(providerSubdomain.mode, "provider-subdomain");
assert.equal(providerSubdomain.hostname, "mirrorcraft-demo.pages.dev");
assert.equal(providerSubdomain.ownershipVerified, false);
assert.equal(providerSubdomain.verification.status, "not-required");
assert.deepEqual(providerSubdomain.dnsRecords, []);

const customApex = domain.createCustomDomainPlan({
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
    {
      type: "TXT",
      name: "_mirrorcraft-verification",
      value: "provider-verification-token-placeholder",
      purpose: "ownership-verification",
    },
  ],
});
assert.equal(customApex.mode, "custom-domain");
assert.equal(customApex.hostname, "example.test");
assert.equal(customApex.apex, "example.test");
assert.equal(customApex.wwwHostname, "www.example.test");
assert.equal(customApex.ownershipVerified, false);
assert.equal(customApex.verification.status, "pending");
assert.ok(customApex.dnsRecords.some((record) => record.name === "@"));
assert.ok(
  customApex.dnsRecords.some(
    (record) =>
      record.type === "CNAME" &&
      record.name === "www" &&
      record.value === "example.test",
  ),
);

const verified = domain.applyDomainVerification(customApex, {
  status: "verified",
  checkedAt: "2026-09-27T00:00:00.000Z",
  evidence: ["provider-domain-check:verified"],
});
assert.equal(verified.ownershipVerified, true);
assert.equal(verified.verification.status, "verified");
assert.deepEqual(verified.verification.evidence, ["provider-domain-check:verified"]);

const failed = domain.applyDomainVerification(customApex, {
  status: "failed",
  checkedAt: "2026-09-27T00:00:00.000Z",
  evidence: ["provider-domain-check:dns-mismatch"],
  message: "DNS record does not match the provider requirement",
});
assert.equal(failed.ownershipVerified, false);
assert.equal(failed.verification.status, "failed");
assert.ok(failed.blockers.some((reason) => reason.includes("verification")));

assert.throws(
  () =>
    domain.createCustomDomainPlan({
      providerId: "cloudflare",
      hostname: "https://example.test/path",
      includeWww: false,
      providerRecords: [],
    }),
  /hostname is invalid/,
);

assert.throws(
  () =>
    domain.createCustomDomainPlan({
      providerId: "cloudflare",
      hostname: "example.test",
      includeWww: false,
      providerRecords: [
        {
          type: "TXT",
          name: "_verify",
          value: "secret://should-not-be-a-dns-value",
          purpose: "ownership-verification",
        },
      ],
    }),
  /secret references are not valid DNS values/,
);

console.log("MirrorCraft domain planner smoke passed");
