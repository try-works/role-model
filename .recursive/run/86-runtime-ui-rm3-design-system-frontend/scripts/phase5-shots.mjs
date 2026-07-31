import { chromium } from "@playwright/test";
import path from "node:path";
const dest = process.argv[2];
const base = "http://127.0.0.1:3470";
const routes = [
  ["/app", "overview-dark.png", /Runtime overview/i],
  ["/app/studio/chat", "studio-chat-dark.png", /Chat workspace|Chat/i],
  ["/app/remote/providers", "remote-providers-dark.png", /Provider|Remote/i],
  ["/app/local/endpoints", "local-endpoints-dark.png", /Local endpoints|Endpoint/i],
  ["/app/models", "models-dark.png", /Configured models|Models/i],
  ["/app/router/strategy", "router-strategy-dark.png", /Routing strategy/i],
  ["/app/router/config", "router-config-redirect.png", /Routing strategy/i],
  ["/app/observe/activity", "observe-activity-dark.png", /Activity|Observe/i],
];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
for (const [route, file, heading] of routes) {
  await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("h1", { timeout: 20000 });
  await page.waitForTimeout(700);
  console.log(JSON.stringify({ route, href: page.url(), h1: await page.locator("h1").first().textContent(), file }));
  await page.screenshot({ path: path.join(dest, file), fullPage: true });
}
await page.goto(base + "/app", { waitUntil: "domcontentloaded" });
await page.waitForSelector("h1");
await page.getByRole("button", { name: /Switch to light theme/i }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(dest, "overview-light.png"), fullPage: true });
console.log(JSON.stringify({ route: "/app", theme: "light", file: "overview-light.png" }));
await browser.close();
