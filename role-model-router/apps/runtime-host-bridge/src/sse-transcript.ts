/**
 * Run 115 S17b (R26 second half): the scoped SSE transcript reader.
 *
 * The reader owns the response body reader and, when a caller signal is supplied, one abort listener.
 * Both are released on success, failure and caller abort; on failure/abort the underlying stream is
 * cancelled first so a stalled upstream read is stopped rather than left running. Cleanup is
 * observable through onRelease (the same test seam shape S17a used for the JSON path).
 *
 * Typed failures are deliberately distinct from the JSON path's TrackBPrivateOperation* names:
 * - SseTranscriptAbortError: the caller's AbortSignal fired (or the read rejected because it fired).
 * - SseTranscriptIncompleteError: EOF arrived while the drained final frame was still invalid JSON
 *   (the stream ended mid-frame; the drain does not fabricate a frame).
 * - SseTranscriptProtocolError: a blank-line-terminated frame carried a payload that is not JSON.
 * A transport failure (including a downstream stream-writer error) propagates unchanged, so business
 * error identity is preserved; only the three semantic failures above are re-typed.
 *
 * Frame semantics: payloads are emitted strictly in arrival order, one per blank-line-terminated
 * frame; a frame split across chunks is reassembled; a final unterminated frame is drained (valid
 * JSON only); [DONE] is reported once through onDone and never as a data payload (drain/DONE/frame
 * order is pinned by test/s17b-sse-cleanup.test.ts).
 */

export type SseCleanupKind = "abort-listener" | "decoder" | "reader";

export interface SseReaderLike {
  readonly read: () => Promise<{ readonly done: boolean; readonly value?: Uint8Array }>;
  readonly cancel: (reason?: unknown) => Promise<void>;
  readonly releaseLock: () => void;
}

export interface SseBodyLike {
  readonly getReader: () => SseReaderLike;
}

export interface SseResponseLike {
  readonly body: SseBodyLike | null;
  readonly text: () => Promise<string>;
}

export interface SseTranscriptOptions {
  /** Caller-owned abort signal. Forwarded by Effect.tryPromise when the thunk declares it. */
  readonly signal?: AbortSignal;
  /** Cleanup observer: reader/listener release is counted here. */
  readonly onRelease?: (kind: SseCleanupKind) => void;
  /** One call per non-DONE frame payload, in arrival order. */
  readonly onPayload?: (payloadText: string) => Promise<void> | void;
  /** Called once when a [DONE] frame is seen. */
  readonly onDone?: () => Promise<void> | void;
}

const ABORTED_MESSAGE = "SSE transcript aborted by caller";

export class SseTranscriptAbortError extends Error {
  readonly _tag = "SseTranscriptAbortError";
  constructor() {
    super(ABORTED_MESSAGE);
    this.name = "SseTranscriptAbortError";
  }
}

export class SseTranscriptIncompleteError extends Error {
  readonly _tag = "SseTranscriptIncompleteError";
  constructor() {
    super("SSE transcript ended mid-frame");
    this.name = "SseTranscriptIncompleteError";
  }
}

export class SseTranscriptProtocolError extends Error {
  readonly _tag = "SseTranscriptProtocolError";
  readonly payloadText: string;
  constructor(payloadText: string) {
    super("SSE frame payload is not valid JSON");
    this.name = "SseTranscriptProtocolError";
    this.payloadText = payloadText;
  }
}

const dataLinesOf = (block: string): ReadonlyArray<string> =>
  block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart());

const asAbortError = (error: Error): SseTranscriptAbortError =>
  error instanceof SseTranscriptAbortError
    ? error
    : error.name === "AbortError"
      ? new SseTranscriptAbortError()
      : new SseTranscriptAbortError();

const emitFrame = async (
  block: string,
  options: SseTranscriptOptions,
  final: boolean,
): Promise<void> => {
  const dataLines = dataLinesOf(block);
  if (dataLines.length === 0) {
    return;
  }
  const payloadText = dataLines.join("\n").trim();
  if (payloadText.length === 0) {
    return;
  }
  if (payloadText === "[DONE]") {
    await options.onDone?.();
    return;
  }
  try {
    JSON.parse(payloadText);
  } catch {
    throw final
      ? new SseTranscriptIncompleteError()
      : new SseTranscriptProtocolError(payloadText);
  }
  await options.onPayload?.(payloadText);
};

export const readSseTranscript = async (
  response: SseResponseLike,
  options: SseTranscriptOptions = {},
): Promise<string> => {
  const signal = options.signal;
  const isCallerAborted = (): boolean => signal?.aborted === true;
  if (isCallerAborted()) {
    throw new SseTranscriptAbortError();
  }

  if (response.body === null) {
    const transcript = await response.text();
    for (const block of transcript.split(/\r?\n\r?\n/u)) {
      await emitFrame(block, options, false);
    }
    return transcript;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let rawTranscript = "";
  let pending = "";

  let abortListener: (() => void) | undefined;
  let abortRejection: Promise<never> | undefined;
  if (signal !== undefined) {
    abortRejection = new Promise<never>((_resolve, reject) => {
      abortListener = () => {
        // Stop the stalled upstream read at abort time, not only when the rejection settles.
        void reader.cancel(new SseTranscriptAbortError()).catch(() => undefined);
        reject(new SseTranscriptAbortError());
      };
      signal.addEventListener("abort", abortListener, { once: true });
    });
    // If the stream settles first, the rejection has no consumer; do not let it surface unhandled.
    abortRejection.catch(() => undefined);
  }

  const nextRead = async (): Promise<{ readonly done: boolean; readonly value?: Uint8Array }> => {
    const pendingRead = reader.read();
    if (abortRejection === undefined) {
      return await pendingRead;
    }
    return await Promise.race([pendingRead, abortRejection]);
  };

  const flushBlocks = async (final: boolean): Promise<void> => {
    while (true) {
      const separatorIndex = pending.indexOf("\n\n");
      if (separatorIndex < 0) {
        break;
      }
      const block = pending.slice(0, separatorIndex);
      pending = pending.slice(separatorIndex + 2);
      await emitFrame(block, options, false);
    }
    if (final && pending.trim().length > 0) {
      const block = pending;
      pending = "";
      await emitFrame(block, options, true);
    }
  };

  try {
    while (true) {
      const { done, value } = await nextRead();
      if (done) {
        const finalText = decoder.decode();
        if (finalText.length > 0) {
          rawTranscript += finalText;
          pending += finalText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        }
        await flushBlocks(true);
        return rawTranscript;
      }
      if (value === undefined) {
        continue;
      }
      const chunkText = decoder.decode(value, { stream: true });
      rawTranscript += chunkText;
      pending += chunkText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      await flushBlocks(false);
    }
  } catch (error) {
    // Stop the upstream read before releasing: a failed or aborted stream must not keep running.
    await reader.cancel(error).catch(() => undefined);
    if (isCallerAborted()) {
      throw new SseTranscriptAbortError();
    }
    if (
      error instanceof SseTranscriptAbortError ||
      error instanceof SseTranscriptIncompleteError ||
      error instanceof SseTranscriptProtocolError
    ) {
      throw error;
    }
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError") {
      throw asAbortError(error instanceof Error ? error : new Error(name));
    }
    // Never wrap a downstream/business failure: its identity is part of the caller contract.
    throw error;
  } finally {
    if (signal !== undefined && abortListener !== undefined) {
      signal.removeEventListener("abort", abortListener);
      options.onRelease?.("abort-listener");
    }
    reader.releaseLock();
    options.onRelease?.("reader");
    // TextDecoder has no release API; this is the scope-exit marker for the decoder allocation.
    options.onRelease?.("decoder");
  }
};
