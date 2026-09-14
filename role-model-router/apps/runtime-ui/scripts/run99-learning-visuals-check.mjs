import { chromium } from "@playwright/test";

const token = process.argv[2];
const outDir = process.argv[3] ?? "E:\\tmp\\p99";
const base = process.argv[4] ?? "http://127.0.0.1:3457";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1560, height: 1200 }, colorScheme: "dark" });
await context.addInitScript(
  ([storageKey, value]) => {
    window.localStorage.setItem(storageKey, value);
  },
  ["role-model.learning.operator-token", token],
);
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await page.goto(`${base}/app/learning/history`, { waitUntil: "domcontentloaded" });
await page.getByText("Activity by bucket").waitFor({ timeout: 45000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}\\run99-learning-history.png`, fullPage: true });
const historyText = await page.locator("body").innerText();

await page.goto(`${base}/app/learning`, { waitUntil: "domcontentloaded" });
await page.getByText("Live replay & evaluation").waitFor({ timeout: 45000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}\\run99-learning-live.png`, fullPage: true });
const overviewText = await page.locator("body").innerText();

// Without an operator token the surface must say so instead of showing an idle readback.
const anonymous = await browser.newContext({ viewport: { width: 1560, height: 1200 }, colorScheme: "dark" });
const anonymousPage = await anonymous.newPage();
await anonymousPage.goto(`${base}/app/learning`, { waitUntil: "domcontentloaded" });
await anonymousPage.getByText("Live replay & evaluation").waitFor({ timeout: 45000 });
await anonymousPage.waitForTimeout(1500);
await anonymousPage.screenshot({ path: `${outDir}\\run99-learning-live-no-token.png`, fullPage: true });
const anonymousText = await anonymousPage.locator("body").innerText();

await browser.close();
console.log(
  JSON.stringify(
    {
      historyHasHeatmap: historyText.includes("Activity by bucket"),
      historyHasMix: historyText.includes("Decisive comparison mix"),
      historyHasTimeline: historyText.includes("Activation timeline"),
      historyHasGuardrails: historyText.includes("Guardrails"),
      historyNumbers: historyText.match(/\b(156|1970|344)\b/g) ?? [],
      liveHasPanel: overviewText.includes("Live replay & evaluation"),
      liveHasPipeline: overviewText.includes("Learner"),
      noTokenSaysTokenRequired: anonymousText.includes("token required") && anonymousText.includes("awaiting operator token"),
      noTokenClaimsIdle: /\bidle\b/.test(anonymousText),
      consoleErrors: errors.slice(0, 5),
    },
    null,
    1,
  ),
);
