import { useEffect, useState } from "react";

import { ErrorState, LoadingState, SectionCard } from "../components/page-primitives";
import {
  codeBlockClassName,
  compactTitleClassName,
  monoUtilityStrongTextClassName,
  mutedPanelClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  type RuntimeDownstreamOpenAIProviderConfig,
  fetchDownstreamOpenAIProviderConfig,
} from "../lib/runtime-api";
import { buildDownstreamProviderGuide } from "../lib/view-models";

/** Paper Connection contract field label — sans 11px uppercase (not mono eyebrow). */
const contractFieldLabelClassName =
  "font-sans text-[11px] font-normal uppercase leading-[14px] tracking-[0.04em] text-[var(--rm-muted)]";

export default function IntegrationsDownstreamRoute() {
  const [provider, setProvider] = useState<RuntimeDownstreamOpenAIProviderConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchDownstreamOpenAIProviderConfig()
      .then(setProvider)
      .catch((value: unknown) =>
        setError(
          value instanceof Error
            ? value.message
            : "Could not load downstream compatibility details.",
        ),
      );
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!provider) {
    return <LoadingState label="Loading downstream integration details…" />;
  }

  const guide = buildDownstreamProviderGuide(provider);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Connection contract"
        description="OpenAI-compatible base URLs, endpoints, and auth header for clients calling this runtime."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {guide.connectionRows.map((row) => (
            <div key={row.label} className={`${mutedPanelClassName} p-4`}>
              <p className={contractFieldLabelClassName}>{row.label}</p>
              <p className={`mt-2 break-all ${monoUtilityStrongTextClassName}`}>{row.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Consumer setup"
        description="Steps, model inventory, and example requests for OpenAI-compatible clients."
      >
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className={`${mutedPanelClassName} min-w-0 p-4`}>
            <p className={compactTitleClassName}>Setup steps</p>
            <ol className={`mt-3 list-decimal space-y-2 pl-4 ${supportingTextClassName}`}>
              {guide.opencodeSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className={`mt-4 ${supportingTextClassName}`}>{provider.authentication.note}</p>
            <div className="mt-4">
              <p className={compactTitleClassName}>Compatibility notes</p>
              <ul className={`mt-3 list-disc space-y-2 pl-4 ${supportingTextClassName}`}>
                {provider.setup.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className={`${mutedPanelClassName} min-w-0 p-4`}>
              <p className={compactTitleClassName}>Available models</p>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                {guide.availableModels.map((modelLabel) => (
                  <span
                    key={modelLabel}
                    className="max-w-full rounded-md border border-[var(--rm-border)] px-2 py-1 text-xs leading-4 text-[var(--rm-fg)]"
                  >
                    <span className="min-w-0 break-all">{modelLabel}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className={`${mutedPanelClassName} min-w-0 p-4`}>
              <p className={compactTitleClassName}>Example commands</p>
              <pre className={`mt-3 ${codeBlockClassName}`}>{guide.examples.modelsCurl}</pre>
              <pre className={`mt-3 ${codeBlockClassName}`}>{guide.examples.chatCurl}</pre>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
