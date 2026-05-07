import { useEffect, useMemo, useState } from "react";

import { CodeBlock, EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { fieldClassName, mutedPanelClassName, primaryButtonClassName, secondaryButtonClassName } from "../lib/design-system";
import {
  fetchAudioVoices,
  fetchRuntimeSnapshot,
  submitAudioTranscription,
  submitSpeechGeneration,
  type RuntimeAudioVoiceRecord,
  type RuntimeSnapshot,
} from "../lib/runtime-api";
import { buildWorkbenchModelOptions } from "../lib/view-models";

type AudioMode = "speech" | "transcription";

type AudioResult =
  | {
      readonly kind: "speech";
      readonly model: string;
      readonly voice: string;
      readonly audioUrl: string | null;
      readonly rawPayload: string;
    }
  | {
      readonly kind: "transcription";
      readonly text: string;
      readonly rawPayload: string;
    };

function getVoiceId(voice: RuntimeAudioVoiceRecord): string {
  return voice.id ?? voice.voice ?? voice.name ?? voice.label ?? "voice";
}

function getVoiceLabel(voice: RuntimeAudioVoiceRecord): string {
  return voice.label ?? voice.name ?? voice.voice ?? voice.id ?? "Unnamed voice";
}

export default function StudioAudioRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [voices, setVoices] = useState<readonly RuntimeAudioVoiceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [mode, setMode] = useState<AudioMode>("speech");
  const [model, setModel] = useState("");
  const [voice, setVoice] = useState("");
  const [speechInput, setSpeechInput] = useState("Explain the current runtime posture in one short sentence.");
  const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AudioResult | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then((value) => {
        setSnapshot(value);
        setModel((current) => current || value.models[0]?.id || "");
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load audio workspace context."));
  }, []);

  useEffect(() => {
    if (!model) {
      setVoices([]);
      setVoice("");
      setVoiceLoading(false);
      return;
    }

    setVoiceLoading(true);
    setVoiceError(null);
    void fetchAudioVoices(model)
      .then((value) => {
        setVoices(value);
        setVoice((current) => current || getVoiceId(value[0] ?? {}));
      })
      .catch((value: unknown) => setVoiceError(value instanceof Error ? value.message : "Could not load audio voices."))
      .finally(() => setVoiceLoading(false));
  }, [model]);

  useEffect(() => {
    return () => {
      if (result?.kind === "speech" && result.audioUrl) {
        URL.revokeObjectURL(result.audioUrl);
      }
    };
  }, [result]);

  const modelOptions = useMemo(() => buildWorkbenchModelOptions(snapshot?.models ?? []), [snapshot?.models]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model) {
      setError("Choose a model before running an audio request.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === "speech") {
        const blob = await submitSpeechGeneration({
          model,
          input: speechInput,
          voice,
        });
        const audioUrl = typeof URL.createObjectURL === "function" ? URL.createObjectURL(blob) : null;
        setResult({
          kind: "speech",
          model,
          voice,
          audioUrl,
          rawPayload: JSON.stringify(
            {
              kind: "speech",
              model,
              voice,
              size: blob.size,
              type: blob.type || "application/octet-stream",
            },
            null,
            2,
          ),
        });
      } else {
        if (!transcriptionFile) {
          setError("Choose an audio file before submitting a transcription request.");
          setSubmitting(false);
          return;
        }
        const response = await submitAudioTranscription({
          file: transcriptionFile,
          model,
        });
        setResult({
          kind: "transcription",
          text: response.text,
          rawPayload: JSON.stringify(response, null, 2),
        });
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : "Audio request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Audio workflows"
        description="Keep speech synthesis, voice discovery, and transcription in one audio workspace so the request rail, result stage, and diagnostics stay aligned."
        actions={
          <>
            <a className={secondaryButtonClassName} href="/v1/models">
              Model list
            </a>
            {model ? (
              <a className={secondaryButtonClassName} href={`/v1/audio/voices?model=${encodeURIComponent(model)}`}>
                Voice endpoint
              </a>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FactCard label="Available models" value={snapshot?.models.length ?? 0} detail="Audio requests reuse the runtime model listing." emphasis />
        <FactCard label="Available voices" value={voices.length} detail="Voice discovery stays adjacent to speech synthesis." />
        <FactCard label="Active mode" value={mode === "speech" ? "Speech" : "Transcription"} detail="Switch audio families without leaving the studio section." />
      </div>

      {error ? <ErrorState label={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Audio mode and request" description="Use one request rail for speech and transcription instead of splitting the operator flow across duplicate pages.">
          {!snapshot ? (
            <LoadingState label="Loading audio request context…" />
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Mode</span>
                <select className={fieldClassName} value={mode} onChange={(event) => setMode(event.target.value as AudioMode)}>
                  <option value="speech">Speech synthesis</option>
                  <option value="transcription">Transcription</option>
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
              {mode === "speech" ? (
                <>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-[var(--rm-fg)]">Voice</span>
                    <select className={fieldClassName} value={voice} onChange={(event) => setVoice(event.target.value)}>
                      {voices.map((entry) => {
                        const id = getVoiceId(entry);
                        return (
                          <option key={id} value={id}>
                            {getVoiceLabel(entry)}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-[var(--rm-fg)]">Input</span>
                    <textarea className={`${fieldClassName} min-h-32`} value={speechInput} onChange={(event) => setSpeechInput(event.target.value)} />
                  </label>
                </>
              ) : (
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[var(--rm-fg)]">Audio file</span>
                  <input className={fieldClassName} onChange={(event) => setTranscriptionFile(event.target.files?.[0] ?? null)} type="file" />
                </label>
              )}
              <button className={primaryButtonClassName} disabled={submitting} type="submit">
                {submitting ? "Running…" : "Run audio request"}
              </button>
            </form>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Audio result stage" description="The dominant stage belongs to playable output or transcript text, with transport details kept adjacent rather than hidden.">
            {!result ? (
              <EmptyState label="Run a speech or transcription request to populate the audio stage." />
            ) : result.kind === "speech" ? (
              <div className="space-y-4">
                <div className={`${mutedPanelClassName} p-4`}>
                  <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">Speech output</p>
                  <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                    Voice <span className="font-medium text-[var(--rm-fg)]">{result.voice || "unspecified"}</span> on model{" "}
                    <span className="font-medium text-[var(--rm-fg)]">{result.model}</span>
                  </p>
                </div>
                {result.audioUrl ? <audio className="w-full" controls src={result.audioUrl} /> : <EmptyState label="Speech audio is available, but this environment cannot create a local audio URL." />}
              </div>
            ) : (
              <div className={`${mutedPanelClassName} p-4`}>
                <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">Transcript</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--rm-fg)]">{result.text || "No transcript text was returned."}</p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Voice inventory" description="Voice discovery and request diagnostics stay as a secondary rail to the result stage.">
            {voiceLoading ? (
              <LoadingState label="Loading voices…" />
            ) : voiceError ? (
              <ErrorState label={voiceError} />
            ) : voices.length === 0 ? (
              <EmptyState label="Choose a model to inspect available voices." />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {voices.map((entry) => {
                    const id = getVoiceId(entry);
                    return (
                      <StatusPill key={id} tone={id === voice ? "accent" : "neutral"}>
                        {getVoiceLabel(entry)}
                      </StatusPill>
                    );
                  })}
                </div>
                <CodeBlock className="min-h-44 text-sm">{result?.rawPayload ?? JSON.stringify(voices, null, 2)}</CodeBlock>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
