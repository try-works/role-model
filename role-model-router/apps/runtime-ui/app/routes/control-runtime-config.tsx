import { MetricStrip } from "@role-model/ui";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { ErrorState, LoadingState, SectionCard } from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  fieldClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { applyLlamaSwapScaffold } from "../lib/llama-swap-setup";
import {
  type RuntimeConfig,
  type RuntimeConfigRecord,
  fetchRuntimeConfig,
  updateRuntimeConfig,
} from "../lib/runtime-api";

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
    llamaSwap: {
      models: [],
      process: createEmptyProcessConfig(),
    },
    liteLLM: {
      providers: [],
      process: createEmptyProcessConfig(),
    },
  };
}

function toEditorText(config: RuntimeConfig | null): string {
  return JSON.stringify(config ?? createDefaultRuntimeConfig(), null, 2);
}

export default function ControlRuntimeConfigRoute() {
  const [configRecord, setConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [editorText, setEditorText] = useState<string>(toEditorText(null));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuntimeConfig()
      .then((nextRecord) => {
        setConfigRecord(nextRecord);
        setEditorText(toEditorText(nextRecord.config));
        setError(null);
      })
      .catch((value: unknown) => {
        setError(value instanceof Error ? value.message : "Could not load runtime config.");
      });
  }, []);

  const currentConfig = configRecord?.config ?? createDefaultRuntimeConfig();
  const editorConfig = useMemo(() => {
    try {
      return JSON.parse(editorText) as RuntimeConfig;
    } catch {
      return null;
    }
  }, [editorText]);
  const canInsertScaffold = (editorConfig?.llamaSwap?.models?.length ?? 0) === 0;
  const remoteMappingCount = useMemo(
    () =>
      currentConfig.liteLLM.providers.reduce(
        (count, provider) => count + provider.modelMappings.length,
        0,
      ),
    [currentConfig],
  );

  const save = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const payload = JSON.parse(editorText) as RuntimeConfig;
      const nextRecord = await updateRuntimeConfig(payload);
      setConfigRecord(nextRecord);
      setEditorText(toEditorText(nextRecord.config));
      setError(null);
      setStatusMessage("Runtime config applied.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not apply runtime config.");
    } finally {
      setSaving(false);
    }
  };

  const snapshotRows = [
    ["Path", configRecord?.path ?? "not configured"],
    ["Execution", currentConfig.executionMode ?? "pending"],
    ["Strategy", currentConfig.routingStrategy ?? "pending"],
    ["Local models", String(currentConfig.llamaSwap.models.length)],
    ["Remote maps", String(remoteMappingCount)],
  ] as const;

  return (
    <div className="space-y-6">
      {error ? <ErrorState label={error} /> : null}

      <MetricStrip
        aria-label="Runtime config summary"
        variant="panel"
        items={[
          {
            id: "execution",
            label: "Execution",
            value: currentConfig.executionMode ?? "pending",
          },
          {
            id: "strategy",
            label: "Strategy",
            value: currentConfig.routingStrategy ?? "pending",
          },
          {
            id: "local-models",
            label: "Local models",
            value: String(currentConfig.llamaSwap.models.length),
          },
          {
            id: "remote-maps",
            label: "Remote maps",
            value: String(remoteMappingCount),
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <SectionCard
          title="Config editor"
          description="Edit the canonical JSON payload, then save and apply through the role-model runtime control plane."
        >
          <div className="space-y-4">
            {!configRecord ? <LoadingState label="Loading runtime config…" /> : null}
            <textarea
              className={`${fieldClassName} !min-h-[28rem] font-mono text-xs leading-6`}
              rows={24}
              spellCheck={false}
              value={editorText}
              onChange={(event) => setEditorText(event.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <button
                className={primaryButtonClassName}
                type="button"
                disabled={saving || !configRecord}
                onClick={() => void save()}
              >
                {saving ? "Applying…" : "Save and apply"}
              </button>
              {canInsertScaffold ? (
                <button
                  className={secondaryButtonClassName}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const base = editorConfig ?? createDefaultRuntimeConfig();
                    const next = applyLlamaSwapScaffold(base);
                    setEditorText(JSON.stringify(next, null, 2));
                    setStatusMessage(
                      "Llama-swap scaffold inserted. Replace your-model-id and the GGUF path, then Save and apply.",
                    );
                    setError(null);
                  }}
                >
                  Insert llama-swap scaffold
                </button>
              ) : null}
              <button
                className={secondaryButtonClassName}
                type="button"
                disabled={saving}
                onClick={() => {
                  setEditorText(toEditorText(configRecord?.config ?? null));
                  setStatusMessage(null);
                  setError(null);
                }}
              >
                Reset editor
              </button>
            </div>
            {statusMessage ? <p className={supportingTextClassName}>{statusMessage}</p> : null}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Applied snapshot"
            description="Active config file and local-plus-remote payload in force."
          >
            <div className={`${mutedPanelClassName} space-y-3 p-4`}>
              {snapshotRows.map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-start justify-between gap-3">
                  <p className={monoEyebrowClassName}>{label}</p>
                  <p className={`${bodyStrongTextClassName} max-w-[70%] break-all text-right`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Page actions"
            description="Related control-plane surfaces for this config."
          >
            <div className="flex flex-col gap-3">
              <Link className={secondaryButtonClassName} to="/app/router/strategy">
                Routing strategy
              </Link>
              <Link className={secondaryButtonClassName} to="/app/models">
                Inspect models
              </Link>
              <a className={secondaryButtonClassName} href="/api/role-model/runtime/config">
                Runtime config JSON
              </a>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
