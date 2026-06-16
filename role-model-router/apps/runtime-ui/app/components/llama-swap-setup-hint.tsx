import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  type LlamaSwapConfigStatus,
  llamaSwapHintDetail,
  llamaSwapHintHeadline,
  readLlamaSwapConfigStatus,
} from "../lib/llama-swap-setup";
import { fetchRuntimeConfig } from "../lib/runtime-api";
import { LlamaSwapSetupModal } from "./llama-swap-setup-modal";

export function useLlamaSwapConfigStatus(): {
  status: LlamaSwapConfigStatus | null;
  loading: boolean;
} {
  const [status, setStatus] = useState<LlamaSwapConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchRuntimeConfig()
      .then((record) => setStatus(readLlamaSwapConfigStatus(record)))
      .catch(() =>
        setStatus({
          operational: false,
          variant: "not_configured",
          declaredModelIds: [],
          executionMode: undefined,
          configPath: null,
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  return { status, loading };
}

export function LlamaSwapSetupHint({
  variant,
  status,
}: {
  variant: "prominent" | "compact";
  status: LlamaSwapConfigStatus;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  if (status.operational) {
    return null;
  }

  const panelClassName =
    variant === "prominent"
      ? `${mutedPanelClassName} border border-[var(--rm-border-strong)] p-5`
      : `${mutedPanelClassName} p-4`;

  return (
    <>
      <div className={panelClassName}>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
          Llama-swap setup
        </p>
        <p className="mt-3 text-sm font-medium text-[var(--rm-fg)]">
          {llamaSwapHintHeadline(status)}
        </p>
        {variant === "prominent" ? (
          <p className="mt-2 max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">
            {llamaSwapHintDetail()}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={primaryButtonClassName}
            type="button"
            onClick={() => setModalOpen(true)}
          >
            Setup guide
          </button>
          {variant === "prominent" ? (
            <Link className={secondaryButtonClassName} to="/app/system/runtime-config">
              Open runtime config
            </Link>
          ) : null}
        </div>
      </div>
      {modalOpen ? (
        <LlamaSwapSetupModal status={status} onClose={() => setModalOpen(false)} />
      ) : null}
    </>
  );
}

export function LlamaSwapSetupBanner() {
  const { status, loading } = useLlamaSwapConfigStatus();
  if (loading || !status || status.operational) {
    return null;
  }
  return <LlamaSwapSetupHint variant="compact" status={status} />;
}
