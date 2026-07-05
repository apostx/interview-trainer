import { chromium } from "playwright";

const BASE = "http://localhost:3457";
const SHOTS = process.env.SHOTS_DIR ?? "e2e-shots";
import { mkdirSync } from "node:fs";
mkdirSync(SHOTS, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  // Start a session (backend developer defaults)
  await page.goto(BASE + "/setup/");
  await page.getByRole("button", { name: "Start Practice" }).click();
  await page.waitForURL(/\/session\/?\?id=/);
  console.log("session started:", page.url());

  // Record with the fake microphone (emits a tone)
  await page.getByRole("button", { name: /Start answering/ }).click();
  await page.getByText("Recording…").waitFor();
  console.log("✅ recording state entered (fake mic active)");
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Stop & transcribe" }).click();

  // Model download + transcription — first run downloads whisper-tiny.en
  const start = Date.now();
  let lastLog = "";
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const editing = await page
      .locator("textarea#answer-transcript")
      .isVisible()
      .catch(() => false);
    if (editing) break;
    const status = await page
      .getByText(/Downloading speech model|Transcribing your answer/)
      .textContent()
      .catch(() => null);
    if (status && status !== lastLog) {
      console.log(`   [${Math.round((Date.now() - start) / 1000)}s] ${status}`);
      lastLog = status;
    }
    await page.waitForTimeout(2000);
  }

  const editing = await page
    .locator("textarea#answer-transcript")
    .isVisible()
    .catch(() => false);
  if (!editing) {
    await page.screenshot({ path: `${SHOTS}/mic-stuck.png` });
    console.log("❌ never reached transcript editing state");
  } else {
    const secs = Math.round((Date.now() - start) / 1000);
    const value = await page.locator("textarea#answer-transcript").inputValue();
    const errBox = await page
      .locator('[role="alert"]')
      .textContent()
      .catch(() => null);
    console.log(
      `✅ reached transcript editing after ${secs}s; transcript="${value.slice(0, 120)}"${errBox ? ` alert="${errBox}"` : ""}`,
    );
    await page.screenshot({ path: `${SHOTS}/11-mic-transcript.png` });
  }

  console.log("--- PAGE ERRORS ---");
  console.log(errors.length ? errors.join("\n") : "(none)");
  await browser.close();
}

main().catch((e) => {
  console.error("MIC TEST FAILED:", e);
  process.exit(1);
});
