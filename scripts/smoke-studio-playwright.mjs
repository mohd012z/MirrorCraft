import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join } from "node:path";

import { chromium } from "playwright";

const ROOT = process.cwd();
const PORT = 3400 + (process.pid % 400);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next");
let serverOutput = "";

const server = spawn(
  process.execPath,
  [nextBin, "start", "-H", "127.0.0.1", "-p", String(PORT)],
  {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Studio server exited early (${server.exitCode}):\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${BASE_URL}/studio`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Studio server did not become ready:\n${serverOutput}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${BASE_URL}/studio`, { waitUntil: "networkidle" });

  // The studio now defaults to the compact IDE (one preview + docked drawers).
  // The category panels live in the preserved List view — switch to it first.
  await page.getByRole("button", { name: /List view/ }).first().click();
  await page.getByRole("heading", { name: "Editing Studio" }).waitFor({ state: "visible" });

  assert.equal(await page.getByRole("heading", { name: "Editing Studio" }).isVisible(), true);

  const projectIO = page.locator("section#project-io");
  assert.equal(await projectIO.isVisible(), true, "Expected Project I/O panel to be mounted");

  const composed = page.locator("section.rounded-2xl").filter({
    has: page.getByText("Editable Composed Preview", { exact: true }),
  }).first();
  assert.equal(await composed.isVisible(), true);

  const editable = composed.locator("[data-mirrorcraft-node]").first();
  const before = (await editable.textContent())?.trim() ?? "";
  assert.ok(before.length > 0, "Expected editable composed content");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    projectIO.getByRole("button", { name: "Export Project", exact: true }).click(),
  ]);
  assert.match(download.suggestedFilename(), /\.mirrorcraft\.json$/);
  const exportedPath = await download.path();
  assert.ok(exportedPath, "Expected exported MirrorCraft bundle path");

  const editedText = `Playwright Studio Edit ${process.pid}`;
  await editable.click();
  const directInput = composed.locator("input").last();
  await directInput.waitFor({ state: "visible" });
  await directInput.fill(editedText);
  await composed.getByRole("button", { name: "Apply", exact: true }).click();
  assert.equal((await editable.textContent())?.trim(), editedText);

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    projectIO.getByRole("button", { name: "Import Project", exact: true }).click(),
  ]);
  await fileChooser.setFiles(exportedPath);
  await projectIO.getByText(/Imported project/).waitFor({ state: "visible" });
  assert.equal((await editable.textContent())?.trim(), before);

  const secondEdit = `${editedText} Undo`;
  await editable.click();
  await composed.locator("input").last().fill(secondEdit);
  await composed.getByRole("button", { name: "Apply", exact: true }).click();
  assert.equal((await editable.textContent())?.trim(), secondEdit);

  const undo = page.getByRole("button", { name: /Undo/ }).first();
  assert.equal(await undo.isEnabled(), true);
  await undo.click();
  assert.equal((await editable.textContent())?.trim(), before);

  const structuredOperations = page.locator("section.rounded-2xl").filter({
    has: page.getByText("Structured Operations", { exact: true }),
  }).first();
  assert.equal(await structuredOperations.isVisible(), true);
  await structuredOperations.getByRole("button", { name: "Hosting", exact: true }).click();
  assert.equal(
    await structuredOperations.getByText("Demo static/personal eligibility snapshot", { exact: true }).isVisible(),
    true,
  );
  assert.ok(
    await structuredOperations.getByText("evidence-ready", { exact: true }).count() > 0,
    "Expected at least one evidence-ready hosting candidate",
  );

  assert.equal(
    await page.getByRole("button", { name: "Compile", exact: true }).isVisible(),
    true,
  );

  console.log("MirrorCraft Studio Playwright smoke passed");
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 2000);
      server.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}
