import { useEffect, useMemo, useState } from "react";

import { CodeBlock, EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { fieldClassName, listRowClassName, primaryButtonClassName, secondaryButtonClassName } from "../lib/design-system";
import { fetchRuntimeSnapshot, submitRerankRequest, type RuntimeSnapshot } from "../lib/runtime-api";
import { buildWorkbenchModelOptions } from "../lib/view-models";

export default function StudioRerankRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [query, setQuery] = useState("Which option best summarizes the runtime?");
  const [documentsText, setDocumentsText] = useState("The runtime routes requests.\nThe runtime owns provider account onboarding.\nThe runtime UI is a Swiss-style operator shell.");
  const [path, setPath] = useState<"/v1/rerank" | "/v1/reranking">("/v1/rerank");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ rawPayload: string; rows: Array<{ index: number; score: number; text: string }> } | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then((value) => {
        setSnapshot(value);
        setModel((current) => current || value.models[0]?.id || "");
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load rerank workspace context."));
  }, []);

  const modelOptions = useMemo(() => buildWorkbenchModelOptions(snapshot?.models ?? []), [snapshot?.models]);
  const documents = useMemo(
    () => documentsText.split(/\r?\n/).map((value) => value.trim()).filter((value) => value.length > 0),
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
      <PageHeader
        eyebrow="Studio"
        title="Rerank"
        description="Keep query, candidate set, ordered score ledger, and raw payload inspection in one rerank workspace beside the rest of Studio."
        actions={
          <a className={secondaryButtonClassName} href="/v1/models">
            Model list
          </a>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FactCard label="Available models" value={snapshot?.models.length ?? 0} detail="The runtime model listing drives the rerank model selector." emphasis />
        <FactCard label="Candidate documents" value={documents.length} detail="Each non-empty line in the request rail becomes a rerank candidate." />
        <FactCard label="Active contract" value={path} detail="Switch between the two vendor-backed rerank route families without leaving the page." />
      </div>

      {error ? <ErrorState label={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Rerank request" description="Use a compact request rail for the query, contract path, and candidate set.">
          {!snapshot ? (
            <LoadingState label="Loading rerank request context…" />
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Contract</span>
                <select className={fieldClassName} value={path} onChange={(event) => setPath(event.target.value as "/v1/rerank" | "/v1/reranking")}>
                  <option value="/v1/rerank">/v1/rerank</option>
                  <option value="/v1/reranking">/v1/reranking</option>
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
                <span className="font-medium text-[var(--rm-fg)]">Query</span>
                <textarea className={`${fieldClassName} min-h-28`} value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Candidate documents</span>
                <textarea className={`${fieldClassName} min-h-40`} value={documentsText} onChange={(event) => setDocumentsText(event.target.value)} />
              </label>
              <button className={primaryButtonClassName} disabled={submitting} type="submit">
                {submitting ? "Running…" : "Submit rerank request"}
              </button>
            </form>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Ranked results" description="The dominant workspace is an ordered ledger, not a wall of raw JSON.">
            {!result ? (
              <EmptyState label="Submit a rerank request to populate ordered scores." />
            ) : result.rows.length === 0 ? (
              <EmptyState label="The runtime returned no ranked candidates." />
            ) : (
              <div className="space-y-3">
                {result.rows.map((row) => (
                  <div key={`${row.index}-${row.score}`} className={listRowClassName}>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-[var(--rm-fg)]">Document {row.index + 1}</p>
                        <StatusPill tone="accent">{row.score.toFixed(4)}</StatusPill>
                      </div>
                      <p className="text-sm text-[var(--rm-secondary)]">{row.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Contract details" description="Keep raw transport artifacts adjacent so the request contract remains operator-readable.">
            <CodeBlock className="min-h-60 text-sm">{result?.rawPayload ?? "{\n  \"status\": \"No rerank request yet\"\n}"}</CodeBlock>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
