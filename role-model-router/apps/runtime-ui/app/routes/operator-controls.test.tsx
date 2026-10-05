import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { OperatorCapabilityStatus, availabilityTone } from "./operator-controls";

describe("Run 96 operator controls route", () => {
  test("renders every operator availability state with an explicit truthful tone", () => {
    expect(availabilityTone("available")).toBe("success");
    expect(availabilityTone("unobserved")).toBe("warning");
    expect(availabilityTone("degraded")).toBe("warning");
    expect(availabilityTone("blocked")).toBe("error");
    expect(availabilityTone("unavailable")).toBe("neutral");
    expect(availabilityTone(undefined)).toBe("neutral");
  });

  test("AC-R25-03: unavailable, unobserved, degraded, blocked, maintenance, pressure, and stale states render distinct reasons", () => {
    const states = [
      ["unavailable", "configured owner is unreachable"],
      ["unobserved", "independent probe has not completed"],
      ["degraded", "latency exceeded the service objective"],
      ["blocked", "authorization epoch is stale"],
      ["maintenance", "storage compaction is active"],
      ["pressure", "queue byte budget is near capacity"],
      ["stale", "last observation exceeded its freshness window"],
    ] as const;
    const html = renderToStaticMarkup(
      <OperatorCapabilityStatus
        capabilities={Object.fromEntries(
          states.map(([state], index) => [`capability-${index}`, state]),
        )}
        reasons={Object.fromEntries(
          states.map(([state, reason], index) => [`capability-${index}`, `${state}: ${reason}`]),
        )}
      />,
    );

    for (const [state, reason] of states) {
      expect(html).toContain(state);
      expect(html).toContain(reason);
    }
  });
});
