import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import { Schema } from "effect";

import { CONTROL_ENDPOINTS, type ControlEndpoint } from "./runtime-endpoints";

/**
 * S26k: configuration/control surface beside readback.ts. A control spec has one
 * GET read and one explicit non-destructive action; dispatch is guarded while an
 * action is pending so a double click cannot fire twice.
 */

export const ControlKeySchema = Schema.Literals(["providers", "endpoints", "controlController"]);
export type ControlKey = typeof ControlKeySchema.Type;
export const CONTROL_KEYS: readonly ControlKey[] = ["providers", "endpoints", "controlController"];

export const ControlRow = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  meta: Schema.String,
  value: Schema.String,
});
export type ControlRow = typeof ControlRow.Type;

export const ControlState = Schema.Struct({
  actionMessage: Schema.optional(Schema.String),
  actionStatus: Schema.Literals(["idle", "pending", "ok", "error"]),
  notice: Schema.optional(Schema.String),
  selectedEndpointId: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  rows: Schema.Array(ControlRow),
  status: Schema.Literals(["idle", "loading", "ok", "empty", "error"]),
  token: Schema.Number,
});
export type ControlState = typeof ControlState.Type;

export const ControlsState = Schema.Struct({
  controlController: ControlState,
  endpoints: ControlState,
  providers: ControlState,
});
export type ControlsState = typeof ControlsState.Type;

export const idleControl = (): ControlState => ({
  actionStatus: "idle",
  rows: [],
  status: "idle",
  token: 0,
});
export const emptyControls = (): ControlsState => ({
  controlController: idleControl(),
  endpoints: idleControl(),
  providers: idleControl(),
});
export const loadingControl = (token: number): ControlState => ({
  actionStatus: "idle",
  rows: [],
  status: "loading",
  token,
});
export const failedControl = (message: string, token: number): ControlState => ({
  actionMessage: undefined,
  actionStatus: "idle",
  error: message,
  rows: [],
  status: "error",
  token,
});

export const controlErrorMessage = (label: string, status: number, reason?: string): string => {
  if (reason !== undefined) return `${label} read failed: HTTP ${String(status)} (${reason})`;
  if (status === 401) return `${label} read failed: HTTP 401 (not authorized)`;
  if (status === 403) return `${label} read failed: HTTP 403 (forbidden)`;
  return `${label} read failed: HTTP ${String(status)}`;
};
export const controlActionErrorMessage = (
  label: string,
  status: number,
  reason?: string,
): string =>
  reason === undefined
    ? `${label} action failed: HTTP ${String(status)}`
    : `${label} action failed: HTTP ${String(status)} (${reason})`;

const asRecord = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const row = (id: string, label: string, value: string, meta: string): ControlRow => ({
  id,
  label,
  meta,
  value,
});
const reasonOf = (body: unknown): string | undefined => {
  const record = asRecord(body);
  return typeof record?.reason === "string"
    ? record.reason
    : typeof record?.message === "string"
      ? record.message
      : undefined;
};
const rowsOrEmpty = (rows: readonly ControlRow[], token: number): ControlState =>
  rows.length === 0
    ? { actionStatus: "idle", rows: [], status: "empty", token }
    : { actionStatus: "idle", rows, status: "ok", token };

const parseProviders = (body: unknown, token: number): ControlState => {
  const list = Array.isArray(body) ? body : asArray(asRecord(body)?.accounts);
  const rows = list.flatMap((value, index) => {
    const account = asRecord(value);
    if (account === undefined) return [];
    const id = String(account.providerAccountId ?? account.id ?? index);
    return [
      row(
        id,
        String(account.providerId ?? "provider"),
        String(account.status ?? account.healthStatus ?? ""),
        String(account.authMode ?? ""),
      ),
    ];
  });
  return rowsOrEmpty(rows, token);
};
const parseEndpoints = (body: unknown, token: number): ControlState => {
  const list = Array.isArray(body) ? body : asArray(asRecord(body)?.endpoints);
  const rows = list.flatMap((value, index) => {
    const endpoint = asRecord(value);
    if (endpoint === undefined) return [];
    if (endpoint.endpointId === undefined && endpoint.id === undefined && endpoint.modelId === undefined) return [];
    const id = String(endpoint.endpointId ?? endpoint.id ?? index);
    return [
      row(
        id,
        String(endpoint.modelId ?? "endpoint"),
        String(endpoint.status ?? ""),
        String(endpoint.providerId ?? ""),
      ),
    ];
  });
  if (list.length > 0 && rows.length === 0) return { actionStatus: "idle", error: "Endpoints read failed: invalid response", rows: [], status: "error", token };
  return rowsOrEmpty(rows, token);
};
const parseController = (body: unknown, token: number): ControlState => {
  const record = asRecord(body);
  if (record === undefined) {
    return {
      actionStatus: "idle",
      error: "Controller read failed: invalid response",
      rows: [],
      status: "error",
      token,
    };
  }
  const rows = Object.entries(record)
    .filter(
      ([, value]) =>
        typeof value === "string" || typeof value === "number" || typeof value === "boolean",
    )
    .map(([key, value]) => row(key, key, String(value), "controller"));
  return rowsOrEmpty(rows, token);
};

export interface ControlActionSpec {
  /** Static fields; the acting row's id is merged into `targetField` at dispatch. */
  readonly body: Readonly<Record<string, unknown>>;
  /** Which body field receives the acting row id. Without it the action cannot target a row. */
  readonly targetField?: "endpointId" | "providerAccountId";
  /** When set, the control is disabled and this explains why. An action that cannot succeed is */
  /** not offered as if it could. */
  readonly disabledReason?: string;
  readonly id: string;
  readonly label: string;
  readonly method: "POST" | "PATCH";
  readonly path: string;
  readonly successMessage: string;
}
export interface ControlSpec {
  readonly action: ControlActionSpec;
  readonly emptyText: string;
  readonly key: ControlKey;
  readonly label: string;
  readonly parse: (body: unknown, token: number) => ControlState;
  readonly read: ControlEndpoint;
}

export const CONTROL_SPECS: Readonly<Record<ControlKey, ControlSpec>> = {
  providers: {
    action: {
      body: {},
      id: "reconnect",
      targetField: "providerAccountId",
      label: "Reconnect provider",
      method: "POST",
      path: CONTROL_ENDPOINTS.providersReconnect.path,
      successMessage: "Providers action completed.",
    },
    emptyText: "No providers configured yet.",
    key: "providers",
    label: "Providers",
    parse: parseProviders,
    read: CONTROL_ENDPOINTS.providersRead,
  },
  endpoints: {
    action: {
      body: {},
      disabledReason: "Admission needs a provider account, a model and a region; the form is not ported yet (S208).",
      id: "activate",
      label: "Activate endpoint",
      method: "POST",
      path: CONTROL_ENDPOINTS.endpointsActivate.path,
      successMessage: "Endpoints action completed.",
    },
    emptyText: "No endpoints configured yet.",
    key: "endpoints",
    label: "Endpoints",
    parse: parseEndpoints,
    read: CONTROL_ENDPOINTS.endpointsRead,
  },
  controlController: {
    action: {
      body: {},
      id: "update-assignment",
      targetField: "endpointId",
      label: "Update controller",
      method: "PATCH",
      path: CONTROL_ENDPOINTS.controllerUpdate.path,
      successMessage: "Controller action completed.",
    },
    emptyText: "No controller assignment available.",
    key: "controlController",
    label: "Controller",
    parse: parseController,
    read: CONTROL_ENDPOINTS.controllerRead,
  },
};

export const controlKeyForRouteTag = (tag: string): ControlKey | null =>
  tag === "Providers"
    ? "providers"
    : tag === "Endpoints"
      ? "endpoints"
      : tag === "ControlController"
        ? "controlController"
        : null;

export interface ControlClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
}
export interface ControlResult {
  readonly body: unknown;
  readonly status: number;
}
export interface ControlClient {
  readonly read: (key: ControlKey) => Promise<ControlResult>;
  readonly dispatch: (key: ControlKey, endpointId?: string) => Promise<ControlResult>;
}
const headers = (options: ControlClientOptions): HeadersInit => ({
  ...(options.token === undefined ? {} : { authorization: `Bearer ${options.token}` }),
  "content-type": "application/json",
});
export const createControlClients = (options: ControlClientOptions = {}): ControlClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = (path: string) => `${options.baseUrl ?? ""}${path}`;
  return {
    dispatch: async (key, endpointId) => {
      const spec = CONTROL_SPECS[key];
      const response = await fetchImpl(url(spec.action.path), {
        body: JSON.stringify(
          endpointId === undefined || spec.action.targetField === undefined
            ? spec.action.body
            : { ...spec.action.body, [spec.action.targetField]: endpointId },
        ),
        headers: headers(options),
        method: spec.action.method,
      });
      return { body: await response.json(), status: response.status };
    },
    read: async (key) => {
      const spec = CONTROL_SPECS[key];
      const response = await fetchImpl(url(spec.read.path), {
        headers: headers(options),
        method: spec.read.method,
      });
      return { body: await response.json(), status: response.status };
    },
  };
};

export const controlFromResult = (
  key: ControlKey,
  result: ControlResult,
  token: number,
): ControlState => {
  const spec = CONTROL_SPECS[key];
  if (result.status < 200 || result.status >= 300) {
    return {
      actionStatus: "idle",
      error: controlErrorMessage(spec.label, result.status, reasonOf(result.body)),
      rows: [],
      status: "error",
      token,
    };
  }
  return spec.parse(result.body, token);
};
export const parseControlFixture = (key: ControlKey, body: unknown, token = 1): ControlState =>
  CONTROL_SPECS[key].parse(body, token);