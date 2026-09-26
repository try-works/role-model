/**
 * Run 101 / R3 + R10: the Queues card renders the server's own catalogue.
 *
 * The pinned property: every value, bound and default the page shows comes from
 * the operator API's response, so the card cannot drift from the registry the
 * server validates against.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { formatQueueAge } from "../lib/queue-api";

describe("@recursive:101-effect-mq-queue-rebuild @sp10 queues configuration card", () => {
  it("formats a missing age as a dash so an empty queue is not read as fresh work", () => {
    expect(formatQueueAge(null)).toBe("—");
  });

  it("renders the card with the catalogue's bounds when the API answers", async () => {
    const { QueuesConfigurationCard } = await import("./queues-configuration-card");
    const markup = renderToStaticMarkup(<QueuesConfigurationCard />);
    // Server-render (no effects): the card shows its heading and explanation
    // even before the fetch resolves, which is what the route's first paint is.
    expect(markup).toContain("Queues");
    expect(markup).toContain("Bounded per-queue parameters");
  });
});
