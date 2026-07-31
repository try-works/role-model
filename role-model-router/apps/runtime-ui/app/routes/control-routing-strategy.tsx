import { useCallback, useEffect, useState } from "react";

import { MetricStrip } from "@role-model/ui";

import {
  Badge,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  fieldClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
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

const formFieldLabelClassName = fieldLabelClassName;

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
  const draftAlias = formatDraftRoutingAlias(selectedRoutingStrategyValue, selectedExecutionMode);

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
          <div className="min-w-0 space-y-5">
            <div className="-mx-5 border-b border-[var(--rm-border)]">
              <div className="flex min-h-0">
                <div
                  className="w-[240px] shrink-0 space-y-0.5 border-r border-[var(--rm-border)] p-2"
                  role="listbox"
                  aria-label="Routing strategy"
                >
                  {STRATEGY_CHOICES.map((option) => {
                    const selected = selectedRoutingStrategy === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? "bg-[var(--rm-panel-muted)]"
                            : "hover:bg-[var(--rm-panel-muted)]"
                        }`}
                        onClick={() => setSelectedRoutingStrategy(option.value)}
                      >
                        <span
                          aria-hidden
                          className={`h-[14px] w-[3px] shrink-0 rounded-[1px] ${
                            selected ? "bg-[var(--rm-fg)]" : "bg-transparent"
                          }`}
                        />
                        <span className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="min-w-0 flex-1 space-y-3.5 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[18px] font-semibold leading-6 text-[var(--rm-fg)]">
                      {selectedStrategyDetails.label}
                    </h3>
                    <Badge tone="accent">selected</Badge>
                    {hasUnsavedChanges ? <Badge tone="warning">unsaved</Badge> : null}
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
                        {
                          id: "best-for",
                          label: "Best for",
                          value: selectedStrategyDetails.bestFor,
                        },
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

          <aside className="space-y-3 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-5">
            <p className={monoEyebrowClassName}>Active posture</p>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="font-sans text-xs leading-4 text-[var(--rm-secondary)]">Strategy</p>
                <p className="text-sm font-semibold leading-[18px] text-[var(--rm-fg)]">
                  {selectedStrategyDetails.label}
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-sans text-xs leading-4 text-[var(--rm-secondary)]">Execution</p>
                <p className="text-sm font-semibold leading-[18px] text-[var(--rm-fg)]">
                  {selectedExecutionModeDetails.label}
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-sans text-xs leading-4 text-[var(--rm-secondary)]">Alias</p>
                <p className="font-mono text-sm font-semibold leading-[18px] text-[var(--rm-fg)]">
                  {draftAlias}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </SectionCard>
    </div>
  );
}
