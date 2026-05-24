import { useEffect, useState } from "react";

import {
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  codeBlockClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  type RuntimeDownstreamOpenAIProviderConfig,
  fetchDownstreamOpenAIProviderConfig,
} from "../lib/runtime-api";
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

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!provider) {
    return <LoadingState label="Loading downstream integration details…" />;
  }

  const guide = buildDownstreamProviderGuide(provider);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Endpoints"
        title="Downstream provider contract"
        description="Configure consumer apps such as opencode against the runtime's OpenAI-compatible downstream surface."
        actions={
          <a className={secondaryButtonClassName} href="/api/role-model/downstream/openai">
            Provider JSON
          </a>
        }
      />

      <SectionCard
        title="Connection contract"
        description="Base URL, auth expectations, and downstream model discovery in one reference block."
      >
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

      <SectionCard
        title="Consumer setup"
        description="The runtime remains downstream-compatible, including tool-calling consumer expectations."
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className={`${mutedPanelClassName} p-4`}>
            <p className="font-medium text-[var(--rm-fg)]">Setup steps</p>
            <ol className="mt-3 space-y-2 text-sm text-[var(--rm-secondary)]">
              {guide.opencodeSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-[var(--rm-secondary)]">
              {provider.authentication.note}
            </p>
          </div>

          <div className="space-y-4">
            <div className={`${mutedPanelClassName} p-4`}>
              <p className="font-medium text-[var(--rm-fg)]">Available models</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {guide.availableModels.map((modelId) => (
                  <StatusPill
                    key={modelId}
                    tone={modelId === provider.setup.recommendedModel ? "accent" : "neutral"}
                  >
                    {modelId}
                  </StatusPill>
                ))}
              </div>
            </div>

            <div className={`${mutedPanelClassName} p-4`}>
              <p className="font-medium text-[var(--rm-fg)]">Example commands</p>
              <pre className={`mt-3 ${codeBlockClassName}`}>{guide.examples.modelsCurl}</pre>
              <pre className={`mt-3 ${codeBlockClassName}`}>{guide.examples.chatCurl}</pre>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Compatibility posture"
        description="Compatibility notes stay with the downstream contract instead of on a duplicate reference page."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">API family</p>
            <p className="mt-2">
              Downstream consumers should treat this runtime as an OpenAI-compatible provider
              surfaced through the model listing and chat-completions contract shown above.
            </p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Tool calling</p>
            <p className="mt-2">
              `tool_calls` compatibility follows the selected routed model and remains inspectable
              in request detail rather than hidden behind a separate compatibility matrix.
            </p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">MCP boundary</p>
            <p className="mt-2">
              MCP and runtime-owned tool execution stay backend-governed; downstream clients consume
              the compatible response surface rather than negotiating connector state directly.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
