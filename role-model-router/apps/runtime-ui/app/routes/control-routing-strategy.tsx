import { useCallback, useEffect, useState } from "react";

import { MetricStrip } from "@role-model/ui";

import {
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
  StatusPill,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  compactTitleClassName,
  fieldClassName,
  foregroundEmphasisClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import {
  ROUTING_MODE_OPTIONS,
  type RuntimeRoutingMode,
  formatDraftRoutingAlias,
  normalizeRoutingModeValue,
} from "../lib/routing-mode";
import {
  type RuntimeConfig,
  type RuntimeConfigRecord,
  fetchRuntimeConfig,
  updateRuntimeConfig,
} from "../lib/runtime-api";

type RoutingStrategyChoice = RuntimeRoutingMode | "unset" | "custom";
type RuntimeExecutionMode = NonNullable<RuntimeConfig["executionMode"]>;

const formFieldLabelClassName = `${utilityLabelClassName} text-[var(--rm-fg)]`;

const EXECUTION_MODE_OPTIONS: ReadonlyArray<{
  readonly value: RuntimeExecutionMode;
  readonly label: string;
  readonly detail: string;
}> = [
  {
    value: "hybrid",
    label: "Hybrid",
    detail: "Keep both local llama-swap and remote LiteLLM execution available to the runtime.",
  },
  {
    value: "local_only",
    label: "Local only",
    detail: "Route only through local llama-swap-managed models.",
  },
  {
    value: "remote_only",
    label: "Remote only",
    detail: "Route only through remote provider-backed endpoints.",
  },
  {
    value: "decision_only",
    label: "Decision only",
    detail: "Keep routing and diagnostics active without enabling local or remote execution.",
  },
] as const;

const STRATEGY_CHOICES: ReadonlyArray<{
  readonly value: RoutingStrategyChoice;
  readonly label: string;
  readonly detail: string;
  readonly modeId: string;
  readonly guidance: string;
  readonly bestFor: string;
  readonly needsController: boolean;
}> = [
  {
    value: "unset",
    label: "Use runtime default",
    detail: "Leave the persisted routing mode unset.",
    modeId: "—",
    guidance: "runtime default",
    bestFor: "host-owned default alias",
    needsController: false,
  },
  ...ROUTING_MODE_OPTIONS.map((option) => ({
    value: option.value as RoutingStrategyChoice,
    label: option.label,
    detail: option.detail,
    modeId: option.value,
    guidance: option.guidance,
    bestFor: option.bestFor,
    needsController: option.needsController,
  })),
  {
    value: "custom",
    label: "Custom strategy",
    detail:
      "Preserve a repo-specific routing mode string exactly as typed for advanced or transitional configurations.",
    modeId: "custom",
    guidance: "exact string",
    bestFor: "advanced / transitional configs",
    needsController: false,
  },
];

function createEmptyProcessConfig() {
  return {
    command: null,
    args: [],
    env: {},
    cwd: null,
    startupTimeoutMs: null,
  } as const;
}

function createDefaultRuntimeConfig(): RuntimeConfig {
  return {
    version: "1.0",
    routingStrategy: null,
    executionMode: "decision_only",
    llamaSwap: {
      enabled: false,
      models: [],
      process: createEmptyProcessConfig(),
    },
    liteLLM: {
      enabled: false,
      providers: [],
      process: createEmptyProcessConfig(),
    },
  };
}

function toRoutingStrategyDraft(strategy: string | null | undefined): {
  readonly choice: RoutingStrategyChoice;
  readonly customValue: string;
} {
  const normalized = strategy?.trim() ?? "";
  if (!normalized) {
    return { choice: "unset", customValue: "" };
  }
  const normalizedRoutingMode = normalizeRoutingModeValue(normalized);
  if (normalizedRoutingMode) {
    return {
      choice: normalizedRoutingMode,
      customValue: "",
    };
  }
  return {
    choice: "custom",
    customValue: normalized,
  };
}

function resolveRoutingStrategyChoice(
  choice: RoutingStrategyChoice,
  customValue: string,
): string | null {
  if (choice === "unset") {
    return null;
  }
  if (choice === "custom") {
    return customValue.trim() || null;
  }
  return choice;
}

function applyExecutionMode(
  config: RuntimeConfig,
  executionMode: RuntimeExecutionMode,
): RuntimeConfig {
  return {
    ...config,
    executionMode,
    llamaSwap: {
      ...config.llamaSwap,
      enabled: executionMode === "hybrid" || executionMode === "local_only",
    },
    liteLLM: {
      ...config.liteLLM,
      enabled: executionMode === "hybrid" || executionMode === "remote_only",
    },
  };
}

export default function ControlRoutingStrategyRoute() {
  const [configRecord, setConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedRoutingStrategy, setSelectedRoutingStrategy] =
    useState<RoutingStrategyChoice>("unset");
  const [customRoutingStrategy, setCustomRoutingStrategy] = useState("");
  const [selectedExecutionMode, setSelectedExecutionMode] =
    useState<RuntimeExecutionMode>("hybrid");

  const syncDrafts = useCallback((nextRecord: RuntimeConfigRecord) => {
    const nextConfig = nextRecord.config ?? createDefaultRuntimeConfig();
    const routingDraft = toRoutingStrategyDraft(nextConfig.routingStrategy);
    setSelectedRoutingStrategy(routingDraft.choice);
    setCustomRoutingStrategy(routingDraft.customValue);
    setSelectedExecutionMode(nextConfig.executionMode ?? "hybrid");
  }, []);

  const loadState = useCallback(async () => {
    try {
      const nextConfigRecord = await fetchRuntimeConfig();
      setConfigRecord(nextConfigRecord);
      syncDrafts(nextConfigRecord);
      setError(null);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not load routing strategy posture.");
      throw value;
    }
  }, [syncDrafts]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!configRecord) {
    return <LoadingState label="Loading routing strategy posture…" />;
  }

  const config = configRecord.config ?? createDefaultRuntimeConfig();
  const persistedRoutingStrategy = config.routingStrategy ?? null;
  const persistedExecutionMode = config.executionMode ?? "decision_only";
  const selectedRoutingStrategyValue = resolveRoutingStrategyChoice(
    selectedRoutingStrategy,
    customRoutingStrategy,
  );
  const hasUnsavedChanges =
    selectedRoutingStrategyValue !== persistedRoutingStrategy ||
    selectedExecutionMode !== persistedExecutionMode;
  const selectedStrategyDetails =
    STRATEGY_CHOICES.find((option) => option.value === selectedRoutingStrategy) ??
    STRATEGY_CHOICES[0];
  const selectedExecutionModeDetails =
    EXECUTION_MODE_OPTIONS.find((option) => option.value === selectedExecutionMode) ??
    EXECUTION_MODE_OPTIONS[0];
  const draftAlias = formatDraftRoutingAlias(
    selectedRoutingStrategyValue,
    selectedExecutionMode,
  );

  const save = async () => {
    const nextStrategy = resolveRoutingStrategyChoice(
      selectedRoutingStrategy,
      customRoutingStrategy,
    );
    if (selectedRoutingStrategy === "custom" && !nextStrategy) {
      setError("Custom strategy cannot be empty.");
      return;
    }
    setSaving(true);
    setStatusMessage(null);
    setError(null);
    try {
      const nextConfig = applyExecutionMode(
        {
          ...config,
          routingStrategy: nextStrategy,
        },
        selectedExecutionMode,
      );
      await updateRuntimeConfig(nextConfig);
      await loadState();
      setStatusMessage("Routing strategy saved and applied.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not update routing strategy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Routing strategy"
        description="Choose how the runtime picks models for each request."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="space-y-1" role="listbox" aria-label="Routing strategy">
                {STRATEGY_CHOICES.map((option) => {
                  const selected = selectedRoutingStrategy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`flex w-full items-center gap-2 rounded-[var(--rm-radius-field)] px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-l-2 border-[var(--rm-accent)] bg-[var(--rm-surface-strong)]"
                          : "border-l-2 border-transparent hover:bg-[var(--rm-surface-strong)]"
                      }`}
                      onClick={() => setSelectedRoutingStrategy(option.value)}
                    >
                      <span className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={compactTitleClassName}>{selectedStrategyDetails.label}</h3>
                  <StatusPill tone="accent">selected</StatusPill>
                  {hasUnsavedChanges ? <StatusPill tone="warning">unsaved</StatusPill> : null}
                </div>
                <p className={supportingTextClassName}>{selectedStrategyDetails.detail}</p>

                {selectedRoutingStrategy === "custom" ? (
                  <label className="grid gap-2">
                    <span className={formFieldLabelClassName}>Custom strategy</span>
                    <input
                      className={fieldClassName}
                      value={customRoutingStrategy}
                      onChange={(event) => setCustomRoutingStrategy(event.target.value)}
                      placeholder="org.routing.v2"
                    />
                    <span className={supportingTextClassName}>
                      Persisted exactly as typed — not remapped to a named mode.
                    </span>
                  </label>
                ) : (
                  <MetricStrip
                    aria-label="Strategy details"
                    variant="inventory"
                    className="max-w-none"
                    items={[
                      { id: "mode-id", label: "Mode id", value: selectedStrategyDetails.modeId },
                      {
                        id: "guidance",
                        label: "Guidance",
                        value: selectedStrategyDetails.guidance,
                      },
                      { id: "best-for", label: "Best for", value: selectedStrategyDetails.bestFor },
                      {
                        id: "needs-controller",
                        label: "Needs controller",
                        value: selectedStrategyDetails.needsController ? "yes" : "no",
                      },
                    ]}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <SelectField
                label="Execution mode"
                value={selectedExecutionMode}
                onChange={(value) => setSelectedExecutionMode(value as RuntimeExecutionMode)}
              >
                {EXECUTION_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <p className={supportingTextClassName}>{selectedExecutionModeDetails.detail}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className={primaryButtonClassName}
                type="button"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Applying…" : "Save and apply strategy"}
              </button>
              <button
                className={secondaryButtonClassName}
                type="button"
                disabled={saving}
                onClick={() => {
                  syncDrafts(configRecord);
                  setStatusMessage(null);
                  setError(null);
                }}
              >
                Reset form
              </button>
            </div>
            {statusMessage ? <p className={supportingTextClassName}>{statusMessage}</p> : null}
          </div>

          <aside className="space-y-4 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4">
            <p className={foregroundEmphasisClassName}>Active posture</p>
            <MetricStrip
              aria-label="Active posture"
              variant="inventory"
              className="max-w-none"
              items={[
                {
                  id: "strategy",
                  label: "Strategy",
                  value: selectedStrategyDetails.label,
                },
                {
                  id: "execution",
                  label: "Execution",
                  value: selectedExecutionModeDetails.label,
                },
                {
                  id: "alias",
                  label: "Alias",
                  value: draftAlias,
                },
              ]}
            />
          </aside>
        </div>
      </SectionCard>
    </div>
  );
}
