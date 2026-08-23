import { type MetricItem, MetricStrip } from "@role-model/ui";
import { useEffect, useMemo, useState } from "react";

import {
  CodeBlock,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
} from "../components/page-primitives";
import {
  bodyTextClassName,
  fieldClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  primaryButtonBlockClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  type RuntimeSnapshot,
  fetchRuntimeEndpoints,
  fetchRuntimeModels,
  submitWorkbenchChat,
} from "../lib/runtime-api";
import { buildWorkbenchModelOptions, summarizeWorkbenchResult } from "../lib/view-models";

const formFieldLabelClassName = fieldLabelClassName;

function buildChatUsageMetrics(
  usageRows: Array<{ label: string; value: string }>,
  result: Record<string, unknown>,
): MetricItem[] {
  const items: MetricItem[] = [];
  const input = usageRows.find((row) => row.label === "Input tokens");
  const output = usageRows.find((row) => row.label === "Output tokens");

  if (input) {
    items.push({
      id: "input",
      label: "Input tokens",
      shortLabel: "Input",
      value: input.value,
    });
  }
  if (output) {
    items.push({
      id: "output",
      label: "Output tokens",
      shortLabel: "Output",
      value: output.value,
    });
  }

  const latencyMs =
    typeof result.latencyMs === "number"
      ? result.latencyMs
      : typeof result.durationMs === "number"
        ? result.durationMs
        : null;
  if (latencyMs !== null) {
    items.push({
      id: "latency",
      label: "Latency",
      shortLabel: "Latency",
      value: latencyMs >= 1000 ? `${(latencyMs / 1000).toFixed(1)}s` : `${latencyMs} ms`,
    });
  }

  return items;
}

export default function WorkbenchRoute() {
  const [snapshot, setSnapshot] = useState<Pick<RuntimeSnapshot, "models" | "endpoints"> | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("Summarize the chosen endpoint.");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([fetchRuntimeModels(), fetchRuntimeEndpoints()])
      .then(([models, endpoints]) => {
        setSnapshot({ models, endpoints });
      })
      .catch((value: unknown) =>
        setLoadError(value instanceof Error ? value.message : "Could not load workbench."),
      );
  }, []);

  const modelOptions = useMemo(
    () => buildWorkbenchModelOptions(snapshot?.models ?? [], snapshot?.endpoints ?? []),
    [snapshot?.endpoints, snapshot?.models],
  );

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    if (!modelOptions.some((entry) => entry.value === model)) {
      setModel(modelOptions[0]?.value ?? "");
    }
  }, [model, modelOptions, snapshot]);

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
        messages: [{ role: "user", content: prompt }],
      });
      setResult(response);
    } catch (value) {
      setSubmitError(value instanceof Error ? value.message : "Workbench request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const resultSummary = result ? summarizeWorkbenchResult(result) : null;
  const usageMetrics =
    result && resultSummary ? buildChatUsageMetrics(resultSummary.usageRows, result) : [];
  const hasModels = modelOptions.length > 0;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
      <SectionCard title="Request">
        {hasModels ? (
          <form className="space-y-4" onSubmit={onSubmit}>
            <SelectField label="Model" value={model} onChange={setModel}>
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <label className="grid gap-1.5">
              <span className={formFieldLabelClassName}>Prompt</span>
              <textarea
                className={`${fieldClassName} min-h-40`}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </label>
            <button
              className={primaryButtonBlockClassName}
              disabled={submitting || model.trim().length === 0}
              type="submit"
            >
              {submitting ? "Running…" : "Run request"}
            </button>
          </form>
        ) : (
          <EmptyState label="No execution-ready models are currently available." />
        )}
      </SectionCard>

      <SectionCard title="Result workspace">
        {submitError ? (
          <ErrorState label={submitError} />
        ) : !resultSummary ? (
          <EmptyState label="No result yet." />
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <p className={monoEyebrowClassName}>Assistant</p>
              {usageMetrics.length > 0 ? (
                <MetricStrip aria-label="Usage metrics" items={usageMetrics} variant="inline" />
              ) : null}
              <p className={`whitespace-pre-wrap ${bodyTextClassName}`}>
                {resultSummary.outputText || "No assistant text was returned."}
              </p>
            </div>

            <div className="space-y-3">
              <p className={monoEyebrowClassName}>Tool calls</p>
              {resultSummary.toolCalls.length === 0 ? (
                <p className={supportingTextClassName}>
                  No tool calls were surfaced for this response.
                </p>
              ) : (
                <div className="space-y-1">
                  {resultSummary.toolCalls.map((toolCall, index) => {
                    const execution =
                      resultSummary.toolExecutions.find(
                        (entry) => entry.toolName === toolCall.name,
                      ) ?? resultSummary.toolExecutions[index];
                    const status = execution?.status?.toLowerCase() ?? "ok";
                    const ok = status === "ok" || status === "success" || status === "completed";
                    const latencyMs =
                      typeof execution?.durationMs === "number" ? execution.durationMs : null;
                    return (
                      <div
                        key={toolCall.id ?? `${toolCall.name}-${toolCall.arguments}`}
                        className="flex items-center gap-3 py-1.5"
                      >
                        <span
                          aria-hidden="true"
                          className={`size-2 shrink-0 rounded-full ${
                            ok
                              ? "bg-[var(--rm-chart-cache,var(--rm-accent))]"
                              : "bg-[var(--status-warning,var(--rm-chart-warning))]"
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-[var(--rm-fg)]">
                          {toolCall.name}
                        </span>
                        {latencyMs !== null ? (
                          <span className={`shrink-0 tabular-nums ${supportingTextClassName}`}>
                            {latencyMs}ms
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className={monoEyebrowClassName}>Raw response</p>
              <CodeBlock className="min-h-72">{resultSummary.rawPayload}</CodeBlock>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
