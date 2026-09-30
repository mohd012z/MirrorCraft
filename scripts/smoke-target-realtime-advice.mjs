import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/mirrorcraft/target-studio/advice.ts", import.meta.url), "utf8");

assert.match(source, /export function buildRealtimeAdvice/);
assert.match(source, /command:\s*"rectify"/);
assert.match(source, /mode:\s*"virtual"/);
assert.match(source, /behavioral/);
assert.match(source, /visual/);
assert.match(source, /structural/);
assert.match(source, /affectedRoutes/);
assert.match(source, /affectedViewports/);
assert.doesNotMatch(source, /mode:\s*"real"/);

console.log("MirrorCraft realtime advice contract smoke passed");
