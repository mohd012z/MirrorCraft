import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const navigatorUrl = new URL("../src/mirrorcraft/target-studio/problem-navigator.ts", import.meta.url);
let source = "";
try { source = await readFile(navigatorUrl, "utf8"); } catch {}

assert.match(source, /export function buildProblemNavigation/);
assert.match(source, /export function buildCorrectionPreview/);
assert.match(source, /sourceRange/);
assert.match(source, /before/);
assert.match(source, /after/);
assert.match(source, /command:\s*"rectify"/);
assert.match(source, /mode:\s*"virtual"/);
assert.match(source, /verification/);
assert.match(source, /evidence/);
assert.doesNotMatch(source, /mode:\s*"real"/);

console.log("MirrorCraft ProblemNavigator contract smoke passed");
