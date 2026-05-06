import { Link } from "react-router";

import { PageHeader, SectionCard } from "../components/page-primitives";

export default function NotFoundRoute() {
  return (
    <div className="min-h-screen bg-[var(--rm-bg)] p-4">
      <div className="mx-auto max-w-3xl space-y-6 pt-16">
        <PageHeader
          eyebrow="Not found"
          title="This runtime route does not exist"
          description="Return to the operator shell to continue working with the runtime surfaces."
        />
        <SectionCard title="Navigation" description="The repo-owned runtime UI lives under /app.">
          <Link className="text-sm font-medium text-[var(--rm-accent)]" to="/app">
            Go to the dashboard
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}
