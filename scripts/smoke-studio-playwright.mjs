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
  browser = await chromium.launch({ headless: true });
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

  // ---------- compact IDE: functional inspection buttons (from the defense study) ----------
  // Back to the default compact IDE — its bottom bar now exposes the real
  // inspection drawers: AI Trust, Map, 360°, Diff, Network, Console.
  await page.getByRole("button", { name: /Compact IDE/ }).first().click();
  await page.locator("footer").getByRole("button", { name: "AI Trust" }).waitFor({ state: "visible" });

  for (const [label, marker] of [
    ["AI Trust", "content scan"],
    ["Map", "Page structure"],
    ["360°", "Focus node"],
    ["Diff", "session"],
    ["Network", "evidence-first"],
    ["Console", "event stream"],
  ]) {
    const button = page.locator("footer").getByRole("button", { name: label, exact: true });
    assert.equal(await button.isVisible(), true, `Expected bottom-bar button "${label}"`);
    await button.click();
    // The docked drawer overlays the canvas with a titled header + live content.
    const drawer = page.locator(".absolute.inset-0.top-14").first();
    assert.equal(await drawer.isVisible(), true, `Drawer for "${label}" did not open`);
    assert.ok(
      (await drawer.textContent())?.toLowerCase().includes(marker.toLowerCase()),
      `Drawer "${label}" missing expected content marker "${marker}"`,
    );
    await drawer.getByRole("button", { name: /Close/ }).click();
    await drawer.waitFor({ state: "hidden" });
  }

  // The AI Trust drawer must report the real scan (sections counted), not a stub.
  await page.locator("footer").getByRole("button", { name: "AI Trust", exact: true }).click();
  const aiDrawer = page.locator(".absolute.inset-0.top-14").first();
  assert.ok(
    /section\(s\)/.test((await aiDrawer.textContent()) ?? ""),
    "AI Trust drawer should show a section count from the real scan",
  );

  // 360° must list the real page-model nodes in its focus select.
  await aiDrawer.getByRole("button", { name: /Close/ }).click();
  await aiDrawer.waitFor({ state: "hidden" });
  await page.locator("footer").getByRole("button", { name: "360°", exact: true }).click();
  const context360 = page.locator(".absolute.inset-0.top-14").first();
  assert.ok(
    (await context360.locator("select option").count()) >= 2,
    "360° should list multiple real nodes",
  );

  // Network: this starter page model has no route/api/asset nodes, so the
  // button must surface the honest evidence-first note (no fabricated data).
  await context360.getByRole("button", { name: /Close/ }).click();
  await context360.waitFor({ state: "hidden" });
  await page.locator("footer").getByRole("button", { name: "Network", exact: true }).click();
  const networkDrawer = page.locator(".absolute.inset-0.top-14").first();
  assert.ok(
    (await networkDrawer.textContent())?.includes("npm run clone:url"),
    "Network drawer should point to the local runtime as the real data source",
  );
  await networkDrawer.getByRole("button", { name: /Close/ }).click();
  await networkDrawer.waitFor({ state: "hidden" });

  // Console: the live stream must capture real studio bus events while open.
  await page.locator("footer").getByRole("button", { name: "Console", exact: true }).click();
  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent("mirrorcraft:studio-viewport", { detail: "portrait" }));
    document.dispatchEvent(new CustomEvent("mirrorcraft:studio-toast", { detail: { message: "console probe" } }));
  });
  await page.waitForTimeout(150);
  const consoleDrawer = page.locator(".absolute.inset-0.top-14").first();
  const consoleText = (await consoleDrawer.textContent()) ?? "";
  assert.ok(/viewport/.test(consoleText), "Console should capture viewport events");
  assert.ok(/console probe/.test(consoleText), "Console should capture event detail");

  // Diff: after a real edit, the drawer must produce the actual change report.
  await consoleDrawer.getByRole("button", { name: /Close/ }).click();
  await consoleDrawer.waitFor({ state: "hidden" });
  const diffEditable = composed.locator("[data-mirrorcraft-node]").first();
  await diffEditable.click();
  const diffInput = composed.locator("input").last();
  await diffInput.waitFor({ state: "visible" });
  await diffInput.fill("Diff probe edit");
  await composed.getByRole("button", { name: "Apply", exact: true }).click();
  await page.locator("footer").getByRole("button", { name: "Diff", exact: true }).click();
  const diffDrawer = page.locator(".absolute.inset-0.top-14").first();
  const diffText = (await diffDrawer.textContent()) ?? "";
  assert.ok(diffText.includes("Session change report"), "Diff should show the real change report after an edit");
  assert.ok(/content value\(s\)/.test(diffText), "Diff report should count the edit");

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
