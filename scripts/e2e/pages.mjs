import { chromium } from "playwright";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

// Serves the static export (out/) at the root, the way the custom domain
// (interviewtrainer.sallai.cc) does. Build first with: npm run build
const PORT = 3459;
const PREFIX = "";
const OUT = path.join(process.cwd(), "out");
const BASE = `http://localhost:${PORT}${PREFIX}`;
const SHOTS = process.env.SHOTS_DIR ?? "e2e-shots";
mkdirSync(SHOTS, { recursive: true });

if (!existsSync(path.join(OUT, "index.html"))) {
  console.error("out/ is missing — run the basePath build first (see header).");
  process.exit(1);
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, BASE).pathname);
  if (!urlPath.startsWith(PREFIX)) {
    res.writeHead(404).end("outside basePath");
    return;
  }
  let filePath = path.join(OUT, urlPath.slice(PREFIX.length));
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!existsSync(filePath)) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": MIME[path.extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
});
await new Promise((resolve) => server.listen(PORT, resolve));

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (
  await browser.newContext({ viewport: { width: 1280, height: 900 } })
).newPage();
page.setDefaultTimeout(20000);

const errors = [];
const failedRequests = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith("http://localhost:3459")) {
    failedRequests.push(`${r.status()} ${r.url()}`);
  }
});
page.on("requestfailed", (r) => {
  if (r.url().startsWith("http://localhost:3459")) {
    failedRequests.push(`FAILED ${r.url()} (${r.failure()?.errorText})`);
  }
});

// 1. Dashboard under basePath
await page.goto(BASE + "/");
await page.getByRole("heading", { name: "Dashboard" }).waitFor();
console.log("✅ Dashboard loads from static export at root");
await page.screenshot({ path: `${SHOTS}/15-pages-dashboard.png` });

// 2. Client-side nav to setup, start a session (query-param route)
await page.getByRole("main").getByRole("link", { name: "Start Practice" }).first().click();
await page.getByRole("heading", { name: "Practice setup" }).waitFor();
await page.getByRole("button", { name: "Start Practice" }).click();
await page.waitForURL(/\/session\/?\?id=/);
console.log("✅ Session started, query-param URL:", page.url());

// 3. Worker preload: the session page creates the Whisper worker on mount.
await page.waitForTimeout(3000);
const workerFailed = failedRequests.filter((r) => /worker|whisper/i.test(r));
console.log(
  workerFailed.length === 0
    ? "✅ No failed local requests while worker bootstraps"
    : `❌ worker asset failures: ${workerFailed.join(", ")}`,
);

// 4. Answer one question via typing → review renders
await page.getByRole("button", { name: "Type answer instead" }).click();
await page
  .locator("textarea#answer-transcript")
  .fill("It depends on the requirements. I would use an idempotency key, a message queue with retries and a dead letter queue, plus monitoring and alerting.");
await page.getByRole("button", { name: "Review answer" }).click();
await page.getByRole("heading", { name: "Answer review" }).waitFor();
console.log("✅ Answer reviewed on the static build");
await page.screenshot({ path: `${SHOTS}/16-pages-review.png` });

// 5. Direct URL load (hard refresh) of a client route under basePath
await page.goto(BASE + "/topics/");
await page.getByRole("heading", { name: "Topic library" }).waitFor();
const packOk = await page
  .getByText("Frontend interview prep (Nagarro)")
  .first()
  .isVisible()
  .catch(() => false);
console.log(
  packOk
    ? "✅ Direct navigation to /topics/ works; content pack loaded in static build"
    : "❌ /topics/ direct load or pack loading broken",
);

// 6. 404 handling probe
const resp = await page.goto(BASE + "/nonexistent/");
console.log(
  resp.status() === 404
    ? "🔍 Unknown path returns 404 (expected on Pages: default 404.html)"
    : `🔍 Unknown path status: ${resp.status()}`,
);

console.log("--- PAGE ERRORS ---");
console.log(errors.length ? errors.join("\n") : "(none)");
console.log("--- FAILED REQUESTS ---");
console.log(failedRequests.length ? failedRequests.join("\n") : "(none)");
await browser.close();
server.close();
