import { useEffect, useMemo, useState } from "react";

import { CodeBlock, EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { fieldClassName, mutedPanelClassName, primaryButtonClassName } from "../lib/design-system";
import { fetchRuntimeSnapshot, submitWorkbenchChat, type RuntimeSnapshot } from "../lib/runtime-api";
import { buildCredentialReadinessRows, buildWorkbenchModelOptions, summarizeWorkbenchResult } from "../lib/view-models";

export default function WorkbenchRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("Summarize the chosen endpoint.");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then((data) => {
        setSnapshot(data);
        if (data.models[0]?.id) {
          setModel(data.models[0].id);
        }
      })
      .catch((value: unknown) => setLoadError(value instanceof Error ? value.message : "Could not load workbench."));
  }, []);

  const modelOptions = useMemo(() => buildWorkbenchModelOptions(snapshot?.models ?? []), [snapshot?.models]);

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
  const toolCapableEndpoints = snapshot.endpoints.filter((endpoint) => endpoint.toolCallingSupported).length;
  const readinessRows = buildCredentialReadinessRows(snapshot.summary).filter((row) => row.value > 0);
  const blockingReadinessRows = readinessRows.filter((row) => row.key !== "ready");
  const hasModels = modelOptions.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Chat workspace"
        description="Compose routed chat requests, then inspect assistant text, tool calls, execution receipts, and token usage without leaving the shell."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Models" value={snapshot.models.length} detail="Available model ids currently exposed through the runtime model listing." emphasis />
        <FactCard label="Tool-capable endpoints" value={toolCapableEndpoints} detail="Endpoints currently able to surface tool-calling behavior in the workspace." />
        <FactCard label="Selected model" value={model || "—"} detail="The active model binding for the next routed request." className="xl:col-span-2" />
      </div>

      {blockingReadinessRows.length > 0 ? (
        <SectionCard
          title="Execution readiness"
          description="Saved provider configuration can still be incomplete even when the control plane is populated."
        >
          <div className="flex flex-wrap gap-3">
            {readinessRows.map((row) => (
              <StatusPill key={row.key} tone={row.tone}>
                {row.label} {row.value}
              </StatusPill>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Composer" description="This form posts directly to the runtime-host `/v1/chat/completions` route.">
          {hasModels ? (
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Model</span>
                <select className={fieldClassName} value={model} onChange={(event) => setModel(event.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Prompt</span>
                <textarea className={`${fieldClassName} min-h-40`} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              </label>
              <button className={primaryButtonClassName} disabled={submitting || model.trim().length === 0} type="submit">
                {submitting ? "Running…" : "Run request"}
              </button>
            </form>
          ) : (
            <EmptyState
              label={
                blockingReadinessRows.length > 0
                  ? "No execution-ready models yet. Complete OAuth, fix credentials, or activate an endpoint from Providers."
                  : "No execution-ready models are currently available."
              }
            />
          )}
        </SectionCard>

        <SectionCard title="Result workspace" description="Tooling-aware response summary aligned with the runtime host payload.">
          {submitError ? (
            <div className={`${mutedPanelClassName} border-l-4 border-red-500 p-4`}>
              <p className="text-xs font-normal uppercase tracking-[0.2em] text-red-500">Request failed</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--rm-fg)]">{submitError}</p>
            </div>
          ) : !resultSummary ? (
            <EmptyState label="No result yet." />
          ) : (
            <div className="space-y-4">
              <div className={`${mutedPanelClassName} p-4`}>
                <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">Assistant output</p>
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
                      <p className="text-sm text-[var(--rm-secondary)]">No tool calls were surfaced for this response.</p>
                    ) : (
                      resultSummary.toolCalls.map((toolCall) => (
                        <div key={toolCall.id ?? `${toolCall.name}-${toolCall.arguments}`} className={`${mutedPanelClassName} p-3`}>
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
                    <StatusPill tone={resultSummary.toolExecutions.length > 0 ? "success" : "neutral"}>
                      {resultSummary.toolExecutions.length}
                    </StatusPill>
                  </div>
                  <div className="mt-3 space-y-3">
                    {resultSummary.toolExecutions.length === 0 ? (
                      <p className="text-sm text-[var(--rm-secondary)]">No runtime tool execution receipts were recorded.</p>
                    ) : (
                      resultSummary.toolExecutions.map((execution, index) => (
                        <div key={`${execution.connectorId ?? "connector"}-${execution.toolName ?? index}`} className={`${mutedPanelClassName} p-3`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-[var(--rm-fg)]">{execution.toolName ?? "Unnamed tool"}</p>
                            {execution.status ? (
                              <StatusPill tone={execution.status === "success" ? "success" : "warning"}>
                                {execution.status}
                              </StatusPill>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                            {execution.connectorId ?? "Unknown connector"}
                            {typeof execution.durationMs === "number" ? ` • ${execution.durationMs} ms` : ""}
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
                    <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">{row.label}</p>
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
