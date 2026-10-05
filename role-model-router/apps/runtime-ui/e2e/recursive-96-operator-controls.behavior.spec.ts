import { type Page, type Route, expect, test } from "@playwright/test";

type OperatorRequest = {
  method: string;
  path: string;
  body: string | null;
};

type OperatorCapability = "available" | "unavailable" | "unobserved" | "degraded" | "blocked";

type OperatorFixture = {
  status?: Partial<Record<string, OperatorCapability>>;
  requests: OperatorRequest[];
};

const sensitiveValues = [
  "raw-operator-secret",
  "sk-live-operator-secret",
  "prompt-content-that-must-not-render",
];

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installOperatorFixture(page: Page, fixture: OperatorFixture): Promise<void> {
  await page.route("**/api/role-model/operator/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const body = request.postData() ?? null;
    fixture.requests.push({ method: request.method(), path, body });

    if (path === "/api/role-model/operator/status" && request.method() === "GET") {
      await fulfillJson(route, {
        schemaVersion: "role-model.operator-status.v1",
        overall: "degraded",
        observedAtMs: 1_700_000_000_000,
        reason: "one dependent capability is degraded",
        reasons: {
          graph: "graph is available",
          replay: "replay is available",
          evaluation: "evaluation is available",
          learning: "learning is available",
          extensions: "extension inventory is degraded",
          storage: "storage maintenance is blocked by policy",
        },
        capabilities: {
          graph: fixture.status?.graph ?? "available",
          replay: fixture.status?.replay ?? "available",
          evaluation: fixture.status?.evaluation ?? "available",
          learning: fixture.status?.learning ?? "available",
          extensions: fixture.status?.extensions ?? "degraded",
          storage: fixture.status?.storage ?? "blocked",
        },
        rawSecret: sensitiveValues[0],
      });
      return;
    }

    if (path === "/api/role-model/operator/trace-roots" && request.method() === "GET") {
      await fulfillJson(route, {
        roots: [
          {
            traceRootId: "trace-1",
            generation: 3,
            completeness: "complete",
            rawSecret: sensitiveValues[1],
            prompt: sensitiveValues[2],
          },
        ],
        rawContent: sensitiveValues[2],
      });
      return;
    }

    if (path === "/api/role-model/operator/replay/jobs" && request.method() === "GET") {
      await fulfillJson(route, {
        jobs: [{ jobId: "replay-1", status: "running" }],
        rawSecret: sensitiveValues[0],
      });
      return;
    }

    if (path === "/api/role-model/operator/evaluation/jobs" && request.method() === "GET") {
      await fulfillJson(route, {
        jobs: [{ jobId: "eval-1", status: "running" }],
        rawSecret: sensitiveValues[1],
      });
      return;
    }

    if (
      (path === "/api/role-model/operator/evaluation/jobs/eval-1" ||
        path.startsWith("/api/role-model/operator/evaluation/jobs/eval-1/")) &&
      request.method() === "GET"
    ) {
      await fulfillJson(route, {
        jobId: "eval-1",
        status: "running",
        trials: [{ trialId: "trial-1", scoreId: "score-1" }],
        scorers: [{ scorerId: "scorer-1" }],
        comparisons: [{ comparisonId: "comparison-1" }],
        groups: [{ groupId: "group-1" }],
        rawSecret: sensitiveValues[0],
      });
      return;
    }

    if (path === "/api/role-model/operator/learning" && request.method() === "GET") {
      await fulfillJson(route, {
        mode: "shadow",
        rollbackAvailable: true,
        rawSecret: sensitiveValues[0],
      });
      return;
    }

    if (path === "/api/role-model/operator/learning/profile" && request.method() === "GET") {
      await fulfillJson(route, {
        confidence: 0.84,
        sources: ["trace-1", "score-1"],
        rawSecret: sensitiveValues[1],
      });
      return;
    }

    if (path === "/api/role-model/operator/learning/advisory" && request.method() === "GET") {
      await fulfillJson(route, {
        confidence: 0.72,
        reason: "advisory is bounded and shadow-only",
        rawSecret: sensitiveValues[2],
      });
      return;
    }

    if (request.method() === "POST") {
      if (path === "/api/role-model/operator/replay/jobs") {
        await fulfillJson(route, {
          jobId: "replay-2",
          status: "queued",
          receipt: { operation: "create", traceRootId: "trace-1" },
          rawSecret: sensitiveValues[0],
        });
        return;
      }
      if (path.endsWith("/replay/jobs/replay-1/cancel")) {
        await fulfillJson(route, {
          jobId: "replay-1",
          status: "cancelled",
          receipt: { operation: "cancel", jobId: "replay-1" },
          rawSecret: sensitiveValues[1],
        });
        return;
      }
      if (path.endsWith("/evaluation/jobs/eval-1/cancel")) {
        await fulfillJson(route, {
          jobId: "eval-1",
          status: "cancelled",
          receipt: { operation: "cancel", jobId: "eval-1" },
          rawSecret: sensitiveValues[1],
        });
        return;
      }
      if (path.endsWith("/evaluation/jobs/eval-1/retry")) {
        await fulfillJson(route, {
          jobId: "eval-1",
          status: "queued",
          receipt: { operation: "retry", jobId: "eval-1" },
          rawSecret: sensitiveValues[2],
        });
        return;
      }
      if (path === "/api/role-model/operator/learning/mode") {
        await fulfillJson(route, {
          mode: "advisory",
          receipt: { operation: "mode", mode: "advisory" },
          rawSecret: sensitiveValues[0],
        });
        return;
      }
      if (path === "/api/role-model/operator/learning/rollback") {
        await fulfillJson(route, {
          mode: "shadow",
          rolledBack: true,
          receipt: { operation: "rollback", restoredGeneration: 2 },
          rawSecret: sensitiveValues[1],
        });
        return;
      }
    }

    await fulfillJson(
      route,
      { error: `unhandled operator fixture path: ${request.method()} ${path}` },
      500,
    );
  });
}

async function loadOperatorState(page: Page): Promise<void> {
  await page.goto("/app/system/operator");
  await page.getByLabel("Operator access token").fill("raw-operator-secret");
  await page.getByRole("button", { name: "Load Operator State" }).click();
  await expect(page.getByText("Loaded current operator state.", { exact: true })).toBeVisible();
}

test.describe("@recursive:96-message-graph-replay-evaluation-learning @operator-controls", () => {
  test("loads the operator route, renders truthful states, and suppresses raw secrets/content", async ({
    page,
  }) => {
    const fixture: OperatorFixture = { requests: [] };
    await installOperatorFixture(page, fixture);
    await loadOperatorState(page);

    await expect(page.getByText("available", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("degraded", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("blocked", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Trace roots and completeness", { exact: true })).toBeVisible();
    await expect(page.getByText("Profile confidence", { exact: true })).toBeVisible();
    await expect(page.getByText("Advisory confidence and reason", { exact: true })).toBeVisible();

    const renderedText = await page.locator("body").innerText();
    for (const sensitiveValue of sensitiveValues) {
      expect(renderedText).not.toContain(sensitiveValue);
    }
    await expect(page.getByLabel("Operator access token")).toHaveAttribute("type", "password");
    expect(fixture.requests.filter(({ path }) => path.endsWith("/status"))).toHaveLength(1);
  });

  test("creates and cancels replay work with confirmed receipts", async ({ page }) => {
    const fixture: OperatorFixture = { requests: [] };
    await installOperatorFixture(page, fixture);
    await loadOperatorState(page);

    await page.getByLabel("Trace root id").fill("trace-1");
    await page.getByLabel("Max requests").fill("4");
    await page.getByRole("button", { name: "Create Replay" }).click();
    await expect(page.getByText(/Replay creation completed\./)).toBeVisible();
    await expect(page.getByText("Sanitized action receipt", { exact: true })).toBeVisible();
    await expect(page.locator("pre").filter({ hasText: "replay-2" })).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Cancel" }).first().click();
    await expect(page.getByText(/Replay cancellation completed\./)).toBeVisible();
    await expect(page.getByText("Sanitized action receipt", { exact: true })).toBeVisible();

    const create = fixture.requests.find(
      ({ method, path }) => method === "POST" && path === "/api/role-model/operator/replay/jobs",
    );
    expect(create?.body).toContain('"traceRootId":"trace-1"');
    expect(create?.body).toContain('"maxRequests":4');
    expect(
      fixture.requests.some(
        ({ method, path }) => method === "POST" && path.endsWith("/replay/jobs/replay-1/cancel"),
      ),
    ).toBe(true);
  });

  test("inspects, retries, and cancels evaluation work", async ({ page }) => {
    const fixture: OperatorFixture = { requests: [] };
    await installOperatorFixture(page, fixture);
    await loadOperatorState(page);

    await page.getByRole("button", { name: "Inspect" }).last().click();
    await expect(page.getByText("Evaluation job and score summary", { exact: true })).toBeVisible();
    await expect(page.getByText("Trials", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText(/Evaluation retry completed\./)).toBeVisible();
    await expect(page.getByText("Sanitized action receipt", { exact: true })).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Cancel" }).last().click();
    await expect(page.getByText(/Evaluation cancellation completed\./)).toBeVisible();

    expect(
      fixture.requests.some(({ method, path }) => method === "POST" && path.endsWith("/retry")),
    ).toBe(true);
    expect(
      fixture.requests.some(({ method, path }) => method === "POST" && path.endsWith("/cancel")),
    ).toBe(true);
  });

  test("updates learning mode and rolls back shadow state with confirmation", async ({ page }) => {
    const fixture: OperatorFixture = { requests: [] };
    await installOperatorFixture(page, fixture);
    await loadOperatorState(page);

    await page.getByLabel("Learning mode").selectOption("advisory");
    await page.getByRole("button", { name: "Update Mode" }).click();
    await expect(page.getByText(/Learning mode update completed\./)).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Roll Back Shadow State" }).click();
    await expect(page.getByText(/Learning rollback completed\./)).toBeVisible();
    await expect(page.getByText("Sanitized action receipt", { exact: true })).toBeVisible();

    expect(
      fixture.requests.some(
        ({ method, path, body }) =>
          method === "POST" &&
          path.endsWith("/learning/mode") &&
          body?.includes('"mode":"advisory"'),
      ),
    ).toBe(true);
    expect(
      fixture.requests.some(
        ({ method, path }) => method === "POST" && path.endsWith("/learning/rollback"),
      ),
    ).toBe(true);
  });

  test("fails closed when replay, evaluation, and learning capabilities are unavailable or blocked", async ({
    page,
  }) => {
    const fixture: OperatorFixture = {
      requests: [],
      status: { replay: "unavailable", evaluation: "blocked", learning: "degraded" },
    };
    await installOperatorFixture(page, fixture);
    await loadOperatorState(page);

    await expect(page.getByRole("button", { name: "Create Replay" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Retry" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Update Mode" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Roll Back Shadow State" })).toBeDisabled();

    const mutationRequests = fixture.requests.filter(({ method }) => method === "POST");
    expect(mutationRequests).toHaveLength(0);
  });
});
