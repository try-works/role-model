import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import {
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  fieldClassName,
  getSelectablePanelClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  ROUTING_MODE_OPTIONS,
  describeRoutingMode,
  formatRoutingModeLabel,
  normalizeRoutingModeValue,
  type RuntimeRoutingMode,
} from "../lib/routing-mode";
import {
  type RuntimeConfig,
  type RuntimeConfigRecord,
  type RuntimeControllerAssignment,
  fetchControllerAssignment,
  fetchRuntimeConfig,
  updateRuntimeConfig,
} from "../lib/runtime-api";

type RoutingStrategyChoice = RuntimeRoutingMode | "unset" | "custom";
type RuntimeExecutionMode = NonNullable<RuntimeConfig["executionMode"]>;

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

function applyExecutionMode(config: RuntimeConfig, executionMode: RuntimeExecutionMode): RuntimeConfig {
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
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedRoutingStrategy, setSelectedRoutingStrategy] =
    useState<RoutingStrategyChoice>("unset");
  const [customRoutingStrategy, setCustomRoutingStrategy] = useState("");
  const [selectedExecutionMode, setSelectedExecutionMode] = useState<RuntimeExecutionMode>("hybrid");

  const syncDrafts = useCallback((nextRecord: RuntimeConfigRecord) => {
    const nextConfig = nextRecord.config ?? createDefaultRuntimeConfig();
    const routingDraft = toRoutingStrategyDraft(nextConfig.routingStrategy);
    setSelectedRoutingStrategy(routingDraft.choice);
    setCustomRoutingStrategy(routingDraft.customValue);
    setSelectedExecutionMode(nextConfig.executionMode ?? "hybrid");
  }, []);

  const loadState = useCallback(async () => {
    void Promise.all([fetchRuntimeConfig(), fetchControllerAssignment()])
      .then(([nextConfigRecord, nextController]) => {
        setConfigRecord(nextConfigRecord);
        setController(nextController);
        syncDrafts(nextConfigRecord);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(
          value instanceof Error ? value.message : "Could not load routing strategy posture.",
        ),
      );
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
  const selectedStrategyDetails = (() => {
    if (selectedRoutingStrategy === "unset") {
      return {
        label: "Unset strategy",
        detail: "Persist no explicit strategy and let the runtime fall back to its baseline default.",
      };
    }
    if (selectedRoutingStrategy === "custom") {
      return {
        label: "Custom strategy",
        detail:
          "Preserve a repo-specific routing mode string exactly as typed for advanced or transitional configurations.",
      };
    }
    return (
      ROUTING_MODE_OPTIONS.find((option) => option.value === selectedRoutingStrategy) ??
      ROUTING_MODE_OPTIONS[0]
    );
  })();
  const selectedExecutionModeDetails =
    EXECUTION_MODE_OPTIONS.find((option) => option.value === selectedExecutionMode) ??
    EXECUTION_MODE_OPTIONS[0];

  const save = async () => {
    const nextStrategy =
      selectedRoutingStrategy === "unset"
        ? null
        : selectedRoutingStrategy === "custom"
          ? customRoutingStrategy.trim() || null
          : selectedRoutingStrategy;
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
      const nextRecord = await updateRuntimeConfig(nextConfig);
      setConfigRecord(nextRecord);
      syncDrafts(nextRecord);
      setStatusMessage("Routing strategy saved and applied.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not update routing strategy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Router"
        title="Routing strategy"
        description="Set the persisted Strategy A/B/C routing mode and execution mode from one control-plane surface, then verify the result through controller, router, and request views."
        actions={
          <>
            <Link className={secondaryButtonClassName} to="/app/system/runtime-config">
              Advanced config
            </Link>
            <Link className={secondaryButtonClassName} to="/app/router/config">
              Router detail
            </Link>
          </>
        }
      />

      <SectionCard
        title="Persisted routing posture"
        description="Change the saved Strategy A/B/C routing mode and the effective execution mode here; both write through the runtime config control-plane record instead of living as placeholder UI state."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <div className="space-y-3" role="radiogroup" aria-label="Routing strategy">
              <p className="text-sm font-medium text-[var(--rm-fg)]">Routing strategy</p>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedRoutingStrategy === "unset"}
                  className={getSelectablePanelClassName(selectedRoutingStrategy === "unset")}
                  onClick={() => setSelectedRoutingStrategy("unset")}
                >
                  <span className="block font-medium text-[var(--rm-fg)]">Use runtime default</span>
                  <span className="mt-2 block text-sm text-[var(--rm-secondary)]">
                    Leave the persisted routing mode unset.
                  </span>
                </button>
                {ROUTING_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selectedRoutingStrategy === option.value}
                    className={getSelectablePanelClassName(selectedRoutingStrategy === option.value)}
                    onClick={() => setSelectedRoutingStrategy(option.value)}
                  >
                    <span className="block font-medium text-[var(--rm-fg)]">{option.label}</span>
                    <span className="mt-2 block text-sm text-[var(--rm-secondary)]">
                      {option.detail}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedRoutingStrategy === "custom"}
                  className={getSelectablePanelClassName(selectedRoutingStrategy === "custom")}
                  onClick={() => setSelectedRoutingStrategy("custom")}
                >
                  <span className="block font-medium text-[var(--rm-fg)]">Custom strategy</span>
                  <span className="mt-2 block text-sm text-[var(--rm-secondary)]">
                    Preserve a custom persisted routing mode string.
                  </span>
                </button>
              </div>
              {selectedRoutingStrategy === "custom" ? (
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[var(--rm-fg)]">Custom strategy</span>
                  <input
                    className={fieldClassName}
                    value={customRoutingStrategy}
                    onChange={(event) => setCustomRoutingStrategy(event.target.value)}
                    placeholder="baseline"
                  />
                </label>
              ) : null}
            </div>

            <div className="space-y-3">
              <label
                className="block text-sm font-medium text-[var(--rm-fg)]"
                htmlFor="execution-mode-select"
              >
                Execution mode
              </label>
              <select
                id="execution-mode-select"
                className={fieldClassName}
                value={selectedExecutionMode}
                onChange={(event) =>
                  setSelectedExecutionMode(event.target.value as RuntimeExecutionMode)
                }
              >
                {EXECUTION_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-[var(--rm-secondary)]">
                {selectedExecutionModeDetails.detail}
              </p>
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
            {statusMessage ? (
              <p className="text-sm text-[var(--rm-secondary)]">{statusMessage}</p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">{selectedStrategyDetails.label}</p>
              <p className="mt-3 leading-6">{selectedStrategyDetails.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={configRecord.applied ? "success" : "warning"}>
                  {configRecord.applied ? "config applied" : "config pending"}
                </StatusPill>
                <StatusPill tone={selectedRoutingStrategy === "custom" ? "accent" : "neutral"}>
                  {selectedRoutingStrategy === "unset"
                    ? "default strategy"
                    : selectedRoutingStrategy === "custom"
                      ? "custom"
                      : formatRoutingModeLabel(selectedRoutingStrategy)}
                </StatusPill>
              </div>
            </div>

            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">Current controller</p>
              <p className="mt-3 break-all text-[var(--rm-fg)]">
                {controller?.endpointId ?? "No controller assigned"}
              </p>
              <p className="mt-2 leading-6">
                {controller
                  ? `${controller.modelId} (${controller.sourceType})`
                  : "Assign a controller when you want controller-guided routing posture to be explicit."}
              </p>
            </div>

            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">Applied config record</p>
              <p className="mt-3 break-all leading-6">{configRecord.path ?? "not configured"}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Current control-plane context"
        description="Use the routing strategy page as the persisted control surface, then verify the live outcome through the controller, router, and request-ledger views."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={`${mutedPanelClassName} p-4`}>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--rm-muted)]">
              Persisted strategy
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--rm-fg)]">
              {config.routingStrategy ? formatRoutingModeLabel(config.routingStrategy) : "runtime default"}
            </p>
            {describeRoutingMode(config.routingStrategy) ? (
              <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                {describeRoutingMode(config.routingStrategy)}
              </p>
            ) : null}
          </div>
          <div className={`${mutedPanelClassName} p-4`}>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--rm-muted)]">
              Execution mode
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--rm-fg)]">
              {config.executionMode ?? "pending"}
            </p>
          </div>
          <div className={`${mutedPanelClassName} p-4`}>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--rm-muted)]">
              Local models
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--rm-fg)]">
              {config.llamaSwap.models.length}
            </p>
          </div>
          <div className={`${mutedPanelClassName} p-4`}>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--rm-muted)]">
              Remote mappings
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--rm-fg)]">
              {config.liteLLM.providers.reduce(
                (count, provider) => count + provider.modelMappings.length,
                0,
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            to="/app/router/controller"
          >
            <span className="block font-medium text-[var(--rm-fg)]">Controller</span>
            Review or change the current controller assignment.
          </Link>
          <Link
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            to="/app/router/config"
          >
            <span className="block font-medium text-[var(--rm-fg)]">Router detail</span>
            Inspect routing provenance, controller guidance, and policy inputs.
          </Link>
          <Link
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            to="/app/studio/chat"
          >
            <span className="block font-medium text-[var(--rm-fg)]">Workbench</span>
            Run routed requests against the live runtime.
          </Link>
          <Link
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            to="/app/observe/requests"
          >
            <span className="block font-medium text-[var(--rm-fg)]">Requests</span>
            Inspect routing receipts and raw request observations.
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
