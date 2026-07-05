import { describe, expect, test } from "vitest";

import { isVoiceInventoryUnavailableError } from "./studio-audio";

describe("studio audio voice inventory state", () => {
  test("treats the HTML fallback parse error as an unavailable voice inventory", () => {
    expect(
      isVoiceInventoryUnavailableError(
        "Request to /v1/audio/voices?model=moonshot%2Fkimi-audio returned HTML instead of JSON.",
      ),
    ).toBe(true);
  });

  test("does not hide real runtime voice inventory errors", () => {
    expect(isVoiceInventoryUnavailableError("Request to /v1/audio/voices failed with 500.")).toBe(
      false,
    );
  });
});
