/** Legacy storage key: the operator read token is a local convenience, never a public asset. */
export const OPERATOR_TOKEN_STORAGE_KEY = "role-model.learning.operator-token";

export const writeStoredOperatorToken = (value: string): void => {
  try {
    if (value.length === 0) globalThis.localStorage?.removeItem(OPERATOR_TOKEN_STORAGE_KEY);
    else globalThis.localStorage?.setItem(OPERATOR_TOKEN_STORAGE_KEY, value);
  } catch {
    // Storage is a local convenience; a denied write must not break the action.
  }
};

export const readStoredOperatorToken = (): string | undefined => {
  try {
    const value = globalThis.localStorage?.getItem(OPERATOR_TOKEN_STORAGE_KEY) ?? "";
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
};
