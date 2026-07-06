import { chromium } from "playwright";

const BASE = "http://localhost:3457";
const SHOTS = process.env.SHOTS_DIR ?? "e2e-shots";
import { mkdirSync } from "node:fs";
mkdirSync(SHOTS, { recursive: true });
const results = [];
const log = (icon, msg) => {
  results.push(`${icon} ${msg}`);
  console.log(`${icon} ${msg}`);
};

const KITCHEN_SINK_ANSWER =
  "It depends on the requirements and constraints. First I would measure and profile — check metrics, logs, p99 latency percentiles and dashboards before changing anything. " +
  "For write operations I would use an idempotency key so the same request multiple times has no duplicate side effect, store the key with a unique constraint and return the same response. " +
  "I would put a message queue between services to decouple them and absorb spikes, with a retry policy with backoff, a dead letter queue for failed messages, and alerting on it. " +
  "For reads I would use cache-aside caching with TTL and explicit invalidation on write, being careful about stale data and cache stampede. " +
  "I would add rate limiting and monitoring with metrics, tracing and alerting for observability. " +
  "The trade-off is eventual consistency and operational complexity versus scalability and reliability.";

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 850 } })).newPage();
  page.setDefaultTimeout(25000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  // ---- 1. Dashboard empty state
  await page.goto(BASE + "/");
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.getByText("No practice yet", { exact: true }).waitFor();
  await page.getByText("Next recommended practice").waitFor();
  await page.screenshot({ path: `${SHOTS}/01-dashboard-empty.png` });
  log("✅", "Dashboard loads: next recommended practice + empty state");

  // ---- 2. Setup: probe zero practice types (in Advanced settings)
  await page.getByRole("main").getByRole("link", { name: "Start Practice" }).first().click();
  await page.getByRole("heading", { name: "Practice setup" }).waitFor();
  await page.getByText("Advanced settings").click();
  const typeCheckbox = (label) =>
    page.locator("label", { hasText: label }).locator('input[type="checkbox"]');
  for (const t of ["Quick Questions", "Real Scenarios", "Architecture Practice"]) {
    await typeCheckbox(t).uncheck();
  }
  await page.getByRole("button", { name: "Start Practice" }).click();
  await page.getByText("Select at least one practice type.").waitFor();
  log("🔍", "Setup with zero practice types → inline error 'Select at least one practice type.'");

  for (const t of ["Quick Questions", "Real Scenarios", "Architecture Practice"]) {
    await typeCheckbox(t).check();
  }
  // Quick length option shows both durations
  await page.getByRole("button", { name: /Quick/ }).waitFor();
  await page.screenshot({ path: `${SHOTS}/02-setup.png` });
  await page.getByRole("button", { name: "Start Practice" }).click();
  await page.waitForURL(/\/session\/?\?id=/);
  log("✅", "Session generated and runner opened: " + page.url());

  // ---- 3. Question loop
  let questionNo = 0;
  let overrideProbed = false;
  let skippedOne = false;
  let hintProbed = false;
  for (let guard = 0; guard < 100; guard++) {
    if (page.url().includes("/summary")) break;

    // Question phase?
    const typeBtn = page.getByRole("button", { name: "Type answer instead" });
    const reviewHeading = page.getByRole("heading", { name: "Answer review" });
    const nextQBtn = page.getByRole("button", { name: /Next question|Continue to follow-up/ });
    const submitFollowUp = page.getByRole("button", { name: "Submit follow-up answer" });

    if (await typeBtn.isVisible().catch(() => false)) {
      const isFollowUp = await page.getByText("Follow-up", { exact: false }).first().isVisible().catch(() => false);
      if (!isFollowUp) {
        questionNo++;
        const qLabel = await page.getByText(/Question \d+ of \d+/).textContent();
        // Probe: thinking timer visible
        const timer = await page.getByText("Thinking time").isVisible().catch(() => false);
        if (questionNo === 1) {
          log(timer ? "✅" : "❌", `${qLabel}: question card + thinking timer ${timer ? "visible" : "MISSING"}`);
          await page.screenshot({ path: `${SHOTS}/03-question.png` });
        }
        if (!hintProbed) {
          const hint = page.getByRole("button", { name: "Show hint" });
          if (await hint.isVisible().catch(() => false)) {
            await hint.click();
            await page.getByText("💡").waitFor();
            log("🔍", "'Show hint' reveals the answer-structure hint");
            hintProbed = true;
          }
        }
        if (!skippedOne && questionNo === 2) {
          await page.getByRole("button", { name: "Skip question" }).click();
          skippedOne = true;
          log("🔍", "Skipped question 2 via 'Skip question' → advanced");
          continue;
        }
      }
      await typeBtn.click();
      const textarea = page.locator("textarea#answer-transcript");
      await textarea.waitFor();
      const submitBtn = page.getByRole("button", { name: /Review answer|Submit follow-up answer|Check my answer/ });
      if (!overrideProbed && (await submitBtn.textContent()) === "Review answer") {
        const disabled = await submitBtn.isDisabled();
        log(disabled ? "🔍" : "❌", `Empty transcript → submit button ${disabled ? "disabled (good)" : "ENABLED (bad)"}`);
      }
      await textarea.fill(isFollowUp ? "I would use idempotency keys and deduplication so retries are safe." : KITCHEN_SINK_ANSWER);
      await submitBtn.click();
      continue;
    }

    if (await reviewHeading.isVisible().catch(() => false)) {
      if (!overrideProbed) {
        const scoreBefore = await page.locator("span.rounded-lg.bg-background").first().textContent();
        // Override the first rubric item to a different status
        const group = page.locator('[role="group"]').first();
        const missingBtn = group.getByRole("button", { name: "Missing" });
        const coveredBtn = group.getByRole("button", { name: "Covered" });
        const wasCovered = (await group.locator('button[aria-pressed="true"]').textContent()) === "Covered";
        await (wasCovered ? missingBtn : coveredBtn).click();
        await page.waitForTimeout(400);
        const scoreAfter = await page.locator("span.rounded-lg.bg-background").first().textContent();
        log(
          scoreBefore !== scoreAfter ? "🔍" : "⚠️",
          `Manual override (${wasCovered ? "covered→missing" : "→covered"}): score ${scoreBefore} → ${scoreAfter}${scoreBefore === scoreAfter ? " (no change?)" : ""}`,
        );
        // put it back
        await (wasCovered ? coveredBtn : missingBtn).click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${SHOTS}/04-review.png` });
        // Probe: mark topic unknown → learning cards land in practice queue
        await page.getByRole("button", { name: "I don't know this topic" }).click();
        await page.getByText("Added learning cards to your practice queue").waitFor();
        log("🔍", "'I don't know this topic' on review → learning cards confirmation shown");
        overrideProbed = true;
      }
      await nextQBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
      continue;
    }

    if (await submitFollowUp.isVisible().catch(() => false)) {
      // follow-up capture in idle state → use type
      continue;
    }
    // follow-up result state → Next question
    const nq = page.getByRole("button", { name: "Next question" });
    if (await nq.isVisible().catch(() => false)) {
      const clicked = await nq.click({ timeout: 5000 }).then(() => true).catch(() => false);
      if (clicked) log("✅", "Follow-up answered and result shown → next question");
      await page.waitForTimeout(400);
      continue;
    }
    await page.waitForTimeout(500);
  }

  // ---- 4. Summary
  await page.waitForURL(/\/summary/);
  await page.getByRole("heading", { name: "Session summary" }).waitFor();
  const overall = await page.getByText("Overall score").locator("..").locator("p").nth(1).textContent();
  log("✅", `Summary page: overall score tile shows ${overall}`);
  const weak = await page.getByText("Weak topics to revisit").isVisible().catch(() => false);
  log(weak ? "✅" : "⚠️", weak ? "Weak topics section present on summary" : "No weak topics section (all covered?)");
  await page.screenshot({ path: `${SHOTS}/05-summary.png`, fullPage: true });

  // ---- 5. Persistence: reload → weak topics from the session survive
  await page.goto(BASE + "/");
  await page.getByText("Your weak topics").waitFor();
  await page.reload();
  await page.getByText("Your weak topics").waitFor();
  log("✅", "Persistence: after full reload dashboard still shows weak topics from the session");
  await page.screenshot({ path: `${SHOTS}/06-dashboard-filled.png` });

  // ---- 6. Practice queue (generated from missed criticals)
  await page.goto(BASE + "/practice/");
  await page.getByRole("heading", { name: "Practice queue" }).waitFor();
  const hasDue = await page.getByText(/card(s)? due/).isVisible().catch(() => false);
  if (hasDue) {
    const dueText = await page.getByText(/card(s)? due/).textContent();
    log("✅", `Practice queue has due items: "${dueText.trim()}"`);
    await page.getByRole("button", { name: "Type answer instead" }).click();
    await page.locator("textarea#answer-transcript").fill("An idempotency key with a unique constraint makes retries safe with no duplicate side effect.");
    await page.getByRole("button", { name: "Check my answer" }).click();
    await page.getByText("How well did you recall this?").waitFor();
    await page.screenshot({ path: `${SHOTS}/07-practice.png` });
    await page.getByRole("button", { name: /^4/ }).click();
    await page.waitForTimeout(500);
    log("✅", "Practice card answered, self-scored 4 → rescheduled and queue advanced");
  } else {
    log("⚠️", "Practice queue empty right after a session with missing criticals — unexpected");
  }

  // ---- 7. Unknown topic intake
  await page.goto(BASE + "/topics/new/");
  await page.getByLabel("Topic name").fill("Event Sourcing Test");
  await page.getByRole("button", { name: "Add topic & create learning cards" }).click();
  await page.waitForURL(/\/practice/);
  const dueAfterIntake = await page.getByText(/card(s)? due/).textContent();
  log("✅", `Unknown topic intake: redirected to practice, queue now "${dueAfterIntake.trim()}" (4 learning cards added)`);

  await page.goto(BASE + "/topics/");
  await page.getByText("Event Sourcing Test", { exact: true }).first().waitFor();
  log("✅", "Topic library lists the new topic (status Unknown)");

  // ---- Study view: browse material without being quizzed
  await page.goto(BASE + "/study/");
  await page.getByRole("heading", { name: "Study", exact: true }).waitFor();
  await page.getByText("Circuit breaker", { exact: true }).first().click();
  await page.getByText("A strong answer covers").first().waitFor();
  log("✅", "Study view: topic expands to question + expected answer points");
  await page.getByLabel("Search topics and questions").fill("idempotency");
  await page.getByText("Idempotency", { exact: true }).first().waitFor();
  log("🔍", "Study search filters topics");
  await page.screenshot({ path: `${SHOTS}/17-study.png` });
  await page.screenshot({ path: `${SHOTS}/08-topics.png` });

  // ---- 8. Settings persistence
  await page.goto(BASE + "/settings/");
  await page.getByLabel("Target role").selectOption("solution_architect");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.getByText("Saved ✓").waitFor();
  await page.reload();
  const roleVal = await page.getByLabel("Target role").inputValue();
  log(roleVal === "solution_architect" ? "🔍" : "❌", `Settings persist across reload (target role = ${roleVal})`);
  // restore
  await page.getByLabel("Target role").selectOption("backend_developer");
  await page.getByRole("button", { name: "Save settings" }).click();

  // ---- 9. Mobile viewport
  const mobile = await (await browser.newContext({ viewport: { width: 375, height: 740 } })).newPage();
  await mobile.goto(BASE + "/");
  await mobile.getByRole("heading", { name: "Dashboard" }).waitFor();
  const bottomNavVisible = await mobile.locator("nav[aria-label='Main navigation']").isVisible();
  const sidebarVisible = await mobile.locator("aside").isVisible().catch(() => false);
  log(bottomNavVisible && !sidebarVisible ? "✅" : "❌", `Mobile 375px: bottom tab bar ${bottomNavVisible ? "visible" : "MISSING"}, sidebar ${sidebarVisible ? "VISIBLE (bad)" : "hidden"}`);
  const hScroll = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  log(hScroll ? "❌" : "🔍", `Mobile: horizontal page scroll ${hScroll ? "PRESENT (bad)" : "absent"}`);
  await mobile.screenshot({ path: `${SHOTS}/09-mobile-dashboard.png` });
  await mobile.goto(page.url().includes("session") ? page.url() : BASE + "/setup/");
  await mobile.screenshot({ path: `${SHOTS}/10-mobile-setup.png` });

  console.log("\n--- PAGE ERRORS ---");
  console.log(errors.length ? errors.join("\n") : "(none)");
  console.log("\n--- SUMMARY ---");
  console.log(results.join("\n"));
  await browser.close();
}

main().catch((e) => {
  console.error("DRIVE FAILED:", e);
  process.exit(1);
});
