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
  fieldClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  primaryButtonBlockClassName,
} from "../lib/design-system";
import {
  type RuntimeSnapshot,
  fetchRuntimeEndpoints,
  fetchRuntimeModels,
  submitAdvancedRequest,
} from "../lib/runtime-api";
import { buildWorkbenchModelOptions } from "../lib/view-models";

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

const formFieldLabelClassName = fieldLabelClassName;

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
  const [snapshot, setSnapshot] = useState<Pick<RuntimeSnapshot, "models" | "endpoints"> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [path, setPath] = useState<AdvancedPath>("/v1/responses");
  const [payloadText, setPayloadText] = useState("{}");
  const [submitting, setSubmitting] = useState(false);
  const [responsePayload, setResponsePayload] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeModels(), fetchRuntimeEndpoints()])
      .then(([models, endpoints]) => {
        setSnapshot({ models, endpoints });
        const defaultModel = buildWorkbenchModelOptions(models, endpoints)[0]?.value || "";
        setModel((current) => current || defaultModel);
      })
      .catch((value: unknown) =>
        setError(
          value instanceof Error ? value.message : "Could not load advanced workspace context.",
        ),
      );
  }, []);

  const modelOptions = useMemo(
    () => buildWorkbenchModelOptions(snapshot?.models ?? [], snapshot?.endpoints ?? []),
    [snapshot?.endpoints, snapshot?.models],
  );

  useEffect(() => {
    const defaultModel = model || modelOptions[0]?.value || "";
    setPayloadText(JSON.stringify(buildDefaultPayload(path, defaultModel), null, 2));
  }, [model, modelOptions, path]);

  const hasModels = modelOptions.length > 0;
  const requestTemplate = JSON.stringify(
    buildDefaultPayload(path, model || modelOptions[0]?.value || ""),
    null,
    2,
  );

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
      {error ? <ErrorState label={error} /> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <SectionCard title="Endpoint family">
          {!snapshot ? (
            <LoadingState label="Loading advanced request context…" />
          ) : !hasModels ? (
            <EmptyState label="No execution-ready models are currently available." />
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <SelectField
                label="Family"
                value={path}
                onChange={(value) => setPath(value as AdvancedPath)}
              >
                {advancedFamilies.map((family) => (
                  <option key={family.path} value={family.path}>
                    {family.label}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Model" value={model} onChange={setModel}>
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <label className="grid gap-1.5">
                <span className={formFieldLabelClassName}>JSON payload</span>
                <textarea
                  className={`${fieldClassName} min-h-72 font-mono`}
                  value={payloadText}
                  onChange={(event) => setPayloadText(event.target.value)}
                />
              </label>
              <button
                className={primaryButtonBlockClassName}
                disabled={submitting || model.trim().length === 0}
                type="submit"
              >
                {submitting ? "Running…" : "Submit advanced request"}
              </button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Response workspace">
          <div className="space-y-4">
            <CodeBlock className="min-h-72">
              {responsePayload ?? '{\n  "status": "No advanced request yet"\n}'}
            </CodeBlock>
            <div className="space-y-2">
              <p className={monoEyebrowClassName}>Request template</p>
              <CodeBlock className="min-h-52">{requestTemplate}</CodeBlock>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
