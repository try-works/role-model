// Run 77 / SP8: R2-R4, R6-R8, R10, A1-A2; guardrail R7.
import { expect, test } from "@playwright/test";

test("@smoke @recursive:77-catalog-json-size-and-ui-freeze @sp8 keeps Models and Benchmark responsive without the rich request route", async ({
  page,
}) => {
  const requestedPaths: string[] = [];
  page.on("request", (request) => {
    requestedPaths.push(new URL(request.url()).pathname);
  });
  const modelsCandidates = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/role-model/router/candidates",
  );

  const modelsStartedAt = Date.now();
  await page.goto("/app/models");
  await expect(page.getByRole("heading", { name: "Model inventory" })).toBeVisible();
  expect(Date.now() - modelsStartedAt).toBeLessThan(5_000);
  const candidatesBody = await (await modelsCandidates).body();
  expect(candidatesBody.byteLength).toBeLessThan(512 * 1024);

  const kimiInventoryCard = page.locator("article").filter({ hasText: "moonshot/kimi-k2.5" });
  await kimiInventoryCard.getByRole("button", { name: "Inspect" }).click();
  const saveButton = page.getByRole("button", { name: "Save bindings" }).first();
  await expect(saveButton).toBeVisible();
  const mutationRequestOffset = requestedPaths.length;
  const mutationResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/role-model/accounts" &&
      response.request().method() === "POST",
  );
  const mutationStartedAt = Date.now();
  const healthStartedAt = Date.now();
  const healthResponse = page.request.get("/healthz");
  const summaryStartedAt = Date.now();
  const summaryResponse = page.request.get("/api/role-model/runtime/summary");
  await saveButton.click();
  const mutation = await mutationResponse;
  const mutationResponseMs = Date.now() - mutationStartedAt;
  expect(mutation.status()).toBe(200);
  await expect(page.getByText("Updated roles for moonshot.personal.primary.")).toBeVisible();
  await expect(saveButton).toBeEnabled();
  const buttonPendingMs = Date.now() - mutationStartedAt;
  const health = await healthResponse;
  const healthMs = Date.now() - healthStartedAt;
  const summary = await summaryResponse;
  const summaryMs = Date.now() - summaryStartedAt;
  expect(health.status()).toBe(200);
  expect(healthMs).toBeLessThan(1_000);
  expect(summary.status()).toBe(200);
  expect(summaryMs).toBeLessThan(1_000);
  expect(buttonPendingMs - mutationResponseMs).toBeLessThan(500);
  expect(buttonPendingMs).toBeLessThan(3_000);
  const mutationModelPaths = requestedPaths
    .slice(mutationRequestOffset)
    .filter((path) =>
      [
        "/api/role-model/accounts",
        "/api/role-model/endpoints",
        "/api/role-model/models",
        "/api/role-model/router/candidates",
        "/api/role-model/requests",
      ].includes(path),
    );
  expect(mutationModelPaths).toEqual(["/api/role-model/accounts"]);

  expect(requestedPaths).not.toContain("/api/role-model/requests");

  const benchmarkStartedAt = Date.now();
  await page.goto("/app/models/benchmark");
  await expect(page.getByRole("heading", { name: "Run capability benchmark" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Run quick benchmark/ })).toBeVisible();
  const benchmarkEssentialMs = Date.now() - benchmarkStartedAt;
  expect(benchmarkEssentialMs).toBeLessThan(2_000);

  const malformed = await page.request.post("/v1/chat/completions", {
    data: { model: "/proc/1513/fd/63", messages: [{ role: "user", content: "negative control" }] },
  });
  expect(malformed.status()).toBe(400);
  expect((await page.request.get("/healthz")).status()).toBe(200);

  console.log(
    JSON.stringify({
      modelsEssentialMs: Date.now() - modelsStartedAt,
      candidatePayloadBytes: candidatesBody.byteLength,
      mutationResponseMs,
      buttonPendingMs,
      convergenceAfterResponseMs: buttonPendingMs - mutationResponseMs,
      mutationModelPaths,
      healthMs,
      summaryMs,
      benchmarkEssentialMs,
      malformedModelStatus: malformed.status(),
    }),
  );
});
