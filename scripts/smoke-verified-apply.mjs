import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const url = new URL("../src/mirrorcraft/target-studio/apply-transaction.ts", import.meta.url);
let source = "";
try { source = await readFile(url, "utf8"); } catch {}

assert.match(source, /export function prepareApplyTransaction/);
assert.match(source, /export function finalizeApplyTransaction/);
assert.match(source, /verification\.status\s*!==\s*"PASS"/);
assert.match(source, /snapshot/);
assert.match(source, /rollback/);
assert.match(source, /mode:\s*"real"/);
assert.match(source, /postApplyVerification/);
assert.match(source, /ROLLED_BACK/);
assert.match(source, /COMMITTED/);

console.log("MirrorCraft verified apply transaction contract smoke passed");
