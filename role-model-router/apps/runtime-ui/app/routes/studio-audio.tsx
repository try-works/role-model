import { useEffect, useMemo, useRef, useState } from "react";

import {
  Badge,
  CodeBlock,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  bodyTextClassName,
  fieldClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  primaryButtonBlockClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  type RuntimeAudioVoiceRecord,
  type RuntimeSnapshot,
  fetchAudioVoices,
  fetchRuntimeModels,
  submitAudioTranscription,
  submitSpeechGeneration,
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

const SPEECH_WAVEFORM_HEIGHTS = [
  12, 22, 34, 18, 28, 14, 36, 24, 16, 30, 20, 32, 12, 18, 26, 14, 22, 10, 28, 16,
] as const;

function formatPlaybackClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

const SPEECH_WAVEFORM_BARS = SPEECH_WAVEFORM_HEIGHTS.map((height, index) => ({
  id: `speech-wave-${index}`,
  height,
}));

function SpeechPlayer({ src }: { readonly src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (audio.paused) {
      void audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
      return;
    }
    audio.pause();
    setPlaying(false);
  };

  return (
    <div className={`${mutedPanelClassName} flex items-center gap-3 p-3`}>
      <button
        aria-label={playing ? "Pause speech" : "Play speech"}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] text-[var(--rm-fg)]"
        onClick={togglePlayback}
        type="button"
      >
        {playing ? (
          <svg aria-hidden="true" className="size-3.5" fill="currentColor" viewBox="0 0 16 16">
            <rect height="12" rx="1" width="3.5" x="3" y="2" />
            <rect height="12" rx="1" width="3.5" x="9.5" y="2" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="size-3.5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 2.5v11l9-5.5-9-5.5Z" />
          </svg>
        )}
      </button>
      <div aria-hidden="true" className="flex h-10 min-w-0 flex-1 items-end gap-[3px]">
        {SPEECH_WAVEFORM_BARS.map((bar) => (
          <span
            key={bar.id}
            className="w-[3px] shrink-0 rounded-sm bg-[var(--rm-accent)]/70"
            style={{ height: bar.height }}
          />
        ))}
      </div>
      <span className={`shrink-0 tabular-nums ${supportingTextClassName}`}>
        {formatPlaybackClock(currentTime)} / {formatPlaybackClock(duration)}
      </span>
      <audio
        className="hidden"
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime || 0);
        }}
        preload="metadata"
        ref={audioRef}
        src={src}
      >
        <track kind="captions" label="Generated speech captions unavailable" srcLang="en" />
      </audio>
    </div>
  );
}

function getVoiceId(voice: RuntimeAudioVoiceRecord): string {
  return voice.id ?? voice.voice ?? voice.name ?? voice.label ?? "voice";
}

function getVoiceLabel(voice: RuntimeAudioVoiceRecord): string {
  return voice.label ?? voice.name ?? voice.voice ?? voice.id ?? "Unnamed voice";
}

const formFieldLabelClassName = fieldLabelClassName;

export function isVoiceInventoryUnavailableError(message: string | null): boolean {
  return Boolean(message?.includes("returned HTML instead of JSON"));
}

export default function StudioAudioRoute() {
  const [snapshot, setSnapshot] = useState<Pick<RuntimeSnapshot, "models"> | null>(null);
  const [voices, setVoices] = useState<readonly RuntimeAudioVoiceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [mode, setMode] = useState<AudioMode>("speech");
  const [model, setModel] = useState("");
  const [voice, setVoice] = useState("");
  const [speechInput, setSpeechInput] = useState(
    "Explain the current runtime posture in one short sentence.",
  );
  const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AudioResult | null>(null);

  useEffect(() => {
    void fetchRuntimeModels()
      .then((models) => {
        setSnapshot({ models });
        setModel((current) => current || models[0]?.id || "");
      })
      .catch((value: unknown) =>
        setError(
          value instanceof Error ? value.message : "Could not load audio workspace context.",
        ),
      );
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
      .catch((value: unknown) =>
        setVoiceError(value instanceof Error ? value.message : "Could not load audio voices."),
      )
      .finally(() => setVoiceLoading(false));
  }, [model]);

  useEffect(() => {
    return () => {
      if (result?.kind === "speech" && result.audioUrl) {
        URL.revokeObjectURL(result.audioUrl);
      }
    };
  }, [result]);

  const modelOptions = useMemo(
    () => buildWorkbenchModelOptions(snapshot?.models ?? []),
    [snapshot?.models],
  );
  const voiceInventoryUnavailable = isVoiceInventoryUnavailableError(voiceError);

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
        const audioUrl =
          typeof URL.createObjectURL === "function" ? URL.createObjectURL(blob) : null;
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
      {error ? <ErrorState label={error} /> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <SectionCard title="Audio mode and request">
          {!snapshot ? (
            <LoadingState label="Loading audio request context…" />
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <SelectField
                label="Mode"
                value={mode}
                onChange={(value) => setMode(value as AudioMode)}
              >
                <option value="speech">Speech synthesis</option>
                <option value="transcription">Transcription</option>
              </SelectField>
              <SelectField label="Model" value={model} onChange={setModel}>
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              {mode === "speech" ? (
                <>
                  <SelectField label="Voice" value={voice} onChange={setVoice}>
                    {voices.map((entry) => {
                      const id = getVoiceId(entry);
                      return (
                        <option key={id} value={id}>
                          {getVoiceLabel(entry)}
                        </option>
                      );
                    })}
                  </SelectField>
                  <label className="grid gap-1.5">
                    <span className={formFieldLabelClassName}>Input</span>
                    <textarea
                      className={`${fieldClassName} min-h-32`}
                      value={speechInput}
                      onChange={(event) => setSpeechInput(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <label className="grid gap-1.5">
                  <span className={formFieldLabelClassName}>Audio file</span>
                  <input
                    className={fieldClassName}
                    onChange={(event) => setTranscriptionFile(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
              )}
              <button className={primaryButtonBlockClassName} disabled={submitting} type="submit">
                {submitting ? "Running…" : "Run audio request"}
              </button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Audio result stage">
          <div className="space-y-4">
            {!result ? (
              <EmptyState label="Run a speech or transcription request to populate the audio stage." />
            ) : result.kind === "speech" ? (
              <div className="space-y-4">
                <div className={`${mutedPanelClassName} p-4`}>
                  <p className={monoEyebrowClassName}>Speech output</p>
                  <p className={`mt-2 ${supportingTextClassName}`}>
                    Voice{" "}
                    <span className={bodyStrongTextClassName}>{result.voice || "unspecified"}</span>{" "}
                    on model <span className={bodyStrongTextClassName}>{result.model}</span>
                  </p>
                </div>
                {result.audioUrl ? (
                  <SpeechPlayer key={result.audioUrl} src={result.audioUrl} />
                ) : (
                  <EmptyState label="Speech audio is available, but this environment cannot create a local audio URL." />
                )}
                {result.audioUrl ? (
                  <p className={monoEyebrowClassName}>
                    Captions are not available for generated speech playback in this preview.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className={`${mutedPanelClassName} p-4`}>
                <p className={monoEyebrowClassName}>Transcript</p>
                <p className={`mt-3 whitespace-pre-wrap ${bodyTextClassName}`}>
                  {result.text || "No transcript text was returned."}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <p className={monoEyebrowClassName}>Voice inventory</p>
              {voiceLoading ? (
                <LoadingState label="Loading voices…" />
              ) : voiceInventoryUnavailable ? (
                <EmptyState label="Voice inventory is unavailable on this runtime host." />
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
                        <Badge key={id} tone={id === voice ? "accent" : "neutral"}>
                          {getVoiceLabel(entry)}
                        </Badge>
                      );
                    })}
                  </div>
                  <CodeBlock className="min-h-44">
                    {result?.rawPayload ?? JSON.stringify(voices, null, 2)}
                  </CodeBlock>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
