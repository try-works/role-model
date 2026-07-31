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
  compactTitleClassName,
  fieldClassName,
  fieldLabelClassName,
  listRowClassName,
  monoEyebrowClassName,
  primaryButtonBlockClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { type RuntimeSnapshot, fetchRuntimeModels, submitRerankRequest } from "../lib/runtime-api";
import { buildWorkbenchModelOptions } from "../lib/view-models";

const formFieldLabelClassName = fieldLabelClassName;

export default function StudioRerankRoute() {
  const [snapshot, setSnapshot] = useState<Pick<RuntimeSnapshot, "models"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [query, setQuery] = useState("Which option best summarizes the runtime?");
  const [documentsText, setDocumentsText] = useState(
    "The runtime routes requests.\nThe runtime owns provider account onboarding.\nThe runtime UI is a calm Apple-inspired operator shell.",
  );
  const [path, setPath] = useState<"/v1/rerank" | "/v1/reranking">("/v1/rerank");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    rawPayload: string;
    rows: Array<{ index: number; score: number; text: string }>;
  } | null>(null);

  useEffect(() => {
    void fetchRuntimeModels()
      .then((models) => {
        setSnapshot({ models });
        setModel((current) => current || models[0]?.id || "");
      })
      .catch((value: unknown) =>
        setError(
          value instanceof Error ? value.message : "Could not load rerank workspace context.",
        ),
      );
  }, []);

  const modelOptions = useMemo(
    () => buildWorkbenchModelOptions(snapshot?.models ?? []),
    [snapshot?.models],
  );
  const documents = useMemo(
    () =>
      documentsText
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    [documentsText],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model) {
      setError("Choose a model before submitting a rerank request.");
      return;
    }
    if (documents.length === 0) {
      setError("Provide at least one candidate document.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await submitRerankRequest(
        {
          model,
          query,
          documents,
        },
        path,
      );
      setResult({
        rawPayload: JSON.stringify(response, null, 2),
        rows: response.results.map((entry) => ({
          index: entry.index,
          score: entry.relevance_score,
          text: documents[entry.index] ?? "(missing source document)",
        })),
      });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Rerank request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorState label={error} /> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <SectionCard title="Rerank request">
          {!snapshot ? (
            <LoadingState label="Loading rerank request context…" />
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <SelectField
                label="Contract"
                value={path}
                onChange={(value) => setPath(value as "/v1/rerank" | "/v1/reranking")}
              >
                <option value="/v1/rerank">/v1/rerank</option>
                <option value="/v1/reranking">/v1/reranking</option>
              </SelectField>
              <SelectField label="Model" value={model} onChange={setModel}>
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <label className="grid gap-1.5">
                <span className={formFieldLabelClassName}>Query</span>
                <textarea
                  className={`${fieldClassName} min-h-28`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={formFieldLabelClassName}>Candidate documents</span>
                <textarea
                  className={`${fieldClassName} min-h-40`}
                  value={documentsText}
                  onChange={(event) => setDocumentsText(event.target.value)}
                />
              </label>
              <button className={primaryButtonBlockClassName} disabled={submitting} type="submit">
                {submitting ? "Running…" : "Submit rerank request"}
              </button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Ranked results">
          <div className="space-y-4">
            {!result ? (
              <EmptyState label="Submit a rerank request to populate ordered scores." />
            ) : result.rows.length === 0 ? (
              <EmptyState label="The runtime returned no ranked candidates." />
            ) : (
              <div className="space-y-3">
                <p className={monoEyebrowClassName}>Ordered ledger</p>
                {result.rows.map((row) => (
                  <div key={`${row.index}-${row.score}`} className={listRowClassName}>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <p className={compactTitleClassName}>Document {row.index + 1}</p>
                        <p
                          className={`font-mono text-[13px] tabular-nums ${supportingTextClassName}`}
                        >
                          {row.score.toFixed(4)}
                        </p>
                      </div>
                      <p className={supportingTextClassName}>{row.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <p className={monoEyebrowClassName}>Contract details</p>
              <CodeBlock className="min-h-60">
                {result?.rawPayload ?? '{\n  "status": "No rerank request yet"\n}'}
              </CodeBlock>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
