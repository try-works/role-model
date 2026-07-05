import { Link } from "react-router";

import {
  codeBlockClassName,
  inlineTitleClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";

export default function LocalMatrixRoute() {
  return (
    <div className="space-y-5">
      <section className={`${mutedPanelClassName} space-y-2 p-5`}>
        <h2 className={inlineTitleClassName}>Llama-swap matrix</h2>
        <p className={supportingTextClassName}>
          This route redirects to the llama-swap models board in grid view.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={`${mutedPanelClassName} space-y-3 p-4`}>
          <p className={inlineTitleClassName}>Redirect target</p>
          <p className={`break-words ${codeBlockClassName}`}>
            /app/local/llama-swap/models?view=grid
          </p>
          <Link className={primaryButtonClassName} to="/app/local/llama-swap/models?view=grid">
            Open grid view
          </Link>
        </section>

        <section className={`${mutedPanelClassName} space-y-3 p-4`}>
          <p className={inlineTitleClassName}>Shared inventory</p>
          <p className={supportingTextClassName}>
            Grid and list views reflect the same loaded-model inventory and role assignments.
          </p>
        </section>
      </div>

      <section className={`${mutedPanelClassName} space-y-1 p-4`}>
        <p className={utilityLabelClassName}>Resolution</p>
        <p className={supportingTextClassName}>
          Navigate here only when you want the models board opened directly in grid mode.
        </p>
      </section>
    </div>
  );
}
