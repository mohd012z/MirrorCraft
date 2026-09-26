#!/usr/bin/env node
/**
 * MirrorCraft one-command setup
 * Checks Node version, installs deps, prints next steps.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const MIN_MAJOR = 20;
const major = Number(process.versions.node.split(".")[0]);

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

log(`\n⛏  MirrorCraft setup\n`);

if (Number.isNaN(major) || major < MIN_MAJOR) {
  fail(
    `Node.js ${MIN_MAJOR}+ required (you have ${process.versions.node}).\n` +
      `  → https://nodejs.org/`
  );
}
log(`✓ Node ${process.versions.node}`);

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
log(`→ npm install`);
const install = spawnSync(npm, ["install"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (install.status !== 0) fail("npm install failed");

log(`\n✓ ${pkg.name}@${pkg.version} ready\n`);
log(`Next steps:`);
log(`  1. npm run dev          # preview the showcase landing`);
log(`  2. Open in Cursor (or Claude Code / Codex / …)`);
log(`  3. Run: /clone-website https://example.com`);
log(`\nDocs: README.md · Skill: .claude/skills/clone-website/\n`);
