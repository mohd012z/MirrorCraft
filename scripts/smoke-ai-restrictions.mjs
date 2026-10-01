import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = process.cwd();
const TEMP_ROOT = await mkdtemp(join(tmpdir(), "mirrorcraft-ai-restrictions-"));
const emitted = new Map();

async function exists(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

async function resolveSource(specifier, parentSource) {
  let base;
  if (specifier.startsWith("@/")) base = join(ROOT, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(parentSource), specifier);
  else return null;
  const candidates = extname(base) ? [base] : [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error(`Unable to resolve ${specifier} from ${parentSource}`);
}

function outputPathFor(sourcePath) {
  return join(TEMP_ROOT, relative(ROOT, sourcePath).replace(/\.(?:ts|tsx)$/, ".mjs"));
}

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
  const restrictions = await loadModule("src/mirrorcraft/policy/restrictions.ts");

  const highRisk = restrictions.restrictionsFromInjectionAssessment({
    score: 0.95,
    classification: "confirmed-injection",
    signals: ["authority-override"],
    evidence: [{ id: "e-authority", signal: "authority-override", source: "browser", excerpt: "fixture", confidence: 0.95 }],
    action: "exclude-from-agent-context",
    sourceContent: "fixture",
  });
  assert.equal(highRisk.allowed, false);
  assert.equal(highRisk.blockers[0].code, "instruction-boundary-violation");
  assert.ok(highRisk.blockers[0].evidence.includes("e-authority"));

  const benign = restrictions.restrictionsFromInjectionAssessment({
    score: 0,
    classification: "none",
    signals: [],
    evidence: [],
    action: "allow-as-data",
    sourceContent: "Authorization policy documentation.",
  });
  assert.equal(benign.allowed, true);
  assert.equal(benign.restrictions.length, 0);

  const toolDenied = restrictions.restrictionsFromToolAuthorization({
    allowed: false,
    reason: "External content cannot authorize git-write.",
    evidenceIds: ["e-tool"],
  });
  assert.equal(toolDenied.allowed, false);
  assert.equal(toolDenied.blockers[0].code, "tool-escalation-request");
  assert.ok(toolDenied.blockers[0].evidence.includes("e-tool"));

  const secretRequest = restrictions.restrictionsFromInjectionAssessment({
    score: 0.99,
    classification: "confirmed-injection",
    signals: ["secret-acquisition-request"],
    evidence: [{ id: "e-secret-request", signal: "secret-acquisition-request", source: "browser", excerpt: "fixture", confidence: 0.99 }],
    action: "exclude-from-agent-context",
    sourceContent: "fixture",
  });
  assert.equal(secretRequest.blockers[0].code, "secret-exposure-request");
  assert.notEqual(secretRequest.blockers[0].code, "secret-boundary-violation");

  console.log("MirrorCraft AI restriction smoke passed");
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
