import { expect, test } from "@playwright/test";

test("operates the packaged Track B runtime and cloud-backed recommendation flow", async ({
  page,
}) => {
  test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

  await page.goto("/app/system/extensions");
  await expect(
    page.getByRole("heading", { name: "Contribution, disclosure, and opt-out" }),
  ).toBeVisible();

  // Wait for contribution policy to hydrate before branching on opt-out vs re-enable.
  await expect(
    page.getByRole("button", { name: /Opt out & clear queue|Re-enable contribution/ }),
  ).toBeVisible({ timeout: 30_000 });

  const optOut = page.getByRole("button", { name: "Opt out & clear queue" });
  if (await optOut.isVisible()) {
    const [response] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate.url().includes("/api/role-model/contribution") &&
          candidate.request().method() === "PUT",
      ),
      optOut.click(),
    ]);
    expect(response.ok()).toBeTruthy();
  }
  await expect(page.getByText("consumer · none")).toBeVisible();
  const [reenableResponse] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.url().includes("/api/role-model/contribution") &&
        candidate.request().method() === "PUT",
    ),
    page.getByRole("button", { name: "Re-enable contribution" }).click(),
  ]);
  expect(reenableResponse.ok()).toBeTruthy();
  await expect(page.getByText(/pending_disclosure · epoch/)).toBeVisible();
  const [disclosureResponse] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.url().includes("/api/role-model/contribution") &&
        candidate.request().method() === "PUT",
    ),
    page.getByRole("button", { name: "Review disclosure & authorize" }).click(),
  ]);
  expect(disclosureResponse.ok()).toBeTruthy();
  await expect(page.getByText(/active · epoch/)).toBeVisible();

  const signatureStatus = page.getByText(/Signature valid · Local policy allows apply/).first();
  if (!(await signatureStatus.isVisible())) {
    await page.getByRole("button", { name: "Download & validate latest" }).click();
  }
  await expect(signatureStatus).toBeVisible({ timeout: 30_000 });

  // Dismissed rows keep the "Validate & apply" label but stay disabled. Prefer an enabled control.
  let apply = page.getByRole("button", { name: "Validate & apply", disabled: false }).first();
  if (!(await apply.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Download & validate latest" }).click();
    await expect(signatureStatus).toBeVisible({ timeout: 30_000 });
    apply = page.getByRole("button", { name: "Validate & apply", disabled: false }).first();
  }
  await expect(apply).toBeVisible({ timeout: 30_000 });
  await expect(apply).toBeEnabled();
  await apply.scrollIntoViewIfNeeded();
  const [applyResponse] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.url().includes("/api/role-model/recommendations/apply") &&
        candidate.request().method() === "POST",
    ),
    apply.click(),
  ]);
  expect(applyResponse.ok()).toBeTruthy();
  await expect(page.getByText("applied", { exact: true })).toBeVisible();
  await expect(page.getByText("Endpoint").first()).toBeVisible();
  // Seeded packs use candidate-* model ids on permanent-dev; older captures used deepseek.
  await expect(page.getByText(/deepseek|candidate-[ab]/i).first()).toBeVisible();
  await expect(page.getByText("Preferred for").first()).toBeVisible();

  await page.goto("/app/system/storage-retention");
  await expect(page.getByRole("heading", { name: "Retention policy editor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dry-run" })).toBeVisible();
  const richTrace = page.getByText("rich_trace").first();
  const hasRichTrace = await richTrace.isVisible().catch(() => false);
  await page.getByRole("button", { name: "Dry-run" }).click();
  await expect(page.getByText(/\d+ affected · [\d.]+ (?:B|KiB|MiB)/).first()).toBeVisible({
    timeout: 15_000,
  });
  const dryRunText = await page
    .getByText(/\d+ affected · [\d.]+ (?:B|KiB|MiB)/)
    .first()
    .innerText();
  const affectedMatch = dryRunText.match(/^(\d+) affected/);
  const affectedCount = affectedMatch ? Number(affectedMatch[1]) : 0;
  if (affectedCount > 0) {
    await page.getByRole("button", { name: "Execute plan" }).click();
    const cancel = page.getByRole("button", { name: "Cancel job" });
    if (await cancel.isVisible()) {
      await cancel.click();
      await expect(page.getByText(/cancelled · 0%/)).toBeVisible();
    }

    await page.getByRole("button", { name: "Dry-run" }).click();
    await page.getByRole("button", { name: "Execute plan" }).click();
    await expect
      .poll(
        async () => {
          const response = await page.request.get("/api/role-model/storage-retention");
          return (await response.json()).activeJob?.status;
        },
        { timeout: 60_000 },
      )
      .toBe("completed");
    await page.reload();
    await expect(page.getByText(/completed · 100%/)).toBeVisible();
    const rollback = page.getByRole("button", { name: "Rollback" });
    if (await rollback.count()) {
      await rollback.last().click();
      await expect(page.getByText("rolled_back", { exact: true }).last()).toBeVisible();
    }
  }
  if (hasRichTrace) {
    await expect(page.getByText("rich_trace").first()).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Retention policy editor" })).toBeVisible();
  }
  await test.info().attach("run00-live-final", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  if (process.env.RUN00_EVIDENCE_SCREENSHOT)
    await page.screenshot({ fullPage: true, path: process.env.RUN00_EVIDENCE_SCREENSHOT });
});
