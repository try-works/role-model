import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { CodeBlock, ErrorState, LoadingState, SectionCard } from "../components/page-primitives";
import {
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import { applyLlamaSwapScaffold } from "../lib/llama-swap-setup";
import {
  type RuntimeConfig,
  type RuntimeConfigRecord,
  fetchRuntimeConfig,
  updateRuntimeConfig,
} from "../lib/runtime-api";
import { usePageActions } from "../lib/shell-header-context";

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

  usePageActions(
    <>
      <Link className={secondaryButtonClassName} to="/app/router/strategy">
        Routing strategy
      </Link>
      <Link className={secondaryButtonClassName} to="/app/models">
        Inspect models
      </Link>
      <a className={secondaryButtonClassName} href="/api/role-model/runtime/config">
        Runtime config JSON
      </a>
    </>,
    [],
  );

  return (
    <div className="space-y-6">
      {error ? <ErrorState label={error} /> : null}

      <SectionCard
        title="Config editor"
        description={`Edit the canonical JSON payload directly, then save and apply it through the role-model runtime control plane. Current scope: ${currentConfig.llamaSwap.models.length} local models, ${remoteMappingCount} remote mappings, execution mode ${currentConfig.executionMode ?? "pending"}.`}
      >
        <div className="space-y-4">
          {!configRecord ? <LoadingState label="Loading runtime config…" /> : null}
          <textarea
            className={`${fieldClassName} min-h-96 font-mono text-xs leading-6`}
            spellCheck={false}
            value={editorText}
            onChange={(event) => setEditorText(event.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <button
              className={primaryButtonClassName}
              type="button"
              disabled={saving}
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
          {statusMessage ? (
            <p className="text-sm text-[var(--rm-secondary)]">{statusMessage}</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Applied config snapshot"
        description={`Use this snapshot to confirm the active config file (${configRecord?.path ?? "not configured"}) and the exact local-plus-remote runtime payload in force.`}
      >
        <CodeBlock>
          {JSON.stringify(configRecord?.config ?? createDefaultRuntimeConfig(), null, 2)}
        </CodeBlock>
      </SectionCard>
    </div>
  );
}
