import { describe, expect, test } from "vitest";

import { describeOperatorWriteError } from "./operator-write-error";

/**
 * Run 98 addendum 45 J4 — the operator hit "i cant change policy because of authentication error" on a page
 * whose readback worked without a token. The 401 must say what to do instead of echoing the raw code.
 */
describe("run98 a45 operator write error copy", () => {
  test("a 401 write names the remedy and says the readback needs no token", () => {
    const described = describeOperatorWriteError(
      new Error(
        "Request to /api/role-model/operator/learning/policy failed with 401: operator_authentication_required",
      ),
    );
    expect(described).toContain("operator token");
    expect(described).toContain("--operator-auth-token");
    expect(described).toContain("Readbacks work without one");
  });

  test("a non-authentication failure is passed through unchanged", () => {
    expect(describeOperatorWriteError(new Error("activation requires a recorded pack"))).toBe(
      "activation requires a recorded pack",
    );
  });
});
