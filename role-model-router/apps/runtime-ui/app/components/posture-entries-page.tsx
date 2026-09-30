import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  type PosturePatchRow,
  buildPostureEntryRows,
  buildPostureNamedBlockPatch,
  buildWorkloadTemplateDraft,
  createPostureDraft,
  filterPostureDiagnosticsForKind,
  findDuplicateEntryNames,
  formatCommaList,
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
      <Badge tone="neutral">{alias.candidateLabel}</Badge>
      <span className={supportingTextClassName}>
        {alias.leaderEndpointId
          ? `${alias.leaderLabel ?? "current leader"}: ${alias.leaderEndpointId}`
          : "no eligible endpoint"}
      </span>
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
          {row.unresolvableScopes.length > 0 ? (
            <Badge tone="error">
              {`${row.unresolvableScopes.length} scope${row.unresolvableScopes.length === 1 ? "" : "s"} cannot resolve`}
            </Badge>
          ) : null}
        </div>
      </div>
      {row.resolvableAliases.length === 0 ? (
        <EmptyState label="No scope can resolve for this entry yet; save it again after the pool or the capability requirement changes." />
      ) : (
        <div className="space-y-2">
          {row.resolvableAliases.map((alias) => (
            <AliasRow key={alias.aliasId} alias={alias} />
          ))}
        </div>
      )}
      {row.unresolvableScopeNotice ? (
        <p className={supportingTextClassName}>{row.unresolvableScopeNotice}</p>
      ) : null}
      {row.messages.length > 0 ? (
        <ul className="space-y-1">
          {row.messages.map((message) => (
            <li key={message} className={supportingTextClassName}>
              {message}
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
  /** The row the operator just added, so its Name field takes focus instead of the saved rows'. */
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  /** Saved entries the operator removed in this session; the patch deletes exactly these names. */
  const [removedSavedNames, setRemovedSavedNames] = useState<readonly string[]>([]);
  const nameInputRefs = useRef(new Map<string, HTMLInputElement>());

  const readbackEntries = useMemo(
    () => (kind === "role" ? routerConfig?.agentStrategies : routerConfig?.workloads) ?? null,
    [kind, routerConfig],
  );
  const diagnostics = routerConfig?.postureDiagnostics ?? {
    violations: [],
    skipped: [],
    warnings: [],
  };
  /**
   * Operator decision: the diagnostics card renders one page, so it only sees the diagnostics of the
   * entries that page owns - the Agent strategy page never lists a workload's scopes or warnings.
   */
  const pageDiagnostics = useMemo(
    () => filterPostureDiagnosticsForKind(kind, readbackEntries ?? [], diagnostics),
    [kind, readbackEntries, diagnostics],
  );
  const diagnosticsSummary = useMemo(
    () => summarizePostureDiagnostics(pageDiagnostics),
    [pageDiagnostics],
  );
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

  /**
   * Post-lock repair (run 103): focus the row the operator just added so typing goes into the new
   * entry and never into a saved row (an accessibility-safe replacement for `autoFocus`).
   */
  useEffect(() => {
    if (focusRowId === null) {
      return;
    }
    const input = nameInputRefs.current.get(focusRowId);
    input?.focus();
    input?.scrollIntoView({ block: "nearest" });
  }, [focusRowId]);

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
    setSaving(true);
    try {
      /**
       * Post-lock repair (run 103, operator decision): the page sends a per-entry patch, so adding or
       * editing a row upserts only that entry and the entries the editor does not name are never
       * touched. A `null` travels only for an entry the operator removed with the Remove action; a
       * rename upserts the new name and leaves the saved entry behind it in place.
       */
      const rows: PosturePatchRow[] = [];
      forms.forEach((form, index) => {
        const validation = validations[index];
        if (validation?.ok) {
          rows.push({ originName: form.originName, entry: validation.entry });
        }
      });
      const patch = buildPostureNamedBlockPatch(kind, {
        saved: readbackEntries ?? [],
        rows,
        removedNames: removedSavedNames,
      });
      const addedNames = rows
        .map((row) => row.entry.name)
        .filter((name) => !savedNames.includes(name));
      /** The runtime document key the whole block is written under: `agent_strategies` or `workloads`. */
      const documentKey = postureBlockDocumentKey(kind);
      await updateRuntimeConfig({ [documentKey]: patch.block });
      await loadState();
      setRemovedSavedNames([]);
      const countLabel = `${rows.length} ${kind === "role" ? "agent strateg" : "workload"}${rows.length === 1 ? "y" : "ies"}`;
      let message = `${title} saved (${countLabel}); the aliases materialise from this block.`;
      if (addedNames.length > 0) {
        message += ` Added: ${addedNames.join(", ")}.`;
      }
      if (patch.deletedNames.length > 0) {
        message += ` Removed: ${patch.deletedNames.join(", ")} — their <name>.<scope> aliases stop materialising.`;
      }
      if (patch.keptOriginNames.length > 0) {
        message += ` Kept: ${patch.keptOriginNames.join(", ")} — a rename adds the new entry, so the saved one stays until you press Remove entry on it.`;
      }
      setStatusMessage(message);
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
        description={`Violations and capability warnings the runtime raised for the saved ${title} entries on this page. A scope that cannot resolve is reported on its own entry.`}
      >
        {diagnosticsSummary.violations.length === 0 && diagnosticsSummary.warnings.length === 0 ? (
          <EmptyState label="The readback reports no posture violations or capability warnings for this page." />
        ) : (
          <div className="space-y-3">
            {diagnosticsSummary.violations.map((violation) => (
              <p key={violation} className={errorNoticeClassName}>
                {violation}
              </p>
            ))}
            {diagnosticsSummary.warnings.map((warning) => (
              <p key={warning} className={supportingTextClassName}>
                {warning}
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
                      const row = formFromDraft(draft, null);
                      setForms((current) => [...current, row]);
                      setFocusRowId(row.id);
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
        description={`Edit the ${title} block. Saving upserts only the rows below; an entry is deleted only when you remove it here.`}
      >
        <div className="space-y-4">
          <p className={supportingTextClassName}>
            {`${(readbackEntries ?? []).length} saved · ${forms.filter((form) => form.originName === null).length} new row${forms.filter((form) => form.originName === null).length === 1 ? "" : "s"}${removedSavedNames.length > 0 ? ` · ${removedSavedNames.length} pending removal${removedSavedNames.length === 1 ? "" : "s"}` : ""}. Add as many entries as you need: saving upserts the rows here and never touches an entry you did not edit.`}
          </p>
          {removedSavedNames.length > 0 ? (
            <div
              className={`${mutedPanelClassName} flex flex-wrap items-center justify-between gap-2 p-3`}
            >
              <p className={supportingTextClassName}>
                {`Removed in this editor: ${removedSavedNames.join(", ")} — saving stops their <name>.<scope> aliases.`}
              </p>
              <button
                type="button"
                className={secondaryButtonClassName}
                disabled={saving}
                onClick={() => {
                  const restored = (readbackEntries ?? []).filter((entry) =>
                    removedSavedNames.includes(entry.name),
                  );
                  setForms((current) => [
                    ...current,
                    ...restored.map((entry) =>
                      formFromDraft(postureDraftFromEntry(entry), entry.name),
                    ),
                  ]);
                  setRemovedSavedNames([]);
                }}
              >
                Undo removal
              </button>
            </div>
          ) : null}
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
                      /**
                       * Post-lock repair (run 103, operator decision): this button is the only way an
                       * entry is ever deleted. The removal is recorded and sent as an explicit `null`
                       * when the operator saves; unsaved rows simply disappear.
                       */
                      if (
                        form.originName !== null &&
                        typeof window !== "undefined" &&
                        !window.confirm(
                          `Remove the saved entry "${form.originName}"? Saving afterwards stops its ${form.originName}.<scope> aliases.`,
                        )
                      ) {
                        return;
                      }
                      if (form.originName !== null) {
                        const removedName = form.originName;
                        setRemovedSavedNames((current) =>
                          current.includes(removedName) ? current : [...current, removedName],
                        );
                      }
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
                      ref={(element) => {
                        if (element) {
                          nameInputRefs.current.set(form.id, element);
                        } else {
                          nameInputRefs.current.delete(form.id);
                        }
                      }}
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
                      {`Saving adds \`${form.name.trim()}\` and materialises \`${form.name.trim()}.<scope>\`. The saved entry \`${form.originName}\` stays in place — press Remove entry on it to stop its aliases.`}
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
              onClick={() => {
                const row = formFromDraft(createPostureDraft(kind), null);
                setForms((current) => [...current, row]);
                setFocusRowId(row.id);
              }}
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
