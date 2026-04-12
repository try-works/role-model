# Traces

Trace artifacts describe how routing and execution progressed.

The baseline trace vocabulary covers:

- eligibility and scoring evaluation,
- endpoint selection,
- load, queue, prefill, decode, and tool execution,
- fallback, retry, and failure paths.

`TraceSpan` captures interval context; `TraceEvent` captures point-in-time observations inside or alongside
those spans.
