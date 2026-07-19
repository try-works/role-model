import { writeFile } from "node:fs/promises";
import { chromium } from "../../../../../role-model-router/apps/runtime-ui/node_modules/@playwright/test/index.mjs";

const baseUrl = process.env.RUN77_ADDENDUM_BASE_URL ?? "http://127.0.0.1:55725";
const telemetry = (await fetch(`${baseUrl}/api/role-model/telemetry/requests?limit=50`).then((response) =>
  response.json(),
)) as Array<Record<string, unknown>>;
const successful = telemetry.find(
  (row) => row.requestedModelId === "baseline.remote-only" && row.statusFamily === "success",
);
if (!successful) throw new Error("Successful alias telemetry row is required for browser drill-in");
const requestId = String(successful.requestId);

const routes = [
  "/app",
  "/app/models",
  "/app/models/benchmark",
  "/app/remote/providers",
  "/app/router",
  "/app/router/candidates",
  "/app/router/strategy",
  "/app/router/decisions",
  `/app/router/decisions/${requestId}`,
  "/app/observe/requests",
  "/app/observe/routing",
  `/app/observe/requests/${requestId}`,
  "/app/connect/downstream",
  "/app/system/runtime",
] as const;

const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
try {
  const page = await browser.newPage();
  const results = [];
  for (const route of routes) {
    const apiFailures: Array<{ path: string; status: number }> = [];
    const failedRequests: Array<{ path: string; error: string }> = [];
    const onResponse = (response: { url(): string; status(): number }) => {
      const url = new URL(response.url());
      if (url.pathname.startsWith("/api/") && response.status() >= 400) {
        apiFailures.push({ path: url.pathname, status: response.status() });
      }
    };
    const onRequestFailed = (request: {
      url(): string;
      failure(): { errorText: string } | null;
    }) => {
      const url = new URL(request.url());
      const error = request.failure()?.errorText ?? "unknown";
      const expectedStreamAbort =
        url.pathname === "/api/role-model/telemetry/stream" && error === "net::ERR_ABORTED";
      if (url.pathname.startsWith("/api/") && !expectedStreamAbort) {
        failedRequests.push({ path: url.pathname, error });
      }
    };
    page.on("response", onResponse);
    page.on("requestfailed", onRequestFailed);
    const startedAt = Date.now();
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.locator("main").waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(900);
    const body = await page.locator("body").innerText();
    const headings = await page.locator("h1, h2").allInnerTexts();
    const visibleFatalError = /Unexpected Application Error|Application Error|Failed to load runtime|Route Error/i.test(
      body,
    );
    results.push({
      route,
      status: response?.status() ?? null,
      elapsedMs: Date.now() - startedAt,
      headings: headings.slice(0, 5),
      bodyCharacters: body.length,
      apiFailures,
      failedRequests,
      visibleFatalError,
    });
    page.off("response", onResponse);
    page.off("requestfailed", onRequestFailed);
  }

  const failed = results.filter(
    (result) =>
      result.status !== 200 ||
      result.headings.length === 0 ||
      result.apiFailures.length > 0 ||
      result.failedRequests.length > 0 ||
      result.visibleFatalError,
  );
  const receipt = { generatedAt: new Date().toISOString(), requestId, results, failed };
  await writeFile(
    new URL("./browser-route-receipt.json", import.meta.url),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(receipt, null, 2));
  if (failed.length > 0) throw new Error(`${failed.length} affected browser routes failed`);
} finally {
  await browser.close();
}
