import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
} from "../components/page-primitives";
import {
  COMPUTE_PREFERENCE_NAMES,
  POSTURE_KIND_LABELS,
  type PostureAliasRowView,
  type PostureDraft,
  type PostureEntryKind,
  type PostureEntryRowView,
  buildPostureEntryRows,
  buildPostureWriteBlock,
  buildWorkloadTemplateDraft,
  createPostureDraft,
  findDuplicateEntryNames,
  formatCommaList,
  listEntriesRemovedBySave,
  parseCommaList,
  postureBlockDocumentKey,
  postureDraftFromEntry,
  summarizePostureDiagnostics,
  validatePostureDraft,
} from "../lib/agent-strategy";
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
  ROUTING_MODE_OPTIONS,
  SCORING_STRATEGY_OPTIONS,
  formatRoutingModeLabel,
  formatScoringStrategyLabel,
} from "../lib/routing-mode";
import { type RouterConfig, fetchRouterConfig, updateRuntimeConfig } from "../lib/runtime-api";

/** The editable shape of one entry; the two list fields stay raw text while the operator types. */
interface PostureForm {
  /**
   * Post-lock repair (run 103): the row identity must not depend on the entry name. The previous
   * key (`${name}-${index}`) changed on every keystroke, so React remounted the card after the first
   * character and the field lost focus — an operator could only ever type one character per click.
   */
  readonly id: string;
  /** The saved entry this row was loaded from; null for a row the operator just added. */
  readonly originName: string | null;
  readonly kind: PostureEntryKind;
  readonly name: string;
  readonly roleId: string;
  readonly scoringStrategy: string;
  readonly routingMode: string;
  readonly computePreference: string;
  readonly modelIdsText: string;
  readonly capabilitiesText: string;
}

let postureRowSequence = 0;

function createPostureRowId(): string {
  postureRowSequence += 1;
  return `posture-row-${postureRowSequence}`;
}

function formFromDraft(draft: PostureDraft, originName: string | null): PostureForm {
  return {
    id: createPostureRowId(),
    originName,
    kind: draft.kind,
    name: draft.name,
    roleId: draft.roleId,
    scoringStrategy: draft.scoringStrategy,
    routingMode: draft.routingMode,
    computePreference: draft.computePreference,
    modelIdsText: formatCommaList(draft.modelIds),
    capabilitiesText: formatCommaList(draft.requiredCapabilities),
  };
}

function draftFromForm(form: PostureForm): PostureDraft {
  return {
    kind: form.kind,
    name: form.name,
    roleId: form.roleId,
    scoringStrategy: form.scoringStrategy,
    routingMode: form.routingMode,
    computePreference: form.computePreference,
    modelIds: parseCommaList(form.modelIdsText),
    requiredCapabilities: parseCommaList(form.capabilitiesText),
  };
}

function readRoleOptions(
  config: RouterConfig | null,
): readonly { id: string; label: string; description: string | null }[] {
  const roles = config?.policySources?.roles ?? [];
  const options = roles.flatMap((role) => {
    const record = role as Record<string, unknown>;
    const id =
      typeof record.roleId === "string"
        ? record.roleId
        : typeof record.role_id === "string"
          ? record.role_id
          : null;
    if (id === null) {
      return [];
    }
    const label =
      typeof record.label === "string"
        ? record.label
        : typeof record.name === "string"
          ? record.name
          : id;
    const description = typeof record.description === "string" ? record.description.trim() : "";
    return [{ id, label, description: description.length > 0 ? description : null }];
  });
  return [...new Map(options.map((option) => [option.id, option])).values()].sort((left, right) =>
    left.id.localeCompare(right.id, "en"),
  );
}

function AliasRow({ alias }: { alias: PostureAliasRowView }) {
  return (
    <div className={`${mutedPanelClassName} flex flex-wrap items-center gap-x-4 gap-y-2 p-3`}>
      <div className="min-w-0">
        <p className={`${bodyStrongTextClassName} break-all text-[var(--rm-fg)]`}>
          {alias.aliasId}
        </p>
        <p className={supportingTextClassName}>
          {`scope ${alias.scopeLabel} · mode ${alias.modeLabel}`}
        </p>
      </div>
      <Badge tone={alias.poolEmpty ? "error" : "neutral"}>{alias.candidateLabel}</Badge>
      {alias.poolEmpty ? (
        <Badge tone="error">{alias.poolEmptyLabel ?? "POOL EMPTY"}</Badge>
      ) : (
        <span className={supportingTextClassName}>
          {alias.leaderEndpointId
            ? `${alias.leaderLabel ?? "current leader"}: ${alias.leaderEndpointId}`
            : "no eligible endpoint"}
        </span>
      )}
    </div>
  );
}

function EntryRow({ row }: { row: PostureEntryRowView }) {
  return (
    <div className={`${cardClassName} space-y-3 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`${bodyStrongTextClassName} break-all text-[var(--rm-fg)]`}>{row.name}</p>
          <p className={supportingTextClassName}>{`${row.bindingLabel} · ${row.postureSummary}`}</p>
          <p className={supportingTextClassName}>
            {`models ${row.modelIds.length > 0 ? row.modelIds.join(", ") : "inherit"} · ${row.capabilityLabel}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{row.kindLabel}</Badge>
          {row.poolEmptyAliasIds.length > 0 ? (
            <Badge tone="error">{`${row.poolEmptyAliasIds.length} pool empty`}</Badge>
          ) : null}
        </div>
      </div>
      {row.aliases.length === 0 ? (
        <EmptyState label="No alias is materialised for this entry yet; save it to materialise one per execution scope." />
      ) : (
        <div className="space-y-2">
          {row.aliases.map((alias) => (
            <AliasRow key={alias.aliasId} alias={alias} />
          ))}
        </div>
      )}
      {row.warnings.length > 0 ? (
        <ul className="space-y-1">
          {row.warnings.map((warning) => (
            <li key={warning} className={supportingTextClassName}>
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Run 103 / SP8 - the shared page behind `Agent strategy` (role-bound postures) and `Workloads`
 * (workload postures). Both pages list every entry with its binding, posture, per-scope aliases and
 * candidate counts, and write back the whole canonical config block.
 */
export function PostureEntriesPage({ kind }: { readonly kind: PostureEntryKind }) {
  const title = POSTURE_KIND_LABELS[kind];
  const [routerConfig, setRouterConfig] = useState<RouterConfig | null>(null);
  const [forms, setForms] = useState<readonly PostureForm[]>([]);
  const [formErrors, setFormErrors] = useState<
    Readonly<Record<number, Readonly<Record<string, string>>>>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const readbackEntries = useMemo(
    () => (kind === "role" ? routerConfig?.agentStrategies : routerConfig?.workloads) ?? null,
    [kind, routerConfig],
  );
  const diagnostics = routerConfig?.postureDiagnostics ?? {
    violations: [],
    skipped: [],
    warnings: [],
  };
  const diagnosticsSummary = useMemo(() => summarizePostureDiagnostics(diagnostics), [diagnostics]);
  const roleOptions = useMemo(() => readRoleOptions(routerConfig), [routerConfig]);
  const rows = useMemo(
    () => buildPostureEntryRows(readbackEntries ?? [], diagnostics),
    [readbackEntries, diagnostics],
  );
  const templates = routerConfig?.workloadExamples ?? {};

  const loadState = useCallback(async () => {
    const next = await fetchRouterConfig();
    setRouterConfig(next);
    const entries = kind === "role" ? next.agentStrategies : next.workloads;
    setForms(
      (entries ?? []).map((entry) => formFromDraft(postureDraftFromEntry(entry), entry.name)),
    );
    setLoadError(null);
  }, [kind]);

  useEffect(() => {
    void loadState().catch((value: unknown) => {
      setLoadError(value instanceof Error ? value.message : `Could not load ${title}.`);
    });
  }, [loadState, title]);

  if (loadError) {
    return <ErrorState label={loadError} />;
  }
  if (!routerConfig) {
    return <LoadingState label={`Loading ${title}…`} />;
  }

  const updateForm = (index: number, patch: Partial<PostureForm>): void => {
    setForms((current) =>
      current.map((form, position) => (position === index ? { ...form, ...patch } : form)),
    );
  };

  const save = async () => {
    const validations = forms.map((form) => validatePostureDraft(draftFromForm(form)));
    const nextErrors: Record<number, Record<string, string>> = {};
    validations.forEach((validation, index) => {
      if (!validation.ok) {
        nextErrors[index] = { ...validation.errors };
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setSaveError("Fix the highlighted entries before saving.");
      setStatusMessage(null);
      return;
    }
    setFormErrors({});
    setSaveError(null);
    /**
     * Post-lock repair (run 103): the write replaces the whole block keyed by name, so a duplicate
     * name would silently collapse two rows into one and a missing name would silently remove a
     * saved entry (a rename removes the old name and its aliases). Both are refused or confirmed
     * before anything is written.
     */
    const duplicateNames = findDuplicateEntryNames(forms.map((form) => form.name));
    if (duplicateNames.length > 0) {
      setSaveError(
        `Duplicate entry name${duplicateNames.length === 1 ? "" : "s"}: ${duplicateNames.join(", ")}. Entry names must be unique — saving two rows with the same name would keep only one and its aliases would change.`,
      );
      setStatusMessage(null);
      return;
    }
    const savedNames = (readbackEntries ?? []).map((entry) => entry.name);
    const removedNames = listEntriesRemovedBySave(
      savedNames,
      forms.map((form) => form.name),
    );
    if (removedNames.length > 0) {
      const confirmed =
        typeof window === "undefined" ||
        window.confirm(
          `Saving removes the saved entr${removedNames.length === 1 ? "y" : "ies"} ${removedNames.join(", ")}: their <name>.<scope> aliases stop materialising. Continue?`,
        );
      if (!confirmed) {
        setStatusMessage(
          `Save cancelled: ${removedNames.join(", ")} would have been removed. Add the missing entr${removedNames.length === 1 ? "y" : "ies"} back or use Remove entry to delete one deliberately.`,
        );
        return;
      }
    }
    setSaving(true);
    try {
      const entries = validations.flatMap((validation) =>
        validation.ok ? [validation.entry] : [],
      );
      const block = buildPostureWriteBlock(kind, entries);
      /** The runtime document key the whole block is written under: `agent_strategies` or `workloads`. */
      const documentKey = postureBlockDocumentKey(kind);
      await updateRuntimeConfig({ [documentKey]: block });
      await loadState();
      setStatusMessage(`${title} saved; the aliases materialise from this block.`);
    } catch (value) {
      setSaveError(value instanceof Error ? value.message : `Could not save ${title}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={title}
        description={
          kind === "role"
            ? "Role-bound postures. Each entry materialises one alias per execution scope and inherits the role the operator bound to it."
            : "Workload postures. Each entry materialises one alias per execution scope for a workload shape that no taxonomy role covers."
        }
      >
        {readbackEntries === null ? (
          <p className={errorNoticeClassName}>
            {`This runtime build does not publish the ${title} readback yet, so the page cannot show or safely rewrite the saved block.`}
          </p>
        ) : rows.length === 0 ? (
          <EmptyState label={`No ${title} entries are configured yet.`} />
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <EntryRow key={row.name} row={row} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Posture diagnostics"
        description="Violations, ALIAS_POOL_EMPTY reports and capability warnings the runtime raised for the saved blocks."
      >
        {diagnosticsSummary.violations.length === 0 &&
        diagnosticsSummary.poolEmptyReports.length === 0 &&
        diagnosticsSummary.warnings.length === 0 ? (
          <EmptyState label="The readback reports no posture violations, skipped scopes, or warnings." />
        ) : (
          <div className="space-y-3">
            {diagnosticsSummary.violations.map((violation) => (
              <p key={violation} className={errorNoticeClassName}>
                {violation}
              </p>
            ))}
            {diagnosticsSummary.poolEmptyReports.map((report) => (
              <p key={report.aliasId} className={supportingTextClassName}>
                {`${report.aliasId} · ${report.reason} (ALIAS_POOL_EMPTY)`}
              </p>
            ))}
            {diagnosticsSummary.unknownCapabilityWarnings.map((warning) => (
              <p key={warning} className={supportingTextClassName}>
                {`Unknown capability warning: ${warning}`}
              </p>
            ))}
          </div>
        )}
      </SectionCard>

      {kind === "workload" ? (
        <SectionCard
          title="Workload templates"
          description="The two workload examples the runtime ships and validates. A template only fills the editor; nothing is written until you save."
        >
          <div className="flex flex-wrap gap-3">
            {[
              { name: "batch", label: "Use batch template" },
              { name: "embedding", label: "Use embedding template" },
            ].map(({ name: templateName, label }) => {
              const template = templates[templateName] ?? {
                scoring_strategy: "cost",
                ...(templateName === "embedding"
                  ? { required_capabilities: ["embeddings.text"] }
                  : {}),
              };
              return (
                <button
                  key={templateName}
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() => {
                    const draft = buildWorkloadTemplateDraft(templateName, template);
                    if (draft) {
                      setForms((current) => [...current, formFromDraft(draft, null)]);
                      setStatusMessage(`Added the ${templateName} template to the editor.`);
                    }
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Entries"
        description={`Edit the ${title} block. Saving writes the whole block, so removing an entry here removes its aliases.`}
      >
        <div className="space-y-4">
          {forms.length === 0 ? (
            <EmptyState label="No entries in the editor yet." />
          ) : (
            forms.map((form, index) => (
              <div key={form.id} className={`${cardClassName} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={monoEyebrowClassName}>
                    {form.originName !== null
                      ? `Editing saved entry ${form.originName}`
                      : form.name.trim().length > 0
                        ? `New entry ${form.name.trim()}`
                        : "New entry"}
                  </p>
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    disabled={saving}
                    onClick={() => {
                      setForms((current) => current.filter((_, position) => position !== index));
                      setFormErrors({});
                    }}
                  >
                    Remove entry
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="grid gap-1">
                    <span className={fieldLabelClassName}>Name</span>
                    <input
                      className={fieldClassName}
                      value={form.name}
                      placeholder={kind === "role" ? "coder" : "embedding"}
                      onChange={(event) => updateForm(index, { name: event.target.value })}
                    />
                    {formErrors[index]?.name ? (
                      <span className={errorNoticeClassName}>{formErrors[index]?.name}</span>
                    ) : null}
                  </label>
                  {form.originName !== null &&
                  form.name.trim().length > 0 &&
                  form.name.trim() !== form.originName ? (
                    <p className={`sm:col-span-2 xl:col-span-3 ${supportingTextClassName}`}>
                      {`Renaming this entry removes \`${form.originName}\` and its ${form.originName}.<scope> aliases, and materialises \`${form.name.trim()}\` instead.`}
                    </p>
                  ) : null}
                  {kind === "role" ? (
                    <label className="grid gap-1">
                      <span className={fieldLabelClassName}>Role (required)</span>
                      <select
                        className={fieldClassName}
                        value={form.roleId}
                        onChange={(event) => updateForm(index, { roleId: event.target.value })}
                      >
                        <option value="">Select a runtime role…</option>
                        {roleOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {`${option.label} (${option.id})`}
                          </option>
                        ))}
                        {form.roleId.length > 0 &&
                        !roleOptions.some((option) => option.id === form.roleId) ? (
                          <option
                            value={form.roleId}
                          >{`${form.roleId} (not in the readback)`}</option>
                        ) : null}
                      </select>
                      {formErrors[index]?.roleId ? (
                        <span className={errorNoticeClassName}>{formErrors[index]?.roleId}</span>
                      ) : null}
                      {roleOptions.find((option) => option.id === form.roleId)?.description ? (
                        <span className={supportingTextClassName}>
                          {roleOptions.find((option) => option.id === form.roleId)?.description}
                        </span>
                      ) : null}
                      <span className={supportingTextClassName}>
                        {`Every entry named \`${form.name.trim().length > 0 ? form.name.trim() : "<name>"}\` materialises \`${form.name.trim().length > 0 ? form.name.trim() : "<name>"}.<scope>\` aliases an agent can call.`}
                      </span>
                    </label>
                  ) : (
                    <label className="grid gap-1">
                      <span className={fieldLabelClassName}>Required capabilities</span>
                      <input
                        className={fieldClassName}
                        value={form.capabilitiesText}
                        placeholder="embeddings.text"
                        onChange={(event) =>
                          updateForm(index, { capabilitiesText: event.target.value })
                        }
                      />
                      <span className={supportingTextClassName}>
                        Comma separated; written as required_capabilities and reported as a warning
                        while the capability taxonomy does not know the name.
                      </span>
                    </label>
                  )}
                  <SelectField
                    label="Scoring strategy"
                    value={form.scoringStrategy}
                    onChange={(value) => updateForm(index, { scoringStrategy: value })}
                  >
                    <option value="">Inherit the routing posture</option>
                    {SCORING_STRATEGY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Routing mode"
                    value={form.routingMode}
                    onChange={(value) => updateForm(index, { routingMode: value })}
                  >
                    <option value="">Inherit the routing posture</option>
                    {ROUTING_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Compute preference"
                    value={form.computePreference}
                    onChange={(value) => updateForm(index, { computePreference: value })}
                  >
                    <option value="">Inherit</option>
                    {COMPUTE_PREFERENCE_NAMES.map((preference) => (
                      <option key={preference} value={preference}>
                        {preference}
                      </option>
                    ))}
                  </SelectField>
                  <label className="grid gap-1">
                    <span className={fieldLabelClassName}>Model ids</span>
                    <input
                      className={fieldClassName}
                      value={form.modelIdsText}
                      placeholder="qwen3-coder"
                      onChange={(event) => updateForm(index, { modelIdsText: event.target.value })}
                    />
                  </label>
                </div>
                {formErrors[index]?.scoringStrategy ? (
                  <p className={errorNoticeClassName}>{formErrors[index]?.scoringStrategy}</p>
                ) : null}
                {formErrors[index]?.routingMode ? (
                  <p className={errorNoticeClassName}>{formErrors[index]?.routingMode}</p>
                ) : null}
                {formErrors[index]?.computePreference ? (
                  <p className={errorNoticeClassName}>{formErrors[index]?.computePreference}</p>
                ) : null}
                <p className={supportingTextClassName}>
                  {`Saving writes ${form.scoringStrategy.trim().length > 0 ? formatScoringStrategyLabel(form.scoringStrategy) : "the inherited scoring strategy"}${form.routingMode.trim().length > 0 ? ` on ${formatRoutingModeLabel(form.routingMode)}` : ""}.`}
                </p>
              </div>
            ))
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={secondaryButtonClassName}
              disabled={saving}
              onClick={() =>
                setForms((current) => [...current, formFromDraft(createPostureDraft(kind), null)])
              }
            >
              {`Add ${kind === "role" ? "agent strategy" : "workload"}`}
            </button>
            <button
              type="button"
              className={primaryButtonClassName}
              disabled={saving || readbackEntries === null}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : `Save ${title}`}
            </button>
          </div>
          {saveError ? <p className={errorNoticeClassName}>{saveError}</p> : null}
          {statusMessage ? <p className={supportingTextClassName}>{statusMessage}</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
