import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { Model } from "../src/model";
import type { AppRoute } from "../src/route";
import { type StudioState, studioIdle } from "../src/studio";
import { view } from "../src/view";
import { shellModel } from "./support/runtime-shell";

/** S541: density/structural envelope per page, asserted against the reference sub-section labels. */
const readback = (rows: readonly { id: string; label: string; value: string; meta: string }[]) => ({
  rows,
  status: "ok" as const,
  token: 1,
});
const row = { id: "row-1", label: "First row", value: "ready", meta: "host" };

const renderText = async (
  tag: AppRoute["_tag"],
  readbacks: Partial<Model["readbacks"]> = {},
  studioTab?: StudioState["tab"],
): Promise<string> => {
  const base = shellModel();
  const model = shellModel({
    // SAFETY: the test supplies one of the exact AppRoute tags.
    route: { _tag: tag } as AppRoute,
    readbacks: { ...base.readbacks, ...readbacks },
    studio: { ...studioIdle(), tab: studioTab ?? studioIdle().tab },
  });
  const rendered = await Effect.runPromise(
    renderToString({ init: () => ({ model, commands: [] }), view }, { isHydratable: false }),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container.textContent ?? "";
};

const expectEnvelope = async (
  tag: AppRoute["_tag"],
  readbacks: Partial<Model["readbacks"]>,
  columns: ReadonlyArray<string>,
  controls: ReadonlyArray<string>,
  studioTab?: StudioState["tab"],
) => {
  const base = shellModel();
  const model = shellModel({
    // SAFETY: the test supplies one of the exact AppRoute tags.
    route: { _tag: tag } as AppRoute,
    readbacks: { ...base.readbacks, ...readbacks },
    studio: { ...studioIdle(), tab: studioTab ?? studioIdle().tab },
  });
  const rendered = await Effect.runPromise(
    renderToString({ init: () => ({ model, commands: [] }), view }, { isHydratable: false }),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  const headers = [...container.querySelectorAll("table thead th")].map(
    (cell) => cell.textContent?.trim() ?? "",
  );
  for (const column of columns) expect(headers).toContain(column);
  const named = [...container.querySelectorAll("button, [role='button'], input, select")];
  for (const name of controls) {
    const found = named.some((element) => {
      const text = element.textContent?.trim() ?? "";
      const aria = element.getAttribute("aria-label") ?? "";
      return text === name || aria === name;
    });
    expect(found, `missing control ${name}`).toBe(true);
  }
};

const expectTitles = async (
  tag: AppRoute["_tag"],
  titles: readonly string[],
  readbacks: Partial<Model["readbacks"]> = {},
  studioTab?: StudioState["tab"],
) => {
  const text = await renderText(tag, readbacks, studioTab);
  for (const title of titles) expect(text).toContain(title);
};

describe("S541 learning/models/studio density envelope", () => {
  it("learning overview carries the reference envelope", async () => {
    await expectTitles(
      "Learning",
      [
        "Learning overview",
        "Live replay & evaluation",
        "Recent decisions",
        "This machine's owner is trusted",
      ],
      { learning: readback([row]) },
    );
  });
  it("learning packs carries the ladder-index envelope", async () => {
    await expectTitles("LearningPacks", ["One row per role · task", "top three ranked endpoints"], {
      learningPacks: readback([row]),
    });
    await expectEnvelope(
      "LearningPacks",
      { learningPacks: readback([row]) },
      ["ROLE · TASK", "TOP ENDPOINTS", "ACTIVATION"],
      [],
    );
  });
  it("learning evidence carries the cohort metric block", async () => {
    await expectTitles(
      "LearningEvidence",
      ["Evidence", "Guardrail", "Bound", "Observed", "Verdict", "Evidence loss by reason"],
      { learningEvidence: readback([row]) },
    );
    await expectEnvelope(
      "LearningEvidence",
      { learningEvidence: readback([row]) },
      ["Guardrail", "Bound", "Observed", "Verdict", "REASON", "COUNT", "DETAIL"],
      [],
    );
  });
  it("learning decisions carries the receipts envelope", async () => {
    await expectTitles(
      "LearningDecisions",
      ["This machine's owner is trusted", "Advisory state", "Observation origin"],
      { learningDecisions: readback([row]) },
    );
    await expectEnvelope(
      "LearningDecisions",
      { learningDecisions: readback([row]) },
      ["DECISION", "OUTCOME", "ORIGIN", "EVIDENCE"],
      [],
    );
  });
  it("learning history carries the durable-state envelope", async () => {
    await expectTitles(
      "LearningHistory",
      [
        "This machine's owner is trusted",
        "What the replay, evaluation and learning loop did over the window",
      ],
      { learningHistory: readback([row]) },
    );
    await expectEnvelope(
      "LearningHistory",
      { learningHistory: readback([row]) },
      ["BUCKET", "VALUE", "DETAIL"],
      [],
    );
  });
  it("models carries the inventory/benchmark/roles envelope", async () => {
    await expectTitles("Models", ["Model inventory", "Runtime ·", "Cost", "Benchmark", "Roles"], {
      configuredModels: readback([row]),
      modelEndpoints: readback([row]),
    });
  });
  it("studio chat workspace envelope", async () => {
    await expectTitles(
      "Studio",
      ["Chat workspace", "Request", "Run request", "Result workspace"],
      {},
      "chat",
    );
    await expectEnvelope("Studio", {}, [], ["Run request"], "chat");
  });
  it("studio images workspace envelope", async () => {
    await expectTitles(
      "Studio",
      [
        "Images workspace",
        "Image request modes",
        "Run image request",
        "Image result stage",
        "GENERATED IMAGES",
      ],
      {},
      "images",
    );
    await expectEnvelope("Studio", {}, [], ["Run image request"], "images");
  });
  it("studio audio workspace envelope", async () => {
    await expectTitles(
      "Studio",
      [
        "Audio workspace",
        "Audio mode and request",
        "Run audio request",
        "Audio result stage",
        "VOICE INVENTORY",
      ],
      {},
      "audio",
    );
    await expectEnvelope("Studio", {}, [], ["Run audio request", "Voice"], "audio");
  });
  it("studio rerank workspace envelope", async () => {
    await expectTitles(
      "Studio",
      [
        "Rerank workspace",
        "Contract /v1/rerank",
        "Submit rerank request",
        "Ranked results",
        "CONTRACT DETAILS",
      ],
      {},
      "rerank",
    );
    await expectEnvelope("Studio", {}, [], ["Submit rerank request"], "rerank");
  });
  it("studio advanced workspace envelope", async () => {
    await expectTitles(
      "Studio",
      [
        "Advanced workspace",
        "Endpoint family",
        "Submit advanced request",
        "Response workspace",
        "REQUEST TEMPLATE",
      ],
      {},
      "advanced",
    );
    await expectEnvelope("Studio", {}, [], ["Submit advanced request"], "advanced");
  });
});
