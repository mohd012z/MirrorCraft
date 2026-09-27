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

const catalog = await loadTypeScriptModule(
  "../src/mirrorcraft/hosting/provider-catalog.ts",
);
const classifier = await loadTypeScriptModule(
  "../src/mirrorcraft/hosting/classifier.ts",
);

const firebase = catalog.getProviderProfile("firebase-hosting");
assert.ok(firebase, "Expected Firebase Hosting in provider catalog");
assert.equal(firebase.kind, "hosting");
assert.equal(firebase.freeTier, "yes");
assert.equal(firebase.billingMode, "hard-cap");
assert.ok(firebase.runtimes.includes("static"));

const cloudRun = catalog.getProviderProfile("google-cloud-run");
assert.ok(cloudRun, "Expected Google Cloud Run in provider catalog");
assert.equal(cloudRun.kind, "hosting");
assert.equal(cloudRun.freeTier, "yes");
assert.equal(cloudRun.billingMode, "usage-based");
assert.ok(cloudRun.runtimes.includes("serverless"));

const staticPlan = classifier.classifyFreeHosting(
  {
    runtime: "static",
    commercialUse: false,
    requireCustomDomain: false,
    requiredCapabilities: ["hosting"],
    verifiedAt: "2026-09-27",
    maxEvidenceAgeDays: 7,
  },
  catalog.PROVIDER_CATALOG,
);
const firebaseCandidate = staticPlan.candidates.find(
  (candidate) => candidate.providerId === "firebase-hosting",
);
assert.ok(firebaseCandidate, "Expected Firebase Hosting classification candidate");
assert.equal(firebaseCandidate.billingMode, "hard-cap");
assert.equal(firebaseCandidate.zeroCostEvidenceReady, true);
assert.equal(firebaseCandidate.eligible, true);

const serverlessPlan = classifier.classifyFreeHosting(
  {
    runtime: "serverless",
    commercialUse: false,
    requireCustomDomain: false,
    requiredCapabilities: ["hosting", "functions"],
    verifiedAt: "2026-09-27",
    maxEvidenceAgeDays: 7,
  },
  catalog.PROVIDER_CATALOG,
);
const cloudRunCandidate = serverlessPlan.candidates.find(
  (candidate) => candidate.providerId === "google-cloud-run",
);
assert.ok(cloudRunCandidate, "Expected Cloud Run classification candidate");
assert.equal(cloudRunCandidate.billingMode, "usage-based");
assert.equal(cloudRunCandidate.zeroCostEvidenceReady, false);
assert.equal(cloudRunCandidate.eligible, false);
assert.ok(
  cloudRunCandidate.blockers.some((blocker) =>
    blocker.toLowerCase().includes("billable"),
  ),
  "Expected a billable-usage blocker for Cloud Run",
);

console.log("MirrorCraft zero-cost hosting smoke passed");
