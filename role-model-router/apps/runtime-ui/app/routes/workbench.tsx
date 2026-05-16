import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";

import {
  CodeBlock,
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { fieldClassName, mutedPanelClassName, primaryButtonClassName } from "../lib/design-system";
import {
  type RuntimeSnapshot,
  type WorkbenchChatInput,
  fetchRuntimeSnapshot,
  submitWorkbenchChat,
} from "../lib/runtime-api";
import {
  buildWorkbenchEndpointOptions,
  buildWorkbenchModelOptions,
  summarizeWorkbenchResult,
} from "../lib/view-models";

const routingModeOptions: Array<{
  label: string;
  value: "" | NonNullable<WorkbenchChatInput["routingModeOverride"]>;
}> = [
  { label: "Alias default (use configured strategy)", value: "" },
  { label: "Baseline", value: "baseline" },
  { label: "Difficulty", value: "difficulty" },
  { label: "Controller", value: "controller" },
  { label: "Hybrid", value: "hybrid" },
];

function formatRoutingModeLabel(
  value: "" | NonNullable<WorkbenchChatInput["routingModeOverride"]>,
): string {
  if (!value) {
    return "Alias default";
  }

  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function readLocationRoutingModeOverride(
  value: unknown,
): "" | NonNullable<WorkbenchChatInput["routingModeOverride"]> {
  if (
    value === "baseline" ||
    value === "difficulty" ||
    value === "controller" ||
    value === "hybrid"
  ) {
    return value;
  }

  return "";
}

export default function WorkbenchRoute() {
  const location = useLocation();
  const locationRoutingModeOverride = readLocationRoutingModeOverride(
    typeof location.state === "object" && location.state !== null
      ? (location.state as { routingModeOverride?: unknown }).routingModeOverride
      : undefined,
  );
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [endpointId, setEndpointId] = useState("");
  const [routingModeOverride, setRoutingModeOverride] = useState<
    "" | NonNullable<WorkbenchChatInput["routingModeOverride"]>
  >(locationRoutingModeOverride);
  const [prompt, setPrompt] = useState("Summarize the chosen endpoint.");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then((data) => {
        setSnapshot(data);
      })
      .catch((value: unknown) =>
        setLoadError(value instanceof Error ? value.message : "Could not load workbench."),
      );
  }, []);

  useEffect(() => {
    if (locationRoutingModeOverride) {
      setRoutingModeOverride(locationRoutingModeOverride);
    }
  }, [locationRoutingModeOverride]);
  const modelOptions = useMemo(
    () => buildWorkbenchModelOptions(snapshot?.models ?? []),
    [snapshot?.models],
  );
  const endpointOptions = useMemo(
    () =>
      snapshot
        ? buildWorkbenchEndpointOptions({
            modelId: model,
            models: snapshot.models,
            endpoints: snapshot.endpoints,
            accounts: snapshot.accounts,
          })
        : [],
    [model, snapshot],
  );

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    if (!snapshot.models.some((entry) => entry.id === model)) {
      setModel(snapshot.models[0]?.id ?? "");
    }
  }, [model, snapshot]);

  useEffect(() => {
    setEndpointId((current) =>
      endpointOptions.some((option) => option.value === current)
        ? current
        : (endpointOptions[0]?.value ?? ""),
    );
  }, [endpointOptions]);

  if (loadError) {
    return <ErrorState label={loadError} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading workbench…" />;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    try {
      const response = await submitWorkbenchChat({
        model,
        endpointId: endpointId || undefined,
        messages: [{ role: "user", content: prompt }],
        routingModeOverride: routingModeOverride || undefined,
      });
      setResult(response);
    } catch (value) {
      setSubmitError(value instanceof Error ? value.message : "Workbench request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const resultSummary = result ? summarizeWorkbenchResult(result) : null;
  const toolCapableEndpoints = snapshot.endpoints.filter(
    (endpoint) => endpoint.toolCallingSupported,
  ).length;
  const routingModeLabel = formatRoutingModeLabel(routingModeOverride);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Chat workspace"
        description="Compose routed chat requests, then inspect assistant text, tool calls, execution receipts, and token usage without leaving the shell."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Models"
          value={snapshot.models.length}
          detail="Available model ids currently exposed through the runtime model listing."
          emphasis
        />
        <FactCard
          label="Tool-capable endpoints"
          value={toolCapableEndpoints}
          detail="Endpoints currently able to surface tool-calling behavior in the workspace."
        />
        <FactCard
          label="Selected model"
          value={model}
          detail="The active model binding for the next routed request."
        />
        <FactCard
          label="Routing mode"
          value={routingModeLabel}
          detail="Optional per-request override that the runtime host forwards as a routing-mode header."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard
          title="Composer"
          description="This form posts directly to the runtime-host `/v1/chat/completions` route."
        >
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Model</span>
              <select
                className={fieldClassName}
                value={model}
                onChange={(event) => setModel(event.target.value)}
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Endpoint</span>
              <select
                className={fieldClassName}
                value={endpointId}
                onChange={(event) => setEndpointId(event.target.value)}
              >
                {endpointOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Routing mode</span>
              <select
                className={fieldClassName}
                value={routingModeOverride}
                onChange={(event) =>
                  setRoutingModeOverride(
                    event.target.value as
                      | ""
                      | NonNullable<WorkbenchChatInput["routingModeOverride"]>,
                  )
                }
              >
                {routingModeOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Prompt</span>
              <textarea
                className={`${fieldClassName} min-h-40`}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </label>
            <button className={primaryButtonClassName} disabled={submitting} type="submit">
              {submitting ? "Running…" : "Run request"}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Result workspace"
          description="Tooling-aware response summary aligned with the runtime host payload."
        >
          {submitError ? (
            <div className={`${mutedPanelClassName} border-l-4 border-red-500 p-4`}>
              <p className="text-xs font-normal uppercase tracking-[0.2em] text-red-500">
                Request failed
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--rm-fg)]">
                {submitError}
              </p>
            </div>
          ) : !resultSummary ? (
            <EmptyState label="No result yet." />
          ) : (
            <div className="space-y-4">
              <div className={`${mutedPanelClassName} p-4`}>
                <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                  Routing receipt handoff
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--rm-fg)]">
                  Requested mode: <span className="font-medium">{routingModeLabel}</span>. Verify
                  the persisted routing receipt in{" "}
                  <Link className="font-medium text-[var(--rm-accent)]" to="/app/observe/requests">
                    Telemetry ledger
                  </Link>{" "}
                  after the request completes.
                </p>
              </div>

              <div className={`${mutedPanelClassName} p-4`}>
                <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                  Assistant output
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--rm-fg)]">
                  {resultSummary.outputText || "No assistant text was returned."}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={`${mutedPanelClassName} p-4`}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[var(--rm-fg)]">Tool calls</p>
                    <StatusPill tone={resultSummary.toolCalls.length > 0 ? "accent" : "neutral"}>
                      {resultSummary.toolCalls.length}
                    </StatusPill>
                  </div>
                  <div className="mt-3 space-y-3">
                    {resultSummary.toolCalls.length === 0 ? (
                      <p className="text-sm text-[var(--rm-secondary)]">
                        No tool calls were surfaced for this response.
                      </p>
                    ) : (
                      resultSummary.toolCalls.map((toolCall) => (
                        <div
                          key={toolCall.id ?? `${toolCall.name}-${toolCall.arguments}`}
                          className={`${mutedPanelClassName} p-3`}
                        >
                          <p className="font-medium text-[var(--rm-fg)]">{toolCall.name}</p>
                          <CodeBlock className="mt-3 text-xs">{toolCall.arguments}</CodeBlock>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={`${mutedPanelClassName} p-4`}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[var(--rm-fg)]">Execution receipts</p>
                    <StatusPill
                      tone={resultSummary.toolExecutions.length > 0 ? "success" : "neutral"}
                    >
                      {resultSummary.toolExecutions.length}
                    </StatusPill>
                  </div>
                  <div className="mt-3 space-y-3">
                    {resultSummary.toolExecutions.length === 0 ? (
                      <p className="text-sm text-[var(--rm-secondary)]">
                        No runtime tool execution receipts were recorded.
                      </p>
                    ) : (
                      resultSummary.toolExecutions.map((execution, index) => (
                        <div
                          key={`${execution.connectorId ?? "connector"}-${execution.toolName ?? index}`}
                          className={`${mutedPanelClassName} p-3`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-[var(--rm-fg)]">
                              {execution.toolName ?? "Unnamed tool"}
                            </p>
                            {execution.status ? (
                              <StatusPill
                                tone={execution.status === "success" ? "success" : "warning"}
                              >
                                {execution.status}
                              </StatusPill>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                            {execution.connectorId ?? "Unknown connector"}
                            {typeof execution.durationMs === "number"
                              ? ` • ${execution.durationMs} ms`
                              : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {resultSummary.usageRows.map((row) => (
                  <div key={row.label} className={`${mutedPanelClassName} p-4`}>
                    <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                      {row.label}
                    </p>
                    <p className="mt-2 text-lg font-medium text-[var(--rm-fg)]">{row.value}</p>
                  </div>
                ))}
              </div>

              <CodeBlock className="min-h-72 text-sm">{resultSummary.rawPayload}</CodeBlock>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
