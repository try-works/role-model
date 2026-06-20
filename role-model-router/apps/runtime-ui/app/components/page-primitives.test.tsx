import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { SelectField, type SelectOptionModel, getSelectTypeaheadMatchIndex } from "./page-primitives";

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
        <option value="endpoint">
          openai.personal.openai-codex-subscription.global.gpt-5.4
        </option>
      </SelectField>,
    );

    expect(markup).toContain("title=\"openai.personal.openai-codex-subscription.global.gpt-5.4\"");
    expect(markup).toContain("justify-between");
    expect(markup).toContain("flex min-w-0 items-center");
    expect(markup).toContain("min-w-0 flex-1 truncate");
  });
});
