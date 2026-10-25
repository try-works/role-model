export interface RuntimeConfigRecord {
  readonly applied?: boolean;
  readonly config: Readonly<Record<string, unknown>> | null;
  readonly path?: string;
}

const asRecord = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Readonly<Record<string, unknown>>) : undefined;

export const parseRuntimeConfigRecord = (body: unknown): RuntimeConfigRecord | undefined => {
  const record = asRecord(body);
  if (record === undefined) return undefined;
  const config = record.config === null ? null : asRecord(record.config);
  if (record.config !== null && config === undefined) return undefined;
  return { applied: record.applied === true, config: config ?? null, ...(typeof record.path === "string" ? { path: record.path } : {}) };
};

export const runtimeConfigText = (record: RuntimeConfigRecord): string =>
  record.config === null ? "{}" : JSON.stringify(record.config, null, 2);

export const parseRuntimeConfigText = (text: string): { readonly config: Readonly<Record<string, unknown>> } | { readonly error: string } => {
  try {
    const parsed: unknown = JSON.parse(text);
    const config = asRecord(parsed);
    return config === undefined ? { error: "Config must be a JSON object." } : { config };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid JSON." };
  }
};

const valueKey = (value: unknown): string => JSON.stringify(value ?? null);

export const runtimeConfigDiff = (
  original: Readonly<Record<string, unknown>>,
  edited: Readonly<Record<string, unknown>>,
): readonly string[] => {
  const keys = [...new Set([...Object.keys(original), ...Object.keys(edited)])].sort();
  return keys.flatMap((key) => {
    const before = Object.hasOwn(original, key) ? valueKey(original[key]) : undefined;
    const after = Object.hasOwn(edited, key) ? valueKey(edited[key]) : undefined;
    if (before === after) return [];
    if (before === undefined) return ["added: " + key];
    if (after === undefined) return ["removed: " + key];
    return ["changed: " + key];
  });
};

export interface RuntimeConfigClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
}
export interface RuntimeConfigClient {
  readonly read: () => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly save: (config: Readonly<Record<string, unknown>>) => Promise<{ readonly body: unknown; readonly status: number }>;
}
export const createRuntimeConfigClient = (options: RuntimeConfigClientOptions = {}): RuntimeConfigClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = (options.baseUrl ?? "") + "/api/role-model/runtime/config";
  const headers = (base: Record<string, string>): Record<string, string> => ({ ...base, ...(options.token === undefined ? {} : { authorization: `Bearer ${options.token}` }) });
  return {
    read: async () => {
      const response = await fetchImpl(url, { cache: "no-store", headers: headers({ accept: "application/json" }) });
      return { body: await response.json(), status: response.status };
    },
    save: async (config) => {
      const response = await fetchImpl(url, { body: JSON.stringify(config), headers: headers({ "content-type": "application/json" }), method: "PUT" });
      return { body: await response.json(), status: response.status };
    },
  };
};
