import { expect, test } from "@playwright/test";

test.describe("@recursive:87-direct-track-b-semantic-completion @sp0 @smoke", () => {
  test("extension lifecycle mutation is durable through the live host and restored before exit", async ({
    page,
  }) => {
    await page.goto("/app/system/extensions");
    await expect(page.getByRole("heading", { name: "Extension inventory" })).toBeVisible();
    const initial = await page.request.get("/api/role-model/extensions");
    expect(initial.ok()).toBeTruthy();
    const rows = (await initial.json()) as Array<{
      id: string;
      enabled: boolean;
      lifecycle: string;
      revision: number;
    }>;
    expect(rows).toHaveLength(13);
    const qaResponse = await page.request.get("/api/role-model/extensions/qa");
    expect(qaResponse.ok()).toBeTruthy();
    const qaRows = (await qaResponse.json()) as typeof rows;
    const synthetic = qaRows.find((row) => row.id === "run87-browser-future-extension") as
      | ((typeof rows)[number] & {
          testOnly?: boolean;
          qaStartupReceipt?: { echoed?: { packagedQa?: boolean }; requestId?: string };
        })
      | undefined;
    expect(synthetic).toMatchObject({
      enabled: true,
      lifecycle: "ready",
      testOnly: true,
      qaStartupReceipt: {
        echoed: { packagedQa: true },
        requestId: "run87:packaged-qa:run87-browser-future-extension",
      },
    });
    const target = rows.find((row) => row.id === "artifact-store") ?? rows[0];
    expect(target).toBeTruthy();

    const disabled = await page.request.post("/api/role-model/extensions/mutate", {
      data: {
        id: target.id,
        action: "disable",
        expectedRevision: target.revision,
        mutationId: `run87-sp0-disable-${target.revision}`,
      },
    });
    expect(disabled.ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Extension inventory" })).toBeVisible();
    const afterDisable = (await page.request.get("/api/role-model/extensions")).json() as Promise<
      Array<{ id: string; enabled: boolean; lifecycle: string; revision: number }>
    >;
    expect((await afterDisable).find((row) => row.id === target.id)?.enabled).toBe(false);

    const disabledRows = await afterDisable;
    const disabledTarget = disabledRows.find((row) => row.id === target.id) as
      | { id: string; enabled: boolean; lifecycle: string; revision: number }
      | undefined;
    const enabled = await page.request.post("/api/role-model/extensions/mutate", {
      data: {
        id: target.id,
        action: "enable",
        expectedRevision: disabledTarget?.revision,
        mutationId: `run87-sp0-enable-${disabledTarget?.revision}`,
      },
    });
    expect(enabled.ok()).toBeTruthy();
    const restored = (await (
      await page.request.get("/api/role-model/extensions")
    ).json()) as Array<{
      id: string;
      enabled: boolean;
      revision: number;
      pid: number | null;
    }>;
    const restoredTarget = restored.find((row) => row.id === target.id);
    expect(restoredTarget?.enabled).toBe(true);
    const restarted = await page.request.post("/api/role-model/extensions/mutate", {
      data: {
        id: target.id,
        action: "restart",
        expectedRevision: restoredTarget?.revision,
        mutationId: `run87-sp0-restart-${restoredTarget?.revision}`,
      },
    });
    expect(restarted.ok()).toBeTruthy();
    const afterRestart = (await (
      await page.request.get("/api/role-model/extensions")
    ).json()) as Array<{
      id: string;
      enabled: boolean;
      lifecycle: string;
      revision: number;
      pid: number | null;
    }>;
    const restartedTarget = afterRestart.find((row) => row.id === target.id);
    expect(restartedTarget).toMatchObject({ enabled: true, lifecycle: "ready" });
    expect(restartedTarget?.revision).toBeGreaterThan(restoredTarget?.revision ?? -1);
    expect(restartedTarget?.pid).not.toBe(restoredTarget?.pid);

    const crashTarget = afterRestart.find(
      (row) => row.id !== target.id && row.enabled && row.lifecycle === "ready" && row.pid,
    );
    expect(crashTarget?.pid).toBeTruthy();
    process.kill(crashTarget?.pid as number, "SIGKILL");
    await expect
      .poll(
        async () => {
          const current = (await (
            await page.request.get("/api/role-model/extensions")
          ).json()) as Array<{
            id: string;
            lifecycle: string;
            pid: number | null;
          }>;
          const recovered = current.find((row) => row.id === crashTarget?.id);
          return recovered?.lifecycle === "ready" && recovered.pid !== crashTarget?.pid;
        },
        { timeout: 60_000 },
      )
      .toBe(true);

    const unknown = await page.request.post("/api/role-model/extensions/mutate", {
      data: {
        id: "run87-absent-incompatible-extension",
        action: "enable",
        expectedRevision: 1,
        mutationId: "run87-sp0-unknown-distribution",
      },
    });
    expect(unknown.ok()).toBe(false);
  });
});
