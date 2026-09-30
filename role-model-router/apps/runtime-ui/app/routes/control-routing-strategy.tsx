import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckboxControl } from "../components/checkbox-control";
import {
  Badge,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  cardClassName,
  errorNoticeClassName,
  fieldClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  LATENCY_COMPARISON_METRIC_COPY,
  LATENCY_SELECTION_ENABLED_FIELD,
  type LatencyOverrideToggleView,
  buildLatencyOverrideToggle,
} from "../lib/latency-override";
import {
  type LearningPolicyView,
  fetchLearningPolicy,
  saveLearningPolicy,
  useOperatorToken,
} from "../lib/learning-api";
import {
  EXECUTION_SCOPE_OPTIONS,
  type ExecutionScopeName,
  PIN_WEIGHTS_HELP_TEXT,
  ROUTING_MODE_OPTIONS,
  type RoutingModeName,
  SCORING_PRESETS,
  SCORING_STRATEGY_OPTIONS,
  type ScoringStrategyName,
  WEIGHT_METRICS,
  WEIGHT_SUM_TOLERANCE,
  type WeightProfile,
  buildRoutingPatchDocument,
  formatExecutionScopeSegment,
  formatWeightMetricLabel,
  formatWeightValue,
  normalizeExecutionScopeValue,
  normalizeRoutingModeValue,
  normalizeScoringStrategyValue,
  resolveRoutingPostureSummary,
  validateWeightProfile,
} from "../lib/routing-mode";
import { type RouterConfig, fetchRouterConfig, updateRuntimeConfig } from "../lib/runtime-api";

type WeightDrafts = Readonly<Record<(typeof WEIGHT_METRICS)[number], string>>;

function weightDraftsFromProfile(profile: WeightProfile): WeightDrafts {
  return Object.fromEntries(
    WEIGHT_METRICS.map((metric) => [metric, String(profile[metric])]),
  ) as WeightDrafts;
}

function parseWeightDrafts(drafts: WeightDrafts): WeightProfile | null {
  const parsed: Partial<Record<(typeof WEIGHT_METRICS)[number], number>> = {};
  for (const metric of WEIGHT_METRICS) {
    const raw = drafts[metric].trim();
    const value = raw.length === 0 ? Number.NaN : Number(raw);
    if (!Number.isFinite(value)) {
      return null;
    }
    parsed[metric] = value;
  }
  return parsed as WeightProfile;
}

/** Run 103 / SP8 - the Routing strategy page of design document section 8. */
export default function ControlRoutingStrategyRoute() {
  const [routerConfig, setRouterConfig] = useState<RouterConfig | null>(null);
  const [latencyToggle, setLatencyToggle] = useState<LatencyOverrideToggleView | null>(null);
  const [policyVersion, setPolicyVersion] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [latencySaving, setLatencySaving] = useState(false);
  const [latencyStatus, setLatencyStatus] = useState<string | null>(null);
  /** Revealed only after a write the runtime refused for authorization reasons. */
  const [latencyTokenNeeded, setLatencyTokenNeeded] = useState(false);
  const { token, setToken } = useOperatorToken();

  const [mode, setMode] = useState<RoutingModeName>("baseline");
  const [scoringStrategy, setScoringStrategy] = useState<ScoringStrategyName>("balanced");
  const [pinWeights, setPinWeights] = useState(false);
  const [weightDrafts, setWeightDrafts] = useState<WeightDrafts>(() =>
    weightDraftsFromProfile(SCORING_PRESETS.balanced),
  );
  const [executionScope, setExecutionScope] = useState<ExecutionScopeName>("decision_only");
  const [latencyEnabledDraft, setLatencyEnabledDraft] = useState<boolean | null>(null);

  const syncDrafts = useCallback((next: RouterConfig, policy: LatencyOverrideToggleView | null) => {
    const summary = resolveRoutingPostureSummary({
      routing: next.routing ?? null,
      persisted: next.persisted,
    });
    setMode(summary.mode);
    setScoringStrategy(summary.scoringStrategy ?? "balanced");
    setPinWeights(summary.pinWeights);
    setWeightDrafts(
      weightDraftsFromProfile(
        summary.weights ??
          (summary.scoringStrategy && summary.scoringStrategy !== "custom"
            ? SCORING_PRESETS[summary.scoringStrategy]
            : SCORING_PRESETS.balanced),
      ),
    );
    setExecutionScope(
      normalizeExecutionScopeValue(next.persisted.executionMode) ?? "decision_only",
    );
    if (policy) {
      setLatencyEnabledDraft(policy.enabled);
    }
  }, []);

  const loadState = useCallback(async () => {
    const [nextRouterConfig, nextPolicy] = await Promise.all([
      fetchRouterConfig(),
      fetchLearningPolicy().catch(() => null),
    ]);
    const nextLatencyToggle = nextPolicy ? buildLatencyOverrideToggle(nextPolicy.fields) : null;
    setRouterConfig(nextRouterConfig);
    setLatencyToggle(nextLatencyToggle);
    setPolicyVersion(nextPolicy?.policyVersion ?? null);
    syncDrafts(nextRouterConfig, nextLatencyToggle);
    setLoadError(null);
  }, [syncDrafts]);

  useEffect(() => {
    void loadState().catch((value: unknown) => {
      setLoadError(
        value instanceof Error ? value.message : "Could not load the routing strategy posture.",
      );
    });
  }, [loadState]);

  const savedPosture = useMemo(
    () =>
      routerConfig
        ? resolveRoutingPostureSummary({
            routing: routerConfig.routing ?? null,
            persisted: routerConfig.persisted,
          })
        : null,
    [routerConfig],
  );
  const parsedWeights = useMemo(() => parseWeightDrafts(weightDrafts), [weightDrafts]);
  const weightValidation = useMemo(
    () => (parsedWeights ? validateWeightProfile(parsedWeights) : null),
    [parsedWeights],
  );
  const weightsAreCustom = scoringStrategy === "custom";
  const selectedModeOption =
    ROUTING_MODE_OPTIONS.find((option) => option.value === mode) ?? ROUTING_MODE_OPTIONS[0];
  const selectedScoringOption =
    SCORING_STRATEGY_OPTIONS.find((option) => option.value === scoringStrategy) ??
    SCORING_STRATEGY_OPTIONS[0];
  const selectedScopeOption =
    EXECUTION_SCOPE_OPTIONS.find((option) => option.value === executionScope) ??
    EXECUTION_SCOPE_OPTIONS[0];
  const draftAlias = `${selectedModeOption.aliasFamily}.${formatExecutionScopeSegment(executionScope)}`;
  const savedScopeSegment = formatExecutionScopeSegment(
    routerConfig?.persisted.executionMode ?? executionScope,
  );
  const savedWeightDrafts = savedPosture?.weights
    ? weightDraftsFromProfile(savedPosture.weights)
    : null;
  const weightsDirty =
    weightsAreCustom &&
    (parsedWeights === null ||
      savedWeightDrafts === null ||
      WEIGHT_METRICS.some((metric) => weightDrafts[metric] !== savedWeightDrafts[metric]));
  const hasUnsavedChanges =
    savedPosture === null ||
    savedPosture.mode !== mode ||
    (savedPosture.scoringStrategy ?? "balanced") !== scoringStrategy ||
    savedPosture.pinWeights !== pinWeights ||
    weightsDirty ||
    routerConfig?.persisted.executionMode !== executionScope;

  if (loadError) {
    return <ErrorState label={loadError} />;
  }
  if (!routerConfig || !savedPosture) {
    return <LoadingState label="Loading routing strategy posture…" />;
  }

  const saveRoutingStrategy = async () => {
    const built = buildRoutingPatchDocument({
      routing: routerConfig.routing ?? null,
      scoringStrategy,
      weights: weightsAreCustom ? parsedWeights : null,
      pinWeights,
      executionScope,
    });
    if (!built.ok) {
      setSaveError(built.error);
      setStatusMessage(null);
      return;
    }
    setSaving(true);
    setSaveError(null);
    setStatusMessage(null);
    try {
      await updateRuntimeConfig({ ...built.document });
      await loadState();
      setStatusMessage("Routing posture saved; the next decision uses this posture.");
    } catch (value) {
      setSaveError(
        value instanceof Error ? value.message : "Could not save the routing strategy posture.",
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Post-lock addendum-03 (operator directive): the checkbox owns its own write. It flips exactly one
   * learning-policy field, and the write is optimistic - a refused or stale write restores the saved
   * value instead of leaving the page claiming a state the runtime does not hold.
   */
  const toggleLatencyOverride = async (next: boolean) => {
    const previous = latencyEnabledDraft;
    if (policyVersion === null) {
      setLatencyStatus("The learning policy readback did not publish a policy version.");
      return;
    }
    setLatencyEnabledDraft(next);
    setLatencySaving(true);
    setLatencyStatus(null);
    try {
      await saveLearningPolicy(
        {
          changes: { [LATENCY_SELECTION_ENABLED_FIELD]: next },
          expectedPolicyVersion: policyVersion,
          operator: "operator:ui",
          reason: "routing strategy measured-latency override checkbox",
        },
        fetch,
        token,
      );
      await loadState();
      setLatencyTokenNeeded(false);
      setLatencyStatus(
        next ? "Measured-latency override enabled." : "Measured-latency override disabled.",
      );
    } catch (value) {
      setLatencyEnabledDraft(previous);
      setLatencyTokenNeeded(true);
      setLatencyStatus(
        value instanceof Error
          ? value.message
          : "Could not write the measured-latency override to the learning policy.",
      );
    } finally {
      setLatencySaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Routing strategy"
        description="Mode, scoring strategy, custom weights, the pin flag and the execution scope the next decision will use."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
          <div className="min-w-0 space-y-5">
            <div className="-mx-5 border-b border-[var(--rm-border)]">
              <div className="flex min-h-0">
                <div
                  className="w-[240px] shrink-0 space-y-0.5 border-r border-[var(--rm-border)] p-2"
                  role="listbox"
                  aria-label="Routing mode"
                >
                  {ROUTING_MODE_OPTIONS.map((option) => {
                    const selected = mode === option.value;
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
                        onClick={() => setMode(option.value)}
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
                  <div className="space-y-2">
                    <SelectField
                      label="Scoring strategy"
                      value={scoringStrategy}
                      onChange={(value) => {
                        const normalized = normalizeScoringStrategyValue(value) ?? "balanced";
                        setScoringStrategy(normalized);
                        if (normalized !== "custom") {
                          setWeightDrafts(weightDraftsFromProfile(SCORING_PRESETS[normalized]));
                        }
                      }}
                    >
                      {SCORING_STRATEGY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                    <p className={supportingTextClassName}>{selectedScoringOption.detail}</p>
                  </div>
                  <div className="space-y-1">
                    <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                      {selectedModeOption.label}
                    </p>
                    <p className={supportingTextClassName}>{selectedModeOption.detail}</p>
                    <p className={supportingTextClassName}>
                      {selectedModeOption.needsController
                        ? "Needs the routing controller."
                        : "Runs without the routing controller."}{" "}
                      Aliases: {selectedModeOption.aliasFamily}.*
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckboxControl
                  id="routing-pin-weights"
                  aria-label="Pin scoring strategy"
                  checked={pinWeights}
                  onChange={() => setPinWeights((current) => !current)}
                />
                <div className="space-y-1">
                  <label
                    className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}
                    htmlFor="routing-pin-weights"
                  >
                    Pin scoring strategy
                  </label>
                  <p className={supportingTextClassName}>{PIN_WEIGHTS_HELP_TEXT}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={monoEyebrowClassName}>Custom weights</p>
                <p className={supportingTextClassName}>
                  {weightsAreCustom
                    ? `Sum ${weightValidation ? formatWeightValue(weightValidation.sum) : "—"} (1.0 ± ${WEIGHT_SUM_TOLERANCE})`
                    : "Enabled when the scoring strategy is Custom"}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {WEIGHT_METRICS.map((metric) => (
                  <label key={metric} className="grid gap-1">
                    <span className={fieldLabelClassName}>{formatWeightMetricLabel(metric)}</span>
                    <input
                      className={fieldClassName}
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      disabled={!weightsAreCustom || saving}
                      value={weightDrafts[metric]}
                      onChange={(event) =>
                        setWeightDrafts((current) => ({
                          ...current,
                          [metric]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              {weightsAreCustom && weightValidation && !weightValidation.ok ? (
                <p className={errorNoticeClassName}>
                  {weightValidation.sumError ??
                    "Every metric must be between 0 and 1 and the six must sum to 1.0 ± 0.001."}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <span className={supportingTextClassName}>Reset to preset</span>
                {(Object.keys(SCORING_PRESETS) as ReadonlyArray<keyof typeof SCORING_PRESETS>).map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={secondaryButtonClassName}
                      disabled={!weightsAreCustom || saving}
                      onClick={() =>
                        setWeightDrafts(weightDraftsFromProfile(SCORING_PRESETS[preset]))
                      }
                    >
                      {SCORING_STRATEGY_OPTIONS.find((option) => option.value === preset)?.label ??
                        preset}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-2">
              <SelectField
                label="Execution scope"
                value={executionScope}
                onChange={(value) =>
                  setExecutionScope(normalizeExecutionScopeValue(value) ?? "decision_only")
                }
              >
                {EXECUTION_SCOPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <p className={supportingTextClassName}>{selectedScopeOption.detail}</p>
            </div>

            <div className={`${mutedPanelClassName} space-y-2 p-4`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className={monoEyebrowClassName}>Resolved posture</p>
                {hasUnsavedChanges ? <Badge tone="warning">unsaved</Badge> : null}
                {savedPosture.source === "legacy-string" ? (
                  <Badge tone="warning">legacy spelling migrated on save</Badge>
                ) : null}
              </div>
              <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                {`${savedPosture.modeLabel} · ${savedPosture.scoringStrategyLabel} · scope ${savedScopeSegment}`}
              </p>
              <p className={supportingTextClassName}>{savedPosture.sourceLabel}</p>
              <p className={supportingTextClassName}>
                {savedPosture.legacyStrategy
                  ? `Saved string: ${savedPosture.legacyStrategy} — saving writes ${savedPosture.mode} / ${savedPosture.scoringStrategy ?? "balanced"}.`
                  : `Saved posture: ${savedPosture.mode} / ${savedPosture.scoringStrategy ?? "balanced"}.`}
              </p>
              {savedPosture.degradations.length > 0 ? (
                <ul className="space-y-1">
                  {savedPosture.degradations.map((degradation) => (
                    <li key={degradation} className={supportingTextClassName}>
                      {degradation}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className={primaryButtonClassName}
                type="button"
                disabled={saving}
                onClick={() => void saveRoutingStrategy()}
              >
                {saving ? "Applying…" : "Save and apply strategy"}
              </button>
              <button
                className={secondaryButtonClassName}
                type="button"
                disabled={saving}
                onClick={() => {
                  syncDrafts(routerConfig, latencyToggle);
                  setStatusMessage(null);
                  setSaveError(null);
                }}
              >
                Reset form
              </button>
            </div>
            {saveError ? <p className={errorNoticeClassName}>{saveError}</p> : null}
            {statusMessage ? <p className={supportingTextClassName}>{statusMessage}</p> : null}
          </div>

          <aside className={`${cardClassName} space-y-3 p-5`}>
            <p className={monoEyebrowClassName}>Active posture</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className={fieldLabelClassName}>Mode</p>
                <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                  {selectedModeOption.label}
                </p>
              </div>
              <div className="space-y-1">
                <p className={fieldLabelClassName}>Scoring strategy</p>
                <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                  {selectedScoringOption.label}
                </p>
              </div>
              <div className="space-y-1">
                <p className={fieldLabelClassName}>Execution scope</p>
                <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                  {selectedScopeOption.label}
                </p>
              </div>
              <div className="space-y-1">
                <p className={fieldLabelClassName}>Alias</p>
                <p className={`${bodyStrongTextClassName} break-all text-[var(--rm-fg)]`}>
                  {draftAlias}
                </p>
              </div>
              <div className="space-y-1">
                <p className={fieldLabelClassName}>Saved alias</p>
                <p className={`${bodyStrongTextClassName} break-all text-[var(--rm-fg)]`}>
                  {savedPosture.routingAliasId}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </SectionCard>
      <SectionCard
        title="Measured-latency override"
        description="Off by default. One switch; the bounds, window and sample floor stay on the learning policy."
      >
        {latencyToggle === null || latencyEnabledDraft === null || !latencyToggle.published ? (
          <p className={supportingTextClassName}>
            {latencyToggle === null
              ? "The learning-policy readback is unavailable, so this switch cannot read or write the override."
              : `This runtime build does not publish ${LATENCY_SELECTION_ENABLED_FIELD}, so the override cannot be switched from here.`}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckboxControl
                id="latency-selection-enabled"
                aria-label="Measured-latency override"
                checked={latencyEnabledDraft}
                disabled={latencySaving}
                onChange={() => void toggleLatencyOverride(!latencyEnabledDraft)}
              />
              <div className="space-y-1">
                <label
                  className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}
                  htmlFor="latency-selection-enabled"
                >
                  Enabled
                </label>
                <p className={supportingTextClassName}>
                  {`When enabled the router may substitute an endpoint it already considered eligible when the measured comparison ${LATENCY_COMPARISON_METRIC_COPY} shows a large enough advantage. The minimum stage, window, sample floor and bounds are edited on Learning → Configuration.`}
                </p>
              </div>
            </div>
            {latencyTokenNeeded ? (
              <label className={fieldLabelClassName}>
                Operator token
                <input
                  className={`${fieldClassName} mt-1 font-mono`}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="only needed when this runtime requires one"
                  type="password"
                  value={token}
                />
                <span className={`mt-1 block ${supportingTextClassName}`}>
                  The learning policy is written through the authenticated operator API; the machine
                  that owns the runtime needs no token.
                </span>
              </label>
            ) : null}
            {latencyStatus ? <p className={supportingTextClassName}>{latencyStatus}</p> : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
