import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders tone data attribute and Paper soft-fill success tone", () => {
    const markup = renderToStaticMarkup(createElement(Badge, { tone: "success" }, "healthy"));
    expect(markup).toContain('data-slot="badge"');
    expect(markup).toContain('data-tone="success"');
    expect(markup).toContain("healthy");
    expect(markup).toContain("h-[22px]");
    expect(markup).toContain("font-mono");
    expect(markup).toContain("text-[11px]");
    expect(markup).toContain("bg-[var(--rm-pill-soft-bg)]");
    expect(markup).toContain("text-[var(--rm-pill-success-ink)]");
  });

  it("keeps accent tone as solid primary fill", () => {
    const markup = renderToStaticMarkup(createElement(Badge, { tone: "accent" }, "selected"));
    expect(markup).toContain('data-tone="accent"');
    expect(markup).toContain("bg-[var(--rm-pill-accent-bg)]");
    expect(markup).toContain("!text-[var(--rm-pill-accent-ink)]");
  });
});
