import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = process.cwd();
const TEMP_ROOT = await mkdtemp(join(tmpdir(), "mirrorcraft-target-watch-"));
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
async function emitModule(sourcePath) {
  const absolute = resolve(sourcePath);
  if (emitted.has(absolute)) return emitted.get(absolute);
  const outputPath = outputPathFor(absolute); emitted.set(absolute, outputPath);
  const source = await readFile(absolute, "utf8");
  const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, strict: true } });
  let output = transpiled.outputText;
  const pattern = /(from\s+|import\s*)(["'])([^"']+)\2/g;
  const replacements = [];
  for (const match of output.matchAll(pattern)) {
    const dependency = await resolveSource(match[3], absolute); if (!dependency) continue;
    const dependencyOutput = await emitModule(dependency);
    let rewritten = relative(dirname(outputPath), dependencyOutput).replaceAll("\\", "/"); if (!rewritten.startsWith(".")) rewritten = `./${rewritten}`;
    const offset = match.index + match[0].lastIndexOf(match[3]); replacements.push({ start: offset, end: offset + match[3].length, value: rewritten });
  }
  for (const replacement of replacements.sort((a,b) => b.start-a.start)) output = `${output.slice(0,replacement.start)}${replacement.value}${output.slice(replacement.end)}`;
  await mkdir(dirname(outputPath), { recursive: true }); await writeFile(outputPath, output, "utf8"); return outputPath;
}
async function load(path) { return import(pathToFileURL(await emitModule(join(ROOT, path))).href); }

try {
  const targetStudio = await load("src/mirrorcraft/target-studio/index.ts");
  const before = {
    id: "fixture", nodes: {
      "route:/pricing": { id:"route:/pricing", kind:"route", label:"Pricing", route:"/pricing", sourcePath:"src/app/pricing/page.tsx", metadata:{ viewports:[390,768,1440] } },
      "component:PricingCard": { id:"component:PricingCard", kind:"container", label:"PricingCard", route:"/pricing", sourcePath:"src/components/PricingCard.tsx", metadata:{ styles:["pricing-card"], viewports:[390,768,1440], tests:["pricing-mobile.spec.ts"] } },
      "function:pricing-cta": { id:"function:pricing-cta", kind:"function", label:"Pricing CTA", route:"/pricing", sourcePath:"src/components/PricingCard.tsx" },
    }, edges:[
      { from:"route:/pricing", to:"component:PricingCard", kind:"contains" },
      { from:"component:PricingCard", to:"function:pricing-cta", kind:"invokes" },
    ]
  };
  const after = structuredClone(before);
  after.nodes["component:PricingCard"].metadata.styles = ["pricing-card", "pricing-card-compact"];

  assert.equal(typeof targetStudio.watchGraphChanges, "function", "ChangeWatcher API must exist");
  const delta = targetStudio.watchGraphChanges(before, after);
  assert.deepEqual(delta.changedTargetIds, ["component:PricingCard"]);
  assert.deepEqual(delta.addedTargetIds, []);
  assert.deepEqual(delta.removedTargetIds, []);
  assert.ok(delta.impact.affectedRoutes.includes("/pricing"));
  assert.ok(delta.impact.affectedViewports.includes(390));
  assert.ok(delta.impact.affectedTests.includes("pricing-mobile.spec.ts"));
  assert.equal(delta.impact.requiresBehaviorTest, true);
  assert.equal(delta.revalidation.fullProject, false);
  assert.deepEqual(delta.revalidation.routes, ["/pricing"]);
  assert.ok(delta.revalidation.viewports.includes(390));
  assert.ok(delta.revalidation.tests.includes("pricing-mobile.spec.ts"));

  const same = targetStudio.watchGraphChanges(before, structuredClone(before));
  assert.deepEqual(same.changedTargetIds, []);
  assert.equal(same.revalidation.required, false);
  console.log("MirrorCraft target ChangeWatcher smoke passed");
} finally { await rm(TEMP_ROOT, { recursive:true, force:true }); }
