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
  mutedPanelClassName,
  primaryButtonBlockClassName,
} from "../lib/design-system";
import {
  type RuntimeSnapshot,
  fetchRuntimeModels,
  submitImageGeneration,
  submitSdApiTxt2Img,
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

const formFieldLabelClassName = fieldLabelClassName;

export default function StudioImagesRoute() {
  const [snapshot, setSnapshot] = useState<Pick<RuntimeSnapshot, "models"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"openai" | "sdapi">("openai");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("A calm operator console poster.");
  const [size, setSize] = useState("1024x1024");
  const [width, setWidth] = useState("1024");
  const [height, setHeight] = useState("1024");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImageResult | null>(null);

  useEffect(() => {
    void fetchRuntimeModels()
      .then((models) => {
        setSnapshot({ models });
        setModel((current) => current || models[0]?.id || "");
      })
      .catch((value: unknown) =>
        setError(
          value instanceof Error ? value.message : "Could not load image workspace context.",
        ),
      );
  }, []);

  const modelOptions = useMemo(
    () => buildWorkbenchModelOptions(snapshot?.models ?? []),
    [snapshot?.models],
  );

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
            .map((entry) =>
              entry.url
                ? entry.url
                : entry.b64_json
                  ? `data:image/png;base64,${entry.b64_json}`
                  : null,
            )
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
      {error ? <ErrorState label={error} /> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <SectionCard title="Image request modes">
          {!snapshot ? (
            <LoadingState label="Loading image request context…" />
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <SelectField
                label="Mode"
                value={mode}
                onChange={(value) => setMode(value as "openai" | "sdapi")}
              >
                <option value="openai">OpenAI-style generation</option>
                <option value="sdapi">SDAPI txt2img</option>
              </SelectField>
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
                  className={`${fieldClassName} min-h-36`}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
              </label>
              {mode === "openai" ? (
                <SelectField label="Size" value={size} onChange={setSize}>
                  <option value="1024x1024">1024x1024</option>
                  <option value="1536x1024">1536x1024</option>
                  <option value="1024x1536">1024x1536</option>
                </SelectField>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className={formFieldLabelClassName}>Width</span>
                    <input
                      className={fieldClassName}
                      inputMode="numeric"
                      value={width}
                      onChange={(event) => setWidth(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={formFieldLabelClassName}>Height</span>
                    <input
                      className={fieldClassName}
                      inputMode="numeric"
                      value={height}
                      onChange={(event) => setHeight(event.target.value)}
                    />
                  </label>
                </div>
              )}
              <button className={primaryButtonBlockClassName} disabled={submitting} type="submit">
                {submitting ? "Running…" : "Run image request"}
              </button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Image result stage">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className={monoEyebrowClassName}>Generated images</p>
              {!result ? (
                <EmptyState label="Run an image request to populate the result stage." />
              ) : result.images.length === 0 ? (
                <EmptyState label="The runtime returned no image payloads for this request." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {result.images.map((image, index) => (
                    <div key={`${result.mode}-${index}`} className={`${mutedPanelClassName} p-3`}>
                      <img
                        alt={`Generated result ${index + 1}`}
                        className="aspect-square w-full object-cover"
                        src={image}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className={monoEyebrowClassName}>Raw response</p>
              <CodeBlock className="min-h-60">
                {result?.rawPayload ?? '{\n  "status": "No image request yet"\n}'}
              </CodeBlock>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
