/**
 * Run 98 addendum 45 J4 (operator report 2026-09-20: "i cant change policy because of authentication error").
 *
 * The Configuration page renders without a token, so a refused *write* is the first place the operator learns a
 * credential is involved. Echoing `401 operator_authentication_required` there says nothing about what to do;
 * this copy names the field and where the value comes from, and states that readbacks do not need it.
 */
const AUTHENTICATION_FAILURE = /(\b401\b|operator_authentication_required)/i;

export function describeOperatorWriteError(value: unknown): string {
  const text =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : String((value as { readonly message?: unknown })?.message ?? value ?? "");
  if (!AUTHENTICATION_FAILURE.test(text)) return text;
  return (
    "This change needs the operator token. Readbacks work without one, but a policy change does not: " +
    "enter the runtime's --operator-auth-token in the Operator token field above, then save again."
  );
}
