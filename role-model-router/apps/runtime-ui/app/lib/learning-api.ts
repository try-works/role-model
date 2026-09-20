import { useCallback, useEffect, useState } from "react";

import { type RuntimeFetcher, fetchJson, postJson, withRuntimeStartupRetry } from "./runtime-api";

/**
 * Run 98 R17: the Learning surface's operator client.
 *
 * Every read is a bounded operator GET; every mutation is an authenticated POST that the
 * sidecar receipts exactly like a config-file or CLI change. The Configuration page renders
 * whatever fields the R15 schema publishes, so a parameter added in a future revision
 * appears without UI code changes (`AC-R17-03a`).
 */

export interface LearningPolicyField {
  readonly name: string;
  readonly type: "number" | "integer" | "enum" | "percent-list" | "boolean" | "string";
  readonly values?: readonly string[];
  readonly unit: string;
  readonly default: unknown;
  readonly min?: number;
  readonly max?: number;
  readonly uiEditable: boolean;
  readonly description: string;
  readonly value: unknown;
}

export interface LearningPolicyView {
  readonly policyVersion: number;
  readonly schemaVersion: string;
  readonly digest: string;
  readonly updatedAtMs: number;
  readonly effective: Record<string, unknown>;
  readonly fields: readonly LearningPolicyField[];
  readonly receipts?: readonly Record<string, unknown>[];
}

export interface LearningPolicyChangeResult {
  readonly policyVersion: number;
  readonly digest?: string;
  readonly receipt?: {
    readonly changedFields?: readonly string[];
    readonly operator?: string;
    readonly previousDigest?: string;
    readonly newDigest?: string;
  };
}

export const OPERATOR_TOKEN_STORAGE_KEY = "role-model.learning.operator-token";

export function readStoredOperatorToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(OPERATOR_TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** The Learning pages share one operator token; it is kept locally, never sent anywhere else. */
export function useOperatorToken(): {
  readonly token: string;
  readonly setToken: (value: string) => void;
} {
  const [token, setTokenState] = useState<string>(() => readStoredOperatorToken());
  useEffect(() => {
    setTokenState(readStoredOperatorToken());
  }, []);
  const setToken = useCallback((value: string) => {
    setTokenState(value);
    if (typeof window === "undefined") return;
    try {
      if (value) window.localStorage.setItem(OPERATOR_TOKEN_STORAGE_KEY, value);
      else window.localStorage.removeItem(OPERATOR_TOKEN_STORAGE_KEY);
    } catch {
      // Storage is a convenience; the token still works for this session.
    }
  }, []);
  return { token, setToken };
}

const operatorHeaders = (token?: string) =>
  token ? { headers: { authorization: `Bearer ${token}` } } : undefined;

const operatorQuery = (query: Readonly<Record<string, string | number | undefined>> = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

export async function fetchLearningPolicy(
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
  query: Readonly<Record<string, string | number | undefined>> = {},
): Promise<LearningPolicyView> {
  return withRuntimeStartupRetry(() =>
    fetchJson<LearningPolicyView>(
      `/api/role-model/operator/learning/policy${operatorQuery(query)}`,
      fetcher,
      operatorHeaders(operatorToken),
    ),
  );
}

export async function saveLearningPolicy(
  input: {
    readonly changes: Readonly<Record<string, unknown>>;
    readonly expectedPolicyVersion: number;
    readonly operator: string;
    readonly reason?: string;
  },
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
): Promise<LearningPolicyChangeResult> {
  return postJson<LearningPolicyChangeResult>(
    "/api/role-model/operator/learning/policy",
    input,
    fetcher,
    { ...(operatorToken ? { authorization: `Bearer ${operatorToken}` } : {}) },
  );
}

export async function rollbackLearningPolicy(
  input: {
    readonly toPolicyVersion: number;
    readonly expectedPolicyVersion: number;
    readonly operator: string;
    readonly reason?: string;
  },
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
): Promise<LearningPolicyChangeResult> {
  return postJson<LearningPolicyChangeResult>(
    "/api/role-model/operator/learning/policy/rollback",
    input,
    fetcher,
    { ...(operatorToken ? { authorization: `Bearer ${operatorToken}` } : {}) },
  );
}

export async function fetchLearningRollout(
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
  query: Readonly<Record<string, string | number | undefined>> = {},
): Promise<Record<string, unknown>> {
  // Run 99 R33: the Overview's first readback must survive a runtime that is still bringing its
  // learning domain up instead of rendering "Learning surface unavailable".
  return withRuntimeStartupRetry(() =>
    fetchJson(
      `/api/role-model/operator/learning/rollout${operatorQuery(query)}`,
      fetcher,
      operatorHeaders(operatorToken),
    ),
  );
}

export async function fetchLearningRecords(
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
  query: Readonly<Record<string, string | number | undefined>> = {},
): Promise<Record<string, unknown>> {
  return withRuntimeStartupRetry(() =>
    fetchJson(
      `/api/role-model/operator/learning/records${operatorQuery(query)}`,
      fetcher,
      operatorHeaders(operatorToken),
    ),
  );
}

export async function fetchLearningDecisions(
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
  query: Readonly<Record<string, string | number | undefined>> = {},
): Promise<Record<string, unknown>> {
  return withRuntimeStartupRetry(() =>
    fetchJson(
      `/api/role-model/operator/learning/decisions${operatorQuery(query)}`,
      fetcher,
      operatorHeaders(operatorToken),
    ),
  );
}

export async function fetchLearningMeasurement(
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
  query: Readonly<Record<string, string | number | undefined>> = {},
): Promise<Record<string, unknown>> {
  return withRuntimeStartupRetry(() =>
    fetchJson(
      `/api/role-model/operator/learning/measurement${operatorQuery(query)}`,
      fetcher,
      operatorHeaders(operatorToken),
    ),
  );
}

/**
 * Run 99: the live activity projection behind the Learning live panel (pipeline, budget,
 * newest events) and the windowed history projection behind the History page.
 */
export async function fetchLearningActivity(
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
  query: Readonly<Record<string, string | number | undefined>> = {},
): Promise<Record<string, unknown>> {
  return withRuntimeStartupRetry(() =>
    fetchJson(
      `/api/role-model/operator/learning/activity${operatorQuery(query)}`,
      fetcher,
      operatorHeaders(operatorToken),
    ),
  );
}

export async function fetchLearningHistory(
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
  query: Readonly<Record<string, string | number | undefined>> = {},
): Promise<Record<string, unknown>> {
  return withRuntimeStartupRetry(() =>
    fetchJson(
      `/api/role-model/operator/learning/history${operatorQuery(query)}`,
      fetcher,
      operatorHeaders(operatorToken),
    ),
  );
}

export async function activateLearningPack(
  body: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
): Promise<Record<string, unknown>> {
  return postJson("/api/role-model/operator/learning/activate-pack", body, fetcher, {
    ...(operatorToken ? { authorization: `Bearer ${operatorToken}` } : {}),
  });
}

export async function rollbackLearningPack(
  body: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
): Promise<Record<string, unknown>> {
  return postJson("/api/role-model/operator/learning/rollback-pack", body, fetcher, {
    ...(operatorToken ? { authorization: `Bearer ${operatorToken}` } : {}),
  });
}

export async function engageLearningKillSwitch(
  body: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
  operatorToken?: string,
): Promise<Record<string, unknown>> {
  return postJson("/api/role-model/operator/learning/kill-switch", body, fetcher, {
    ...(operatorToken ? { authorization: `Bearer ${operatorToken}` } : {}),
  });
}

export interface PolicyDraftValidation {
  readonly changes: Record<string, unknown>;
  readonly errors: Record<string, string>;
}

/**
 * Client-side half of the bounded-edit rule (`AC-R17-04`): the draft is checked against the
 * schema's own bounds, read-only fields are refused, and only changed fields travel to the
 * server, which repeats the same validation and writes nothing on failure.
 */
export function validatePolicyDraft(
  fields: readonly LearningPolicyField[],
  draft: Readonly<Record<string, unknown>>,
): PolicyDraftValidation {
  const changes: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const byName = new Map(fields.map((field) => [field.name, field]));
  for (const [name, value] of Object.entries(draft)) {
    const field = byName.get(name);
    if (!field) {
      errors[name] = "unknown field for this policy schema version";
      continue;
    }
    if (!field.uiEditable) {
      errors[name] = "read-only field";
      continue;
    }
    if (value === undefined) continue;
    if (field.type === "number" || field.type === "integer") {
      const numeric = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(numeric)) {
        errors[name] = "must be a number";
        continue;
      }
      if (field.type === "integer" && !Number.isInteger(numeric)) {
        errors[name] = "must be an integer";
        continue;
      }
      if (typeof field.min === "number" && numeric < field.min) {
        errors[name] = `must be at least ${field.min}`;
        continue;
      }
      if (typeof field.max === "number" && numeric > field.max) {
        errors[name] = `must be at most ${field.max}`;
        continue;
      }
      if (value !== field.value) changes[name] = numeric;
      continue;
    }
    if (field.type === "enum") {
      if (typeof value !== "string" || (field.values && !field.values.includes(value))) {
        errors[name] = `must be one of ${(field.values ?? []).join(", ")}`;
        continue;
      }
    }
    if (field.type === "percent-list") {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((entry) => !Number.isInteger(entry) || entry < 10 || entry > 100) ||
        value.some((entry, index) => index > 0 && entry < (value[index - 1] as number))
      ) {
        errors[name] = "must be non-decreasing percentages within 10-100";
        continue;
      }
    }
    /**
     * Run 98 addendum 47, operator-reported ("bug, should accept true"): the Configuration page renders every
     * field as a text input, so a boolean arrives as `"true"`/`"false"`. Normalise it here — a real boolean or
     * the text form — and refuse anything else by name, so the draft comparison and the request body both
     * carry a boolean instead of the string that the server rightly rejected.
     */
    const normalized =
      field.type === "boolean" ? normalizeBooleanDraft(value) : value;
    if (field.type === "boolean" && normalized === null) {
      errors[name] = "must be true or false";
      continue;
    }
    if (JSON.stringify(normalized) !== JSON.stringify(field.value)) changes[name] = normalized;
  }
  return { changes, errors };
}

/** `true`/`false`, or their trimmed case-insensitive text form; anything else is not a boolean. */
function normalizeBooleanDraft(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return null;
}
