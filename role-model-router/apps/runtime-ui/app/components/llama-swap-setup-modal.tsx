import { useEffect } from "react";
import { Link } from "react-router";

import { primaryButtonClassName, secondaryButtonClassName } from "../lib/design-system";
import {
  LLAMA_SWAP_SCAFFOLD_YAML,
  type LlamaSwapConfigStatus,
  createLlamaSwapScaffoldJsonSnippet,
  llamaSwapHintDetail,
} from "../lib/llama-swap-setup";
import { CodeBlock } from "./page-primitives";

async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function LlamaSwapSetupModal({
  status,
  onClose,
}: {
  status: LlamaSwapConfigStatus;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const jsonSnippet = JSON.stringify({ llamaSwap: createLlamaSwapScaffoldJsonSnippet() }, null, 2);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4" role="presentation">
      <button
        aria-label="Close llama-swap setup modal"
        className="absolute inset-0 bg-[var(--rm-accent-ghost)] backdrop-blur-[1px]"
        type="button"
        onClick={onClose}
      />
      <dialog
        open
        aria-labelledby="llama-swap-setup-title"
        aria-modal="true"
        className="relative mx-auto max-w-4xl rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-6 shadow-[var(--rm-shadow-card)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
              Llama-swap setup
            </p>
            <h2
              id="llama-swap-setup-title"
              className="mt-2 text-2xl font-light tracking-tight text-[var(--rm-fg)]"
            >
              Enable role-model-managed llama-swap
            </h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">
              {llamaSwapHintDetail()}
            </p>
          </div>
          <button className={secondaryButtonClassName} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-6 space-y-6 text-sm leading-6 text-[var(--rm-secondary)]">
          <section>
            <h3 className="text-base font-semibold text-[var(--rm-fg)]">What llama-swap does</h3>
            <p className="mt-2">
              role-model runs the llama-swap process, swaps one GGUF model at a time on your GPU,
              and exposes it through the same local routing surface as peer-backed models.
              Peer-backed local keeps using servers you already operate; llama-swap is for GGUF
              files role-model should load and manage.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[var(--rm-fg)]">Setup steps</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                Place a GGUF weights file on disk (for example under your user models folder).
              </li>
              <li>
                Add a <span className="font-mono text-[var(--rm-fg)]">llama_swap.models</span> entry
                in runtime config with a stable model id and absolute path.
              </li>
              <li>Save and apply runtime config from System → Runtime config.</li>
              <li>
                Restart the role-model runtime if the control plane asks you to reload host policy.
              </li>
              <li>Return to Local → Llama-swap models and load the declared model id.</li>
              <li>Optional: assign roles and review host policy on the llama-swap pages.</li>
            </ol>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[var(--rm-fg)]">YAML scaffold</h3>
              <button
                className={secondaryButtonClassName}
                type="button"
                onClick={() => void copyText(LLAMA_SWAP_SCAFFOLD_YAML)}
              >
                Copy YAML
              </button>
            </div>
            <div className="mt-3">
              <CodeBlock>{LLAMA_SWAP_SCAFFOLD_YAML}</CodeBlock>
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[var(--rm-fg)]">JSON llamaSwap snippet</h3>
              <button
                className={secondaryButtonClassName}
                type="button"
                onClick={() => void copyText(jsonSnippet)}
              >
                Copy JSON
              </button>
            </div>
            <div className="mt-3">
              <CodeBlock>{jsonSnippet}</CodeBlock>
            </div>
          </section>

          <section className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4">
            <p>
              <span className="font-semibold text-[var(--rm-fg)]">Live status:</span>{" "}
              {status.operational ? "operational" : status.variant.replaceAll("_", " ")}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-[var(--rm-fg)]">Execution mode:</span>{" "}
              {status.executionMode ?? "pending"}
            </p>
            <p className="mt-2 break-all font-mono text-xs text-[var(--rm-muted)]">
              {status.configPath ?? "Config path unavailable"}
            </p>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className={primaryButtonClassName}
            to="/app/system/runtime-config"
            onClick={onClose}
          >
            Open runtime config
          </Link>
          <Link
            className={secondaryButtonClassName}
            to="/app/local/llama-swap/models"
            onClick={onClose}
          >
            Back to llama-swap models
          </Link>
        </div>
      </dialog>
    </div>
  );
}
