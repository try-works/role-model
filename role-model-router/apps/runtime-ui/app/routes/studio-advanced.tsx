import { useEffect, useMemo, useState } from "react";

import { CodeBlock, EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard } from "../components/page-primitives";
import { fieldClassName, primaryButtonClassName, secondaryButtonClassName } from "../lib/design-system";
import { fetchRuntimeSnapshot, submitAdvancedRequest, type RuntimeSnapshot } from "../lib/runtime-api";
import { buildCredentialReadinessRows, buildWorkbenchModelOptions } from "../lib/view-models";

const advancedFamilies = [
  {
    path: "/v1/responses",
    label: "Responses",
    description: "OpenAI responses-style request/response board.",
  },
  {
    path: "/v1/messages",
    label: "Messages",
    description: "Anthropic-style messages contract.",
  },
  {
    path: "/v1/messages/count_tokens",
    label: "Count tokens",
    description: "Token estimation for messages payloads.",
  },
  {
    path: "/v1/embeddings",
    label: "Embeddings",
    description: "Vector generation request family.",
  },
  {
    path: "/completion",
    label: "Completion",
    description: "Legacy completion contract.",
  },
  {
    path: "/infill",
    label: "Infill",
    description: "Infill request family.",
  },
] as const;

type AdvancedPath = (typeof advancedFamilies)[number]["path"];

function buildDefaultPayload(path: AdvancedPath, model: string): Record<string, unknown> {
  switch (path) {
    case "/v1/messages/count_tokens":
      return {
        model,
        messages: [{ role: "user", content: "Count the tokens for this request." }],
      };
    case "/v1/embeddings":
      return {
        model,
        input: "Role Model runtime operator shell",
      };
    case "/completion":
      return {
        model,
        prompt: "Summarize the runtime shell in one sentence.",
        max_tokens: 32,
      };
    case "/infill":
      return {
        model,
        prompt: "function summarizeRuntime() {",
        suffix: "\n}",
      };
    case "/v1/messages":
      return {
        model,
        messages: [{ role: "user", content: "Explain the current contract family." }],
      };
    default:
      return {
        model,
        input: "Explain the current contract family.",
      };
  }
}

export default function StudioAdvancedRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [path, setPath] = useState<AdvancedPath>("/v1/responses");
  const [payloadText, setPayloadText] = useState("{}");
  const [submitting, setSubmitting] = useState(false);
  const [responsePayload, setResponsePayload] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then((value) => {
        setSnapshot(value);
        const defaultModel = value.models[0]?.id || "";
        setModel((current) => current || defaultModel);
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load advanced workspace context."));
  }, []);

  useEffect(() => {
    const defaultModel = model || snapshot?.models[0]?.id || "";
    setPayloadText(JSON.stringify(buildDefaultPayload(path, defaultModel), null, 2));
  }, [model, path, snapshot?.models]);

  const modelOptions = useMemo(() => buildWorkbenchModelOptions(snapshot?.models ?? []), [snapshot?.models]);
  const selectedFamily = advancedFamilies.find((entry) => entry.path === path) ?? advancedFamilies[0];
  const readinessRows = snapshot ? buildCredentialReadinessRows(snapshot.summary).filter((row) => row.value > 0) : [];
  const blockingReadinessRows = readinessRows.filter((row) => row.key !== "ready");
  const hasModels = modelOptions.length > 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const parsed = JSON.parse(payloadText) as Record<string, unknown>;
      const response = await submitAdvancedRequest(path, parsed);
      setResponsePayload(JSON.stringify(response, null, 2));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Advanced request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Advanced APIs"
        description="Use one operator workspace for advanced endpoint families that have real vendor/runtime backing but do not merit separate primary navigation."
        actions={
          <a className={secondaryButtonClassName} href="/v1/models">
            Model list
          </a>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FactCard label="Endpoint families" value={advancedFamilies.length} detail="Only advanced families with real runtime backing belong here." emphasis />
        <FactCard label="Selected family" value={selectedFamily.label} detail={selectedFamily.description} />
        <FactCard label="Available models" value={snapshot?.models.length ?? 0} detail="The same runtime model listing feeds the advanced request templates." />
      </div>

      {error ? <ErrorState label={error} /> : null}

      {blockingReadinessRows.length > 0 ? (
        <SectionCard
          title="Execution readiness"
          description="Advanced request families use the same execution-ready model inventory as Workbench and the OpenAI-compatible bridge surfaces."
        >
          <div className="flex flex-wrap gap-3">
            {readinessRows.map((row) => (
              <span
                key={row.key}
                className="inline-flex items-center rounded-full border border-[var(--rm-border)] px-3 py-1 text-xs font-medium text-[var(--rm-secondary)]"
              >
                {row.label} {row.value}
              </span>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Endpoint family" description="Choose the contract family first, then edit the request template for that endpoint.">
          {!snapshot ? (
            <LoadingState label="Loading advanced request context…" />
          ) : !hasModels ? (
            <EmptyState
              label={
                blockingReadinessRows.length > 0
                  ? "No execution-ready models yet. Complete provider setup or activate an endpoint before using Advanced APIs."
                  : "No execution-ready models are currently available."
              }
            />
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Family</span>
                <select className={fieldClassName} value={path} onChange={(event) => setPath(event.target.value as AdvancedPath)}>
                  {advancedFamilies.map((family) => (
                    <option key={family.path} value={family.path}>
                      {family.label}
                    </option>
                  ))}
                </select>
              </label>
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
                <span className="font-medium text-[var(--rm-fg)]">JSON payload</span>
                <textarea className={`${fieldClassName} min-h-72 font-mono`} value={payloadText} onChange={(event) => setPayloadText(event.target.value)} />
              </label>
              <button className={primaryButtonClassName} disabled={submitting || model.trim().length === 0} type="submit">
                {submitting ? "Running…" : "Submit advanced request"}
              </button>
            </form>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Response workspace" description="The dominant stage belongs to the response payload, not to explanatory placeholder copy.">
            <CodeBlock className="min-h-72 text-sm">{responsePayload ?? "{\n  \"status\": \"No advanced request yet\"\n}"}</CodeBlock>
          </SectionCard>

          <SectionCard title="Request template" description="Keep one live example for the selected family adjacent to the response workspace.">
            <CodeBlock className="min-h-52 text-sm">{JSON.stringify(buildDefaultPayload(path, model || snapshot?.models[0]?.id || ""), null, 2)}</CodeBlock>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
