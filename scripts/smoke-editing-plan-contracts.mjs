import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const ROOT = process.cwd();
const TEMP_ROOT = await mkdtemp(join(tmpdir(), "mirrorcraft-edit-contracts-"));
const emitted = new Map();

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function resolveSource(specifier, parentSource) {
  let base;
  if (specifier.startsWith("@/")) {
    base = join(ROOT, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(dirname(parentSource), specifier);
  } else {
    return null;
  }

  const candidates = extname(base)
    ? [base]
    : [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error(`Unable to resolve ${specifier} from ${parentSource}`);
}

function outputPathFor(sourcePath) {
  return join(
    TEMP_ROOT,
    relative(ROOT, sourcePath).replace(/\.(?:ts|tsx)$/, ".mjs"),
  );
}

async function emitModule(sourcePath) {
  const absolute = resolve(sourcePath);
  const cached = emitted.get(absolute);
  if (cached) return cached;

  const outputPath = outputPathFor(absolute);
  emitted.set(absolute, outputPath);
  const source = await readFile(absolute, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
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

  let output = transpiled.outputText;
  const importPattern = /(from\s+|import\s*)(["'])([^"']+)\2/g;
  const replacements = [];
  for (const match of output.matchAll(importPattern)) {
    const dependencySource = await resolveSource(match[3], absolute);
    if (!dependencySource) continue;
    const dependencyOutput = await emitModule(dependencySource);
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

async function load(relativePath) {
  return import(pathToFileURL(await emitModule(join(ROOT, relativePath))).href);
}

try {
  const history = await load("src/mirrorcraft/editing/history.ts");
  const rename = await load("src/mirrorcraft/editing/rename.ts");
  const restructure = await load("src/mirrorcraft/editing/restructure.ts");
  const compile = await load("src/mirrorcraft/editing/compile-engine.ts");
  const composer = await load("src/mirrorcraft/section-composer/index.ts");
  const sectionContent = await load("src/mirrorcraft/section-content/index.ts");
  const siteDna = await load("src/mirrorcraft/site-dna/schema.ts");

  const composition = composer.createPageComposition("contract", ["hero-centered"]);
  const content = sectionContent.createSectionContentState(composition);
  const baseline = history.createEditCheckpoint(composition, content, { label: "Baseline" });
  let editHistory = history.createEditHistory(baseline, 10);
  const headingNodeId = sectionContent.getSectionSlotNodeId(
    composition.sections[0].instanceId,
    "heading",
  );
  const editedContent = {
    revision: content.revision + 1,
    values: { ...content.values, [headingNodeId]: "Edited through contract" },
  };
  const edited = history.createEditCheckpoint(composition, editedContent, { label: "Edited" });
  editHistory = history.recordEdit(editHistory, edited, { label: "Edit heading" });
  assert.equal(editHistory.present.content.values[headingNodeId], "Edited through contract");
  editHistory = history.undoEdit(editHistory);
  assert.equal(editHistory.present.content.values[headingNodeId], content.values[headingNodeId]);
  editHistory = history.redoEdit(editHistory);
  assert.equal(editHistory.present.content.values[headingNodeId], "Edited through contract");

  const graph = {
    nodes: {
      "route:pricing": {
        id: "route:pricing",
        type: "route",
        label: "Pricing",
        routeId: "/pricing",
        metadata: { path: "/pricing", canonical: "/pricing" },
      },
      nav: {
        id: "nav",
        type: "component",
        label: "Navigation",
        metadata: { href: "/pricing" },
      },
      pricing: {
        id: "pricing",
        type: "component",
        label: "Pricing",
        metadata: { componentName: "Pricing" },
      },
    },
    edges: [
      { from: "nav", to: "route:pricing", type: "navigates-to" },
      { from: "pricing", to: "route:pricing", type: "renders" },
    ],
  };
  const routePlan = rename.planRename(graph, {
    targetId: "route:pricing",
    kind: "route",
    from: "/pricing",
    to: "/plans",
  });
  assert.equal(routePlan.atomic, true);
  assert.equal(routePlan.after.nodes["route:pricing"].routeId, "/plans");
  assert.equal(routePlan.after.nodes.nav.metadata.href, "/plans");
  assert.equal(routePlan.after.nodes["route:pricing"].metadata.canonical, "/plans");
  assert.deepEqual(rename.applyRenamePlan(graph, routePlan), routePlan.after);
  assert.throws(
    () => rename.applyRenamePlan({ ...graph, nodes: { ...graph.nodes, extra: { id: "extra", type: "file", label: "extra" } } }, routePlan),
    /stale/,
  );
  const componentPlan = rename.planRename(graph, {
    targetId: "pricing",
    kind: "component",
    from: "Pricing",
    to: "Plans",
  });
  assert.equal(componentPlan.after.nodes.pricing.label, "Plans");
  assert.equal(componentPlan.after.nodes.pricing.metadata.componentName, "Plans");

  const dna = siteDna.createEmptySiteDNA("restructure", "fixture");
  const confidence = { score: 1, reasons: ["fixture"] };
  dna.components.parent = {
    id: "parent",
    name: "Parent",
    routeIds: ["home"],
    children: ["a", "b"],
    fingerprints: {},
    confidence,
  };
  dna.components.a = {
    id: "a",
    name: "A",
    routeIds: ["home"],
    parentId: "parent",
    children: [],
    fingerprints: {},
    confidence,
  };
  dna.components.b = {
    id: "b",
    name: "B",
    routeIds: ["home"],
    parentId: "parent",
    children: [],
    fingerprints: {},
    confidence,
  };
  dna.responsive.a = [
    {
      viewport: { id: "mobile", width: 390, height: 844 },
      routeId: "home",
      componentId: "a",
      visible: true,
    },
  ];

  const moved = restructure.moveComponent(dna, "b", "parent", 0);
  assert.deepEqual(moved.after.components.parent.children, ["b", "a"]);
  assert.deepEqual(moved.after.responsive, dna.responsive);
  assert.deepEqual(restructure.rollbackRestructure(moved), dna);

  const wrapper = {
    id: "wrapper",
    name: "Wrapper",
    routeIds: ["home"],
    children: [],
    fingerprints: {},
    confidence,
  };
  const wrapped = restructure.wrapComponents(dna, ["a", "b"], wrapper);
  assert.deepEqual(wrapped.after.components.parent.children, ["wrapper"]);
  assert.deepEqual(wrapped.after.components.wrapper.children, ["a", "b"]);
  assert.equal(wrapped.after.components.a.parentId, "wrapper");
  assert.deepEqual(restructure.rollbackRestructure(wrapped), dna);
  const unwrapped = restructure.unwrapComponent(wrapped.after, "wrapper");
  assert.deepEqual(unwrapped.after.components.parent.children, ["a", "b"]);
  assert.equal(unwrapped.after.components.wrapper, undefined);

  const passingChecks = [
    ["lint", "Lint"],
    ["typecheck", "Typecheck"],
    ["build", "Build"],
    ["route", "Route smoke"],
    ["console", "Console smoke"],
  ].map(([id, name]) => ({ id, name, required: true, status: "passed", evidence: ["fixture"] }));
  const passingReport = compile.evaluateCompileReport(passingChecks);
  assert.equal(passingReport.passed, true);
  const failingReport = compile.evaluateCompileReport(
    passingChecks.map((check) =>
      check.id === "console" ? { ...check, status: "failed", evidence: ["console error"] } : check,
    ),
  );
  assert.equal(failingReport.passed, false);
  const readyManifest = {
    projectId: "compile-contract",
    revision: "rev-1",
    branch: "feature/test",
    commit: "abc123",
    stage: "ready",
    createdAt: "2026-09-27T00:00:00.000Z",
    verification: passingChecks,
    fidelity: { overall: 1 },
    alignmentPassed: true,
    provenanceComplete: true,
    unresolvedCriticalFindings: 0,
    warnings: [],
    artifacts: [],
  };
  const compilePublish = compile.evaluateCompilePublish(readyManifest, failingReport);
  assert.equal(compilePublish.allowed, false);
  assert.ok(compilePublish.blockers.some((item) => item.includes("Console smoke failed")));

  console.log("MirrorCraft editing plan contracts smoke passed");
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
