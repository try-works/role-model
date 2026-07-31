import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  Badge,
  FactCard,
  SelectField,
  type SelectOptionModel,
  StatusPill,
  getSelectTypeaheadMatchIndex,
} from "./page-primitives";

const providerOptions: SelectOptionModel[] = [
  { value: "302ai", label: "302.AI", disabled: false },
  { value: "minimax", label: "MiniMax Token Plan (minimax.io)", disabled: false },
  { value: "mistral", label: "Mistral", disabled: false },
  { value: "mixlayer", label: "Mixlayer", disabled: false },
  { value: "moark", label: "Moark", disabled: true },
  { value: "modelscope", label: "ModelScope", disabled: false },
];

describe("SelectField typeahead", () => {
  test("matches the next enabled option by typed prefix", () => {
    expect(getSelectTypeaheadMatchIndex(providerOptions, "m", 0)).toBe(1);
    expect(getSelectTypeaheadMatchIndex(providerOptions, "mis", 1)).toBe(2);
  });

  test("cycles repeated same-letter typeahead across enabled matches", () => {
    expect(getSelectTypeaheadMatchIndex(providerOptions, "m", 1)).toBe(2);
    expect(getSelectTypeaheadMatchIndex(providerOptions, "m", 2)).toBe(3);
    expect(getSelectTypeaheadMatchIndex(providerOptions, "m", 3)).toBe(5);
    expect(getSelectTypeaheadMatchIndex(providerOptions, "m", 5)).toBe(1);
  });
});

describe("SelectField rendering", () => {
  test("renders the selected label inside a shrinkable truncated span", () => {
    const markup = renderToStaticMarkup(
      <SelectField label="Endpoint" onChange={() => undefined} value="endpoint">
        <option value="endpoint">openai.personal.openai-codex-subscription.global.gpt-5.4</option>
      </SelectField>,
    );

    expect(markup).toContain('title="openai.personal.openai-codex-subscription.global.gpt-5.4"');
    expect(markup).toContain("justify-between");
    expect(markup).toContain("flex min-w-0 items-center");
    expect(markup).toContain("min-w-0 flex-1 truncate");
  });
});

describe("StatusPill rendering", () => {
  test("renders Paper accent Badge geometry via kit Badge", () => {
    const markup = renderToStaticMarkup(<StatusPill tone="accent">Selected</StatusPill>);

    expect(markup).toContain('data-slot="badge"');
    expect(markup).toContain("bg-[var(--rm-pill-accent-bg)]");
    expect(markup).toContain("!text-[var(--rm-pill-accent-ink)]");
    expect(markup).toContain("h-[22px]");
    expect(markup).toContain("font-mono");
    expect(markup).toContain("text-[11px]");
    expect(markup).not.toContain("bg-transparent");
    expect(markup).not.toContain("text-[13px]");
  });

  test("supports advisory and info soft-fill tones through shared tokens", () => {
    const advisoryMarkup = renderToStaticMarkup(
      <StatusPill tone={"advisory" as never}>Group evidence</StatusPill>,
    );
    const infoMarkup = renderToStaticMarkup(
      <StatusPill tone={"info" as never}>Tool capable</StatusPill>,
    );

    expect(advisoryMarkup).toContain("bg-[var(--rm-pill-soft-bg)]");
    expect(advisoryMarkup).toContain("text-[var(--rm-pill-advisory-ink)]");
    expect(infoMarkup).toContain("bg-[var(--rm-pill-soft-bg)]");
    expect(infoMarkup).toContain("text-[var(--rm-pill-info-ink)]");
  });

  test("direct Badge export matches kit slot without StatusPill wrapper markup", () => {
    const markup = renderToStaticMarkup(<Badge tone="success">healthy</Badge>);
    expect(markup).toContain('data-slot="badge"');
    expect(markup).toContain('data-tone="success"');
    expect(markup).toContain("healthy");
    expect(markup).toContain("text-[var(--rm-pill-success-ink)]");
  });
});

describe("FactCard rendering", () => {
  test("keeps the same panel surface whether emphasis is requested or not", () => {
    const standardMarkup = renderToStaticMarkup(<FactCard label="Models" value={4} />);
    const emphasisMarkup = renderToStaticMarkup(<FactCard label="Models" value={4} emphasis />);

    const standardSurface = standardMarkup.match(/bg-\[var\(--rm-[^)]*\)\]/)?.[0];
    const emphasisSurface = emphasisMarkup.match(/bg-\[var\(--rm-[^)]*\)\]/)?.[0];

    expect(standardSurface).toBeTruthy();
    expect(emphasisSurface).toBeTruthy();
    expect(emphasisSurface).toBe(standardSurface);
    expect(standardMarkup).toContain("border-[var(--rm-border)]");
    expect(emphasisMarkup).toContain("border-[var(--rm-border)]");
  });
});
