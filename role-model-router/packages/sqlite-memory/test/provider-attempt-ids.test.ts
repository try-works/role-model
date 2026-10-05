import { expect, test } from "vitest";

import { buildCompactRuntimeObservationStub } from "../src/index.js";

test("provider-attempt IDs survive compact SQLite observation projection", () => {
  const providerAttemptIds = ["attempt:request-1:primary", "attempt:request-1:fallback"];
  const stub = buildCompactRuntimeObservationStub({
    requestId: "request-1",
    executionSemantics: { providerAttemptIds },
  });

  expect(stub.executionSemantics).toMatchObject({ providerAttemptIds });
});
