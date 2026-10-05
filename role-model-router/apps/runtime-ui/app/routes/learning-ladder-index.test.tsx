import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import type { LadderRowView } from "../lib/learning-ladder";
import * as learningRoute from "./learning";

const activeRow = (overrides: Partial<LadderRowView> = {}): LadderRowView => ({
  roleId: "writer",
  taskTypeId: "coder.explain",
  taxonomyVersion: "1.0",
  topEndpoints: [{ endpointId: "provider.model-a", rank: 1, status: "available" }],
  rankedCount: 5,
  completeness: { admitted: 3, configured: 7 },
  state: "partial",
  active: true,
  rolledBack: { on: false, reason: null, atMs: null },
  ladderVersion: 1,
  nextEligibleAtMs: null,
  ...overrides,
});

describe("Learning ladder index", () => {
  test("renders rows with Roll back on Active rows and Activate on rolled-back rows", () => {
    const markup = renderToStaticMarkup(
      <learningRoute.LearningLadderIndex
        onToggle={vi.fn()}
        rows={[
          activeRow(),
          activeRow({
            roleId: "tester",
            rolledBack: { on: true, reason: null, atMs: null },
            active: false,
          }),
        ]}
      />,
    );
    // A3: raw role/task ids, no display names - the header names the id; the separator is the
    // design system's middle dot (the brief's ASCII '.') and the id qualifier is required.
    expect(markup).toMatch(/Role\s*[.\u00b7]\s*task \(id\)/);
    expect(markup).toContain("Roll back");
    expect(markup).toContain("Activate");
    expect(markup).toContain("Active");
    expect(markup).toContain("Rolled back");
  });

  test("a no-ladder row cannot be toggled and states why", () => {
    const markup = renderToStaticMarkup(
      <learningRoute.LearningLadderIndex
        onToggle={vi.fn()}
        rows={[
          activeRow({
            state: "no_ladder",
            active: false,
            completeness: { admitted: 0, configured: 7 },
            topEndpoints: [],
            rankedCount: 0,
          }),
        ]}
      />,
    );
    expect(markup).toContain("disabled");
    expect(markup).toMatch(/no endpoint ladder/i);
    expect(markup).toContain("0 / 7 admitted");
  });

  test("laddersState unavailable renders an honest note, never the no-pack empty state", () => {
    const markup = renderToStaticMarkup(
      <learningRoute.LearningLadderIndex laddersState="unavailable" onToggle={vi.fn()} rows={[]} />,
    );
    expect(markup).toMatch(/endpoint ladder index[^<]*unavailable/i);
    expect(markup).not.toContain("No pack records");
  });

  test("no ladder rows at all leaves the legacy pack table to render", () => {
    const markup = renderToStaticMarkup(
      <learningRoute.LearningLadderIndex laddersState="not_asked" onToggle={vi.fn()} rows={[]} />,
    );
    expect(markup).not.toContain("No pack records");
    expect(markup).toContain("endpoint ladder");
  });

  test("a rejected toggle leaves the row unchanged and renders the error", () => {
    const markup = renderToStaticMarkup(
      <learningRoute.LearningLadderIndex
        error="Could not update the endpoint ladder rollback: 409 conflict."
        laddersState="reported"
        onToggle={vi.fn()}
        rows={[activeRow()]}
      />,
    );
    expect(markup).toContain("Could not update the endpoint ladder rollback");
    expect(markup).toContain("Roll back");
    expect(markup).toContain("Active");
  });
});
