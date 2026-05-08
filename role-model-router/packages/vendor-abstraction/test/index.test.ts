import { describe, expect, test } from "vitest";

import {
  createVendorNotConfiguredError,
  normalizeVendorError,
  readVendorStreamTranscript,
} from "../src/index.js";

describe("vendor-abstraction", () => {
  test("normalizes rate-limited vendor failures into retryable metadata", () => {
    const result = normalizeVendorError({
      vendorId: "litellm-proxy",
      statusCode: 429,
      body: {
        error: {
          message: "Too many requests.",
        },
      },
      retryAfterHeader: "15",
    });

    expect(result).toEqual({
      errorClass: "VENDOR_RATE_LIMITED",
      vendorId: "litellm-proxy",
      statusCode: 429,
      rawMessage: "Too many requests.",
      retryable: true,
      retryAfterMs: 15000,
    });
  });

  test("creates a normalized vendor-not-configured error for inactive vendor modes", () => {
    expect(
      createVendorNotConfiguredError("llama-swap", "Configure llama_swap.models to enable local execution."),
    ).toEqual({
      errorClass: "VENDOR_NOT_CONFIGURED",
      vendorId: "llama-swap",
      statusCode: undefined,
      rawMessage: "Configure llama_swap.models to enable local execution.",
      retryable: false,
      retryAfterMs: undefined,
    });
  });

  test("reads an SSE vendor transcript and forwards parsed payloads to the stream writer", async () => {
    const encoder = new TextEncoder();
    const payloads: Record<string, unknown>[] = [];
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"response.created","response":{"id":"resp_123"}}\n\ndata: {"type":"response.output_text.delta","delta":"Ready"}\n\ndata: [DONE]\n\n',
            ),
          );
          controller.close();
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
        },
      },
    );

    const transcript = await readVendorStreamTranscript(response, async (payload) => {
      payloads.push(payload);
    });

    expect(payloads).toEqual([
      {
        type: "response.created",
        response: {
          id: "resp_123",
        },
      },
      {
        type: "response.output_text.delta",
        delta: "Ready",
      },
    ]);
    expect(transcript).toContain('"type":"response.created"');
    expect(transcript).toContain('"type":"response.output_text.delta"');
  });
});
