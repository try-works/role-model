import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { LlamaSwapSetupBanner } from "../components/llama-swap-setup-hint";
import { EmptyState, ErrorState, LoadingState, SectionCard } from "../components/page-primitives";
import {
  codeBlockClassName,
  compactTitleClassName,
  fieldClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import { fetchLocalPolicy, updateLocalPolicy } from "../lib/runtime-api";

export default function LocalPolicyRoute() {
  const [policy, setPolicy] = useState<Record<string, unknown>>({});
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLocalPolicy();
      setPolicy({ ...data });
      setDraft({ ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load local policy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateLocalPolicy(draft);
      setPolicy({ ...updated });
      setDraft({ ...updated });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft({ ...policy });
    setSaveError(null);
  };

  const setField = (key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const ttlFieldId = "local-policy-ttl";
  const maxConcurrencyFieldId = "local-policy-max-concurrency";
  const ttl = typeof draft.ttl === "number" ? draft.ttl : 300;
  const autoUnload = typeof draft.autoUnload === "boolean" ? draft.autoUnload : true;
  const maxConcurrency = typeof draft.maxConcurrency === "number" ? draft.maxConcurrency : 1;

  return (
    <div className="space-y-8">
      <LlamaSwapSetupBanner />
      {error ? <ErrorState label={error} /> : null}

      <SectionCard
        title="Policy configuration"
        description="Edit runtime behavior for local model loading and unloading."
      >
        {loading ? (
          <LoadingState label="Loading policy…" />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor={ttlFieldId} className={utilityLabelClassName}>
                  TTL (seconds)
                </label>
                <input
                  id={ttlFieldId}
                  type="number"
                  min={0}
                  value={ttl}
                  onChange={(e) => setField("ttl", Number.parseInt(e.target.value, 10) || 0)}
                  className={fieldClassName}
                />
                <p className={supportingTextClassName}>
                  Seconds a model stays loaded after last request before auto-unload.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor={maxConcurrencyFieldId} className={utilityLabelClassName}>
                  Max concurrency
                </label>
                <input
                  id={maxConcurrencyFieldId}
                  type="number"
                  min={1}
                  value={maxConcurrency}
                  onChange={(e) =>
                    setField("maxConcurrency", Number.parseInt(e.target.value, 10) || 1)
                  }
                  className={fieldClassName}
                />
                <p className={supportingTextClassName}>
                  Maximum number of models loaded simultaneously.
                </p>
              </div>
            </div>

            <label
              htmlFor="autoUnload"
              className={`${mutedPanelClassName} flex cursor-pointer items-start justify-between gap-4 p-4`}
            >
              <span className="space-y-1">
                <span className={`block ${compactTitleClassName}`}>Auto-unload idle models</span>
                <span className={supportingTextClassName}>
                  Release a model from memory after its TTL expires so the managed host does not
                  keep inactive weights pinned indefinitely.
                </span>
              </span>
              <input
                type="checkbox"
                id="autoUnload"
                checked={autoUnload}
                onChange={(e) => setField("autoUnload", e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded-[var(--rm-radius-sm)] border-[var(--rm-border-strong)] accent-[var(--rm-accent)]"
              />
            </label>

            {saveError ? <ErrorState label={saveError} /> : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={primaryButtonClassName}
              >
                {saving ? "Saving…" : "Save policy"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className={secondaryButtonClassName}
              >
                Reset
              </button>
              <Link className={secondaryButtonClassName} to="/app/local/llama-swap/models">
                Open models
              </Link>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Raw policy" description="Current persisted policy payload.">
        {loading ? (
          <LoadingState label="Loading…" />
        ) : Object.keys(policy).length === 0 ? (
          <EmptyState label="No policy configured. Save a policy to see it here." />
        ) : (
          <div className={`${mutedPanelClassName} space-y-3 p-4`}>
            <p className={supportingTextClassName}>
              Persisted JSON stays visible here so operators can confirm the exact contract written
              back to the runtime after saving.
            </p>
            <pre className={`overflow-x-auto ${codeBlockClassName}`}>
              {JSON.stringify(policy, null, 2)}
            </pre>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
