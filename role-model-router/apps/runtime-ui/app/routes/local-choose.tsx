import { Link } from "react-router";

import {
  bodyTextClassName,
  cardClassName,
  inlineTitleClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  utilityLabelClassName,
} from "../lib/design-system";

export default function LocalChooseRoute() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
      <section className={`${cardClassName} flex min-h-[280px] flex-col gap-3 p-5`}>
        <p className={utilityLabelClassName}>External server</p>
        <h2 className={inlineTitleClassName}>Peer-backed models</h2>
        <p className={bodyTextClassName}>
          Use this when you already run an OpenAI-compatible server (LM Studio, llama.cpp, vLLM, or
          similar). Register the server under Endpoints, then register models and roles here.
          role-model routes to your server; it does not load GGUF files for you.
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Link to="/app/local/peer-models" className={primaryButtonClassName}>
            Open peer models
          </Link>
          <Link to="/app/local/endpoints" className={secondaryButtonClassName}>
            Configure endpoints
          </Link>
        </div>
      </section>

      <section className={`${cardClassName} flex min-h-[280px] flex-col gap-3 p-5`}>
        <p className={utilityLabelClassName}>Managed by role-model</p>
        <h2 className={inlineTitleClassName}>Llama-swap models</h2>
        <p className={bodyTextClassName}>
          Use this when role-model runs the local llama-swap process, swaps models on one GPU, and
          applies TTL auto-unload. Models are declared in Runtime config; load and role assignment
          happen here.
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Link to="/app/local/llama-swap/models" className={primaryButtonClassName}>
            Open llama-swap models
          </Link>
          <Link to="/app/system/runtime-config" className={secondaryButtonClassName}>
            Edit runtime config
          </Link>
        </div>
      </section>
    </div>
  );
}
