import { useEffect, useMemo, useState } from "react";

import { CodeBlock, EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard } from "../components/page-primitives";
import { fieldClassName, mutedPanelClassName, primaryButtonClassName, secondaryButtonClassName } from "../lib/design-system";
import {
  fetchRuntimeSnapshot,
  submitImageGeneration,
  submitSdApiTxt2Img,
  type RuntimeSnapshot,
} from "../lib/runtime-api";
import { buildWorkbenchModelOptions } from "../lib/view-models";

type ImageResult =
  | {
      readonly mode: "openai";
      readonly images: readonly string[];
      readonly rawPayload: string;
    }
  | {
      readonly mode: "sdapi";
      readonly images: readonly string[];
      readonly rawPayload: string;
    };

export default function StudioImagesRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"openai" | "sdapi">("openai");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("A Swiss-style operator console poster.");
  const [size, setSize] = useState("1024x1024");
  const [width, setWidth] = useState("1024");
  const [height, setHeight] = useState("1024");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImageResult | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then((value) => {
        setSnapshot(value);
        setModel((current) => current || value.models[0]?.id || "");
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load image workspace context."));
  }, []);

  const modelOptions = useMemo(() => buildWorkbenchModelOptions(snapshot?.models ?? []), [snapshot?.models]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model) {
      setError("Choose a model before running an image request.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === "openai") {
        const response = await submitImageGeneration({
          model,
          prompt,
          size,
        });
        setResult({
          mode,
          images: response.data
            .map((entry) => (entry.url ? entry.url : entry.b64_json ? `data:image/png;base64,${entry.b64_json}` : null))
            .filter((entry): entry is string => typeof entry === "string"),
          rawPayload: JSON.stringify(response, null, 2),
        });
      } else {
        const response = await submitSdApiTxt2Img({
          model,
          prompt,
          width: Number(width) || 1024,
          height: Number(height) || 1024,
        });
        setResult({
          mode,
          images: response.images.map((image) => `data:image/png;base64,${image}`),
          rawPayload: JSON.stringify(response, null, 2),
        });
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : "Image request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Image workflows"
        description="Use one repo-owned workspace for OpenAI-style and SDAPI-style image generation, with the request rail on the left and the result stage in the dominant column."
        actions={
          <>
            <a className={secondaryButtonClassName} href="/v1/models">
              Model list
            </a>
            <a className={secondaryButtonClassName} href="/sdapi/v1/loras">
              SDAPI LoRAs
            </a>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FactCard label="Available models" value={snapshot?.models.length ?? 0} detail="The current runtime model listing drives the request rail." emphasis />
        <FactCard label="Request mode" value={mode === "openai" ? "OpenAI" : "SDAPI"} detail="Switch request families without leaving the studio section." />
        <FactCard label="Returned images" value={result?.images.length ?? 0} detail="Generated images remain in the dominant result stage with raw response details adjacent." />
      </div>

      {error ? <ErrorState label={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Image request modes" description="Choose an OpenAI-style or SDAPI-style request and keep the parameter rail compact.">
          {!snapshot ? (
            <LoadingState label="Loading image request context…" />
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Mode</span>
                <select className={fieldClassName} value={mode} onChange={(event) => setMode(event.target.value as "openai" | "sdapi")}>
                  <option value="openai">OpenAI-style generation</option>
                  <option value="sdapi">SDAPI txt2img</option>
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
                <span className="font-medium text-[var(--rm-fg)]">Prompt</span>
                <textarea className={`${fieldClassName} min-h-36`} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              </label>
              {mode === "openai" ? (
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[var(--rm-fg)]">Size</span>
                  <select className={fieldClassName} value={size} onChange={(event) => setSize(event.target.value)}>
                    <option value="1024x1024">1024x1024</option>
                    <option value="1536x1024">1536x1024</option>
                    <option value="1024x1536">1024x1536</option>
                  </select>
                </label>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-[var(--rm-fg)]">Width</span>
                    <input className={fieldClassName} inputMode="numeric" value={width} onChange={(event) => setWidth(event.target.value)} />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-[var(--rm-fg)]">Height</span>
                    <input className={fieldClassName} inputMode="numeric" value={height} onChange={(event) => setHeight(event.target.value)} />
                  </label>
                </div>
              )}
              <button className={primaryButtonClassName} disabled={submitting} type="submit">
                {submitting ? "Running…" : "Run image request"}
              </button>
            </form>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Image result stage" description="The dominant pane belongs to generated images first, not the request form.">
            {!result ? (
              <EmptyState label="Run an image request to populate the result stage." />
            ) : result.images.length === 0 ? (
              <EmptyState label="The runtime returned no image payloads for this request." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {result.images.map((image, index) => (
                  <div key={`${result.mode}-${index}`} className={`${mutedPanelClassName} p-3`}>
                    <img alt={`Generated image ${index + 1}`} className="aspect-square w-full object-cover" src={image} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Raw response" description="Payloads stay adjacent to the stage so operators can compare visual output and transport details together.">
            <CodeBlock className="min-h-60 text-sm">{result?.rawPayload ?? "{\n  \"status\": \"No image request yet\"\n}"}</CodeBlock>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
