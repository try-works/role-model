"use client";

import * as React from "react";

import type { MetricItem } from "./metric-strip";
import {
  ObserveActivity,
  type ObserveActivityCapture,
  type ObserveActivityEntry,
} from "./observe-activity";
import { SIDEBAR_FIXTURE_MODELS } from "./sidebar-specimens";

export const OBSERVE_ACTIVITY_METRICS: MetricItem[] = [
  { id: "entries", label: "Entries", value: "128" },
  { id: "errors", label: "Errors", value: "6" },
  { id: "promptTokens", label: "Prompt tokens", value: "84.2k" },
  { id: "completionTokens", label: "Completion tokens", value: "31.0k" },
];

export const OBSERVE_ACTIVITY_ENTRIES: ObserveActivityEntry[] = [
  {
    id: "act-1",
    kind: "request.complete",
    summary: "cli.local.coder completed req-router-001",
    timestampLabel: "12:04:18",
    hasCapture: true,
  },
  {
    id: "act-2",
    kind: "controller.change",
    summary: "Controller set to gpt-5.4 @ cli.local.coder",
    timestampLabel: "11:58:02",
    hasCapture: false,
  },
  {
    id: "act-3",
    kind: "tooling.receipt",
    summary: "filesystem.read → ok (42ms)",
    timestampLabel: "11:51:44",
    hasCapture: true,
  },
  {
    id: "act-4",
    kind: "request.error",
    summary: "openai.gpt-5.4 failed req-observe-003",
    timestampLabel: "11:40:11",
    hasCapture: true,
  },
];

export const OBSERVE_ACTIVITY_CAPTURES: Record<string, ObserveActivityCapture> = {
  "act-1": {
    id: "act-1",
    title: "capture · req-router-001",
    body: '{\n  "requestId": "req-router-001",\n  "endpointId": "cli.local.coder",\n  "status": "ok",\n  "latencyMs": 420\n}',
  },
  "act-3": {
    id: "act-3",
    title: "capture · tooling.receipt",
    body: '{\n  "tool": "filesystem.read",\n  "status": "ok",\n  "durationMs": 42\n}',
  },
  "act-4": {
    id: "act-4",
    title: "capture · req-observe-003",
    body: '{\n  "requestId": "req-observe-003",\n  "status": "error",\n  "message": "upstream timeout"\n}',
  },
};

export function ObserveActivitySpecimensDemo() {
  const [selectedId, setSelectedId] = React.useState<string>("act-1");
  const entry = OBSERVE_ACTIVITY_ENTRIES.find((e) => e.id === selectedId);
  const capture = entry?.hasCapture ? (OBSERVE_ACTIVITY_CAPTURES[selectedId] ?? null) : null;

  return (
    <ObserveActivity
      models={SIDEBAR_FIXTURE_MODELS}
      cacheHitRate={73}
      routerEndpoint="127.0.0.1:8787/v1"
      routerAlias="baseline.remote-only"
      metrics={OBSERVE_ACTIVITY_METRICS}
      entries={OBSERVE_ACTIVITY_ENTRIES}
      selectedEntryId={selectedId}
      onSelectEntry={setSelectedId}
      capture={capture}
    />
  );
}
