import { useEffect, useState } from "react";

import { ErrorState, LoadingState, SectionCard, StatusPill } from "../components/page-primitives";
import {
  codeBlockClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  type RuntimeDownstreamOpenAIProviderConfig,
  fetchDownstreamOpenAIProviderConfig,
} from "../lib/runtime-api";
import { usePageActions } from "../lib/shell-header-context";
import { buildDownstreamProviderGuide } from "../lib/view-models";

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

  usePageActions(
    <a className={secondaryButtonClassName} href="/api/role-model/downstream/openai">
      Provider JSON
    </a>,
    [],
  );

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!provider) {
    return <LoadingState label="Loading downstream integration details…" />;
  }

  const guide = buildDownstreamProviderGuide(provider);

  return (
    <div className="space-y-6">
      <SectionCard title="Connection contract">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {guide.connectionRows.map((row) => (
            <div key={row.label} className={`${mutedPanelClassName} p-4`}>
              <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                {row.label}
              </p>
              <p className="mt-2 break-all font-mono text-sm text-[var(--rm-fg)]">{row.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Consumer setup">
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className={`${mutedPanelClassName} min-w-0 p-4`}>
            <p className="font-semibold text-[var(--rm-fg)]">Setup steps</p>
            <ol className="mt-3 space-y-2 text-sm text-[var(--rm-secondary)]">
              {guide.opencodeSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-[var(--rm-secondary)]">
              {provider.authentication.note}
            </p>
          </div>

          <div className="min-w-0 space-y-4">
            <div className={`${mutedPanelClassName} min-w-0 p-4`}>
              <p className="font-semibold text-[var(--rm-fg)]">Available models</p>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                {guide.availableModels.map((modelId) => (
                  <StatusPill
                    key={modelId}
                    className="max-w-full whitespace-normal leading-4"
                    tone={modelId === provider.setup.recommendedModel ? "accent" : "neutral"}
                  >
                    <span className="min-w-0 break-all">{modelId}</span>
                  </StatusPill>
                ))}
              </div>
            </div>

            <div className={`${mutedPanelClassName} min-w-0 p-4`}>
              <p className="font-semibold text-[var(--rm-fg)]">Example commands</p>
              <pre className={`mt-3 ${codeBlockClassName}`}>{guide.examples.modelsCurl}</pre>
              <pre className={`mt-3 ${codeBlockClassName}`}>{guide.examples.chatCurl}</pre>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
