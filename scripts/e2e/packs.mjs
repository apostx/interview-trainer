import { chromium } from "playwright";

const BASE = "http://localhost:3457";
const SHOTS = process.env.SHOTS_DIR ?? "e2e-shots";
import { mkdirSync } from "node:fs";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (
  await browser.newContext({ viewport: { width: 1280, height: 900 } })
).newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

// 1. Topics page: pack card + pack topic present
await page.goto(BASE + "/topics/");
await page.getByRole("heading", { name: "Topic library" }).waitFor();
const packLine = await page
  .getByText("Example pack — GraphQL Federation")
  .first()
  .isVisible()
  .catch(() => false);
console.log(
  packLine
    ? "✅ Content packs card lists 'Example pack — GraphQL Federation' (require.context works at runtime)"
    : "❌ pack NOT listed on topics page",
);
const packTopic = await page
  .getByText("GraphQL Federation", { exact: true })
  .first()
  .isVisible()
  .catch(() => false);
console.log(
  packTopic
    ? "✅ Pack topic 'GraphQL Federation' merged into the topic library (via syncSeedTopics)"
    : "❌ pack topic missing from library",
);
await page.screenshot({ path: `${SHOTS}/12-topics-with-pack.png` });

// 2. Setup: no difficulty select anymore
await page.goto(BASE + "/setup/");
await page.getByRole("heading", { name: "Practice setup" }).waitFor();
const diffVisible = await page
  .getByText("Difficulty", { exact: true })
  .isVisible()
  .catch(() => false);
console.log(
  diffVisible
    ? "❌ Difficulty select still on setup page"
    : "🔍 Difficulty select removed from session setup",
);
await page.screenshot({ path: `${SHOTS}/13-setup-no-difficulty.png` });

// 3. Backend architect session with only the pack's modes → pack question reachable
//    (concept_check + tradeoff_decision include the two pack cards)
let foundPackQuestion = false;
for (let attempt = 0; attempt < 6 && !foundPackQuestion; attempt++) {
  await page.goto(BASE + "/setup/");
  await page.getByLabel("Role").selectOption("backend_architect");
  await page.getByRole("button", { name: "Start Practice" }).click();
  await page.waitForURL(/\/session\/?\?id=/);
  // walk through questions by title without answering: skip through
  for (let q = 0; q < 10; q++) {
    if (page.url().includes("/summary")) break;
    const title = await page
      .locator("h1")
      .first()
      .textContent()
      .catch(() => null);
    if (title && /GraphQL Federation|Federation vs single/.test(title)) {
      foundPackQuestion = true;
      console.log(`✅ Pack question appeared in a generated session: "${title}" (attempt ${attempt + 1})`);
      await page.screenshot({ path: `${SHOTS}/14-pack-question-in-session.png` });
      break;
    }
    const skip = page.getByRole("button", { name: "Skip question" });
    if (await skip.isVisible().catch(() => false)) {
      await skip.click().catch(() => {});
      await page.waitForTimeout(400);
    } else break;
  }
}
if (!foundPackQuestion) {
  console.log("⚠️ Pack question did not appear in 6 generated sessions (random selection — check weighting)");
}

console.log("--- PAGE ERRORS ---");
console.log(errors.length ? errors.join("\n") : "(none)");
await browser.close();
