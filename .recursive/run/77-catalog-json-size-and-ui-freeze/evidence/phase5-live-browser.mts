import { chromium } from "../../../../role-model-router/apps/runtime-ui/node_modules/@playwright/test/index.mjs";

const baseUrl = process.env.RUN77_PHASE5_BASE_URL;
if (!baseUrl) throw new Error("RUN77_PHASE5_BASE_URL is required");

const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    (window as unknown as { run77LongTasks: number[] }).run77LongTasks = [];
    new PerformanceObserver((list) => {
      (window as unknown as { run77LongTasks: number[] }).run77LongTasks.push(
        ...list.getEntries().map((entry) => entry.duration),
      );
    }).observe({ type: "longtask", buffered: true });
  });
  const requestedPaths: string[] = [];
  page.on("request", (request) => requestedPaths.push(new URL(request.url()).pathname));
  const candidatesResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/role-model/router/candidates",
  );

  const modelsStartedAt = Date.now();
  await page.goto(`${baseUrl}/app/models`);
  await page.getByRole("heading", { name: "Model inventory" }).waitFor();
  const modelsEssentialMs = Date.now() - modelsStartedAt;
  const candidatePayloadBytes = (await (await candidatesResponse).body()).byteLength;

  const card = page.locator("article").filter({ hasText: "moonshot/kimi-k2.5" });
  await page.waitForTimeout(500);
  if ((await card.count()) === 0) {
    throw new Error(`Kimi card missing from rebuilt runtime UI:\n${(await page.locator("body").innerText()).slice(0, 5_000)}`);
  }
  const inspectButton = card.getByRole("button", { name: "Inspect" });
  if ((await inspectButton.count()) > 0) {
    await inspectButton.click();
  } else {
    await card.getByRole("button", { name: "Selected" }).waitFor();
  }
  const saveButton = page.getByRole("button", { name: "Save bindings" }).first();
  const mutationOffset = requestedPaths.length;
  const mutationResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/role-model/accounts" &&
      response.request().method() === "POST",
  );
  const mutationStartedAt = Date.now();
  const healthStartedAt = Date.now();
  const healthPromise = page.request.get(`${baseUrl}/healthz`);
  const summaryStartedAt = Date.now();
  const summaryPromise = page.request.get(`${baseUrl}/api/role-model/runtime/summary`);
  await saveButton.click();
  const mutationResponse = await mutationResponsePromise;
  const mutationResponseMs = Date.now() - mutationStartedAt;
  await page.getByText("Updated roles for moonshot.run77.phase5.").waitFor();
  await saveButton.waitFor({ state: "visible" });
  const buttonPendingMs = Date.now() - mutationStartedAt;
  const healthStatus = (await healthPromise).status();
  const healthMs = Date.now() - healthStartedAt;
  const summaryStatus = (await summaryPromise).status();
  const summaryMs = Date.now() - summaryStartedAt;
  const mutationPaths = requestedPaths.slice(mutationOffset).filter((path) =>
    [
      "/api/role-model/accounts",
      "/api/role-model/endpoints",
      "/api/role-model/models",
      "/api/role-model/router/candidates",
      "/api/role-model/requests",
    ].includes(path),
  );

  const benchmarkStartedAt = Date.now();
  await page.goto(`${baseUrl}/app/models/benchmark`);
  await page.getByRole("heading", { name: "Run capability benchmark" }).waitFor();
  await page.getByRole("button", { name: /Run quick benchmark/ }).waitFor();
  const benchmarkEssentialMs = Date.now() - benchmarkStartedAt;
  const longTasks = await page.evaluate(
    () => (window as unknown as { run77LongTasks: number[] }).run77LongTasks,
  );

  console.log(
    JSON.stringify(
      {
        modelsEssentialMs,
        candidatePayloadBytes,
        mutationStatus: mutationResponse.status(),
        mutationResponseMs,
        buttonPendingMs,
        convergenceAfterResponseMs: buttonPendingMs - mutationResponseMs,
        mutationPaths,
        richRequestRouteObserved: requestedPaths.includes("/api/role-model/requests"),
        healthStatus,
        healthMs,
        summaryStatus,
        summaryMs,
        benchmarkEssentialMs,
        longTasksMs: longTasks.map((duration) => Number(duration.toFixed(3))),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
