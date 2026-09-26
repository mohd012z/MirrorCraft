#!/usr/bin/env node
/**
 * Cross-platform AGENTS.md → agent config sync (Windows-friendly).
 * Equivalent to sync-agent-rules.sh
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "AGENTS.md");

if (!existsSync(sourcePath)) {
  console.error("Error: AGENTS.md not found");
  process.exit(1);
}

function resolveImports(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^@(.+)$/);
      if (!m) return line;
      const resolved = join(root, m[1]);
      if (existsSync(resolved)) {
        return readFileSync(resolved, "utf8").replace(/\r\n/g, "\n") + "\n";
      }
      return `<!-- Import not found: ${m[1]} -->`;
    })
    .join("\n");
}

const resolved = resolveImports(readFileSync(sourcePath, "utf8"));
const header = `<!-- AUTO-GENERATED from AGENTS.md — do not edit directly.
     Run \`node scripts/sync-agent-rules.mjs\` (or bash scripts/sync-agent-rules.sh) to regenerate. -->`;

function writeFile(target, content) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${header}\n\n${content}\n`, "utf8");
  console.log(`  ✓ ${target.replace(root + "\\", "").replace(root + "/", "")}`);
}

console.log("Syncing agent rules from AGENTS.md...");
writeFile(join(root, ".github/copilot-instructions.md"), resolved);
writeFile(join(root, ".clinerules"), resolved);
writeFile(
  join(root, ".continue/rules/project.md"),
  `---
description: Project conventions for MirrorCraft
alwaysApply: true
---
${resolved}`
);
writeFile(join(root, ".amazonq/rules/project.md"), resolved);
console.log("\nDone.");
