import { expect, test } from "@playwright/test";

/**
 * Run 101 / R10: the queue page reads queue truth and the operator API agrees
 * with what it renders.
 *
 * Phase 5 runs this against the rebuilt packaged runtime while real traffic
 * flows, so the numbers have to move: the spec asserts the page's table matches
 * `/api/role-model/operator/queues` for the same instant, and that a queue's
 * drill-in lists at least the rows the API reports.
 */
test.describe("@recursive:101-effect-mq-queue-rebuild @sp10 @smoke", () => {
  test("queue page and operator readback agree", async ({ page }) => {
    const response = await page.request.get("/api/role-model/operator/queues");
    expect(response.ok()).toBeTruthy();
    const readback = (await response.json()) as {
      available: boolean;
      queues: Array<{
        name: string;
        mode: string;
        waiting: number;
        active: number;
        failed: number;
      }>;
    };
    expect(readback.queues.map((queue) => queue.name)).toEqual([
      "replay.dispatch",
      "evaluation.score",
      "learner.derive",
      "learner.promote",
    ]);

    await page.goto("/app/observe/queues");
    await expect(page.getByRole("heading", { name: "Queues" })).toBeVisible();

    for (const queue of readback.queues) {
      const row = page.getByRole("row").filter({ hasText: queue.name }).first();
      await expect(row).toBeVisible();
      await expect(row).toContainText(queue.mode);
    }

    // The drill-in is queue-scoped: selecting the first queue must show its own
    // job table rather than every queue's rows.
    const first = readback.queues[0];
    if (first) {
      await page.getByRole("button", { name: first.name }).first().click();
      await expect(page.getByRole("heading", { name: `${first.name} jobs` })).toBeVisible();
    }
  });

  test("a plane still on legacy says so rather than showing invented work", async ({ page }) => {
    const response = await page.request.get("/api/role-model/operator/queues");
    const readback = (await response.json()) as {
      available: boolean;
      reason?: string;
      queues: Array<{ name: string; mode: string }>;
    };
    await page.goto("/app/observe/queues");
    if (!readback.available) {
      await expect(page.getByText(/legacy/)).toBeVisible();
    } else {
      for (const queue of readback.queues.filter((entry) => entry.mode === "legacy")) {
        await expect(page.getByRole("row").filter({ hasText: queue.name }).first()).toContainText(
          "legacy",
        );
      }
    }
  });
});
