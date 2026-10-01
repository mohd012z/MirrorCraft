import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = process.cwd();
const TEMP_ROOT = await mkdtemp(join(tmpdir(), "mirrorcraft-adversarial-release-"));
const emitted = new Map();

async function exists(path) { try { return (await stat(path)).isFile(); } catch { return false; } }
async function resolveSource(specifier, parentSource) {
  let base;
  if (specifier.startsWith("@/")) base = join(ROOT, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(parentSource), specifier);
  else return null;
  const candidates = extname(base) ? [base] : [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error(`Unable to resolve ${specifier} from ${parentSource}`);
}
function outputPathFor(sourcePath) { return join(TEMP_ROOT, relative(ROOT, sourcePath).replace(/\.(?:ts|tsx)$/, ".mjs")); }
async function emitTypeScriptModule(sourcePath) {
  const absolute = resolve(sourcePath);
  if (emitted.has(absolute)) return emitted.get(absolute);
  const outputPath = outputPathFor(absolute);
  emitted.set(absolute, outputPath);
  const source = await readFile(absolute, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, strict: true },
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("; "));
  let output = transpiled.outputText;
  const importPattern = /(from\s+|import\s*)(["'])([^"']+)\2/g;
  const replacements = [];
  for (const match of output.matchAll(importPattern)) {
    const dependencySource = await resolveSource(match[3], absolute);
    if (!dependencySource) continue;
    const dependencyOutput = await emitTypeScriptModule(dependencySource);
    let rewritten = relative(dirname(outputPath), dependencyOutput).replaceAll("\\", "/");
    if (!rewritten.startsWith(".")) rewritten = `./${rewritten}`;
    const offset = match.index + match[0].lastIndexOf(match[3]);
    replacements.push({ start: offset, end: offset + match[3].length, value: rewritten });
  }
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, replacement.start)}${replacement.value}${output.slice(replacement.end)}`;
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
  return outputPath;
}
async function loadModule(path) {
  const outputPath = await emitTypeScriptModule(join(ROOT, path));
  return import(pathToFileURL(outputPath).href);
}

try {
  const pipeline = await loadModule("src/mirrorcraft/clone-pipeline/index.ts");
  const readiness = await loadModule("src/mirrorcraft/clone-readiness/index.ts");
  const release = await loadModule("src/mirrorcraft/release-manifest/index.ts");

  const stages = pipeline.CLONE_STAGE_ORDER;
  assert.equal(stages[stages.indexOf("capture") + 1], "trust-analysis");
  assert.equal(stages[stages.indexOf("verify") + 1], "adversarial-verify");
  assert.equal(stages[stages.indexOf("adversarial-verify") + 1], "release");

  const baseReadiness = {
    pagesDiscovered: 1,
    pagesPermitted: 1,
    pagesReconstructed: 1,
    blockedPages: 0,
    components: 1,
    reusableComponents: 1,
    assets: 0,
    brokenRoutes: 0,
    consoleErrors: 0,
    buildErrors: 0,
    unresolvedCriticalFindings: 0,
    autoRepairs: 0,
    warnings: [],
    fidelity: { visual: 1, structure: 1, responsive: 1, behavior: 1, assets: 1, overall: 1 },
    deployment: { profile: "static-export", compatibleTargets: ["github-pages"], incompatibleTargets: [], requirements: [], confidence: 1, reasons: [] },
  };

  const unmeasured = readiness.buildCloneReadinessReport({
    ...baseReadiness,
    aiGeneratedOrRepaired: true,
    adversarialVerification: { status: "unmeasured", evidenceIds: [] },
  });
  assert.equal(unmeasured.adversarialVerificationStatus, "unmeasured");
  assert.equal(unmeasured.publishReady, false);
  assert.ok(unmeasured.blockers.some((item) => item.includes("adversarial verification is unmeasured")));

  const failed = readiness.buildCloneReadinessReport({
    ...baseReadiness,
    aiGeneratedOrRepaired: true,
    adversarialVerification: { status: "measured-fail", evidenceIds: ["e-adv-fail"] },
  });
  assert.equal(failed.publishReady, false);
  assert.ok(failed.blockers.some((item) => item.includes("e-adv-fail")));

  const passed = readiness.buildCloneReadinessReport({
    ...baseReadiness,
    aiGeneratedOrRepaired: true,
    adversarialVerification: { status: "measured-pass", evidenceIds: ["e-adv-pass"] },
  });
  assert.equal(passed.publishReady, true);
  assert.equal(passed.adversarialVerificationStatus, "measured-pass");

  const staticUnmeasured = readiness.buildCloneReadinessReport({
    ...baseReadiness,
    aiGeneratedOrRepaired: false,
  });
  assert.equal(staticUnmeasured.publishReady, true);
  assert.equal(staticUnmeasured.adversarialVerificationStatus, "unmeasured");

  const baseManifest = {
    projectId: "release-gate",
    revision: "rev-1",
    branch: "feature/release-gate",
    commit: "deadbeef",
    stage: "ready",
    createdAt: "2026-10-01T00:00:00.000Z",
    verification: [{ id: "build", label: "Build", required: true, status: "passed", evidence: ["build-ok"] }],
    fidelity: { overall: 1 },
    alignmentPassed: true,
    provenanceComplete: true,
    unresolvedCriticalFindings: 0,
    warnings: [],
    artifacts: [],
  };

  assert.equal(release.releaseReady({
    ...baseManifest,
    aiGeneratedOrRepaired: true,
    adversarialVerification: { status: "unmeasured", evidenceIds: [] },
  }), false);
  assert.equal(release.releaseReady({
    ...baseManifest,
    aiGeneratedOrRepaired: true,
    adversarialVerification: { status: "measured-fail", evidenceIds: ["e-release-fail"] },
  }), false);
  assert.equal(release.releaseReady({
    ...baseManifest,
    aiGeneratedOrRepaired: true,
    adversarialVerification: { status: "measured-pass", evidenceIds: ["e-release-pass"] },
  }), true);
  assert.equal(release.releaseReady({ ...baseManifest, aiGeneratedOrRepaired: false }), true);

  console.log("MirrorCraft adversarial release smoke passed");
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
