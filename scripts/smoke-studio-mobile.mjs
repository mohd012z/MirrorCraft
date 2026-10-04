import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join } from "node:path";

import { chromium } from "playwright";

const ROOT = process.cwd();
const PORT = 3800 + (process.pid % 300);
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
      // starting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Studio server did not become ready:\n${serverOutput}`);
}

let browser;
try {
  await waitForServer();
  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    launchOptions.args = ["--no-sandbox"];
  }
  browser = await chromium.launch(launchOptions);

  // Phone viewport: the compact IDE must expose navigator + inspector functions,
  // keep the bottom tool bar usable, and avoid horizontal page overflow.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${BASE_URL}/studio`, { waitUntil: "networkidle" });

  assert.equal(
    await mobile.getByRole("button", { name: "Navigator", exact: true }).isVisible(),
    true,
    "mobile must expose the navigator",
  );
  assert.equal(
    await mobile.getByRole("button", { name: "Inspector", exact: true }).isVisible(),
    true,
    "mobile must expose the inspector",
  );
  assert.equal(
    await mobile.getByRole("button", { name: "Publish", exact: true }).isVisible(),
    true,
    "mobile must expose the publish gate entry point",
  );

  const overflow = await mobile.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(
    overflow.scroll <= overflow.viewport + 2,
    `mobile page must not horizontally overflow (${overflow.scroll} > ${overflow.viewport})`,
  );

  await mobile.getByRole("button", { name: "Navigator", exact: true }).click();
  const mobileNavigator = mobile.locator('[data-mobile-panel="navigator"]');
  await mobileNavigator.waitFor({ state: "visible" });
  assert.equal(
    await mobileNavigator.getByText("Sections", { exact: true }).isVisible(),
    true,
    "navigator drawer must contain section controls",
  );
  await mobileNavigator.getByRole("button", { name: /Close navigator/i }).click();

  await mobile.getByRole("button", { name: "Inspector", exact: true }).click();
  const mobileInspector = mobile.locator('[data-mobile-panel="inspector"]');
  await mobileInspector.waitFor({ state: "visible" });
  assert.equal(
    await mobileInspector.getByText("Inspector", { exact: true }).isVisible(),
    true,
    "inspector drawer must render the real inspector",
  );
  await mobileInspector.getByRole("button", { name: /Close inspector/i }).click();

  // Bottom tools should be a single scrollable row rather than wrapping into
  // multiple rows that cover the canvas on a phone.
  const bottomBar = mobile.locator('footer[data-studio-bottom-bar="true"]');
  await bottomBar.waitFor({ state: "visible" });
  assert.equal(
    await bottomBar.evaluate((el) => getComputedStyle(el).overflowX === "auto" || getComputedStyle(el).overflowX === "scroll"),
    true,
    "bottom studio tools must scroll horizontally on narrow screens",
  );

  await mobile.close();

  // Desktop: selected branch must reach the canonical Compile/Publish gate and
  // there must be no separate fake top-bar Compile button.
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto(`${BASE_URL}/studio`, { waitUntil: "networkidle" });

  assert.equal(
    await desktop.getByRole("button", { name: "Compile", exact: true }).count(),
    0,
    "compact IDE top bar must not expose a second fake Compile action",
  );

  const branchButton = desktop.getByRole("button", { name: /Branch main/ }).first();
  await branchButton.click();
  await desktop.getByRole("button", { name: /preview/ }).click();

  await desktop.locator("footer").getByRole("button", { name: "Project", exact: true }).click();
  const projectDrawer = desktop.locator('[data-studio-drawer="project"]');
  await projectDrawer.waitFor({ state: "visible" });
  const compileButton = projectDrawer.getByRole("button", { name: /Compile/ });
  await compileButton.click();
  assert.equal(
    await projectDrawer.getByText("preview", { exact: true }).isVisible(),
    true,
    "compile evidence must use the branch selected in the top bar",
  );

  console.log("MirrorCraft mobile UI smoke passed");
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
