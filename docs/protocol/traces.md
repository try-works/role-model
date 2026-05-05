# Traces

Trace artifacts describe how routing and execution progressed.

The baseline trace vocabulary covers:

- eligibility and scoring evaluation,
- endpoint selection,
- load, queue, prefill, decode, and tool execution,
- fallback, retry, and failure paths.

`TraceSpan` captures interval context; `TraceEvent` captures point-in-time observations inside or alongside
those spans.

Trace linkage is now part of the protocol baseline.

Every span carries:

- `trace_id`
- `span_id`
- `request_id`
- `routing_decision_id`
- `span_type`
- `started_at_ms`
- `ended_at_ms`
- `status`

Every event carries:

- `event_id`
- `trace_id`
- optional `span_id`
- `request_id`
- `routing_decision_id`
- `timestamp_ms`
- `event_type`
- `payload`

`validateTraceLinkage` enforces the baseline invariants:

- parent spans must exist when `parent_span_id` is present,
- an event's `trace_id` must match a known trace,
- an event's `span_id` must reference a known span when present,
- an event attached to a span must reuse that span's `request_id` and `routing_decision_id`.

This makes traces usable as the authoritative bridge between router output, execution timing, and later
usage or profile artifacts.
