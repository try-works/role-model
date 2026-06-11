import { Link } from "react-router";

import { LlamaSwapSetupHint, useLlamaSwapConfigStatus } from "../components/llama-swap-setup-hint";
import { FactCard } from "../components/page-primitives";
import { primaryButtonClassName, secondaryButtonClassName } from "../lib/design-system";

export default function LocalChooseRoute() {
  const { status: llamaSwapStatus, loading: llamaSwapStatusLoading } = useLlamaSwapConfigStatus();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <FactCard
          label="External server"
          value="Peer-backed models"
          detail="Use this when you already run an OpenAI-compatible server (LM Studio, llama.cpp, vLLM, or similar). Register the server under Endpoints, then register models and roles here. role-model routes to your server; it does not load GGUF files for you."
          emphasis
        />
        <div className="flex flex-wrap gap-2">
          <Link to="/app/local/peer-models" className={primaryButtonClassName}>
            Open peer models
          </Link>
          <Link to="/app/local/endpoints" className={secondaryButtonClassName}>
            Configure endpoints
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <FactCard
          label="Managed by role-model"
          value="Llama-swap models"
          detail="Use this when role-model should run the local llama-swap process, swap models on one GPU, and apply TTL auto-unload. Models are declared in Runtime config; load and role assignment happen here."
        />
        <div className="flex flex-wrap gap-2">
          <Link to="/app/local/llama-swap/models" className={primaryButtonClassName}>
            Open llama-swap models
          </Link>
          <Link to="/app/system/runtime-config" className={secondaryButtonClassName}>
            Edit runtime config
          </Link>
        </div>
        {!llamaSwapStatusLoading && llamaSwapStatus && !llamaSwapStatus.operational ? (
          <LlamaSwapSetupHint variant="compact" status={llamaSwapStatus} />
        ) : null}
      </div>
    </div>
  );
}
