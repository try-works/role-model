# FAS-7 Route Chart Spec

## Purpose

This document proposes which charts should appear on which runtime UI routes, what each chart displays, and why it is valuable to operators.

---

## Route: `/app`

### Role of the page

High-level operational summary.

This page should answer:

- Is the runtime busy?
- Is usage growing or shifting?
- Is latency degrading?
- Is spend increasing?
- Are failures trending up?

### Charts

#### 1. Token Usage Over Time

- Chart type: stacked area chart
- Range selector: `Day`, `Week`, `Month`, `90 days`
- Breakdown selector:
  - `Total`
  - `By source`
  - `By endpoint`
  - `By model`
- Metrics:
  - input tokens
  - output tokens
  - total tokens

Why this is valuable:

- makes real usage trend visible immediately
- shows whether the system is increasingly local or remote
- gives an at-a-glance sense of actual runtime load

#### 2. Effective Cost Over Time

- Chart type: line chart or filled area chart
- Breakdown selector:
  - `Total`
  - `By provider`
  - `By model`
  - `By source`
- Metrics:
  - actual cost
  - estimated cost
  - effective cost

Why this is valuable:

- cost is a top-level operator concern
- helps users see spend growth and spot remote-heavy cost spikes

#### 3. Latency Trend

- Chart type: dual-line chart
- Metrics:
  - average latency
  - p95 latency
- Breakdown selector:
  - `Total`
  - `By source`

Why this is valuable:

- average latency alone hides painful tail behavior
- p95 gives early warning before users feel a broad outage

#### 4. Success vs Failure Volume

- Chart type: stacked bar chart
- Metrics:
  - success count
  - failure count
- Optional breakdown:
  - `By source`
  - `By status family`

Why this is valuable:

- reliability trend is one of the most important top-level operational signals
- allows users to distinguish “higher traffic” from “more broken traffic”

### Keep below the charts

- current endpoint inventory
- latest requests rail

Why:

- charts explain posture
- inventory and recent requests explain present state and provide drill-in paths

---

## Route: `/app/observe/requests`

### Role of the page

Primary structured telemetry analytics route.

This page should answer:

- where traffic is going
- which endpoints/models are driving usage
- where cost is coming from
- where latency is rising
- which endpoints/models are failing

### Charts

#### 1. Request Volume Over Time

- Chart type: bar chart
- Range selector: `Day`, `Week`, `Month`, `90 days`
- Breakdown selector:
  - `Total`
  - `By source`
  - `By endpoint`
  - `By model`
  - `By provider`

Why this is valuable:

- reveals traffic allocation across the runtime
- shows operational demand patterns directly

#### 2. Token Usage Over Time

- Chart type: stacked area chart
- Breakdown selector:
  - `By source`
  - `By endpoint`
  - `By model`

Why this is valuable:

- token volume is often a better measure of real workload than request count
- exposes heavy models and traffic concentration

#### 3. Effective Cost Over Time

- Chart type: line or area chart
- Breakdown selector:
  - `By provider`
  - `By model`
  - `By source`

Why this is valuable:

- lets operators attribute spend instead of only observing it
- useful for routing and provider optimization decisions

#### 4. Latency Trend

- Chart type: dual-line chart
- Metrics:
  - average latency
  - p95 latency
- Breakdown selector:
  - `Total`
  - `By source`
  - `By endpoint`

Why this is valuable:

- helps isolate whether latency is global or tied to a particular backend

#### 5. Failure Trend

- Chart type: bar chart or line chart
- Breakdown selector:
  - `By endpoint`
  - `By model`
  - `By status family`

Why this is valuable:

- highlights unstable endpoints or provider regressions
- provides immediate incident triage value

#### 6. Ranked Comparison Chart

- Chart type: horizontal bar chart
- Metric selector:
  - request count
  - total tokens
  - effective cost
  - average latency
  - p95 latency
  - failure count
- Ranking target selector:
  - endpoints
  - models
  - providers

Why this is valuable:

- turns the page into a decision surface
- users can quickly identify “top offenders” or “top spenders”

### Keep below the charts

- canonical telemetry request ledger

Ledger should share:

- active time range
- active filters
- breakdown context where appropriate

Why:

- charts show patterns
- ledger provides exact evidence and drill-down

---

## Route: `/app/observe/activity`

### Role of the page

Preserved raw-host activity and capture inspection.

This page should not become the primary analytics route.

### Charts

#### 1. Host Activity Volume

- Chart type: small bar chart
- Metrics:
  - activity entries per time bucket

Why this is valuable:

- provides context for raw host churn
- helps explain whether captures and raw activity are sparse or dense

#### 2. Capture Availability Trend

- Chart type: stacked bar chart
- Metrics:
  - capture-backed entries
  - non-capture entries

Why this is valuable:

- useful as debugging readiness telemetry
- shows whether raw forensic visibility is improving or degrading

### Keep as primary content

- host activity ledger
- capture inspector

Why:

- this route is for forensic evidence, not chart-first analysis

---

## Route: `/app/observe/logs`

### Role of the page

Raw log inspection and correlation support.

This page should remain mostly log-first.

### Charts

#### Optional only: Severity Distribution

- Chart type: compact stacked bar or donut
- Metrics:
  - info
  - warn
  - error
- Optional breakdown:
  - source class

Why this is valuable:

- gives a quick sense of noisy vs unhealthy log periods

### Keep as primary content

- structured log history
- source filter
- raw lines
- stream links

Why:

- operators come here to inspect raw logs, not to browse dashboards

---

## Route: `/app/observe/requests/:requestId`

### Role of the page

Single-request detail and contextual diagnosis.

This page should remain mostly detail-first, with only small contextual charts.

### Charts

#### 1. Endpoint Recent Latency Sparkline

- Chart type: sparkline
- Metrics:
  - recent average latency for this endpoint
  - optional recent p95

Why this is valuable:

- shows whether the current request is an outlier or part of a broader latency trend

#### 2. Endpoint Recent Failure Trend

- Chart type: sparkline or mini bars
- Metrics:
  - recent success/failure counts for the endpoint

Why this is valuable:

- lets the operator see whether the request failed in isolation or as part of a systemic issue

### Keep as primary content

- telemetry facts
- routing receipts
- tooling receipts
- captures
- raw observation bundle

Why:

- this route is for explanation and evidence, not dashboard browsing

---

## Shared Controls

These controls should be reused across charted routes:

- time range selector:
  - `Day`
  - `Week`
  - `Month`
  - `90 days`
- filter bar:
  - source
  - endpoint
  - model
  - provider
  - request operation
  - status family
- metric selector where appropriate
- breakdown selector where appropriate

Why:

- consistent chart controls reduce operator cognitive load
- users should not relearn analytics controls per route

---

## Summary

### Summary routes

- `/app` should be chart-led, compact, and posture-oriented

### Analytics routes

- `/app/observe/requests` should be the main telemetry analytics surface

### Forensic routes

- `/app/observe/activity`
- `/app/observe/logs`
- `/app/observe/requests/:requestId`

These should remain evidence-oriented, with only light contextual charting where useful.
