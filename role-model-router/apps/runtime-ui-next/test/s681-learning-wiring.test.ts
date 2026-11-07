import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { HtmlBuilder } from "@role-model-router/foldkit/html";
import type { Message } from "../src/message";
import { idleObservability } from "../src/observability";
import { emptyReadbacks, READBACK_SPECS, type ReadbackState } from "../src/readback";
import { emptyControls } from "../src/control";
import { idleDiagnostics } from "../src/diagnostics";
import { shellModel } from "./support/runtime-shell";
import { learningLadderRowKey, parseLearningLadderPayload } from "../src/learning-ranking";
import {
  learningConfigurationRoute,
  learningDecisionsRoute,
  learningEvidenceRoute,
  learningHistoryRoute,
  learningOverviewRoute,
  learningPacksRoute,
} from "../src/features/learning/routes";

type Page = {
  readonly key: keyof typeof READBACK_SPECS;
  readonly render: (readback: ReadbackState, h: HtmlBuilder<Message>) => ReturnType<typeof learningConfigurationRoute>;
};

const ladder = parseLearningLadderPayload({
  ladders: [
    {
      active: true,
      completeness: { admitted: 2, configured: 3 },
      ladderVersion: 4,
      rankedCount: 5,
      roleId: "role.alpha",
      rolledBack: { atMs: 1, on: false, reason: null },
      rungs: [{ endpointId: "provider.a", rank: 1, status: "available" }],
      state: "complete",
      taskTypeId: "task.code",
      taxonomyVersion: "v1",
      topEndpoints: [
        { endpointId: "provider.a", rank: 1, status: "available" },
        { endpointId: "provider.b", rank: 2, status: "unavailable" },
      ],
    },
  ],
});
if (!ladder.ok) throw new Error(ladder.error);
const ladderRow = {
  id: `ladder:${learningLadderRowKey(ladder.rows[0]!)}`,
  label: "role.alpha · task.code",
  meta: JSON.stringify(ladder.rows[0]),
  value: "active",
};
const ok = (): ReadbackState => ({
  rows: [
    { id: "alpha", label: "Alpha", meta: "alpha detail", value: "42" },
    ladderRow,
  ],
  status: "ok",
  token: 1,
});
const empty = (): ReadbackState => ({ rows: [], status: "empty", token: 1 });
const failed = (): ReadbackState => ({ message: "boom", rows: [], status: "error", token: 1 });
const idle = (): ReadbackState => ({ rows: [], status: "idle", token: 0 });
const loading = (): ReadbackState => ({ rows: [], status: "loading", token: 1 });

const page = (render: Page["render"], readback: ReadbackState) => {
  const model = shellModel({
    controls: emptyControls(),
    diagnostics: idleDiagnostics(),
    observability: idleObservability(),
    readbacks: emptyReadbacks(),
    route: { _tag: "Learning" },
  });
  return Effect.runPromise(
    renderToString(
      {
        init: () => ({ commands: [], model }),
        view: (_model, h) => ({ body: render(readback, h as HtmlBuilder<Message>), title: "learning" }),
      },
      { isHydratable: false },
    ),
  ).then((rendered) => rendered.html);
};

const pages: ReadonlyArray<Page> = [
  { key: "learning", render: (readback, h) => learningOverviewRoute(readback, emptyReadbacks().replayJobs, emptyReadbacks().evaluationJobs, undefined, undefined, h) },
  { key: "learningConfiguration", render: (readback, h) => learningConfigurationRoute(readback, h) },
  { key: "learningPacks", render: (readback, h) => learningPacksRoute(readback, h) },
  { key: "learningDecisions", render: (readback, h) => learningDecisionsRoute(readback, h) },
  { key: "learningEvidence", render: (readback, h) => learningEvidenceRoute(readback, h) },
  { key: "learningHistory", render: (readback, h) => learningHistoryRoute(readback, h) },
];

const LOADING = "Loading learning state…";
const fail = (html: string, label: string) => {
  if (!html.includes(label)) throw new Error(`missing ${label}`);
};
const absent = (html: string, label: string) => {
  if (html.includes(label)) throw new Error(`unexpected ${label}`);
};
const noHidden = (html: string) => {
  if (/class="[^"]*hidden/.test(html)) throw new Error("hidden wrapper/table found");
};

describe("S681 learning pages are wired to their readback", () => {
  for (const pageDef of pages) {
    it(`${pageDef.key}: idle and loading show only the loading placeholder`, async () => {
      for (const readback of [idle(), loading()]) {
        const html = await page(pageDef.render, readback);
        fail(html, LOADING);
        absent(html, ">Alpha<");
      }
    });

    it(`${pageDef.key}: ok shows the real rows visibly`, async () => {
      const html = await page(pageDef.render, ok());
      fail(html, "Alpha");
      absent(html, LOADING);
      noHidden(html);
    });

    it(`${pageDef.key}: empty shows the spec empty text`, async () => {
      const html = await page(pageDef.render, empty());
      fail(html, READBACK_SPECS[pageDef.key].emptyText);
      absent(html, LOADING);
    });

    it(`${pageDef.key}: error shows the error message`, async () => {
      const html = await page(pageDef.render, failed());
      fail(html, "boom");
      absent(html, LOADING);
    });
  }

  it("renders the ladder columns and activation from the ladder payload rows", async () => {
    const html = await page(pages[2]!.render, ok());
    for (const label of ["ROLE · TASK", "TOP ENDPOINTS", "ACTIVATION"]) fail(html, label);
    fail(html, "role.alpha · task.code");
    fail(html, "provider.a");
    fail(html, "Roll back");
    noHidden(html);
  });

  it("keeps the pack rollback and kill-switch controls", async () => {
    const html = await page(pages[2]!.render, ok());
    fail(html, "Roll back active pack (scope-wide)");
    fail(html, "Engage kill switch");
    fail(html, "Release kill switch");
  });
});
