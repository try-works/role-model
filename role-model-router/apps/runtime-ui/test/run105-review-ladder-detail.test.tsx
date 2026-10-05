import { fileURLToPath } from "node:url";
import { type Browser, expect as browserExpect, chromium } from "@playwright/test";
import { build } from "esbuild";
// Discovered by the exact Vite include for this delegated test/ regression.
// Run with the normal package runner: pnpm test test/run105-review-ladder-detail.test.tsx.
// Browser cases require an installed Playwright Chromium; no server or live runtime is started.
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { normalizeLadderRows } from "../app/lib/learning-ladder";
import { LearningLadderRow } from "../app/routes/learning";

/**
 * The delegated browser cases install their own globals on `window` (the mount hooks, the request
 * queue and the responder). Naming that shape keeps the callbacks typed instead of casting each
 * access through `any`.
 */
interface LadderTestPendingBody {
  readonly roleId: string;
  readonly taskTypeId?: string;
  readonly rolledBack?: boolean;
  readonly reason?: string;
  readonly scopeId?: string;
}
interface LadderTestPending {
  readonly body: LadderTestPendingBody;
  done?: boolean;
  readonly resolve: (value: Response) => void;
}
interface LadderTestWindow extends Window {
  __fixture: { ladders: { roleId: string; rolledBack?: unknown }[] };
  __pending: LadderTestPending[];
  __confirm: boolean;
  __respond: (roleId: string, status: number) => void;
  __mountRows: (rows: unknown) => void;
  __mountPacks: (packs?: unknown) => void;
  __toggles: unknown[];
}

const rungs = [
  { endpointId: "provider.fifth", rank: 5, status: "available" },
  { endpointId: "provider.second", rank: 2, status: "unavailable" },
  { endpointId: "provider.first", rank: 1, status: "available" },
  { endpointId: "provider.fourth", rank: 4, status: "unavailable" },
  { endpointId: "provider.third", rank: 3, status: "available" },
];
const published = (extra: Record<string, unknown> = {}) => ({
  roleId: "writer",
  taskTypeId: "coder.explain",
  taxonomyVersion: "1.0",
  topEndpoints: rungs.filter((rung) => rung.rank <= 3),
  rankedCount: 5,
  completeness: { admitted: 3, configured: 7 },
  ladderVersion: 42,
  rolledBack: { on: true, reason: "operator review <reason>", atMs: 1234 },
  ...extra,
});
const normalize = (extra: Record<string, unknown> = {}) =>
  normalizeLadderRows({ ladders: [published(extra)] })[0];
const rowMarkup = (extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    <table>
      <tbody>
        <LearningLadderRow row={normalize(extra)} onToggle={vi.fn()} />
      </tbody>
    </table>,
  );
const detailOf = (markup: string) =>
  markup.match(/<details\b[^>]*>([\s\S]*?)<\/details>/)?.[1] ?? "";

describe("Run105 R12 per-task full endpoint ranking", () => {
  test("normalizes explicit full rungs preserving top-three and source order", () => {
    const source = published({ rungs });
    const before = JSON.stringify(source);
    const row = normalizeLadderRows({ ladders: [source] })[0];
    expect(row).toHaveProperty(
      "rungs",
      [...rungs].sort((a, b) => a.rank - b.rank),
    );
    expect(row.topEndpoints.map((rung) => rung.rank)).toEqual([1, 2, 3]);
    expect(JSON.stringify(source)).toBe(before);
  });
  test("missing or malformed full ranking stays absent, never copied from top three", () => {
    expect(normalize()).not.toHaveProperty("rungs");
    expect(normalize({ rungs: "not an array" })).not.toHaveProperty("rungs");
    expect(normalize({ rungs: [] })).toHaveProperty("rungs", []);
  });
  test("full rungs use bounded normalization without a three-rung cap", () => {
    const row = normalize({ rungs: [...rungs, null, {}, { endpointId: "provider.unknown" }] });
    expect(row).toHaveProperty("rungs", [
      ...[...rungs].sort((a, b) => a.rank - b.rank),
      { endpointId: "provider.unknown", rank: Number.POSITIVE_INFINITY, status: "not reported" },
    ]);
  });
  test("native closed detail has scoped summary and full ordered ranking with statuses and provenance", () => {
    const markup = rowMarkup({ rungs });
    expect(markup).toMatch(/<details\b/);
    expect(markup).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
    const detail = detailOf(markup);
    expect(detail).toMatch(/<summary[^>]*>[^<]*writer[^<]*coder\.explain/);
    expect(detail).toContain("Full endpoint ranking");
    expect(detail).toContain("endpoint ladder version 42");
    expect(detail).toContain("operator review &lt;reason&gt;");
    const ranked = [...detail.matchAll(/<li\b[\s\S]*?<\/li>/g)].map((match) => match[0]);
    expect(ranked).toHaveLength(5);
    expect(ranked.map((item) => item.match(/title="([^"]+)"/)?.[1])).toEqual(
      [...rungs].sort((a, b) => a.rank - b.rank).map((rung) => rung.endpointId),
    );
    expect(ranked[1]).toContain("unavailable");
    expect(ranked[4]).toContain("available");
    const collapsed = markup.slice(0, markup.indexOf("<details"));
    expect(collapsed.match(/<li\b/g)).toHaveLength(3);
    expect(collapsed).not.toContain("provider.fourth");
  });
  test("top-three-only readback discloses missing full ranking rather than faking one", () => {
    const detail = detailOf(rowMarkup({ ladderVersion: undefined, rolledBack: undefined }));
    expect(detail).toContain("Full endpoint ranking not reported");
    expect(detail).toContain("endpoint ladder version not reported");
    expect(detail).not.toContain("<ol");
  });
  test("explicit empty full ranking has honest empty state", () => {
    const detail = detailOf(rowMarkup({ rungs: [] }));
    expect(detail).toContain("No ranked endpoints reported");
    expect(detail).not.toContain("<li");
  });
  test("unreported admission does not assert the floor failed", () => {
    const markup = rowMarkup({ completeness: undefined, rolledBack: undefined, topEndpoints: [] });
    expect(markup).toContain("admission state not reported");
    expect(markup).not.toContain("nothing admitted yet");
    expect(markup).not.toContain("no endpoint has passed the admission floor");
  });
});

// Real React/Chromium interactions, without starting another application server.
// The API fixture is explicitly synthetic; controller Phase 5 still owns live readback validation.
describe("Run105 R12 React browser interactions", () => {
  let browser: Browser;
  let bundle: string;
  beforeAll(async () => {
    const result = await build({
      absWorkingDir: fileURLToPath(new URL("..", import.meta.url)),
      stdin: {
        contents:
          'import { createRoot } from "react-dom/client";\nimport { LearningLadderIndex, LearningPacksPage } from "./app/routes/learning";\nimport { normalizeLadderRows } from "./app/lib/learning-ladder";\nlet root;\nconst render = (view) => { root ??= createRoot(document.getElementById("root")); root.render(view); };\nwindow.__toggles = [];\nwindow.__mountRows = (ladders) => render(<LearningLadderIndex rows={normalizeLadderRows({ladders})} onToggle={(row, rollback) => window.__toggles.push([row.roleId, rollback])} />);\nwindow.__mountPacks = () => render(<LearningPacksPage />);',
        resolveDir: fileURLToPath(new URL("..", import.meta.url)),
        loader: "tsx",
      },
      bundle: true,
      write: false,
      platform: "browser",
      format: "iife",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"development"' },
    });
    bundle = result.outputFiles[0].text;
    browser = await chromium.launch({ headless: true });
  }, 30_000);
  afterAll(async () => {
    await browser?.close();
  });

  test("keyboard and pointer disclosure reveal only this task's full ranking and do not toggle rollback", async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<div id="root"></div>');
      await page.addScriptTag({ content: bundle });
      await page.evaluate(
        (rows) => (window as unknown as LadderTestWindow).__mountRows(rows),
        [published({ rungs }), published({ roleId: "tester", taskTypeId: "test.review" })],
      );
      const rows = page.locator("tbody tr");
      const writer = rows.filter({ hasText: "writer . coder.explain" });
      const summary = writer.locator("summary");
      await browserExpect(writer.locator("details")).not.toHaveAttribute("open");
      await browserExpect(writer.locator('details [title="provider.fifth"]')).not.toBeVisible();
      await summary.focus();
      await page.keyboard.press("Enter");
      await browserExpect(writer.locator("details")).toHaveAttribute("open", "");
      await browserExpect(writer.locator("details li")).toHaveCount(5);
      await browserExpect(writer.locator('details [title="provider.fifth"]')).toBeVisible();
      await browserExpect(writer.locator("details")).toContainText("endpoint ladder version 42");
      await browserExpect(
        rows.filter({ hasText: "tester . test.review" }).locator("details"),
      ).not.toHaveAttribute("open");
      await page.keyboard.press("Space");
      await browserExpect(writer.locator("details")).not.toHaveAttribute("open");
      await summary.click();
      await browserExpect(writer.locator("details")).toHaveAttribute("open", "");
      expect(await page.evaluate(() => (window as unknown as LadderTestWindow).__toggles)).toEqual(
        [],
      );
      const tester = rows.filter({ hasText: "tester . test.review" });
      await tester.locator("summary").click();
      await browserExpect(tester.locator("details")).toContainText(
        "Full endpoint ranking not reported",
      );
      await browserExpect(tester.locator("details ol")).toHaveCount(0);
    } finally {
      await page.close();
    }
  }, 30_000);

  test("concurrent task writes retain row-local busy and errors, with confirmation and readback authority", async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<div id="root"></div>');
      await page.addScriptTag({ content: bundle });
      await page.evaluate(
        (fixture) => {
          const w = window as unknown as LadderTestWindow;
          w.__fixture = fixture;
          w.__pending = [];
          w.__confirm = false;
          w.confirm = () => w.__confirm;
          w.fetch = async (url: string, init?: RequestInit) => {
            if (init?.method === "POST") {
              const body = JSON.parse(String(init.body));
              return new Promise<Response>((resolve) => w.__pending.push({ body, resolve }));
            }
            return new Response(
              JSON.stringify(String(url).includes("records") ? w.__fixture : {}),
              { status: 200 },
            );
          };
          w.__respond = (roleId: string, status: number) => {
            const pending = w.__pending.find((p) => p.body.roleId === roleId && !p.done);
            if (!pending) throw new Error(`no pending request for ${roleId}`);
            pending.done = true;
            if (status === 200) {
              const row = w.__fixture.ladders.find((r) => r.roleId === roleId);
              if (!row) throw new Error(`no fixture ladder for ${roleId}`);
              row.rolledBack = {
                on: pending.body.rolledBack,
                reason: pending.body.reason,
                atMs: 5678,
              };
            }
            pending.resolve(
              new Response(JSON.stringify(status === 200 ? {} : { error: "conflict" }), { status }),
            );
          };
          w.__mountPacks();
        },
        {
          scopeId: "scope-test",
          laddersState: "reported",
          records: [],
          ladders: [
            published({ rungs, rolledBack: { on: false } }),
            published({
              roleId: "tester",
              taskTypeId: "test.review",
              rungs,
              rolledBack: { on: false },
            }),
          ],
        },
      );
      const writer = page.locator("tbody tr").filter({ hasText: "writer . coder.explain" });
      const tester = page.locator("tbody tr").filter({ hasText: "tester . test.review" });
      await writer.getByRole("button", { name: "Roll back", exact: true }).click();
      expect(
        await page.evaluate(() => (window as unknown as LadderTestWindow).__pending.length),
      ).toBe(0);
      await page.evaluate(() => {
        (window as unknown as LadderTestWindow).__confirm = true;
      });
      await writer.getByRole("button", { name: "Roll back", exact: true }).click();
      await browserExpect(writer.getByRole("button")).toBeDisabled();
      await tester.getByRole("button", { name: "Roll back", exact: true }).click();
      await browserExpect(writer.getByRole("button")).toBeDisabled();
      await browserExpect(tester.getByRole("button")).toBeDisabled();
      await page.evaluate(() => (window as unknown as LadderTestWindow).__respond("writer", 409));
      await browserExpect(writer.getByRole("button")).toBeEnabled();
      await browserExpect(writer.getByRole("alert")).toContainText("409");
      await browserExpect(tester.getByRole("alert")).toHaveCount(0);
      await browserExpect(tester.getByRole("button")).toBeDisabled();
      await browserExpect(writer).toContainText("Active");
      await page.evaluate(() => (window as unknown as LadderTestWindow).__respond("tester", 200));
      await browserExpect(
        tester.getByRole("button", { name: "Activate", exact: true }),
      ).toBeEnabled();
      await browserExpect(writer.getByRole("alert")).toContainText("409");
      await tester.getByRole("button", { name: "Activate", exact: true }).click();
      await page.evaluate(() => (window as unknown as LadderTestWindow).__respond("tester", 200));
      await browserExpect(
        tester.getByRole("button", { name: "Roll back", exact: true }),
      ).toBeEnabled();
      const bodies = await page.evaluate(() =>
        (window as unknown as LadderTestWindow).__pending.map((p) => p.body),
      );
      expect(bodies.map((body) => [body.roleId, body.taskTypeId, body.rolledBack])).toEqual([
        ["writer", "coder.explain", true],
        ["tester", "test.review", true],
        ["tester", "test.review", false],
      ]);
      expect(bodies.every((body) => body.scopeId === "scope-test")).toBe(true);
    } finally {
      await page.close();
    }
  }, 30_000);
});
