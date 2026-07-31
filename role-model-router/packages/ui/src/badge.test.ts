import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders tone data attribute and children", () => {
    const markup = renderToStaticMarkup(
      createElement(Badge, { tone: "success" }, "healthy"),
    );
    expect(markup).toContain('data-slot="badge"');
    expect(markup).toContain('data-tone="success"');
    expect(markup).toContain("healthy");
    expect(markup).toContain("bg-[var(--rm-pill-success-bg)]");
  });
});
