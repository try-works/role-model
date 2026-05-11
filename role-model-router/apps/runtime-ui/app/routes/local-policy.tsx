import { useCallback, useEffect, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "../components/page-primitives";
import {
  fieldClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
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
      <PageHeader
        eyebrow="Local"
        title="Host policy"
        description="Local inference runtime policy: TTL, auto-unload, and resource limits."
      />

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
                <label
                  htmlFor={ttlFieldId}
                  className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]"
                >
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
                <p className="text-xs text-[var(--rm-muted)]">
                  Seconds a model stays loaded after last request before auto-unload.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={maxConcurrencyFieldId}
                  className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]"
                >
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
                <p className="text-xs text-[var(--rm-muted)]">
                  Maximum number of models loaded simultaneously.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoUnload"
                checked={autoUnload}
                onChange={(e) => setField("autoUnload", e.target.checked)}
                className="h-4 w-4 rounded-none border-[var(--rm-border-strong)] accent-[var(--rm-accent)]"
              />
              <label htmlFor="autoUnload" className="text-sm text-[var(--rm-fg)]">
                Auto-unload idle models
              </label>
            </div>

            {saveError ? <ErrorState label={saveError} /> : null}

            <div className="flex gap-3 pt-2">
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
          <pre
            className={`${mutedPanelClassName} overflow-x-auto p-4 text-xs leading-6 text-[var(--rm-secondary)]`}
          >
            {JSON.stringify(policy, null, 2)}
          </pre>
        )}
      </SectionCard>
    </div>
  );
}
