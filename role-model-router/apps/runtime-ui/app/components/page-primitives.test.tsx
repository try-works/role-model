import { describe, expect, test } from "vitest";

import { getSelectTypeaheadMatchIndex, type SelectOptionModel } from "./page-primitives";

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
