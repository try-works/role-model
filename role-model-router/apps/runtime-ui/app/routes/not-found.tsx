import { Link } from "react-router";

import { SectionCard } from "../components/page-primitives";

export default function NotFoundRoute() {
  return (
    <div className="min-h-screen bg-[var(--rm-bg)] p-4">
      <div className="mx-auto max-w-3xl space-y-6 pt-16">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rm-muted)]">
            Not found
          </p>
          <h1 className="text-2xl font-semibold text-[var(--rm-fg)]">
            This runtime route does not exist
          </h1>
          <p className="max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">
            Return to the operator shell to continue working with the runtime surfaces.
          </p>
        </div>
        <SectionCard title="Navigation" description="The repo-owned runtime UI lives under /app.">
          <Link className="text-sm font-semibold text-[var(--rm-accent)]" to="/app">
            Go to the dashboard
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}
