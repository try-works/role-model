export type VendorErrorClass =
  | "VENDOR_AUTH_FAILED"
  | "VENDOR_NOT_CONFIGURED"
  | "VENDOR_RATE_LIMITED"
  | "VENDOR_REQUEST_FAILED"
  | "VENDOR_UNAVAILABLE";

export interface NormalizeVendorErrorInput {
  readonly vendorId: string;
  readonly statusCode?: number;
  readonly body?: unknown;
  readonly retryAfterHeader?: string;
}

export interface NormalizedVendorError {
  readonly errorClass: VendorErrorClass;
  readonly vendorId: string;
  readonly statusCode: number | undefined;
  readonly rawMessage: string;
  readonly retryable: boolean;
  readonly retryAfterMs: number | undefined;
}

export interface VendorExecutionMetadata {
  readonly vendorId: string;
  readonly resolvedModelId?: string;
  readonly latencyMs?: number;
  readonly costUsd?: number;
  readonly cacheStatus?: string;
  readonly cacheUsed?: boolean;
  readonly cacheReadTokens?: number;
  readonly cacheWriteTokens?: number;
}

export interface VendorExecutionRequest {
  readonly providerFamily: string;
  readonly endpointId: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: Record<string, unknown>;
}

export type VendorStreamWriter = (chunk: Record<string, unknown>) => void | Promise<void>;

export interface VendorExecutionOptions {
  readonly streamWriter?: VendorStreamWriter;
  readonly fallbackModelIds?: readonly string[];
}

export interface VendorExecutionResult {
  readonly statusCode: number;
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string>>;
  readonly metadata: VendorExecutionMetadata;
}

export interface VendorRuntimeStatus {
  readonly vendorId: string;
  readonly healthStatus: "healthy" | "inactive" | "starting" | "stopped" | "crashed";
  readonly baseUrl?: string;
  readonly healthUrl?: string;
  readonly pid?: number;
  readonly configPath?: string;
  readonly lastLatencyMs?: number;
}

export interface VendorRuntime {
  execute(request: VendorExecutionRequest, options?: VendorExecutionOptions): Promise<VendorExecutionResult>;
  executeStream(
    request: VendorExecutionRequest,
    streamWriter: VendorStreamWriter,
    options?: Omit<VendorExecutionOptions, "streamWriter">,
  ): Promise<VendorExecutionResult>;
  readStatus(): VendorRuntimeStatus;
  healthCheck(): Promise<VendorRuntimeStatus>;
  shutdown(): Promise<void>;
}

export function parseVendorStreamPayloads(transcript: string): readonly Record<string, unknown>[] {
  const payloads: Record<string, unknown>[] = [];
  for (const block of transcript.split(/\r?\n\r?\n/)) {
    const dataLines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .filter((line) => line.length > 0);
    if (dataLines.length === 0) {
      continue;
    }

    const payloadText = dataLines.join("\n");
    if (payloadText === "[DONE]") {
      continue;
    }

    try {
      payloads.push(JSON.parse(payloadText) as Record<string, unknown>);
    } catch {
      continue;
    }
  }
  return payloads;
}

export async function readVendorStreamTranscript(
  response: Response,
  streamWriter?: VendorStreamWriter,
): Promise<string> {
  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let transcript = "";
  let pending = "";

  const flushBlocks = async (flushAll: boolean): Promise<void> => {
    const parts = pending.split(/\r?\n\r?\n/);
    const completeBlocks = flushAll ? parts : parts.slice(0, -1);
    pending = flushAll ? "" : (parts.at(-1) ?? "");

    for (const payload of completeBlocks.flatMap((block) => parseVendorStreamPayloads(`${block}\n\n`))) {
      await streamWriter?.(payload);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      const finalChunk = decoder.decode();
      transcript += finalChunk;
      pending += finalChunk;
      await flushBlocks(true);
      break;
    }

    const chunkText = decoder.decode(value, { stream: true });
    transcript += chunkText;
    pending += chunkText;
    await flushBlocks(false);
  }

  return transcript;
}

function readVendorMessage(body: unknown): string | null {
  if (typeof body === "string" && body.trim().length > 0) {
    return body;
  }
  if (!body || typeof body !== "object") {
    return null;
  }

  if ("message" in body && typeof body.message === "string" && body.message.trim().length > 0) {
    return body.message;
  }

  if (
    "error" in body &&
    body.error &&
    typeof body.error === "object" &&
    "message" in body.error &&
    typeof body.error.message === "string" &&
    body.error.message.trim().length > 0
  ) {
    return body.error.message;
  }

  return null;
}

function parseRetryAfterMs(retryAfterHeader: string | undefined): number | undefined {
  if (!retryAfterHeader) {
    return undefined;
  }

  const seconds = Number(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const absoluteTime = Date.parse(retryAfterHeader);
  if (Number.isNaN(absoluteTime)) {
    return undefined;
  }

  return Math.max(absoluteTime - Date.now(), 0);
}

export function normalizeVendorError(
  input: NormalizeVendorErrorInput,
): NormalizedVendorError {
  const rawMessage =
    readVendorMessage(input.body) ??
    (input.statusCode ? `Vendor request failed with status ${input.statusCode}.` : "Vendor request failed.");

  if (input.statusCode === 429) {
    return {
      errorClass: "VENDOR_RATE_LIMITED",
      vendorId: input.vendorId,
      statusCode: input.statusCode,
      rawMessage,
      retryable: true,
      retryAfterMs: parseRetryAfterMs(input.retryAfterHeader),
    };
  }

  if (input.statusCode === 401 || input.statusCode === 403) {
    return {
      errorClass: "VENDOR_AUTH_FAILED",
      vendorId: input.vendorId,
      statusCode: input.statusCode,
      rawMessage,
      retryable: false,
      retryAfterMs: undefined,
    };
  }

  if (typeof input.statusCode === "number" && input.statusCode >= 500) {
    return {
      errorClass: "VENDOR_UNAVAILABLE",
      vendorId: input.vendorId,
      statusCode: input.statusCode,
      rawMessage,
      retryable: true,
      retryAfterMs: parseRetryAfterMs(input.retryAfterHeader),
    };
  }

  return {
    errorClass: "VENDOR_REQUEST_FAILED",
    vendorId: input.vendorId,
    statusCode: input.statusCode,
    rawMessage,
    retryable: false,
    retryAfterMs: undefined,
  };
}

export function createVendorNotConfiguredError(
  vendorId: string,
  rawMessage: string,
): NormalizedVendorError {
  return {
    errorClass: "VENDOR_NOT_CONFIGURED",
    vendorId,
    statusCode: undefined,
    rawMessage,
    retryable: false,
    retryAfterMs: undefined,
  };
}
