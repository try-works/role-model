import { describe, expect, test, vi } from "vitest";
import {
  cancelEvaluationJob,
  cancelReplayJob,
  createReplayJob,
  fetchEvaluationJob,
  fetchLearningState,
  fetchOperatorStatus,
  listEvaluationJobs,
  listReplayJobs,
  retryEvaluationJob,
  rollbackLearning,
  updateLearningMode,
} from "./runtime-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Run 96 operator controls", () => {
  test("uses the authenticated operator status endpoint and preserves truthful state", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        schemaVersion: "role-model.operator-status.v1",
        overall: "degraded",
        reason: "evaluation worker is unavailable",
        capabilities: { evaluation: "unavailable" },
      }),
    );

    const result = await fetchOperatorStatus(fetcher, "operator-secret");

    expect(result.overall).toBe("degraded");
    expect(result.reason).toBe("evaluation worker is unavailable");
    expect(fetcher).toHaveBeenCalledWith(
      "/api/role-model/operator/status",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer operator-secret" }),
      }),
    );
  });

  test("exposes replay inspection and cancellation through distinct operator endpoints", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).endsWith("/cancel")) {
        return jsonResponse({ jobId: "replay-1", status: "cancelled" });
      }
      if (init?.method === "POST") {
        return jsonResponse({ jobId: "replay-2", status: "queued" });
      }
      return jsonResponse({ jobs: [{ jobId: "replay-1", status: "running" }] });
    });

    const listed = await listReplayJobs(fetcher, "operator-secret", { limit: "10" });
    const created = await createReplayJob(
      { traceRootId: "trace-1", budget: { maxRequests: 2 } },
      fetcher,
      "operator-secret",
    );
    const cancelled = await cancelReplayJob("replay-1", fetcher, "operator-secret");

    expect(listed.jobs).toHaveLength(1);
    expect(created.status).toBe("queued");
    expect(cancelled.status).toBe("cancelled");
    expect(fetcher).toHaveBeenCalledWith(
      "/api/role-model/operator/replay/jobs?limit=10",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer operator-secret" }),
      }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/role-model/operator/replay/jobs",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/role-model/operator/replay/jobs/replay-1/cancel",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("exposes evaluation inspection, cancellation, retry, and learning rollback controls", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith("/retry")) return jsonResponse({ jobId: "eval-1", status: "queued" });
      if (path.endsWith("/cancel")) return jsonResponse({ jobId: "eval-1", status: "cancelled" });
      if (path.includes("/evaluation/jobs/eval-1")) {
        return jsonResponse({ jobId: "eval-1", status: "running", trials: 2 });
      }
      if (path.endsWith("/learning")) {
        return jsonResponse({ mode: "advisory", rollbackAvailable: true });
      }
      if (path.endsWith("/learning/mode")) return jsonResponse({ mode: "shadow" });
      if (path.endsWith("/learning/rollback"))
        return jsonResponse({ mode: "advisory", rolledBack: true });
      if (init?.method === "POST") return jsonResponse({ jobId: "eval-1", status: "queued" });
      return jsonResponse({ jobs: [{ jobId: "eval-1", status: "running" }] });
    });

    const listed = await listEvaluationJobs(fetcher, "operator-secret", { status: "running" });
    const inspected = await fetchEvaluationJob("eval-1", fetcher, "operator-secret");
    const cancelled = await cancelEvaluationJob("eval-1", fetcher, "operator-secret");
    const retried = await retryEvaluationJob("eval-1", fetcher, "operator-secret");
    const learning = await fetchLearningState(fetcher, "operator-secret");
    const mode = await updateLearningMode({ mode: "shadow" }, fetcher, "operator-secret");
    const rollback = await rollbackLearning(
      { reason: "operator test" },
      fetcher,
      "operator-secret",
    );

    expect(listed.jobs).toHaveLength(1);
    expect(inspected.trials).toBe(2);
    expect(cancelled.status).toBe("cancelled");
    expect(retried.status).toBe("queued");
    expect(learning.mode).toBe("advisory");
    expect(mode.mode).toBe("shadow");
    expect(rollback.rolledBack).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/role-model/operator/evaluation/jobs?status=running",
      expect.anything(),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/role-model/operator/evaluation/jobs/eval-1/retry",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/role-model/operator/learning/mode",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/role-model/operator/learning/rollback",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
