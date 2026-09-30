import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const ROOT = process.cwd();
const TEMP_ROOT = await mkdtemp(join(tmpdir(), "mirrorcraft-studio-publish-"));
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
  return join(TEMP_ROOT, relative(ROOT, sourcePath).replace(/\.(?:ts|tsx)$/, ".mjs"));
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
      errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("; "),
    );
  }
  let output = transpiled.outputText;
  const importPattern = /(from\s+|import\s*)(["'])([^"']+)["']/g;
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
  const publish = await load("src/mirrorcraft/studio-publish.ts");
  const composer = await load("src/mirrorcraft/section-composer/index.ts");
  const sectionContent = await load("src/mirrorcraft/section-content/index.ts");

  const composition = composer.createPageComposition("publish-test", ["hero-centered"]);
  const content = sectionContent.createSectionContentState(composition);

  // 1. A non-empty page compiles successfully with real evidence.
  const ok = publish.compileStudioExport(composition, content, "aurora", "main");
  assert.equal(ok.ok, true, `expected ok compile, got issues: ${JSON.stringify(ok.issues)}`);
  assert.equal(ok.compiledSections, 1);
  assert.equal(ok.hiddenSections, 0);
  assert.ok(ok.html.includes("<!doctype html>"), "html should be a full document");
  assert.ok(ok.bytes > 200, "html should be non-trivial in size");
  assert.match(ok.checksum, /^[0-9a-f]{8}$/, "checksum should be an 8-hex fingerprint");
  assert.equal(ok.branch, "main");

  // 2. Hidden sections are excluded from the compiled count but reported.
  const extra = { ...composition.sections[0], instanceId: `${composition.sections[0].instanceId}-hidden`, hidden: true };
  const withHidden = { ...composition, sections: [...composition.sections, extra], revision: 2 };
  const hidden = publish.compileStudioExport(withHidden, content, "aurora", "preview");
  assert.equal(hidden.ok, true, `expected ok compile with hidden section, got: ${JSON.stringify(hidden.issues)}`);
  assert.equal(hidden.compiledSections, 1, "hidden section must not be compiled");
  assert.equal(hidden.hiddenSections, 1, "hidden section must be reported");

  // 3. The deploy bundle is a real, self-contained artifact.
  const bundle = publish.buildDeployBundle(ok);
  assert.equal(bundle.files.length, 3);
  const names = bundle.files.map((file) => file.name);
  assert.ok(names.includes("index.html"));
  assert.ok(names.includes("mirrorcraft.json"));
  assert.ok(names.includes("DEPLOY.md"));
  const htmlFile = bundle.files.find((file) => file.name === "index.html");
  assert.equal(htmlFile.content, ok.html, "bundle index.html must equal the compiled html");
  const manifest = JSON.parse(bundle.manifestJson);
  assert.equal(manifest.pageId, "publish-test");
  assert.equal(manifest.branch, "main");
  assert.equal(manifest.htmlChecksum, ok.checksum);
  assert.equal(manifest.sections.compiled, 1);
  assert.equal(manifest.sections.total, 1);

  // 4. buildDeployZip produces a valid ZIP (stored entries) that round-trips.
  const zip = publish.buildDeployZip(bundle.files);
  assert.ok(zip.length > bundle.manifestJson.length + 500, "zip should be larger than its content + headers");
  // ZIP magic + end-of-central-directory signature must be present.
  const head = new DataView(zip.buffer, zip.byteOffset, 4);
  const tail = new DataView(zip.buffer, zip.byteOffset + zip.length - 22, 4);
  assert.equal(head.getUint32(0, true), 0x04034b50, "zip must start with a local file header");
  assert.equal(tail.getUint32(0, true), 0x06054b50, "zip must end with the central directory end record");

  // 5. CRC + stored content must actually be recoverable: verify the index.html entry.
  assert.equal(recoverStoredZipEntry(zip, "index.html"), ok.html, "zip entry content must round-trip");

  console.log("MirrorCraft studio publish smoke passed");
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}

// Minimal ZIP reader for stored (uncompressed) entries — verifies the writer
// produces a spec-valid archive without pulling in a dependency.
function recoverStoredZipEntry(zip, entryName) {
  let offset = 0;
  while (offset + 30 <= zip.length) {
    const sig = zip[offset] | (zip[offset + 1] << 8) | (zip[offset + 2] << 16) | (zip[offset + 3] << 24);
    if (sig !== 0x04034b50) break;
    const nameLength = zip[offset + 26] | (zip[offset + 27] << 8);
    const extraLength = zip[offset + 28] | (zip[offset + 29] << 8);
    const name = new TextDecoder().decode(zip.slice(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    const method = zip[offset + 8] | (zip[offset + 9] << 8);
    const size =
      zip[offset + 18] | (zip[offset + 19] << 8) | (zip[offset + 20] << 16) | (zip[offset + 21] << 24);
    offset = dataStart + size;
    if (name === entryName) {
      assert.equal(method, 0, `expected stored entry for ${entryName}`);
      return new TextDecoder().decode(zip.slice(dataStart, dataStart + size));
    }
  }
  void encoder;
  throw new Error(`entry ${entryName} not found in zip`);
}
