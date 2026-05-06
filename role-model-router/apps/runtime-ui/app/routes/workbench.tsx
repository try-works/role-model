import { useEffect, useMemo, useState } from "react";

import { CodeBlock, ErrorState, LoadingState, PageHeader, SectionCard } from "../components/page-primitives";
import { fieldClassName, primaryButtonClassName } from "../lib/design-system";
import { fetchRuntimeSnapshot, submitWorkbenchChat, type RuntimeSnapshot } from "../lib/runtime-api";
import { buildWorkbenchModelOptions } from "../lib/view-models";

export default function WorkbenchRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("openai/gpt-4.1-mini-fast");
  const [prompt, setPrompt] = useState("Summarize the chosen endpoint.");
  const [result, setResult] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then((data) => {
        setSnapshot(data);
        if (data.models[0]?.id) {
          setModel(data.models[0].id);
        }
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load workbench."));
  }, []);

  const modelOptions = useMemo(() => buildWorkbenchModelOptions(snapshot?.models ?? []), [snapshot?.models]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading workbench…" />;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await submitWorkbenchChat({
        model,
        messages: [{ role: "user", content: prompt }],
      });
      const content =
        typeof response.choices === "object" &&
        Array.isArray(response.choices) &&
        response.choices[0] &&
        typeof response.choices[0] === "object" &&
        response.choices[0] &&
        typeof (response.choices[0] as { message?: { content?: string } }).message?.content === "string"
          ? (response.choices[0] as { message: { content: string } }).message.content
          : JSON.stringify(response, null, 2);
      setResult(content);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Workbench request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workbench"
        title="Runtime workbench"
        description="Compose a chat request against the live runtime host path using the repo-owned shell."
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Composer" description="This form posts directly to the runtime-host `/v1/chat/completions` route.">
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
            <button className={primaryButtonClassName} disabled={submitting} type="submit">
              {submitting ? "Running…" : "Run request"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Result" description="Response text or the raw JSON payload if the runtime returns an unexpected shape.">
          <CodeBlock className="min-h-72 text-sm">
            {result || "No result yet."}
          </CodeBlock>
        </SectionCard>
      </div>
    </div>
  );
}
